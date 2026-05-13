import { app, BrowserWindow, dialog, globalShortcut, ipcMain, Menu, nativeImage, nativeTheme, screen, Tray } from 'electron'
import { promises as fs } from 'node:fs'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  isLegacyBoardWidgetBounds,
  normalizePersistedState,
  createDefaultState,
  normalWindowSize,
  widgetWindowSize,
  type DockEdge,
  type PersistedState,
  type WindowBounds,
  type WindowSnapshot,
} from '../shared/contracts'
import {
  getDockCursorAction,
  getWidgetAutoHiddenBounds,
  widgetBlurHideDelayMs,
  widgetCursorMonitorIntervalMs,
  type DockSessionLike,
} from './widgetMotion'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

const appIconPngDataUrl =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAk0lEQVR4nNXUsQ3AIAxEUXbJ/tNkD1ZI2hTgGN+dDZboIv0nFNzaaXPd/bFOSVSKicZhBBqGIOz4EkIVdyNKAeq4iciKTxFbA74jAfx9PBoqIgJgQCgABBL6AZkQ6AUwboXyBBEEdQeUA2YYF0C1CS3AWas4BZCJGMazEGZ8C4AS4YqrEEtxJiQcZiAo8VWMJKqcF1nVVCBMaJ9qAAAAAElFTkSuQmCC'
const dockThreshold = 56
const widgetMinWidth = 640
const widgetMinHeight = 400
const widgetMaxWidth = 1320
const widgetMaxHeight = 900

type Rectangle = Electron.Rectangle
type DockSession = DockSessionLike

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let persistedState: PersistedState = createDefaultState()
let dockSession: DockSession | null = null
let autoHidden = false
let cursorMonitorTimer: NodeJS.Timeout | null = null
let saveTimer: NodeJS.Timeout | null = null
let animationTimer: NodeJS.Timeout | null = null
let hideDeadline: number | null = null
let isRecreatingWindow = false
let isAnimatingWindow = false
let lastEmittedWindowState: WindowSnapshot | null = null
let managedBoundsTarget: Rectangle | null = null
let managedBoundsIgnoreEventsRemaining = 0

function getStateFilePath(): string {
  return path.join(app.getPath('userData'), 'state.json')
}

function createAppIcon(): Electron.NativeImage {
  return nativeImage.createFromDataURL(appIconPngDataUrl)
}

function toWindowBounds(bounds: Rectangle): WindowBounds {
  return {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
  }
}

function fromWindowBounds(bounds: WindowBounds | null): Rectangle | null {
  if (!bounds) {
    return null
  }

  return {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
  }
}

function sanitizeState(raw: unknown): PersistedState {
  const base = normalizePersistedState(raw)
  const widgetBounds = isWindowBounds(base.widgetBounds) ? base.widgetBounds : null
  const resetLegacyWidgetState = isLegacyBoardWidgetBounds(widgetBounds)

  return {
    ...base,
    dockEdge: resetLegacyWidgetState
      ? null
      : base.dockEdge === 'left' || base.dockEdge === 'right' || base.dockEdge === 'top' || base.dockEdge === 'bottom'
        ? base.dockEdge
        : null,
    normalBounds: isWindowBounds(base.normalBounds) ? base.normalBounds : null,
    widgetBounds: resetLegacyWidgetState ? null : widgetBounds,
  }
}

function isWindowBounds(value: unknown): value is WindowBounds {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<WindowBounds>

  return (
    typeof candidate.x === 'number' &&
    typeof candidate.y === 'number' &&
    typeof candidate.width === 'number' &&
    typeof candidate.height === 'number'
  )
}

async function loadState(): Promise<PersistedState> {
  const filePath = getStateFilePath()

  if (!existsSync(filePath)) {
    return createDefaultState()
  }

  try {
    const raw = await fs.readFile(filePath, 'utf8')
    return sanitizeState(JSON.parse(raw))
  } catch {
    const backupPath = `${filePath}.${Date.now()}.bak`

    await fs.rename(filePath, backupPath).catch(() => undefined)
    return createDefaultState()
  }
}

