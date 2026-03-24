import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@workspace/ui/components/navigation-menu"

export function NavBar() {
  return (
    <header className="border-b border-border bg-background px-4">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-4">
        <a
          href="/"
          className="text-xl"
          aria-label="Home"
        >
          🍽️
        </a>
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuLink href="/recipes">
                Recipes
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>
    </header>
  )
}
