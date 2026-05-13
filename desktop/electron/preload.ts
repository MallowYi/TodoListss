import { contextBridge, ipcRenderer } from 'electron'
import type { PersistedState, WindowSnapshot } from '../shared/contracts'

contextBridge.exposeInMainWorld('desktopApi', {
  loadState: () => ipcRenderer.invoke('app:load-state') as Promise<PersistedState>,
  saveState: (state: PersistedState) => ipcRenderer.invoke('app:save-state', state) as Promise<PersistedState>,
  setWidgetMode: (enabled: boolean) => ipcRenderer.invoke('window:set-widget-mode', enabled) as Promise<WindowSnapshot>,
  getWindowState: () => ipcRenderer.invoke('window:get-state') as Promise<WindowSnapshot>,
  minimize: () => ipcRenderer.invoke('window:minimize') as Promise<void>,
  showWidgetMenu: () => ipcRenderer.invoke('window:show-widget-menu') as Promise<void>,
  close: () => ipcRenderer.invoke('window:close') as Promise<void>,
  exportState: () => ipcRenderer.invoke('app:export-state') as Promise<boolean>,
  importState: () => ipcRenderer.invoke('app:import-state') as Promise<PersistedState | null>,
  toggleAutoStart: () => ipcRenderer.invoke('app:toggle-auto-start') as Promise<boolean>,
  getAutoStart: () => ipcRenderer.invoke('app:get-auto-start') as Promise<boolean>,
  onWindowState: (listener: (snapshot: WindowSnapshot) => void) => {
    const wrappedListener = (_event: Electron.IpcRendererEvent, snapshot: WindowSnapshot) => listener(snapshot)
    ipcRenderer.on('window:state', wrappedListener)

    return () => {
      ipcRenderer.removeListener('window:state', wrappedListener)
    }
  },
})
