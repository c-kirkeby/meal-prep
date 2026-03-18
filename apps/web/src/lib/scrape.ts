import type { Recipe } from "./types"

// ── JSON-LD helpers ────────────────────────────────────────────────────────────

interface JsonLdRecipe {
  "@type": string | string[]
  name?: string
  description?: string
  recipeIngredient?: string[]
  recipeInstructions?: unknown
  prepTime?: string
  cookTime?: string
  totalTime?: string
  recipeYield?: string | string[]
  image?: string | { url: string } | Array<string | { url: string }>
  url?: string
}

function normaliseInstructions(raw: unknown): string[] {
  if (!raw) return []
  if (typeof raw === "string") return [raw]
  if (Array.isArray(raw)) {
    return raw.flatMap((item) => {
      if (typeof item === "string") return [item]
      if (item && typeof item === "object") {
        // HowToStep or HowToSection
        const step = item as Record<string, unknown>
        if (step.text && typeof step.text === "string") return [step.text]
        if (step.itemListElement && Array.isArray(step.itemListElement)) {
          return normaliseInstructions(step.itemListElement)
        }
      }
      return []
    })
  }
  return []
}

function normaliseImage(raw: unknown): string | undefined {
  if (!raw) return undefined
  if (typeof raw === "string") return raw
  if (Array.isArray(raw)) {
    const first = raw[0]
    if (typeof first === "string") return first
    if (first && typeof first === "object" && "url" in first)
      return (first as { url: string }).url
  }
  if (typeof raw === "object" && "url" in raw)
    return (raw as { url: string }).url
  return undefined
}

function extractFromJsonLd(html: string, pageUrl: string): Recipe | null {
  const scriptRegex =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match: RegExpExecArray | null

  while ((match = scriptRegex.exec(html)) !== null) {
    let data: unknown
    try {
      data = JSON.parse(match[1])
    } catch {
      continue
    }

    // Could be a single object or an array; also handle @graph
    const candidates: unknown[] = []
    if (Array.isArray(data)) {
      candidates.push(...data)
    } else if (data && typeof data === "object") {
      const obj = data as Record<string, unknown>
      if (obj["@graph"] && Array.isArray(obj["@graph"])) {
        candidates.push(...(obj["@graph"] as unknown[]))
      } else {
        candidates.push(data)
      }
    }

    for (const candidate of candidates) {
      if (!candidate || typeof candidate !== "object") continue
      const node = candidate as JsonLdRecipe
      const types = Array.isArray(node["@type"])
        ? node["@type"]
        : [node["@type"]]
      if (
        !types.some(
          (t) => typeof t === "string" && t.toLowerCase().includes("recipe")
        )
      )
        continue

      if (!node.name || !node.recipeIngredient?.length) continue

      const yield_ = Array.isArray(node.recipeYield)
        ? node.recipeYield[0]
        : node.recipeYield

      return {
        title: node.name,
        description: node.description,
        ingredients: node.recipeIngredient ?? [],
        instructions: normaliseInstructions(node.recipeInstructions),
        prepTime: node.prepTime,
        cookTime: node.cookTime,
        totalTime: node.totalTime,
        servings: yield_,
        imageUrl: normaliseImage(node.image),
        url: pageUrl,
      }
    }
  }

  return null
}

// ── Cloudflare Browser Rendering fallback ─────────────────────────────────────

const CF_BR_RESPONSE_FORMAT = {
  type: "json_schema",
  schema: {
    type: "object",
    properties: {
      title: { type: "string" },
      description: { type: "string" },
      ingredients: { type: "array", items: { type: "string" } },
      instructions: { type: "array", items: { type: "string" } },
      prepTime: { type: "string" },
      cookTime: { type: "string" },
      totalTime: { type: "string" },
      servings: { type: "string" },
      imageUrl: { type: "string" },
    },
    required: ["title", "ingredients", "instructions"],
  },
}

async function scrapeViaBrowserRendering(
  recipeUrl: string,
  accountId: string,
  apiToken: string
): Promise<Recipe | null> {
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/browser-rendering/json`

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: recipeUrl,
      prompt:
        "Extract the full recipe from this page including the title, description, ingredients list, step-by-step instructions, prep time, cook time, total time, servings/yield, and the main image URL.",
      response_format: CF_BR_RESPONSE_FORMAT,
      gotoOptions: { waitUntil: "networkidle0" },
    }),
  })

  if (!res.ok) {
    console.error(
      "[scrape] Browser Rendering API error:",
      res.status,
      await res.text()
    )
    return null
  }

  const json = (await res.json()) as {
    success: boolean
    result: Partial<Recipe>
  }
  if (!json.success || !json.result?.title || !json.result?.ingredients?.length)
    return null

  return {
    title: json.result.title,
    description: json.result.description,
    ingredients: json.result.ingredients ?? [],
    instructions: json.result.instructions ?? [],
    prepTime: json.result.prepTime,
    cookTime: json.result.cookTime,
    totalTime: json.result.totalTime,
    servings: json.result.servings,
    imageUrl: json.result.imageUrl,
    url: recipeUrl,
  }
}

// ── Public entry point ─────────────────────────────────────────────────────────

export async function scrapeRecipe(
  recipeUrl: string,
  accountId: string,
  apiToken: string
): Promise<Recipe | null> {
  // 1. Try fetching the page directly and parsing JSON-LD
  try {
    const res = await fetch(recipeUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; RecipeBot/1.0)" },
    })
    if (res.ok) {
      const html = await res.text()
      const recipe = extractFromJsonLd(html, recipeUrl)
      if (recipe) {
        console.log("[scrape] JSON-LD extraction succeeded for", recipeUrl)
        return recipe
      }
      console.log(
        "[scrape] No JSON-LD Recipe found, falling back to Browser Rendering"
      )
    }
  } catch (err) {
    console.error("[scrape] Direct fetch failed:", err)
  }

  // 2. Fall back to Cloudflare Browser Rendering /json
  console.log("[scrape] Using Browser Rendering fallback for", recipeUrl)
  return scrapeViaBrowserRendering(recipeUrl, accountId, apiToken)
}
