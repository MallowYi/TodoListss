/// <reference types="vite-plugin-electron/electron-env" />
/// <reference types="vite/client" />

declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * The built directory structure
     *
     * ```tree
     * ├─┬─┬ dist
     * │ │ └── index.html
     * │ │
     * │ ├─┬ dist-electron
     * │ │ ├── main.js
     * │ │ └── preload.js
     * │
     * ```
     */
    APP_ROOT: string
    /** /dist/ or /public/ */
    VITE_PUBLIC: string
  }
}

interface Window {
  desktopApi: {
    loadState: () => Promise<import('../shared/contracts').PersistedState>
    saveState: (
      state: import('../shared/contracts').PersistedState,
    ) => Promise<import('../shared/contracts').PersistedState>
    setWidgetMode: (
      enabled: boolean,
    ) => Promise<import('../shared/contracts').WindowSnapshot>
    getWindowState: () => Promise<import('../shared/contracts').WindowSnapshot>
    minimize: () => Promise<void>
    showWidgetMenu: () => Promise<void>
    close: () => Promise<void>
    exportState: () => Promise<boolean>
    importState: () => Promise<import('../shared/contracts').PersistedState | null>
    toggleAutoStart: () => Promise<boolean>
    getAutoStart: () => Promise<boolean>
    onWindowState: (
      listener: (snapshot: import('../shared/contracts').WindowSnapshot) => void,
    ) => () => void
  }
}
