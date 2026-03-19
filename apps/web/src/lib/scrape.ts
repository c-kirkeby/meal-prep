import { parseHTML } from "linkedom"
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
  const { document } = parseHTML(html)
  const scripts = document.querySelectorAll('script[type="application/ld+json"]')

  for (const script of Array.from(scripts)) {
    let data: unknown
    try {
      data = JSON.parse((script as Element).textContent ?? "")
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
        description: node.description ? decodeURIComponent(node.description) : node.description,
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

// ── Microdata extraction ───────────────────────────────────────────────────────

function extractFromMicrodata(html: string, pageUrl: string): Recipe | null {
  try {
    const { document } = parseHTML(html)

    // Find the root Recipe element — itemtype must contain schema.org/Recipe
    const recipeElem = document.querySelector(
      '[itemtype*="schema.org/Recipe"], [itemtype*="schema.org/recipe"]'
    ) as Element | null
    if (!recipeElem) return null

    // Helper: get text from first matching itemprop element
    const prop = (name: string): string | undefined => {
      const el = recipeElem.querySelector(`[itemprop="${name}"]`) as Element | null
      if (!el) return undefined
      // <meta> and <link> elements carry their value in the content/href attribute
      const content =
        el.getAttribute("content") ??
        el.getAttribute("href") ??
        el.textContent?.trim()
      return content || undefined
    }

    // Helper: collect text from ALL matching itemprop elements
    const props = (name: string): string[] => {
      const els = recipeElem.querySelectorAll(`[itemprop="${name}"]`)
      return Array.from(els)
        .map((el) => {
          const e = el as Element
          return (
            e.getAttribute("content") ??
            e.getAttribute("href") ??
            e.textContent?.trim() ??
            ""
          )
        })
        .filter(Boolean) as string[]
    }

    const name = prop("name")
    const ingredients = props("recipeIngredient")

    // Must have at minimum a title and at least one ingredient
    if (!name || ingredients.length === 0) return null

    // Instructions: each [itemprop="recipeInstructions"] element may be a
    // single block of text or an individual step — collect all non-empty values.
    const rawInstructions = props("recipeInstructions")
    const instructions = normaliseInstructions(rawInstructions)

    // Image: prefer <img src>, fall back to <meta content>
    const imgEl = recipeElem.querySelector('[itemprop="image"]') as Element | null
    let imageUrl: string | undefined
    if (imgEl) {
      imageUrl =
        imgEl.getAttribute("src") ??
        imgEl.getAttribute("content") ??
        undefined
    }

    return {
      title: name,
      description: prop("description"),
      ingredients,
      instructions,
      prepTime: prop("prepTime"),
      cookTime: prop("cookTime"),
      totalTime: prop("totalTime"),
      servings: prop("recipeYield"),
      imageUrl,
      url: pageUrl,
    }
  } catch (err) {
    console.error("[scrape] Microdata extraction error:", err)
    return null
  }
}

// ── Heuristic HTML scraping ────────────────────────────────────────────────────

function extractFromHeuristics(html: string, pageUrl: string): Recipe | null {
  try {
    const { document } = parseHTML(html)

    // Helper: try a list of selectors in order, return text of first match
    const firstText = (selectors: string[]): string | undefined => {
      for (const sel of selectors) {
        try {
          const el = document.querySelector(sel) as Element | null
          const text = el?.textContent?.trim()
          if (text) return text
        } catch {
          // invalid selector for this parser — skip
        }
      }
      return undefined
    }

    // Helper: try selectors in order, return all text values from first that matches
    const allTexts = (selectors: string[]): string[] => {
      for (const sel of selectors) {
        try {
          const els = document.querySelectorAll(sel)
          const texts = Array.from(els)
            .map((el) => (el as Element).textContent?.trim() ?? "")
            .filter(Boolean) as string[]
          if (texts.length > 0) return texts
        } catch {
          // invalid selector — skip
        }
      }
      return []
    }

    const title = firstText([
      "h1.recipe-title",
      "h1.entry-title",
      ".recipe-header h1",
      ".recipe-title h1",
      ".recipe-title",
      "h1",
    ])

    const ingredients = allTexts([
      ".recipe-ingredient",
      ".ingredient-list li",
      ".ingredients-list li",
      ".recipe-ingredients li",
      ".ingredients li",
      "ul.ingredients li",
      '[class*="ingredient"] li',
    ])

    const instructions = allTexts([
      ".recipe-instruction",
      ".recipe-instructions li",
      ".instructions li",
      ".recipe-directions li",
      ".directions li",
      "ol.instructions li",
      '[class*="instruction"] li',
      '[class*="direction"] li',
    ])

    // All three must be present for us to trust heuristic output
    if (!title || ingredients.length === 0 || instructions.length === 0) {
      return null
    }

    // Best-effort image from og:image meta
    const ogImage = document.querySelector(
      'meta[property="og:image"]'
    ) as Element | null
    const imageUrl = ogImage?.getAttribute("content") ?? undefined

    return {
      title,
      ingredients,
      instructions,
      imageUrl,
      url: pageUrl,
    }
  } catch (err) {
    console.error("[scrape] Heuristic extraction error:", err)
    return null
  }
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
  // Stages 1–3 all work on the same fetched HTML — one network request.
  try {
    const res = await fetch(recipeUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; RecipeBot/1.0)" },
    })
    if (res.ok) {
      const html = await res.text()

      // Stage 1: JSON-LD structured data
      const jsonLd = extractFromJsonLd(html, recipeUrl)
      if (jsonLd) {
        console.log("[scrape] Stage 1 (JSON-LD) succeeded for", recipeUrl)
        return jsonLd
      }

      // Stage 2: Microdata (inline HTML attributes, schema.org/Recipe)
      const microdata = extractFromMicrodata(html, recipeUrl)
      if (microdata) {
        console.log("[scrape] Stage 2 (Microdata) succeeded for", recipeUrl)
        return microdata
      }

      // Stage 3: Best-effort heuristic HTML scraping
      const heuristic = extractFromHeuristics(html, recipeUrl)
      if (heuristic) {
        console.log("[scrape] Stage 3 (Heuristics) succeeded for", recipeUrl)
        return heuristic
      }

      console.log(
        "[scrape] Stages 1–3 found no recipe, falling back to Browser Rendering"
      )
    }
  } catch (err) {
    console.error("[scrape] Direct fetch failed:", err)
  }

  // Stage 4: Cloudflare Browser Rendering AI — last resort only
  console.log("[scrape] Stage 4 (Browser Rendering) for", recipeUrl)
  return scrapeViaBrowserRendering(recipeUrl, accountId, apiToken)
}
