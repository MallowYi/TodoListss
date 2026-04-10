import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  CheckCircle2,
  ChevronRight,
  GripHorizontal,
  LayoutGrid,
  ListTodo,
  Pin,
  Plus,
  Sparkles,
  StickyNote,
  Trash2,
} from 'lucide-react'
import './App.css'
import type { PersistedState, TodoAccent, TodoColumnId, TodoItem, WindowSnapshot } from '../shared/contracts'
import {
  completedTodoColumnId,
  createDefaultState,
  defaultTodoColumnId,
  normalizeTodoColumnId,
  todoAccents,
} from '../shared/contracts'
import { desktopApi, getDesktopBridgeMode, type BridgeMode, waitForDesktopBridge } from './lib/desktopApi'

type FilterMode = 'all' | 'open' | 'done'

const accentClassMap: Record<TodoAccent, string> = {
  violet: 'todo-card--violet',
  cyan: 'todo-card--cyan',
  rose: 'todo-card--rose',
  amber: 'todo-card--amber',
  emerald: 'todo-card--emerald',
}

const accentSequence: TodoAccent[] = [...todoAccents]
const widgetRevealTransitionMs = 264

const widgetColumnLabelMap: Record<TodoColumnId, string> = {
  backlog: '收集箱',
  today: '今天',
  inProgress: '进行中',
  waiting: '待跟进',
  done: '已完成',
}

const widgetColumnDefinitions: ReadonlyArray<{ id: TodoColumnId; title: string; subtitle: string }> = [
  {
    id: 'backlog',
    title: '收集箱',
    subtitle: '新的想法和刚进来的卡片',
  },
  {
    id: 'today',
    title: '今天',
    subtitle: '这会儿最值得推进的事',
  },
  {
    id: 'inProgress',
    title: '进行中',
    subtitle: '已经开始，继续往前推',
  },
  {
    id: 'waiting',
    title: '待跟进',
    subtitle: '等反馈、等确认或稍后处理',
  },
  {
    id: 'done',
    title: '已完成',
    subtitle: '今天已经落地的内容',
  },
]

const emptyWindowState: WindowSnapshot = {
  widgetMode: false,
  dockEdge: null,
  autoHidden: false,
  alwaysOnTop: false,
}

function sameWindowSnapshot(left: WindowSnapshot, right: WindowSnapshot): boolean {
  return (
    left.widgetMode === right.widgetMode &&
    left.dockEdge === right.dockEdge &&
    left.autoHidden === right.autoHidden &&
    left.alwaysOnTop === right.alwaysOnTop
  )
}

function isElectronUserAgent(): boolean {
  return typeof navigator !== 'undefined' && /\bElectron\/\d+/i.test(navigator.userAgent)
}

function formatTimestamp(isoValue: string): string {
  const value = new Date(isoValue)

  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value)
}

function createTodo(title: string, notes: string, accent: TodoAccent): TodoItem {
  const now = new Date().toISOString()

  return {
    id: crypto.randomUUID(),
    title: title.trim(),
    notes: notes.trim(),
    isCompleted: false,
    createdAt: now,
    updatedAt: now,
    accent,
    columnId: defaultTodoColumnId,
  }
}

function getBoardInsertionIndex(todos: TodoItem[], targetColumnId: TodoColumnId, targetTodoId: string | null): number {
  if (targetTodoId) {
    const targetIndex = todos.findIndex((todo) => todo.id === targetTodoId)

    if (targetIndex >= 0) {
      return targetIndex
    }
  }

  let lastIndexInColumn = -1

  for (let todoIndex = todos.length - 1; todoIndex >= 0; todoIndex -= 1) {
    if (todos[todoIndex].columnId === targetColumnId) {
      lastIndexInColumn = todoIndex
      break
    }
  }

  if (lastIndexInColumn >= 0) {
    return lastIndexInColumn + 1
  }

  const targetColumnIndex = widgetColumnDefinitions.findIndex((column) => column.id === targetColumnId)

  for (let columnIndex = targetColumnIndex + 1; columnIndex < widgetColumnDefinitions.length; columnIndex += 1) {
    const nextColumnTodoIndex = todos.findIndex((todo) => todo.columnId === widgetColumnDefinitions[columnIndex].id)

    if (nextColumnTodoIndex >= 0) {
      return nextColumnTodoIndex
    }
  }

  return todos.length
}

