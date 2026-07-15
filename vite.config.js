import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  // ... baki settings
  build: {
    rollupOptions: {
      external: ['react-is']
    }
  }
})
