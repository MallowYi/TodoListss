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
  dueDate: string | null
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

export type AppTheme = 'dark' | 'light'

export interface TrashItem extends TodoItem {
  deletedAt: string
}

export interface PersistedState {
  todos: TodoItem[]
  trash: TrashItem[]
  selectedTodoId: string | null
  widgetMode: boolean
  dockEdge: DockEdge
  normalBounds: WindowBounds | null
  widgetBounds: WindowBounds | null
  theme: AppTheme
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
    trash: [],
    selectedTodoId: null,
    widgetMode: false,
    dockEdge: null,
    normalBounds: null,
    widgetBounds: null,
    theme: 'dark',
  }
}

export function normalizeTodo(raw: unknown): TodoItem {
  const now = new Date().toISOString()
  const candidate = raw && typeof raw === 'object' ? (raw as Partial<TodoItem>) : {}
  const isCompleted = Boolean(candidate.isCompleted)

  return {
    id: typeof candidate.id === 'string' ? candidate.id : crypto.randomUUID(),
    title: typeof candidate.title === 'string' ? candidate.title : 'Untitled task',
    notes: typeof candidate.notes === 'string' ? candidate.notes : '',
    isCompleted,
    createdAt: typeof candidate.createdAt === 'string' ? candidate.createdAt : now,
    updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : now,
    dueDate: typeof candidate.dueDate === 'string' ? candidate.dueDate : null,
    accent: normalizeTodoAccent(candidate.accent),
    columnId: normalizeTodoColumnId(candidate.columnId, isCompleted),
  }
}

function normalizeTrashItem(raw: unknown): TrashItem | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }

  const candidate = raw as Partial<TrashItem> & { deletedAt?: unknown }
  const base = normalizeTodo(raw)
  const deletedAt = typeof candidate.deletedAt === 'string' ? candidate.deletedAt : new Date().toISOString()

  return { ...base, deletedAt }
}

export function cleanTrash(trash: TrashItem[]): TrashItem[] {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
  return trash.filter((item) => new Date(item.deletedAt).getTime() > cutoff)
}

export function normalizePersistedState(raw: unknown): PersistedState {
  if (!raw || typeof raw !== 'object') {
    return createDefaultState()
  }

  const candidate = raw as Partial<PersistedState>
  const fallback = createDefaultState()
  const todos = Array.isArray(candidate.todos) ? candidate.todos.map(normalizeTodo) : fallback.todos
  const selectedTodoId =
    typeof candidate.selectedTodoId === 'string' && todos.some((todo) => todo.id === candidate.selectedTodoId)
      ? candidate.selectedTodoId
      : null
  const rawTrash = Array.isArray(candidate.trash) ? candidate.trash.map(normalizeTrashItem).filter(Boolean) as TrashItem[] : []
  const trash = cleanTrash(rawTrash)

  return {
    ...fallback,
    ...candidate,
    todos,
    trash,
    selectedTodoId,
  }
}
