import { useState } from "react"
import { InputGroup, InputGroupButton } from "@workspace/ui/components/input-group"
import { InputGroupAddon, InputGroupInput } from "@workspace/ui/components/input-group"

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
        <InputGroup className="h-12 px-2">
          <InputGroupInput placeholder="https://www.example.com/recipes/..." value={url} onChange={event => setUrl(event.target.value)} />
          <InputGroupAddon align="inline-end">
            <InputGroupButton variant="default" className="px-4" size="sm" type="submit" disabled={!url.trim()}>
              Import
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  )
}
