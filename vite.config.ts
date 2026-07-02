import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // Isse build error bypass ho jayega
    chunkSizeWarningLimit: 1600,
  }
})
