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
export type WidgetAnimationUpdateMode = 'position' | 'bounds'
export const widgetHiddenStripThickness = 8

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
const revealCrossAxisPadding = 18

export function getWidgetHideDelayMs(isWindowFocused: boolean): number {
  return isWindowFocused ? 180 : 220
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

export function getWidgetAnimationUpdateMode(
  startBounds: WindowBounds,
  targetBounds: WindowBounds,
): WidgetAnimationUpdateMode {
  return startBounds.width === targetBounds.width && startBounds.height === targetBounds.height ? 'position' : 'bounds'
}

export function getWidgetAutoHiddenBounds(bounds: WindowBounds, edge: WidgetDockEdge): WindowBounds {
  switch (edge) {
    case 'left':
      return {
        x: bounds.x,
        y: bounds.y,
        width: widgetHiddenStripThickness,
        height: bounds.height,
      }
    case 'right':
      return {
        x: bounds.x + bounds.width - widgetHiddenStripThickness,
        y: bounds.y,
        width: widgetHiddenStripThickness,
        height: bounds.height,
      }
    case 'top':
      return {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: widgetHiddenStripThickness,
      }
    case 'bottom':
      return {
        x: bounds.x,
        y: bounds.y + bounds.height - widgetHiddenStripThickness,
        width: bounds.width,
        height: widgetHiddenStripThickness,
      }
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
  const visiblePeekSize = getVisiblePeekSize(dockSession)

  switch (dockSession.edge) {
    case 'left':
      return expandBounds(
        {
          x: dockSession.visibleBounds.x,
          y: dockSession.visibleBounds.y,
          width: visiblePeekSize,
          height: dockSession.visibleBounds.height,
        },
        {
          left: 0,
          right: 0,
          top: revealCrossAxisPadding,
          bottom: revealCrossAxisPadding,
        },
      )
    case 'right':
      return expandBounds(
        {
          x: dockSession.visibleBounds.x + dockSession.visibleBounds.width - visiblePeekSize,
          y: dockSession.visibleBounds.y,
          width: visiblePeekSize,
          height: dockSession.visibleBounds.height,
        },
        {
          left: 0,
          right: 0,
          top: revealCrossAxisPadding,
          bottom: revealCrossAxisPadding,
        },
      )
    case 'top':
      return expandBounds(
        {
          x: dockSession.visibleBounds.x,
          y: dockSession.visibleBounds.y,
          width: dockSession.visibleBounds.width,
          height: visiblePeekSize,
        },
        {
          left: revealCrossAxisPadding,
          right: revealCrossAxisPadding,
          top: 0,
          bottom: 0,
        },
      )
    case 'bottom':
      return expandBounds(
        {
          x: dockSession.visibleBounds.x,
          y: dockSession.visibleBounds.y + dockSession.visibleBounds.height - visiblePeekSize,
          width: dockSession.visibleBounds.width,
          height: visiblePeekSize,
        },
        {
          left: revealCrossAxisPadding,
          right: revealCrossAxisPadding,
          top: 0,
          bottom: 0,
        },
      )
  }
}

function getVisiblePeekSize(dockSession: DockSessionLike): number {
  switch (dockSession.edge) {
    case 'left':
    case 'right':
      return Math.max(1, dockSession.hiddenBounds.width)
    case 'top':
    case 'bottom':
      return Math.max(1, dockSession.hiddenBounds.height)
  }
}
