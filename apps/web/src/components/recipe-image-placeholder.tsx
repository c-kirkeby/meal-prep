import { ImageOffIcon } from "lucide-react"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty"

export function RecipeImagePlaceholder() {
  return (
    <Empty className="aspect-video rounded-lg border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ImageOffIcon />
        </EmptyMedia>
        <EmptyTitle>No image available</EmptyTitle>
      </EmptyHeader>
    </Empty>
  )
}
