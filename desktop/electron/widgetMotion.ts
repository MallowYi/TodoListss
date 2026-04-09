import type { DockEdge, WindowBounds } from '../shared/contracts'

type WidgetDockEdge = Exclude<DockEdge, null>

export interface DockSessionLike {
  edge: WidgetDockEdge
  visibleBounds: WindowBounds
  hiddenBounds: WindowBounds
  revealZone: WindowBounds
}

export interface CursorPoint {
  x: number
  y: number
}

export interface DockCursorActionContext {
  autoHidden: boolean
  cursor: CursorPoint
  dockSession: DockSessionLike
  hideDeadline: number | null
  isAnimatingWindow: boolean
  isWindowFocused: boolean
  nowMs: number
  windowBounds: WindowBounds
}

export type DockCursorAction =
  | {
      type: 'idle'
      hideDeadline: number | null
    }
  | {
      type: 'clear-hide-deadline' | 'hide' | 'reveal'
      hideDeadline: null
    }
  | {
      type: 'schedule-hide'
      hideDeadline: number
    }

export type WidgetAnimationPhase = 'reveal' | 'hide'

export const widgetAnimationDurationsMs = {
  reveal: 176,
  hide: 232,
} as const

export const widgetAnimationFrameIntervalMs = 10
export const widgetCursorMonitorIntervalMs = 48
export const widgetBlurHideDelayMs = 220

const visibleEdgePadding = 12
const visibleInteriorPadding = 84
const visibleCrossAxisPadding = 28
const revealInteriorPadding = 24
const revealCrossAxisPadding = 18

export function getWidgetHideDelayMs(isWindowFocused: boolean): number {
  return isWindowFocused ? 360 : 220
}

export function interpolateWidgetBounds(
  startBounds: WindowBounds,
  targetBounds: WindowBounds,
  progress: number,
  phase: WidgetAnimationPhase,
): WindowBounds {
  const easedProgress = phase === 'reveal' ? easeOutCubic(clampProgress(progress)) : easeInQuad(clampProgress(progress))

  return {
    x: Math.round(startBounds.x + (targetBounds.x - startBounds.x) * easedProgress),
    y: Math.round(startBounds.y + (targetBounds.y - startBounds.y) * easedProgress),
    width: Math.round(startBounds.width + (targetBounds.width - startBounds.width) * easedProgress),
    height: Math.round(startBounds.height + (targetBounds.height - startBounds.height) * easedProgress),
  }
}

export function getDockCursorAction(context: DockCursorActionContext): DockCursorAction {
  if (context.isAnimatingWindow) {
    return {
      type: 'idle',
      hideDeadline: context.hideDeadline,
    }
  }

  if (context.autoHidden) {
    return pointInRect(context.cursor, getExpandedRevealZone(context.dockSession))
      ? {
          type: 'reveal',
          hideDeadline: null,
        }
      : {
          type: 'idle',
          hideDeadline: null,
        }
  }

  if (pointInRect(context.cursor, getVisibleHoverBounds(context.windowBounds, context.dockSession.edge))) {
    return context.hideDeadline === null
      ? {
          type: 'idle',
          hideDeadline: null,
        }
      : {
          type: 'clear-hide-deadline',
          hideDeadline: null,
        }
  }

  if (context.hideDeadline === null) {
    return {
      type: 'schedule-hide',
      hideDeadline: context.nowMs + getWidgetHideDelayMs(context.isWindowFocused),
    }
  }

  if (context.nowMs >= context.hideDeadline) {
    return {
      type: 'hide',
      hideDeadline: null,
    }
  }

  return {
    type: 'idle',
    hideDeadline: context.hideDeadline,
  }
}

function clampProgress(value: number): number {
  return Math.min(Math.max(value, 0), 1)
}

function easeOutCubic(progress: number): number {
  return 1 - Math.pow(1 - progress, 3)
}

function easeInQuad(progress: number): number {
  return progress * progress
}

function pointInRect(point: CursorPoint, rect: WindowBounds): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  )
}

function expandBounds(
  bounds: WindowBounds,
  expansion: {
    left: number
    right: number
    top: number
    bottom: number
  },
): WindowBounds {
  return {
    x: bounds.x - expansion.left,
    y: bounds.y - expansion.top,
    width: bounds.width + expansion.left + expansion.right,
    height: bounds.height + expansion.top + expansion.bottom,
  }
}

function getVisibleHoverBounds(bounds: WindowBounds, edge: WidgetDockEdge): WindowBounds {
  switch (edge) {
    case 'left':
      return expandBounds(bounds, {
        left: visibleEdgePadding,
        right: visibleInteriorPadding,
        top: visibleCrossAxisPadding,
        bottom: visibleCrossAxisPadding,
      })
    case 'right':
      return expandBounds(bounds, {
        left: visibleInteriorPadding,
        right: visibleEdgePadding,
        top: visibleCrossAxisPadding,
        bottom: visibleCrossAxisPadding,
      })
    case 'top':
      return expandBounds(bounds, {
        left: visibleCrossAxisPadding,
        right: visibleCrossAxisPadding,
        top: visibleEdgePadding,
        bottom: visibleInteriorPadding,
      })
    case 'bottom':
      return expandBounds(bounds, {
        left: visibleCrossAxisPadding,
        right: visibleCrossAxisPadding,
        top: visibleInteriorPadding,
        bottom: visibleEdgePadding,
      })
  }
}

function getExpandedRevealZone(dockSession: DockSessionLike): WindowBounds {
  switch (dockSession.edge) {
    case 'left':
      return expandBounds(dockSession.revealZone, {
        left: 0,
        right: revealInteriorPadding,
        top: revealCrossAxisPadding,
        bottom: revealCrossAxisPadding,
      })
    case 'right':
      return expandBounds(dockSession.revealZone, {
        left: revealInteriorPadding,
        right: 0,
        top: revealCrossAxisPadding,
        bottom: revealCrossAxisPadding,
      })
    case 'top':
      return expandBounds(dockSession.revealZone, {
        left: revealCrossAxisPadding,
        right: revealCrossAxisPadding,
        top: 0,
        bottom: revealInteriorPadding,
      })
    case 'bottom':
      return expandBounds(dockSession.revealZone, {
        left: revealCrossAxisPadding,
        right: revealCrossAxisPadding,
        top: revealInteriorPadding,
        bottom: 0,
      })
  }
}
