import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

function readFileText(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8')
}

function readDuration(source: string, pattern: RegExp, label: string): number {
  const match = source.match(pattern)

  assert.ok(match, `Expected to find ${label}`)
  return Number(match[1])
}

test('widget reveal timing is slightly slower and stays synchronized', () => {
  const appTsx = readFileText('../src/App.tsx')
  const appCss = readFileText('../src/App.css')

  const transitionMs = readDuration(appTsx, /const widgetRevealTransitionMs = (\d+)/, 'widget reveal transition duration')
  const headerMs = readDuration(
    appCss,
    /\.widget-board-shell--revealing \.widget-board-header\s*\{[^}]*animation: widget-surface-reveal (\d+)ms[^}]*\}/,
    'widget header reveal duration',
  )
  const boardMs = readDuration(
    appCss,
    /\.widget-board-shell--revealing \.widget-board\s*\{[^}]*animation: widget-surface-reveal (\d+)ms[^}]*animation-delay: \d+ms;[^}]*\}/,
    'widget board reveal duration',
  )
  const boardDelayMs = readDuration(
    appCss,
    /\.widget-board-shell--revealing \.widget-board\s*\{[^}]*animation: widget-surface-reveal \d+ms[^}]*animation-delay: (\d+)ms;[^}]*\}/,
    'widget board reveal delay',
  )

  assert.equal(headerMs, 210)
  assert.equal(boardMs, 240)
  assert.equal(boardDelayMs, 24)
  assert.equal(transitionMs, boardMs + boardDelayMs)
})
