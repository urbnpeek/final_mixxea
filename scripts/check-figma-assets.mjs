import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const bannedImportRegexes = [
  /from\s+['"]figma:asset\//g,
  /import\s*\(\s*['"]figma:asset\//g,
]

const ignoredDirs = new Set([
  'node_modules',
  '.git',
  'dist',
  '.next',
  'coverage',
  '.turbo',
])

const scannedExtensions = new Set([
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.mjs',
  '.cjs',
  '.json',
  '.css',
  '.scss',
  '.md',
  '.yml',
  '.yaml',
  '.html',
])

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) {
        files.push(...(await walk(fullPath)))
      }
      continue
    }

    if (scannedExtensions.has(path.extname(entry.name))) {
      files.push(fullPath)
    }
  }

  return files
}

function lineAndColumn(text, index) {
  const upToMatch = text.slice(0, index)
  const lines = upToMatch.split('\n')
  const line = lines.length
  const column = lines[lines.length - 1].length + 1
  return { line, column }
}

const files = await walk(repoRoot)
const violations = []

for (const file of files) {
  const content = await fs.readFile(file, 'utf8')
  for (const regex of bannedImportRegexes) {
    regex.lastIndex = 0
    const match = regex.exec(content)
    if (match) {
      const { line, column } = lineAndColumn(content, match.index)
      const relativeFile = path.relative(repoRoot, file).replaceAll('\\', '/')
      violations.push(`${relativeFile}:${line}:${column}`)
      break
    }
  }
}

if (violations.length > 0) {
  console.error('Found forbidden figma imports. Replace "figma:asset/*" with local src/assets paths:')
  for (const violation of violations) {
    console.error(` - ${violation}`)
  }
  process.exit(1)
}

console.log('No figma:asset imports found.')
