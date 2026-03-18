import { defineLiveCollection } from "astro:content"
import { recipeLoader } from "./loaders/recipe-loader"

const recipes = defineLiveCollection({
  loader: recipeLoader(),
})

export const collections = { recipes }
