import type { PersistedState, TodoItem, WindowSnapshot } from '../../shared/contracts'
import { createDefaultState, normalizeTodoAccent, normalizeTodoColumnId } from '../../shared/contracts'

type DesktopApi = Window['desktopApi']

export type BridgeMode = 'native' | 'fallback'

const storageKey = 'todolistss:fallback-state'
const bridgePollIntervalMs = 50
const bridgeWaitTimeoutMs = 1200
const windowStateListeners = new Set<(snapshot: WindowSnapshot) => void>()

const fallbackWindowState: WindowSnapshot = {
  widgetMode: false,
  dockEdge: null,
  autoHidden: false,
  alwaysOnTop: false,
}

function cloneDefaultState(): PersistedState {
  return createDefaultState()
}

function normalizeTodo(raw: unknown): TodoItem {
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
    accent: normalizeTodoAccent(candidate.accent),
    columnId: normalizeTodoColumnId(candidate.columnId, isCompleted),
  }
}

function normalizePersistedState(raw: unknown): PersistedState {
  if (!raw || typeof raw !== 'object') {
    return cloneDefaultState()
  }

  const candidate = raw as Partial<PersistedState>
  const todos = Array.isArray(candidate.todos) ? candidate.todos.map(normalizeTodo) : []
  const selectedTodoId =
    typeof candidate.selectedTodoId === 'string' && todos.some((todo) => todo.id === candidate.selectedTodoId)
      ? candidate.selectedTodoId
      : null

  return {
    ...cloneDefaultState(),
    ...candidate,
    todos,
    selectedTodoId,
  }
}

function notifyWindowState(snapshot: WindowSnapshot): void {
  for (const listener of windowStateListeners) {
    listener(snapshot)
  }
}

function readFallbackState(): PersistedState {
  try {
    const raw = window.localStorage.getItem(storageKey)

    if (!raw) {
      return cloneDefaultState()
    }

    return normalizePersistedState(JSON.parse(raw))
  } catch {
    return cloneDefaultState()
  }
}

function writeFallbackState(state: PersistedState): PersistedState {
  const normalizedState = normalizePersistedState(state)

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(normalizedState))
  } catch {
    // Ignore localStorage failures in fallback mode.
  }

  return normalizedState
}

const fallbackDesktopApi: DesktopApi = {
  async loadState() {
    return readFallbackState()
  },
  async saveState(state) {
    return writeFallbackState(state)
  },
  async setWidgetMode(enabled) {
    void enabled

    writeFallbackState({
      ...readFallbackState(),
      widgetMode: false,
      dockEdge: null,
    })

    const snapshot: WindowSnapshot = {
      ...fallbackWindowState,
      widgetMode: false,
      alwaysOnTop: false,
    }

    notifyWindowState(snapshot)
    return snapshot
  },
  async getWindowState() {
    return {
      ...fallbackWindowState,
      widgetMode: false,
      dockEdge: null,
      alwaysOnTop: false,
    }
  },
  async minimize() {
    return
  },
  async showWidgetMenu() {
    return
  },
  async close() {
    window.close()
  },
  onWindowState(listener) {
    windowStateListeners.add(listener)

    return () => {
      windowStateListeners.delete(listener)
    }
  },
}

function getNativeDesktopApi(): DesktopApi | null {
  if (typeof window === 'undefined' || typeof window.desktopApi !== 'object' || window.desktopApi === null) {
    return null
  }

  return window.desktopApi
}

function getActiveDesktopApi(): DesktopApi {
  return getNativeDesktopApi() ?? fallbackDesktopApi
}

export function getDesktopBridgeMode(): BridgeMode {
  return getNativeDesktopApi() ? 'native' : 'fallback'
}

export async function waitForDesktopBridge(timeoutMs = bridgeWaitTimeoutMs): Promise<BridgeMode> {
  const initialMode = getDesktopBridgeMode()

  if (initialMode === 'native' || typeof window === 'undefined') {
    return initialMode
  }

  return new Promise((resolve) => {
    let settled = false

    const finish = (mode: BridgeMode) => {
      if (settled) {
        return
      }

      settled = true
      window.clearTimeout(timeoutId)
      window.clearInterval(intervalId)
      resolve(mode)
    }

    const timeoutId = window.setTimeout(() => {
      finish('fallback')
    }, timeoutMs)

    const intervalId = window.setInterval(() => {
      if (getDesktopBridgeMode() === 'native') {
        finish('native')
      }
    }, bridgePollIntervalMs)
  })
}

export const desktopApi: DesktopApi = {
  async loadState() {
    return getActiveDesktopApi().loadState()
  },
  async saveState(state) {
    return getActiveDesktopApi().saveState(state)
  },
  async setWidgetMode(enabled) {
    return getActiveDesktopApi().setWidgetMode(enabled)
  },
  async getWindowState() {
    return getActiveDesktopApi().getWindowState()
  },
  async minimize() {
    return getActiveDesktopApi().minimize()
  },
  async showWidgetMenu() {
    return getActiveDesktopApi().showWidgetMenu()
  },
  async close() {
    return getActiveDesktopApi().close()
  },
  onWindowState(listener) {
    return getActiveDesktopApi().onWindowState(listener)
  },
}