async function writeState(): Promise<void> {
  const filePath = getStateFilePath()
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, JSON.stringify(persistedState, null, 2), 'utf8')
}

function scheduleStateWrite(): void {
  if (saveTimer) {
    clearTimeout(saveTimer)
  }

  saveTimer = setTimeout(() => {
    writeState().catch((error: unknown) => {
      console.error('Failed to persist app state', error)
    })
  }, 180)
}

function flushStateWrite(): Promise<void> {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }

  return writeState()
}

function createWindowSnapshot(): WindowSnapshot {
  return {
    widgetMode: persistedState.widgetMode,
    dockEdge: persistedState.dockEdge,
    autoHidden,
    alwaysOnTop: persistedState.widgetMode,
  }
}

function sameWindowSnapshot(left: WindowSnapshot | null, right: WindowSnapshot): boolean {
  return (
    left !== null &&
    left.widgetMode === right.widgetMode &&
    left.dockEdge === right.dockEdge &&
    left.autoHidden === right.autoHidden &&
    left.alwaysOnTop === right.alwaysOnTop
  )
}

function emitWindowState(force = false): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return
  }

  const snapshot = createWindowSnapshot()

  if (!force && sameWindowSnapshot(lastEmittedWindowState, snapshot)) {
    return
  }

  lastEmittedWindowState = snapshot
  mainWindow.webContents.send('window:state', snapshot)
}

function getDefaultBounds(width: number, height: number): Rectangle {
  const workArea = screen.getPrimaryDisplay().workArea

  return {
    width,
    height,
    x: Math.round(workArea.x + (workArea.width - width) / 2),
    y: Math.round(workArea.y + (workArea.height - height) / 2),
  }
}

function getDefaultWidgetBounds(width: number, height: number): Rectangle {
  const workArea = screen.getPrimaryDisplay().workArea
  const horizontalInset = Math.max(dockThreshold + 28, Math.round(workArea.width * 0.05))
  const topInset = Math.max(44, Math.round(workArea.height * 0.08))

  return {
    width,
    height,
    x: clamp(workArea.x + workArea.width - width - horizontalInset, workArea.x, workArea.x + workArea.width - width),
    y: clamp(workArea.y + topInset, workArea.y, workArea.y + workArea.height - height),
  }
}

