import { Checkbox } from "@workspace/ui/components/checkbox"

interface Props {
  ingredients: string[]
}

export function IngredientList({ ingredients }: Props) {
  return (
    <ul className="flex flex-col gap-1.5">
      {ingredients.map((ingredient, i) => (
        <li key={i} className="flex items-start gap-2.5 has-[input:checked]:text-muted-foreground has-[input:checked]:line-through">
          <Checkbox
            className="mt-0.5"
            aria-label={ingredient}
          />
          <span
            className="text-sm leading-snug transition-colors"
          >
            {ingredient}
          </span>
        </li>
      ))}
    </ul>
  )
}
