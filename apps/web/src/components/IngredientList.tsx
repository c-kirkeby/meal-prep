import { useState } from "react"
import { Checkbox } from "@workspace/ui/components/checkbox"

interface Props {
  ingredients: string[]
}

export function IngredientList({ ingredients }: Props) {
  const [checked, setChecked] = useState<Set<number>>(new Set())

  function toggle(index: number) {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {ingredients.map((ingredient, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <Checkbox
            checked={checked.has(i)}
            onCheckedChange={() => toggle(i)}
            className="mt-0.5"
            aria-label={ingredient}
          />
          <span
            className={`text-sm leading-snug transition-colors ${
              checked.has(i) ? "text-muted-foreground line-through" : ""
            }`}
          >
            {ingredient}
          </span>
        </li>
      ))}
    </ul>
  )
}
