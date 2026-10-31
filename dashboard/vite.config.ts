import { defineConfig } from "vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import { nitro } from "nitro/vite"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

// Server-only code must never reach the browser bundle: importing one of these from client code fails the
// build. Imports used only inside server function handlers are stripped for the client anyway.
const CLIENT_FORBIDDEN: (string | RegExp)[] = [
  /^node:/,
  /^(fs|path|os|crypto|child_process|net|tls|http|https|stream|zlib)(\/|$)/,
]

// Order per TanStack docs: tanstackStart() before viteReact(). nitro() builds the server bundle:
// NITRO_PRESET=node-server for Docker (.output/server/index.mjs); on Vercel the preset is detected automatically.
const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    tailwindcss(),
    tanstackStart({ importProtection: { behavior: "error", client: { specifiers: CLIENT_FORBIDDEN } } }),
    nitro(),
    viteReact(),
  ],
})

export default config
