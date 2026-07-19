import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true
  },
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    target: import.meta.env.TAURI_PLATFORM === "windows" ? "chrome105" : "safari13",
    minify: !import.meta.env.TAURI_DEBUG ? "esbuild" : false,
    sourcemap: !!import.meta.env.TAURI_DEBUG
  }
})