function moveTodoInBoard(
  todos: TodoItem[],
  sourceTodoId: string,
  targetColumnId: TodoColumnId,
  targetTodoId: string | null,
): TodoItem[] {
  const sourceIndex = todos.findIndex((todo) => todo.id === sourceTodoId)

  if (sourceIndex < 0) {
    return todos
  }

  const sourceTodo = todos[sourceIndex]
  const nextColumnId = normalizeTodoColumnId(targetColumnId, targetColumnId === completedTodoColumnId)

  if (sourceTodo.id === targetTodoId && sourceTodo.columnId === nextColumnId) {
    return todos
  }

  const nextTodos = [...todos]
  nextTodos.splice(sourceIndex, 1)

  const movedTodo: TodoItem = {
    ...sourceTodo,
    columnId: nextColumnId,
    isCompleted: nextColumnId === completedTodoColumnId,
    updatedAt: new Date().toISOString(),
  }
  const targetIndex = getBoardInsertionIndex(nextTodos, nextColumnId, targetTodoId)
  nextTodos.splice(targetIndex, 0, movedTodo)

  return nextTodos
}

function App() {
  const [state, setState] = useState<PersistedState>(createDefaultState())
  const [windowState, setWindowState] = useState<WindowSnapshot>(emptyWindowState)
  const [bridgeMode, setBridgeMode] = useState<BridgeMode>(() => getDesktopBridgeMode())
  const [draftTitle, setDraftTitle] = useState('')
  const [draftNotes, setDraftNotes] = useState('')
  const [isWidgetCreateDialogOpen, setIsWidgetCreateDialogOpen] = useState(false)
  const [widgetCreateTitle, setWidgetCreateTitle] = useState('')
  const widgetCreateTitleTrimmed = widgetCreateTitle.trim()
  const canSubmitWidgetCreate = widgetCreateTitleTrimmed.length > 0

  function openWidgetCreateDialog(): void {
    setWidgetCreateTitle('')
    setIsWidgetCreateDialogOpen(true)
  }

  function closeWidgetCreateDialog(): void {
    setWidgetCreateTitle('')
    setIsWidgetCreateDialogOpen(false)
  }

  function handleWidgetCreateSubmit(): void {
    if (!canSubmitWidgetCreate) {
      return
    }

    setState((currentState) => {
      const accent = accentSequence[currentState.todos.length % accentSequence.length]
      const todo = createTodo(widgetCreateTitleTrimmed, '', accent)

      return {
        ...currentState,
        todos: [todo, ...currentState.todos],
        selectedTodoId: todo.id,
      }
    })
    closeWidgetCreateDialog()
  }
  const [filter, setFilter] = useState<FilterMode>('all')
  const [loaded, setLoaded] = useState(false)
  const [bootMessage, setBootMessage] = useState<string | null>(null)
  const [draggedTodoId, setDraggedTodoId] = useState<string | null>(null)
  const [dragOverTodoId, setDragOverTodoId] = useState<string | null>(null)
  const [dragOverColumnId, setDragOverColumnId] = useState<TodoColumnId | null>(null)
  const [isWidgetRevealActive, setIsWidgetRevealActive] = useState(false)
  const previousWidgetAutoHiddenRef = useRef(windowState.autoHidden)
  const runningInElectronShell = isElectronUserAgent()
  const canUseNativeWidget = bridgeMode === 'native'
  const bridgeStatusLabel =
    bridgeMode !== 'fallback' ? null : runningInElectronShell ? '桌面桥未连接' : '浏览器预览'
  const widgetUnavailableMessage = runningInElectronShell
    ? '当前 Electron 窗口没有连上桌面桥，请重启开发窗口后再试。'
    : '当前是浏览器预览，真正的挂件吸附和自动隐藏只在 Electron 桌面窗口里可用。'

  useEffect(() => {
    let ignore = false
    let unsubscribe: (() => void) | null = null

    void (async () => {
      const resolvedBridgeMode = await waitForDesktopBridge()

      if (ignore) {
        return
      }

      setBridgeMode(resolvedBridgeMode)
      unsubscribe = desktopApi.onWindowState((snapshot) => {
        if (ignore) {
          return
        }

        setWindowState((currentWindowState) => (sameWindowSnapshot(currentWindowState, snapshot) ? currentWindowState : snapshot))
        setState((currentState) =>
          currentState.widgetMode === snapshot.widgetMode && currentState.dockEdge === snapshot.dockEdge
            ? currentState
            : {
                ...currentState,
                widgetMode: snapshot.widgetMode,
                dockEdge: snapshot.dockEdge,
              },
        )
      })

      try {
        const [loadedState, snapshot] = await Promise.all([desktopApi.loadState(), desktopApi.getWindowState()])

        if (ignore) {
          return
        }

        setState({
          ...loadedState,
          widgetMode: snapshot.widgetMode,
          dockEdge: snapshot.dockEdge,
        })
        setWindowState((currentWindowState) => (sameWindowSnapshot(currentWindowState, snapshot) ? currentWindowState : snapshot))
        setBootMessage(null)
        setLoaded(true)
      } catch (error: unknown) {
        console.error('Failed to boot desktop state', error)

        if (ignore) {
          return
        }

        setBridgeMode('fallback')
        setBootMessage(widgetUnavailableMessage)
        setLoaded(true)
      }
    })()

    return () => {
      ignore = true
      unsubscribe?.()
    }
  }, [widgetUnavailableMessage])

  useEffect(() => {
    if (!loaded) {
      return
    }

    const timer = window.setTimeout(() => {
      void desktopApi.saveState(state)
    }, 140)

    return () => {
      window.clearTimeout(timer)
    }
  }, [loaded, state])

  useEffect(() => {
    if (windowState.widgetMode || !isWidgetCreateDialogOpen) {
      return
    }

    setWidgetCreateTitle('')
    setIsWidgetCreateDialogOpen(false)
  }, [isWidgetCreateDialogOpen, windowState.widgetMode])

  useEffect(() => {
    if (!windowState.autoHidden || !isWidgetCreateDialogOpen) {
      return
    }

    setWidgetCreateTitle('')
    setIsWidgetCreateDialogOpen(false)
  }, [isWidgetCreateDialogOpen, windowState.autoHidden])

  useEffect(() => {
    const wasAutoHidden = previousWidgetAutoHiddenRef.current
    previousWidgetAutoHiddenRef.current = windowState.autoHidden

    if (!windowState.widgetMode || windowState.dockEdge === null || windowState.autoHidden || !wasAutoHidden) {
      setIsWidgetRevealActive(false)
      return
    }

    setIsWidgetRevealActive(true)
    const timer = window.setTimeout(() => {
      setIsWidgetRevealActive(false)
    }, widgetRevealTransitionMs)

    return () => {
      window.clearTimeout(timer)
    }
  }, [windowState.autoHidden, windowState.dockEdge, windowState.widgetMode])

  const selectedTodo = useMemo(
    () => state.todos.find((todo) => todo.id === state.selectedTodoId) ?? null,
    [state.selectedTodoId, state.todos],
  )

  const filteredTodos = useMemo(() => {
    switch (filter) {
      case 'open':
        return state.todos.filter((todo) => !todo.isCompleted)
      case 'done':
        return state.todos.filter((todo) => todo.isCompleted)
      default:
        return state.todos
    }
  }, [filter, state.todos])

  const completedCount = useMemo(() => state.todos.filter((todo) => todo.isCompleted).length, [state.todos])
  const openCount = state.todos.length - completedCount
  const completionRate = state.todos.length === 0 ? 0 : Math.round((completedCount / state.todos.length) * 100)
  const widgetColumns = useMemo(
    () =>
      widgetColumnDefinitions.map((column) => ({
        ...column,
        todos: state.todos.filter((todo) => todo.columnId === column.id),
      })),
    [state.todos],
  )

  function selectTodo(todoId: string): void {
    setState((currentState) => ({
      ...currentState,
      selectedTodoId: todoId,
    }))
  }

  function updateTodos(updater: (todos: TodoItem[]) => TodoItem[]): void {
    setState((currentState) => {
      const nextTodos = updater(currentState.todos)
      const selectedTodoStillExists = nextTodos.some((todo) => todo.id === currentState.selectedTodoId)

      return {
        ...currentState,
        todos: nextTodos,
        selectedTodoId: selectedTodoStillExists ? currentState.selectedTodoId : nextTodos[0]?.id ?? null,
      }
    })
  }

  function handleAddTodo(): void {
    const nextTitle = draftTitle.trim()

    if (!nextTitle) {
      return
    }

    const accent = accentSequence[state.todos.length % accentSequence.length]
    const todo = createTodo(nextTitle, draftNotes, accent)

    setState((currentState) => ({
      ...currentState,
      todos: [todo, ...currentState.todos],
      selectedTodoId: todo.id,
    }))
    setDraftTitle('')
    setDraftNotes('')
  }

  function handleToggleTodo(todoId: string): void {
    updateTodos((todos) => {
      const toggledTodo = todos.find((todo) => todo.id === todoId)

      if (!toggledTodo) {
        return todos
      }

      return moveTodoInBoard(
        todos,
        todoId,
        toggledTodo.isCompleted ? defaultTodoColumnId : completedTodoColumnId,
        null,
      )
    })
  }

  function handleDeleteTodo(todoId: string): void {
    updateTodos((todos) => todos.filter((todo) => todo.id !== todoId))
  }

  function handleSelectedTodoChange<K extends keyof Pick<TodoItem, 'title' | 'notes'>>(
    field: K,
    value: TodoItem[K],
  ): void {
    if (!selectedTodo) {
      return
    }

    updateTodos((todos) =>
      todos.map((todo) =>
        todo.id === selectedTodo.id
          ? {
              ...todo,
              [field]: value,
              updatedAt: new Date().toISOString(),
            }
          : todo,
      ),
    )
  }

  async function handleWidgetModeToggle(): Promise<void> {
    if (!canUseNativeWidget) {
      setBootMessage(widgetUnavailableMessage)
      return
    }

    try {
      const snapshot = await desktopApi.setWidgetMode(!windowState.widgetMode)

      setBootMessage(null)
      setWindowState((currentWindowState) => (sameWindowSnapshot(currentWindowState, snapshot) ? currentWindowState : snapshot))
      setState((currentState) =>
        currentState.widgetMode === snapshot.widgetMode && currentState.dockEdge === snapshot.dockEdge
          ? currentState
          : {
              ...currentState,
              widgetMode: snapshot.widgetMode,
              dockEdge: snapshot.dockEdge,
            },
      )
    } catch (error) {
      console.debug('Window mode switch recreated the shell', error)
    }
  }

  function clearWidgetDragState(): void {
    setDraggedTodoId(null)
    setDragOverTodoId(null)
    setDragOverColumnId(null)
  }

  function handleWidgetTodoDrop(targetColumnId: TodoColumnId, targetTodoId: string | null = null): void {
    if (!draggedTodoId) {
      clearWidgetDragState()
      return
    }

    updateTodos((todos) => moveTodoInBoard(todos, draggedTodoId, targetColumnId, targetTodoId))
    clearWidgetDragState()
  }

  if (!loaded) {
    return <div className="loading-state">正在加载更漂亮的桌面 TodoList…</div>
  }

  if (windowState.widgetMode && canUseNativeWidget) {
    const isWidgetHidden = windowState.autoHidden && windowState.dockEdge !== null
    const widgetShellClassName = [
      'widget-board-shell',
      windowState.dockEdge ? `widget-board-shell--dock-${windowState.dockEdge}` : '',
      isWidgetHidden ? 'widget-board-shell--hidden' : '',
      isWidgetRevealActive ? 'widget-board-shell--revealing' : '',
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <div
        className={widgetShellClassName}
        onContextMenu={(event) => {
          event.preventDefault()
          void desktopApi.showWidgetMenu()
        }}
      >
        {isWidgetHidden ? (
          <div className={`widget-edge-handle widget-edge-handle--${windowState.dockEdge}`} title="移到这里呼出挂件">
            <div className="widget-edge-handle__glow" />
            <div className="widget-edge-handle__grip" aria-hidden="true" />
          </div>
        ) : (
          <>
            <header
              className="widget-board-header"
              onDoubleClick={() => {
                void handleWidgetModeToggle()
              }}
              title="拖动顶栏可贴边隐藏；双击返回桌面；右键打开菜单"
            >
              <div className="widget-board-brand">
                <div className="widget-board-brand__badge">
                  <LayoutGrid size={18} />
                </div>
                <div>
                  <div className="widget-board-brand__title">挂件看板</div>
                  <div className="widget-board-brand__subtitle">更接近 Trello 的横向多列布局</div>
                </div>
              </div>

              <div className="widget-board-pills">
                <span className="widget-board-pill">
                  <ListTodo size={14} />
                  {state.todos.length} 张卡片
                </span>
                <span className="widget-board-pill widget-board-pill--success">
                  <CheckCircle2 size={14} />
                  已完成 {completedCount}
                </span>
                {windowState.dockEdge && (
                  <span className="widget-board-pill widget-board-pill--accent">
                    <Pin size={14} />
                    已贴边 {windowState.dockEdge}
                  </span>
                )}
                <span className="widget-board-pill widget-board-pill--soft">拖动顶栏到屏幕边缘可自动隐藏</span>
              </div>

              <div className="widget-board-actions">
                <button className="widget-board-button widget-board-button--primary" onClick={openWidgetCreateDialog} type="button">
                  <Plus size={16} />
                  新增待办
                </button>
                <button
                  className="widget-board-button"
                  onClick={() => {
                    void handleWidgetModeToggle()
                  }}
                  type="button"
                >
                  退出挂件
                </button>
              </div>
            </header>

            {isWidgetCreateDialogOpen ? (
              <div className="widget-dialog-backdrop" onClick={closeWidgetCreateDialog} role="presentation">
                <div
                  aria-describedby="widget-create-dialog-description"
                  aria-labelledby="widget-create-dialog-title"
                  aria-modal="true"
                  className="widget-dialog"
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      event.preventDefault()
                      closeWidgetCreateDialog()
                    }
                  }}
                  role="dialog"
                >
                  <h2 id="widget-create-dialog-title">新增待办</h2>
                  <p id="widget-create-dialog-description">输入标题后直接进入收集箱。</p>
                  <input
                    autoFocus
                    className="widget-dialog__input"
                    maxLength={80}
                    onChange={(event) => setWidgetCreateTitle(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && canSubmitWidgetCreate) {
                        event.preventDefault()
                        handleWidgetCreateSubmit()
                      }
                    }}
                    placeholder="比如：整理今天最先推进的一件事"
                    value={widgetCreateTitle}
                  />
                  <div className="widget-dialog__actions">
                    <button className="widget-board-button widget-board-button--subtle" onClick={closeWidgetCreateDialog} type="button">
                      取消
                    </button>
                    <button
                      className="widget-board-button widget-board-button--primary"
                      disabled={!canSubmitWidgetCreate}
                      onClick={handleWidgetCreateSubmit}
                      type="button"
                    >
                      创建
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="widget-board">
              {widgetColumns.map((column) => (
                <section
                  key={column.id}
                  className={`widget-column ${dragOverColumnId === column.id ? 'widget-column--drag-over' : ''}`}
                  onDragOver={(event) => {
                    event.preventDefault()

                    if (dragOverColumnId !== column.id) {
                      setDragOverColumnId(column.id)
                    }

                    if (dragOverTodoId !== null) {
                      setDragOverTodoId(null)
                    }
                  }}
                  onDrop={(event) => {
                    event.preventDefault()
                    handleWidgetTodoDrop(column.id)
                  }}
                >
                  <header className="widget-column__header">
                    <div>
                      <span className="widget-column__eyebrow">{column.subtitle}</span>
                      <h2>{column.title}</h2>
                    </div>
                    <span className="widget-column__count">{column.todos.length}</span>
                  </header>

                  <div className="widget-column__list">
                    {column.todos.length === 0 ? (
                      <div className="widget-column__empty">
                        <span>这里还没有卡片</span>
                        <p>把任务拖到这一列，整理出和截图更接近的节奏。</p>
                      </div>
                    ) : (
                      column.todos.map((todo) => (
                        <article
                          key={todo.id}
                          className={`widget-board-card widget-board-card--${todo.accent} ${
                            state.selectedTodoId === todo.id ? 'widget-board-card--selected' : ''
                          } ${todo.isCompleted ? 'widget-board-card--completed' : ''} ${
                            dragOverTodoId === todo.id ? 'widget-board-card--drag-over' : ''
                          }`}
                          draggable
                          onClick={() => selectTodo(todo.id)}
                          onDragEnd={clearWidgetDragState}
                          onDragOver={(event) => {
                            event.preventDefault()
                            event.stopPropagation()

                            if (dragOverColumnId !== column.id) {
                              setDragOverColumnId(column.id)
                            }

                            if (dragOverTodoId !== todo.id) {
                              setDragOverTodoId(todo.id)
                            }
                          }}
                          onDragStart={() => {
                            setDraggedTodoId(todo.id)
                            setDragOverColumnId(column.id)
                            setDragOverTodoId(todo.id)
                          }}
                          onDrop={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                            handleWidgetTodoDrop(column.id, todo.id)
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              selectTodo(todo.id)
                            }
                          }}
                          role="button"
                          tabIndex={0}
                          title={todo.notes ? `${todo.title}\n\n${todo.notes}` : todo.title}
                        >
                          <div className={`widget-board-card__accent widget-board-card__accent--${todo.accent}`} />

                          <div className="widget-board-card__header">
                            <span className="widget-board-card__badge">{widgetColumnLabelMap[todo.columnId]}</span>
                            <button
                              aria-label={todo.isCompleted ? `将 ${todo.title} 设为未完成` : `完成 ${todo.title}`}
                              className={`widget-check-button ${todo.isCompleted ? 'widget-check-button--checked' : ''}`}
                              onClick={(event) => {
                                event.stopPropagation()
                                handleToggleTodo(todo.id)
                              }}
                              type="button"
                            >
                              {todo.isCompleted ? <Check size={14} /> : null}
                            </button>
                          </div>

                          <div className="widget-board-card__content">
                            <h3>{todo.title}</h3>
                            {todo.notes ? <p>{todo.notes}</p> : null}
                          </div>

                          <div className="widget-board-card__meta">
                            <span>{todo.notes ? '附带备注' : '仅标题卡片'}</span>
                            <span>{formatTimestamp(todo.updatedAt)}</span>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className={`app-shell ${windowState.widgetMode ? 'app-shell--widget' : ''}`}>
      <div className="ambient ambient--violet" />
      <div className="ambient ambient--cyan" />

      <header className="window-bar">
        <div className="window-brand">
          <div className="window-brand__badge">
            <ListTodo size={16} />
          </div>
          <div>
            <div className="window-brand__title">TodoListss</div>
            <div className="window-brand__subtitle">
              参考了 GitHub 上的 `electron-app` 结构风格和 `shadcn/ui` 视觉语言
            </div>
          </div>
        </div>

        <div className="window-status">
          {bridgeStatusLabel && (
            <span className="status-pill status-pill--warning">
              <Sparkles size={14} />
              {bridgeStatusLabel}
            </span>
          )}
          <button
            className={`status-pill status-pill--action ${windowState.widgetMode ? 'status-pill--action-active' : ''}`}
            onClick={() => {
              void handleWidgetModeToggle()
            }}
            type="button"
          >
            <LayoutGrid size={14} />
            {windowState.widgetMode ? '退出挂件模式' : '进入挂件模式'}
          </button>
          {windowState.dockEdge && (
            <span className="status-pill status-pill--accent">
              <Pin size={14} />
              已贴边 {windowState.dockEdge}
            </span>
          )}
          {windowState.autoHidden && (
            <span className="status-pill status-pill--soft">移到屏幕边缘即可呼出</span>
          )}
          {bootMessage && <span className="status-pill status-pill--warning">{bootMessage}</span>}
        </div>

        <div className="window-actions">
          <div className="window-frame-hint">正常模式保留系统标题栏，可以直接拖动、缩放和最大化。</div>
        </div>
      </header>

      <main className="dashboard">
        <section className="panel hero-panel">
          <div className="hero-panel__content">
            <div className="eyebrow">
              <GripHorizontal size={14} />
              {windowState.alwaysOnTop ? '始终置顶' : '专注工作台'}
            </div>
            <h1>把待办放进一个更顺眼的桌面挂件里。</h1>
            <p>
              这版改成了 Electron + React，界面更轻盈，也更容易继续做视觉打磨。拖到屏幕边缘时会自动贴边，离开后自动隐藏。
            </p>

            <div className="hero-actions">
              <button
                className="secondary-button secondary-button--glow"
                onClick={() => {
                  void handleWidgetModeToggle()
                }}
                type="button"
              >
                <LayoutGrid size={16} />
                {windowState.widgetMode ? '退出挂件模式' : '切换到挂件模式'}
              </button>
              <span>{windowState.widgetMode ? '当前是挂件看板窗口，拖动顶栏可以贴边隐藏。' : '当前是常规桌面窗口，系统标题栏已恢复。'}</span>
            </div>

            <div className="stat-grid">
              <div className="stat-card">
                <span>全部任务</span>
                <strong>{state.todos.length}</strong>
              </div>
              <div className="stat-card">
                <span>进行中</span>
                <strong>{openCount}</strong>
              </div>
              <div className="stat-card">
                <span>已完成</span>
                <strong>{completedCount}</strong>
              </div>
            </div>

            <div className="progress-card">
              <div className="progress-card__header">
                <span>今日进度</span>
                <strong>{completionRate}%</strong>
              </div>
              <div className="progress-track">
                <div className="progress-track__value" style={{ width: `${completionRate}%` }} />
              </div>
            </div>
          </div>

          <div className="composer">
            <div className="composer__label">快速添加</div>
            <div className="composer__input-group">
              <input
                className="text-input"
                maxLength={80}
                onChange={(event) => setDraftTitle(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    handleAddTodo()
                  }
                }}
                placeholder="今天最重要的一件事是什么？"
                value={draftTitle}
              />
              <textarea
                className="text-area"
                maxLength={240}
                onChange={(event) => setDraftNotes(event.target.value)}
                placeholder="补充一点备注，会显示在右侧详情里。"
                rows={4}
                value={draftNotes}
              />
            </div>
            <button className="primary-button" onClick={handleAddTodo} type="button">
              <Plus size={16} />
              添加任务
            </button>
          </div>
        </section>

        <section className="panel list-panel">
          <div className="section-header">
            <div>
              <h2>任务列表</h2>
              <p>更像一个现代工作台，而不是默认系统窗体。</p>
            </div>
            <div className="filter-group">
              {(['all', 'open', 'done'] as const).map((option) => (
                <button
                  key={option}
                  className={`chip-button ${filter === option ? 'chip-button--active' : ''}`}
                  onClick={() => setFilter(option)}
                  type="button"
                >
                  {option === 'all' ? '全部' : option === 'open' ? '进行中' : '已完成'}
                </button>
              ))}
            </div>
          </div>

          <div className="todo-list">
            {filteredTodos.length === 0 ? (
              <div className="empty-card">
                <CheckCircle2 size={20} />
                <div>
                  <strong>这里很清爽</strong>
                  <p>切个筛选或者添加一条新的任务吧。</p>
                </div>
              </div>
            ) : (
              filteredTodos.map((todo) => (
                <div
                  key={todo.id}
                  className={`todo-card ${accentClassMap[todo.accent]} ${
                    state.selectedTodoId === todo.id ? 'todo-card--selected' : ''
                  } ${todo.isCompleted ? 'todo-card--completed' : ''}`}
                  onClick={() => selectTodo(todo.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      selectTodo(todo.id)
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="todo-card__main">
                    <button
                      className={`check-button ${todo.isCompleted ? 'check-button--checked' : ''}`}
                      onClick={(event) => {
                        event.stopPropagation()
                        handleToggleTodo(todo.id)
                      }}
                      type="button"
                    >
                      {todo.isCompleted ? <Check size={15} /> : null}
                    </button>

                    <div className="todo-card__copy">
                      <div className="todo-card__title-row">
                        <h3>{todo.title}</h3>
                        <ChevronRight size={16} />
                      </div>
                      <p>{todo.notes || '没有备注，但也可以保持干净利落。'}</p>
                    </div>
                  </div>

                  <div className="todo-card__meta">
                    <span>{todo.isCompleted ? '已完成' : widgetColumnLabelMap[todo.columnId]}</span>
                    <span>{formatTimestamp(todo.updatedAt)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <aside className="panel detail-panel">
          <div className="section-header">
            <div>
              <h2>任务详情</h2>
              <p>选中一条任务后可以直接编辑。</p>
            </div>
          </div>

          {selectedTodo ? (
            <div className="detail-content">
              <label className="field">
                <span>标题</span>
                <input
                  className="text-input"
                  maxLength={80}
                  onChange={(event) => handleSelectedTodoChange('title', event.target.value)}
                  value={selectedTodo.title}
                />
              </label>

              <label className="field">
                <span>备注</span>
                <textarea
                  className="text-area text-area--detail"
                  maxLength={240}
                  onChange={(event) => handleSelectedTodoChange('notes', event.target.value)}
                  rows={8}
                  value={selectedTodo.notes}
                />
              </label>

              <div className="detail-meta">
                <div className="meta-item">
                  <StickyNote size={16} />
                  <span>创建于 {formatTimestamp(selectedTodo.createdAt)}</span>
                </div>
                <div className="meta-item">
                  <Pin size={16} />
                  <span>
                    当前列：{widgetColumnLabelMap[selectedTodo.columnId]} ·{' '}
                    {windowState.widgetMode ? '挂件看板里可直接拖到其他列' : '切到挂件模式可用看板整理'}
                  </span>
                </div>
              </div>

              <div className="detail-actions">
                <button className="secondary-button" onClick={() => handleToggleTodo(selectedTodo.id)} type="button">
                  <CheckCircle2 size={16} />
                  {selectedTodo.isCompleted ? '重新打开' : '标记完成'}
                </button>
                <button className="secondary-button secondary-button--danger" onClick={() => handleDeleteTodo(selectedTodo.id)} type="button">
                  <Trash2 size={16} />
                  删除
                </button>
              </div>
            </div>
          ) : (
            <div className="detail-placeholder">
              <Sparkles size={22} />
              <strong>选中一条任务</strong>
              <p>右侧会显示备注、更新时间和操作区。</p>
            </div>
          )}
        </aside>
      </main>
    </div>
  )
}

export default App
