// @ts-check

import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "astro/config"
import react from "@astrojs/react"
import cloudflare from "@astrojs/cloudflare"

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
    imageService: "passthrough",
  }),
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      dedupe: ["react", "react-dom", "@base-ui/react"],
    },
    server: {
      watch: {
        ignored: ["**/dist/**", "**/.astro/**"],
      },
    },
  },
  integrations: [react()],
})
