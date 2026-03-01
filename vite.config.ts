import { defineConfig } from 'vite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

const repoRoot = fileURLToPath(new URL('.', import.meta.url))

const figmaAssetResolver = {
  name: 'figma-asset-resolver',
  resolveId(id: string) {
    if (!id.startsWith('figma:asset/')) {
      return null
    }

    const filename = id.slice('figma:asset/'.length)
    const resolvedPath = path.resolve(repoRoot, 'src/assets', filename)

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(
        `[figma-asset-resolver] Missing asset "${filename}". Place it at: ${resolvedPath}`,
      )
    }

    return resolvedPath
  },
}

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used - do not remove them
    figmaAssetResolver,
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
