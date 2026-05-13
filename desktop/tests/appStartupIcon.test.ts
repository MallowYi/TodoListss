import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

function readFileText(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8')
}

test('packaged startup does not load the tray icon from an asar SVG path', () => {
  const mainSource = readFileText('../electron/main.ts')

  assert.doesNotMatch(
    mainSource,
    /new Tray\(path\.join\(process\.env\.VITE_PUBLIC,\s*['"]electron-vite\.svg['"]\)\)/,
  )
})

test('ES module preload is emitted and loaded with an mjs extension', () => {
  const mainSource = readFileText('../electron/main.ts')
  const viteConfigSource = readFileText('../vite.config.ts')

  assert.match(mainSource, /preload:\s*path\.join\(__dirname,\s*['"]preload\.mjs['"]\)/)
  assert.match(viteConfigSource, /format:\s*['"]es['"]/)
  assert.match(viteConfigSource, /entryFileNames:\s*['"]\[name\]\.mjs['"]/)
})
