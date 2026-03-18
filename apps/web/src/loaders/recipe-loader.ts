import type { LiveLoader } from "astro/loaders"
import type { Recipe } from "@/lib/types"

interface RecipeMeta {
  title: string
  imageUrl: string | null
  savedAt: number
}

interface RecipeEntryFilter {
  /** The URL of the recipe to load */
  id: string
}

interface RecipeCollectionFilter {
  /** Maximum number of recipes to return, sorted by most recently saved */
  limit?: number
}

export function recipeLoader(): LiveLoader<
  Recipe,
  RecipeEntryFilter,
  RecipeCollectionFilter
> {
  return {
    name: "recipe-loader",

    loadCollection: async ({ filter }) => {
      try {
        const { env } = await import("cloudflare:workers")
        const listResult = await env.RECIPES.list<RecipeMeta>()

        let keys = listResult.keys
          .filter((k) => k.metadata?.savedAt != null)
          .sort((a, b) => b.metadata!.savedAt - a.metadata!.savedAt)

        if (filter?.limit != null) {
          keys = keys.slice(0, filter.limit)
        }

        return {
          entries: keys.map((k) => ({
            id: k.name,
            data: {
              url: k.name,
              title: k.metadata!.title,
              imageUrl: k.metadata!.imageUrl ?? undefined,
              ingredients: [],
              instructions: [],
            },
          })),
        }
      } catch (error) {
        return {
          error: new Error("Failed to load recipe collection", {
            cause: error,
          }),
        }
      }
    },

    loadEntry: async ({ filter }) => {
      const recipeUrl = filter.id

      try {
        const { env } = await import("cloudflare:workers")

        // Check KV cache first
        const cached = await env.RECIPES.get(recipeUrl, "json")

        if (cached) {
          return {
            id: recipeUrl,
            data: cached as Recipe,
          }
        }

        // Cache miss — scrape upstream
        const { scrapeRecipe } = await import("@/lib/scrape")
        const recipe = await scrapeRecipe(
          recipeUrl,
          env.CLOUDFLARE_ACCOUNT_ID,
          env.CLOUDFLARE_API_TOKEN
        )

        if (!recipe) {
          return undefined
        }

        // Persist to KV for future requests
        await env.RECIPES.put(recipeUrl, JSON.stringify(recipe), {
          metadata: {
            title: recipe.title,
            imageUrl: recipe.imageUrl ?? null,
            savedAt: Date.now(),
          } satisfies RecipeMeta,
        })

        return {
          id: recipeUrl,
          data: recipe,
        }
      } catch (error) {
        return {
          error: new Error(`Failed to load recipe: ${recipeUrl}`, {
            cause: error,
          }),
        }
      }
    },
  }
}
