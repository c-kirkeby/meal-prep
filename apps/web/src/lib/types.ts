export interface Recipe {
  title: string
  description?: string
  ingredients: string[]
  instructions: string[]
  prepTime?: string
  cookTime?: string
  totalTime?: string
  servings?: string
  imageUrl?: string
  url: string
}
