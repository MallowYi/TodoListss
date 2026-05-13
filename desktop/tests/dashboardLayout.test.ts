import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

function readFileText(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8')
}

test('desktop dashboard uses a richer left rail and an internally scrollable task list', () => {
  const appSource = readFileText('../src/App.tsx')
  const cssSource = readFileText('../src/App.css')

  assert.match(appSource, /dashboard-focus/)
  assert.match(appSource, /dashboard-distribution/)
  assert.match(appSource, /dashboard-activity/)
  assert.match(cssSource, /\.app-shell\s*\{[^}]*overflow:\s*hidden/s)
  assert.match(cssSource, /\.dashboard\s*\{[^}]*flex:\s*1/s)
  assert.doesNotMatch(cssSource, /\.dashboard\s*\{[^}]*min-height:\s*620px/s)
  assert.match(cssSource, /\.hero-panel\s*\{[^}]*grid-template-rows:\s*auto auto auto minmax\(0,\s*1fr\) auto/s)
  assert.match(cssSource, /\.list-panel,\s*\.detail-panel\s*\{[^}]*height:\s*100%/s)
  assert.match(cssSource, /\.todo-list\s*\{[^}]*overflow-y:\s*auto/s)
})
