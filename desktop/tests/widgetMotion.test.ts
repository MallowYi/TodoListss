import assert from 'node:assert/strict'
import test from 'node:test'
import type { WindowBounds } from '../shared/contracts'
import {
  getDockCursorAction,
  getWidgetHideDelayMs,
  interpolateWidgetBounds,
  type DockSessionLike,
} from '../electron/widgetMotion.ts'

function createBounds(bounds: WindowBounds): WindowBounds {
  return bounds
}

const visibleBounds = createBounds({
  x: 0,
  y: 120,
  width: 900,
  height: 560,
})

const leftDockSession: DockSessionLike = {
  edge: 'left',
  visibleBounds,
  hiddenBounds: createBounds({
    x: -894,
    y: 120,
    width: 900,
    height: 560,
  }),
  revealZone: createBounds({
    x: 0,
    y: 120,
    width: 48,
    height: 560,
  }),
}

test('reveal moves faster than hide at the midpoint while preserving endpoints', () => {
  const start = createBounds({
    x: 0,
    y: 120,
    width: 900,
    height: 560,
  })
  const target = createBounds({
    x: 100,
    y: 120,
    width: 900,
    height: 560,
  })

  assert.deepEqual(interpolateWidgetBounds(start, target, 0, 'reveal'), start)
  assert.deepEqual(interpolateWidgetBounds(start, target, 1, 'reveal'), target)
  assert.deepEqual(interpolateWidgetBounds(start, target, 0, 'hide'), start)
  assert.deepEqual(interpolateWidgetBounds(start, target, 1, 'hide'), target)

  const revealMidpoint = interpolateWidgetBounds(start, target, 0.5, 'reveal')
  const hideMidpoint = interpolateWidgetBounds(start, target, 0.5, 'hide')

  assert.ok(revealMidpoint.x > 50, 'reveal should reach past the linear midpoint')
  assert.ok(hideMidpoint.x < 50, 'hide should linger before crossing the linear midpoint')
})

test('hidden widget reveals when cursor enters the expanded approach zone', () => {
  const action = getDockCursorAction({
    autoHidden: true,
    cursor: { x: 60, y: 280 },
    dockSession: leftDockSession,
    hideDeadline: null,
    isAnimatingWindow: false,
    isWindowFocused: false,
    nowMs: 1000,
    windowBounds: visibleBounds,
  })

  assert.deepEqual(action, {
    type: 'reveal',
    hideDeadline: null,
  })
})

test('visible widget clears a pending hide when the cursor returns near the board', () => {
  const action = getDockCursorAction({
    autoHidden: false,
    cursor: { x: 958, y: 320 },
    dockSession: leftDockSession,
    hideDeadline: 1350,
    isAnimatingWindow: false,
    isWindowFocused: true,
    nowMs: 1000,
    windowBounds: visibleBounds,
  })

  assert.deepEqual(action, {
    type: 'clear-hide-deadline',
    hideDeadline: null,
  })
})

test('visible widget schedules hide only after the cursor leaves the softer hover bounds', () => {
  const action = getDockCursorAction({
    autoHidden: false,
    cursor: { x: 1020, y: 320 },
    dockSession: leftDockSession,
    hideDeadline: null,
    isAnimatingWindow: false,
    isWindowFocused: true,
    nowMs: 1000,
    windowBounds: visibleBounds,
  })

  assert.deepEqual(action, {
    type: 'schedule-hide',
    hideDeadline: 1000 + getWidgetHideDelayMs(true),
  })
})

test('visible widget hides once the pending deadline expires', () => {
  const action = getDockCursorAction({
    autoHidden: false,
    cursor: { x: 1020, y: 320 },
    dockSession: leftDockSession,
    hideDeadline: 1200,
    isAnimatingWindow: false,
    isWindowFocused: false,
    nowMs: 1200,
    windowBounds: visibleBounds,
  })

  assert.deepEqual(action, {
    type: 'hide',
    hideDeadline: null,
  })
})

test('cursor monitoring ignores motion updates while the window is animating', () => {
  const action = getDockCursorAction({
    autoHidden: true,
    cursor: { x: 10, y: 280 },
    dockSession: leftDockSession,
    hideDeadline: null,
    isAnimatingWindow: true,
    isWindowFocused: false,
    nowMs: 1000,
    windowBounds: visibleBounds,
  })

  assert.deepEqual(action, {
    type: 'idle',
    hideDeadline: null,
  })
})
