import type { Recipe } from "@/lib/types"
import { Card, CardContent } from "@workspace/ui/components/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@workspace/ui/components/carousel"

interface Props {
  recipes: Pick<Recipe, 'url' | 'title' | 'imageUrl'>[]
}

export function RecipeCarousel({ recipes }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-medium text-muted-foreground">
        Recent recipes
      </h2>
      <Carousel opts={{ align: "start" }} className="w-full">
        <CarouselContent>
          {recipes.map((r) => (
            <CarouselItem key={r.url} className="basis-1/2 lg:basis-1/3">
              <a href={`/recipe?url=${encodeURIComponent(r.url)}`}>
                <Card className="gap-0 py-0 transition-shadow hover:shadow-sm hover:ring-foreground/20">
                  {r.imageUrl ? (
                    <img
                      src={r.imageUrl}
                      alt={r.title}
                      width={240}
                      height={160}
                      className="aspect-[3/2] w-full rounded-t-lg object-cover"
                    />
                  ) : (
                    <div className="aspect-[3/2] w-full rounded-t-lg bg-muted" />
                  )}
                  <CardContent className="p-3">
                    <span className="line-clamp-2 text-sm leading-snug font-medium">
                      {r.title}
                    </span>
                  </CardContent>
                </Card>
              </a>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  )
}
