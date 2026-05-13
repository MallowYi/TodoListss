import type { PersistedState, WindowSnapshot } from '../../shared/contracts'
import { createDefaultState, normalizePersistedState } from '../../shared/contracts'

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


function notifyWindowState(snapshot: WindowSnapshot): void {
  for (const listener of windowStateListeners) {
    listener(snapshot)
  }
}

function readFallbackState(): PersistedState {
  try {
    const raw = window.localStorage.getItem(storageKey)

    if (!raw) {
      return createDefaultState()
    }

    return normalizePersistedState(JSON.parse(raw))
  } catch {
    return createDefaultState()
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
  async exportState() {
    const state = readFallbackState()
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'todolistss-backup.json'
    link.click()
    URL.revokeObjectURL(url)
    return true
  },
  async importState() {
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json'
      input.onchange = async () => {
        const file = input.files?.[0]
        if (!file) {
          resolve(null)
          return
        }

        try {
          const text = await file.text()
          const parsed = JSON.parse(text)
          const normalized = normalizePersistedState(parsed)
          writeFallbackState(normalized)
          resolve(normalized)
        } catch {
          resolve(null)
        }
      }
      input.click()
    })
  },
  async toggleAutoStart() {
    return false
  },
  async getAutoStart() {
    return false
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
  async exportState() {
    return getActiveDesktopApi().exportState()
  },
  async importState() {
    return getActiveDesktopApi().importState()
  },
  async toggleAutoStart() {
    return getActiveDesktopApi().toggleAutoStart()
  },
  async getAutoStart() {
    return getActiveDesktopApi().getAutoStart()
  },
  onWindowState(listener) {
    return getActiveDesktopApi().onWindowState(listener)
  },
}