function getWidgetBoundsSize(bounds: Rectangle | WindowBounds | null = persistedState.widgetBounds): {
  width: number
  height: number
} {
  return {
    width: clamp(bounds?.width ?? widgetWindowSize.width, widgetMinWidth, widgetMaxWidth),
    height: clamp(bounds?.height ?? widgetWindowSize.height, widgetMinHeight, widgetMaxHeight),
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function normalizeBounds(bounds: Rectangle, width: number, height: number, workArea: Rectangle): Rectangle {
  return {
    width,
    height,
    x: clamp(bounds.x, workArea.x, workArea.x + workArea.width - width),
    y: clamp(bounds.y, workArea.y, workArea.y + workArea.height - height),
  }
}

function sameBounds(left: Rectangle, right: Rectangle): boolean {
  return left.x === right.x && left.y === right.y && left.width === right.width && left.height === right.height
}

function setManagedWindowBounds(bounds: Rectangle): void {
  if (!mainWindow) {
    return
  }

  managedBoundsTarget = { ...bounds }
  managedBoundsIgnoreEventsRemaining = 4
  mainWindow.setBounds(bounds, false)
}

function shouldIgnoreManagedWindowEvent(): boolean {
  if (!mainWindow) {
    return false
  }

  if (isAnimatingWindow) {
    return true
  }

  if (!managedBoundsTarget) {
    return false
  }

  const currentBounds = mainWindow.getBounds()

  if (!sameBounds(currentBounds, managedBoundsTarget)) {
    managedBoundsTarget = null
    managedBoundsIgnoreEventsRemaining = 0
    return false
  }

  managedBoundsIgnoreEventsRemaining -= 1

  if (managedBoundsIgnoreEventsRemaining <= 0) {
    managedBoundsTarget = null
    managedBoundsIgnoreEventsRemaining = 0
  }

  return true
}

function stopAnimation(): void {
  if (animationTimer) {
    clearTimeout(animationTimer)
    animationTimer = null
  }

  isAnimatingWindow = false
}

function buildDockSession(edge: Exclude<DockEdge, null>, bounds: Rectangle, workArea: Rectangle): DockSession {
  const visibleBounds = (() => {
    switch (edge) {
      case 'left':
        return {
          x: workArea.x,
          y: clamp(bounds.y, workArea.y, workArea.y + workArea.height - bounds.height),
          width: bounds.width,
          height: bounds.height,
        }
      case 'right':
        return {
          x: workArea.x + workArea.width - bounds.width,
          y: clamp(bounds.y, workArea.y, workArea.y + workArea.height - bounds.height),
          width: bounds.width,
          height: bounds.height,
        }
      case 'bottom':
        return {
          x: clamp(bounds.x, workArea.x, workArea.x + workArea.width - bounds.width),
          y: workArea.y + workArea.height - bounds.height,
          width: bounds.width,
          height: bounds.height,
        }
      default:
        return {
          x: clamp(bounds.x, workArea.x, workArea.x + workArea.width - bounds.width),
          y: workArea.y,
          width: bounds.width,
          height: bounds.height,
        }
    }
  })()
  const hiddenBounds = getWidgetAutoHiddenBounds(visibleBounds, edge)

  switch (edge) {
    case 'left':
      return {
        edge,
        visibleBounds,
        hiddenBounds,
        revealZone: {
          ...hiddenBounds,
        },
      }
    case 'right':
      return {
        edge,
        visibleBounds,
        hiddenBounds,
        revealZone: {
          ...hiddenBounds,
        },
      }
    case 'bottom':
      return {
        edge,
        visibleBounds,
        hiddenBounds,
        revealZone: {
          ...hiddenBounds,
        },
      }
    default:
      return {
        edge,
        visibleBounds,
        hiddenBounds,
        revealZone: {
          ...hiddenBounds,
        },
      }
  }
}

function resolveDockEdge(bounds: Rectangle, workArea: Rectangle): DockEdge {
  const distances = [
    { edge: 'left' as const, distance: Math.abs(bounds.x - workArea.x) },
    {
      edge: 'right' as const,
      distance: Math.abs(bounds.x + bounds.width - (workArea.x + workArea.width)),
    },
    { edge: 'top' as const, distance: Math.abs(bounds.y - workArea.y) },
    {
      edge: 'bottom' as const,
      distance: Math.abs(bounds.y + bounds.height - (workArea.y + workArea.height)),
    },
  ].sort((left, right) => left.distance - right.distance)

  return distances[0].distance <= dockThreshold ? distances[0].edge : null
}

function clearDockState(revealWindow: boolean): void {
  if (revealWindow && autoHidden && mainWindow && dockSession) {
    setManagedWindowBounds(dockSession.visibleBounds)
  }

  dockSession = null
  autoHidden = false
  hideDeadline = null
  persistedState.dockEdge = null
  emitWindowState()
}

function persistCurrentBounds(): void {
  if (!mainWindow || autoHidden) {
    return
  }

  const bounds = toWindowBounds(mainWindow.getBounds())

  if (persistedState.widgetMode) {
    persistedState.widgetBounds = bounds
  } else {
    persistedState.normalBounds = bounds
  }

  scheduleStateWrite()
}

function syncWidgetWindowBounds(preferredEdge: Exclude<DockEdge, null> | null = persistedState.dockEdge): void {
  if (!mainWindow || !persistedState.widgetMode) {
    return
  }

  const currentBounds = autoHidden && dockSession ? dockSession.visibleBounds : mainWindow.getBounds()
  const widgetSize = getWidgetBoundsSize(currentBounds)
  const workArea = screen.getDisplayMatching(currentBounds).workArea
  const normalizedBounds = normalizeBounds(currentBounds, widgetSize.width, widgetSize.height, workArea)
  const edge = preferredEdge ?? resolveDockEdge(normalizedBounds, workArea)

  mainWindow.setMinimumSize(widgetMinWidth, widgetMinHeight)

  if (!edge) {
    dockSession = null
    autoHidden = false
    hideDeadline = null
    persistedState.dockEdge = null
    persistedState.widgetBounds = toWindowBounds(normalizedBounds)

    if (!sameBounds(mainWindow.getBounds(), normalizedBounds)) {
      setManagedWindowBounds(normalizedBounds)
    }

    emitWindowState()
    return
  }

  const nextDockSession = buildDockSession(edge, normalizedBounds, workArea)

  dockSession = nextDockSession
  persistedState.dockEdge = edge
  persistedState.widgetBounds = toWindowBounds(nextDockSession.visibleBounds)
  setManagedWindowBounds(autoHidden ? nextDockSession.hiddenBounds : nextDockSession.visibleBounds)
  emitWindowState()
}

function captureCurrentWindowBounds(windowToCapture: BrowserWindow | null = mainWindow): void {
  if (!windowToCapture || windowToCapture.isDestroyed()) {
    return
  }

  const bounds = autoHidden && dockSession ? dockSession.visibleBounds : windowToCapture.getBounds()

  if (persistedState.widgetMode) {
    persistedState.widgetBounds = toWindowBounds(bounds)
  } else {
    persistedState.normalBounds = toWindowBounds(bounds)
  }
}

function revealDockedWindow(): void {
  if (!mainWindow || !dockSession || !autoHidden) {
    return
  }

  stopAnimation()
  autoHidden = false
  hideDeadline = null
  setManagedWindowBounds(dockSession.visibleBounds)
  emitWindowState()
}

function hideDockedWindow(): void {
  if (!mainWindow || !dockSession || autoHidden) {
    return
  }

  stopAnimation()
  autoHidden = true
  hideDeadline = null
  setManagedWindowBounds(dockSession.hiddenBounds)
  emitWindowState()
}

function handleCursorMonitor(): void {
  if (!mainWindow || !persistedState.widgetMode || !dockSession) {
    return
  }

  const action = getDockCursorAction({
    autoHidden,
    cursor: screen.getCursorScreenPoint(),
    dockSession,
    hideDeadline,
    isAnimatingWindow,
    isWindowFocused: mainWindow.isFocused(),
    nowMs: Date.now(),
    windowBounds: mainWindow.getBounds(),
  })

  hideDeadline = action.hideDeadline

  switch (action.type) {
    case 'reveal':
      revealDockedWindow()
      return
    case 'hide':
      hideDockedWindow()
      return
    default:
      return
  }
}

function startCursorMonitor(): void {
  if (cursorMonitorTimer) {
    return
  }

  cursorMonitorTimer = setInterval(handleCursorMonitor, widgetCursorMonitorIntervalMs)
}

function stopCursorMonitor(): void {
  if (cursorMonitorTimer) {
    clearInterval(cursorMonitorTimer)
    cursorMonitorTimer = null
  }
}

function evaluateDocking(): void {
  if (!mainWindow || !persistedState.widgetMode || autoHidden || isAnimatingWindow) {
    return
  }

  const currentBounds = mainWindow.getBounds()
  const workArea = screen.getDisplayMatching(currentBounds).workArea
  const widgetSize = getWidgetBoundsSize(currentBounds)
  const normalizedBounds = normalizeBounds(currentBounds, widgetSize.width, widgetSize.height, workArea)
  const edge = resolveDockEdge(normalizedBounds, workArea)

  if (!edge) {
    if (!sameBounds(currentBounds, normalizedBounds)) {
      setManagedWindowBounds(normalizedBounds)
    }

    clearDockState(false)
    persistedState.widgetBounds = toWindowBounds(normalizedBounds)
    scheduleStateWrite()
    return
  }

  const nextDockSession = buildDockSession(edge, normalizedBounds, workArea)
  dockSession = nextDockSession
  autoHidden = false
  hideDeadline = null
  persistedState.dockEdge = edge
  persistedState.widgetBounds = toWindowBounds(nextDockSession.visibleBounds)

  if (!sameBounds(currentBounds, nextDockSession.visibleBounds)) {
    setManagedWindowBounds(nextDockSession.visibleBounds)
  }

  emitWindowState()
  scheduleStateWrite()
}

function applyWidgetMode(): void {
  if (!mainWindow) {
    return
  }

  const savedBounds = fromWindowBounds(persistedState.widgetBounds)
  const widgetSize = getWidgetBoundsSize(savedBounds)
  const currentBounds = savedBounds
    ? {
        ...savedBounds,
        width: widgetSize.width,
        height: widgetSize.height,
      }
    : getDefaultWidgetBounds(widgetSize.width, widgetSize.height)
  const workArea = screen.getDisplayMatching(currentBounds).workArea
  const nextBounds = normalizeBounds(currentBounds, widgetSize.width, widgetSize.height, workArea)
  const edge = persistedState.dockEdge ?? resolveDockEdge(nextBounds, workArea)

  persistedState.widgetMode = true
  autoHidden = false
  hideDeadline = null
  mainWindow.setMinimumSize(widgetMinWidth, widgetMinHeight)
  mainWindow.setResizable(true)
  mainWindow.setMaximizable(false)
  mainWindow.setFullScreenable(false)
  mainWindow.setAlwaysOnTop(true, 'screen-saver')

  if (!edge) {
    persistedState.dockEdge = null
    persistedState.widgetBounds = toWindowBounds(nextBounds)
    dockSession = null
    setManagedWindowBounds(nextBounds)
  } else {
    const nextDockSession = buildDockSession(edge, nextBounds, workArea)

    persistedState.dockEdge = nextDockSession.edge
    persistedState.widgetBounds = toWindowBounds(nextDockSession.visibleBounds)
    dockSession = nextDockSession
    setManagedWindowBounds(nextDockSession.visibleBounds)
  }

  startCursorMonitor()
  emitWindowState()
  scheduleStateWrite()
}

function applyNormalMode(): void {
  if (!mainWindow) {
    return
  }

  clearDockState(true)
  stopCursorMonitor()

  const currentBounds = fromWindowBounds(persistedState.normalBounds) ?? getDefaultBounds(normalWindowSize.width, normalWindowSize.height)
  const workArea = screen.getDisplayMatching(currentBounds).workArea
  const nextBounds = normalizeBounds(currentBounds, normalWindowSize.width, normalWindowSize.height, workArea)

  persistedState.widgetMode = false
  persistedState.normalBounds = toWindowBounds(nextBounds)
  mainWindow.setMinimumSize(820, 560)
  mainWindow.setAlwaysOnTop(false)
  mainWindow.setResizable(true)
  mainWindow.setMaximizable(true)
  mainWindow.setFullScreenable(true)
  setManagedWindowBounds(nextBounds)

  emitWindowState()
  scheduleStateWrite()
}

async function recreateWindowForMode(enabled: boolean): Promise<void> {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return
  }

  if (persistedState.widgetMode === enabled) {
    if (enabled) {
      applyWidgetMode()
    } else {
      applyNormalMode()
    }

    return
  }

  isRecreatingWindow = true

  const oldWindow = mainWindow
  captureCurrentWindowBounds(oldWindow)
  stopAnimation()
  stopCursorMonitor()

  autoHidden = false
  dockSession = null
  hideDeadline = null
  persistedState.widgetMode = enabled

  if (!enabled) {
    persistedState.dockEdge = null
  }

  await flushStateWrite().catch(() => undefined)

  createMainWindow()

  const nextWindow = mainWindow

  if (!nextWindow || nextWindow === oldWindow) {
    isRecreatingWindow = false
    return
  }

  await new Promise<void>((resolve) => {
    nextWindow.once('ready-to-show', () => {
      if (!oldWindow.isDestroyed()) {
        oldWindow.destroy()
      }

      isRecreatingWindow = false
      resolve()
    })
  })

  if (!oldWindow.isDestroyed()) {
    oldWindow.hide()
  }
}

function registerIpcHandlers(): void {
  ipcMain.handle('app:load-state', () => persistedState)

  ipcMain.handle('app:save-state', async (_event, nextState: PersistedState) => {
    persistedState = {
      ...persistedState,
      todos: Array.isArray(nextState.todos) ? nextState.todos : persistedState.todos,
      selectedTodoId:
        typeof nextState.selectedTodoId === 'string' || nextState.selectedTodoId === null
          ? nextState.selectedTodoId
          : persistedState.selectedTodoId,
    }

    if (persistedState.widgetMode) {
      syncWidgetWindowBounds()
    }

    scheduleStateWrite()
    return persistedState
  })

  ipcMain.handle('window:set-widget-mode', async (_event, enabled: boolean) => {
    if (enabled === persistedState.widgetMode) {
      return createWindowSnapshot()
    }

    await recreateWindowForMode(enabled)

    return createWindowSnapshot()
  })

  ipcMain.handle('window:get-state', () => {
    return createWindowSnapshot()
  })

  ipcMain.handle('window:minimize', () => {
    mainWindow?.minimize()
  })

  ipcMain.handle('window:show-widget-menu', () => {
    if (!mainWindow) {
      return
    }

    const menu = Menu.buildFromTemplate([
      {
        label: '切回桌面模式',
        click: () => {
          void recreateWindowForMode(false)
        },
      },
      {
        label: '最小化',
        click: () => {
          mainWindow?.minimize()
        },
      },
      {
        type: 'separator',
      },
      {
        label: '关闭',
        click: () => {
          mainWindow?.close()
        },
      },
    ])

    menu.popup({ window: mainWindow })
  })

  ipcMain.handle('window:close', async () => {
    await flushStateWrite().catch(() => undefined)
    mainWindow?.close()
  })

  ipcMain.handle('app:export-state', async () => {
    if (!mainWindow) {
      return false
    }

    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: '导出数据',
      defaultPath: 'todolistss-backup.json',
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })

    if (canceled || !filePath) {
      return false
    }

    await fs.writeFile(filePath, JSON.stringify(persistedState, null, 2), 'utf8')
    return true
  })

  ipcMain.handle('app:import-state', async () => {
    if (!mainWindow) {
      return null
    }

    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: '导入数据',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile'],
    })

    if (canceled || filePaths.length === 0) {
      return null
    }

    try {
      const raw = await fs.readFile(filePaths[0], 'utf8')
      const imported = sanitizeState(JSON.parse(raw))
      persistedState = imported
      await flushStateWrite()
      return imported
    } catch {
      return null
    }
  })

  ipcMain.handle('app:toggle-auto-start', () => {
    const current = app.getLoginItemSettings()
    const next = !current.openAtLogin
    app.setLoginItemSettings({ openAtLogin: next })
    return next
  })

  ipcMain.handle('app:get-auto-start', () => {
    return app.getLoginItemSettings().openAtLogin
  })
}

