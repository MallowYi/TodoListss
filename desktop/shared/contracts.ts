export type DockEdge = 'left' | 'right' | 'top' | 'bottom' | null

export const todoAccents = ['violet', 'cyan', 'rose', 'amber', 'emerald'] as const
export type TodoAccent = (typeof todoAccents)[number]

export const todoColumnIds = ['backlog', 'today', 'inProgress', 'waiting', 'done'] as const
export type TodoColumnId = (typeof todoColumnIds)[number]

export const defaultTodoColumnId: TodoColumnId = 'backlog'
export const completedTodoColumnId: TodoColumnId = 'done'

export function normalizeTodoAccent(value: unknown): TodoAccent {
  return typeof value === 'string' && todoAccents.includes(value as TodoAccent) ? (value as TodoAccent) : 'violet'
}

export function normalizeTodoColumnId(value: unknown, isCompleted: boolean): TodoColumnId {
  if (isCompleted) {
    return completedTodoColumnId
  }

  return typeof value === 'string' && todoColumnIds.includes(value as TodoColumnId) && value !== completedTodoColumnId
    ? (value as TodoColumnId)
    : defaultTodoColumnId
}

export interface TodoItem {
  id: string
  title: string
  notes: string
  isCompleted: boolean
  createdAt: string
  updatedAt: string
  accent: TodoAccent
  columnId: TodoColumnId
}

export interface WindowBounds {
  x: number
  y: number
  width: number
  height: number
}

export const legacyBoardWidgetWindowSize = {
  width: 1360,
  height: 760,
} as const

export function isLegacyBoardWidgetBounds(bounds: Pick<WindowBounds, 'width' | 'height'> | null | undefined): boolean {
  return (
    bounds?.width === legacyBoardWidgetWindowSize.width && bounds?.height === legacyBoardWidgetWindowSize.height
  )
}

export interface PersistedState {
  todos: TodoItem[]
  selectedTodoId: string | null
  widgetMode: boolean
  dockEdge: DockEdge
  normalBounds: WindowBounds | null
  widgetBounds: WindowBounds | null
}

export interface WindowSnapshot {
  widgetMode: boolean
  dockEdge: DockEdge
  autoHidden: boolean
  alwaysOnTop: boolean
}

export const normalWindowSize = {
  width: 1180,
  height: 760,
} as const

export const widgetWindowSize = {
  width: 900,
  height: 560,
} as const

export function createDefaultState(): PersistedState {
  return {
    todos: [],
    selectedTodoId: null,
    widgetMode: false,
    dockEdge: null,
    normalBounds: null,
    widgetBounds: null,
  }
}
