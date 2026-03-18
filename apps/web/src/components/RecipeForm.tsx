import { useState } from "react"
import { Button } from "@workspace/ui/components/button"

export function RecipeForm() {
  const [url, setUrl] = useState("")
  const [error, setError] = useState("")

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")

    let parsed: URL
    try {
      parsed = new URL(url.trim())
    } catch {
      setError(
        "Please enter a valid URL, e.g. https://www.example.com/recipes/pasta"
      )
      return
    }

    if (!["http:", "https:"].includes(parsed.protocol)) {
      setError("URL must start with http:// or https://")
      return
    }

    const encoded = encodeURIComponent(url.trim())
    window.location.href = `/recipe?url=${encoded}`
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3">
      <div className="flex gap-2">
        <input
          type="url"
          placeholder="https://www.example.com/recipes/..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="h-9 min-w-0 flex-1 rounded-md border border-input bg-input/20 px-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          aria-label="Recipe URL"
        />
        <Button type="submit" size="sm" disabled={!url.trim()}>
          Get Recipe
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  )
}