function createMainWindow(): void {
  const widgetSize = getWidgetBoundsSize(persistedState.widgetBounds)
  const initialRect = persistedState.widgetMode
    ? normalizeBounds(
        fromWindowBounds(persistedState.widgetBounds) ?? getDefaultWidgetBounds(widgetSize.width, widgetSize.height),
        widgetSize.width,
        widgetSize.height,
        screen.getPrimaryDisplay().workArea,
      )
    : normalizeBounds(
        fromWindowBounds(persistedState.normalBounds) ?? getDefaultBounds(normalWindowSize.width, normalWindowSize.height),
        normalWindowSize.width,
        normalWindowSize.height,
        screen.getPrimaryDisplay().workArea,
      )

  mainWindow = new BrowserWindow({
    x: initialRect.x,
    y: initialRect.y,
    width: initialRect.width,
    height: initialRect.height,
    title: 'TodoListss',
    minWidth: persistedState.widgetMode ? widgetMinWidth : 820,
    minHeight: persistedState.widgetMode ? widgetMinHeight : 560,
    frame: !persistedState.widgetMode,
    show: false,
    backgroundColor: '#07111f',
    hasShadow: true,
    titleBarStyle: persistedState.widgetMode && process.platform === 'darwin' ? 'hidden' : undefined,
    resizable: true,
    maximizable: !persistedState.widgetMode,
    fullscreenable: !persistedState.widgetMode,
    alwaysOnTop: persistedState.widgetMode,
    skipTaskbar: persistedState.widgetMode,
    icon: createAppIcon(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false,
    },
  })
  lastEmittedWindowState = null
  isAnimatingWindow = false
  managedBoundsTarget = null
  managedBoundsIgnoreEventsRemaining = 0

  mainWindow.setMenuBarVisibility(false)

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error('Renderer failed to load', { errorCode, errorDescription, validatedURL })
  })

  mainWindow.webContents.on('preload-error', (_event, preloadPath, error) => {
    console.error('Preload script failed to load', { preloadPath, error })
  })

  mainWindow.webContents.on('did-finish-load', () => {
    emitWindowState(true)
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()

    if (persistedState.widgetMode) {
      applyWidgetMode()
    } else {
      applyNormalMode()
    }
  })

  mainWindow.on('move', () => {
    if (!mainWindow || mainWindow.isMinimized()) {
      return
    }

    if (shouldIgnoreManagedWindowEvent()) {
      return
    }

    if (persistedState.widgetMode) {
      evaluateDocking()
    } else {
      persistCurrentBounds()
    }
  })

  mainWindow.on('resize', () => {
    if (shouldIgnoreManagedWindowEvent()) {
      return
    }

    if (persistedState.widgetMode) {
      evaluateDocking()
    } else {
      persistCurrentBounds()
    }
  })

  mainWindow.on('blur', () => {
    if (persistedState.widgetMode && dockSession && !autoHidden) {
      hideDeadline = Date.now() + widgetBlurHideDelayMs
    }
  })

  mainWindow.on('focus', () => {
    if (persistedState.widgetMode && dockSession) {
      revealDockedWindow()
    }
  })

  mainWindow.on('close', (event) => {
    if (tray && !isRecreatingWindow) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

app.on('window-all-closed', () => {
  stopAnimation()
  stopCursorMonitor()

  if (isRecreatingWindow) {
    return
  }

  if (process.platform !== 'darwin' && !tray) {
    app.quit()
    mainWindow = null
  }
})

app.on('before-quit', () => {
  stopAnimation()
  stopCursorMonitor()
  globalShortcut.unregisterAll()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow()
  }
})

app.whenReady().then(async () => {
  nativeTheme.themeSource = 'dark'
  persistedState = await loadState()
  registerIpcHandlers()

  tray = new Tray(createAppIcon())
  tray.setToolTip('TodoListss')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: '显示主窗口',
        click: () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.show()
            mainWindow.focus()
          } else {
            createMainWindow()
          }
        },
      },
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          tray?.destroy()
          tray = null
          app.quit()
        },
      },
    ]),
  )
  tray.on('click', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show()
      mainWindow.focus()
    } else {
      createMainWindow()
    }
  })

  globalShortcut.register('Ctrl+Shift+T', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isVisible()) {
        mainWindow.hide()
      } else {
        mainWindow.show()
        mainWindow.focus()
      }
    } else {
      createMainWindow()
    }
  })

  createMainWindow()
})
