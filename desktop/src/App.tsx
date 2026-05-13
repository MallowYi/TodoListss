import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  CheckCircle2,
  ChevronRight,
  Download,
  LayoutGrid,
  ListTodo,
  Moon,
  Pin,
  Sparkles,
  Sun,
  Upload,
} from 'lucide-react'
import './App.css'
import type { PersistedState, TodoColumnId, TodoItem, WindowSnapshot } from '../shared/contracts'
import { createDefaultState, defaultTodoColumnId, completedTodoColumnId } from '../shared/contracts'
import { desktopApi, getDesktopBridgeMode, type BridgeMode, waitForDesktopBridge } from './lib/desktopApi'
import {
  accentSequence,
  createTodo,
  formatTimestamp,
  isOverdue,
  moveTodoInBoard,
  widgetColumnDefinitions,
  widgetColumnLabelMap,
  widgetRevealTransitionMs,
  accentClassMap,
} from './lib/todoUtils'
import { StatsGrid } from './components/StatsGrid'
import { ProgressBar } from './components/ProgressBar'
import { Composer } from './components/Composer'
import { Trash2 as TrashIcon } from 'lucide-react'
import { TodoDetailPanel } from './components/TodoDetailPanel'
import { WidgetBoard } from './components/WidgetBoard'

type FilterMode = 'all' | 'open' | 'done'
type SortMode = 'created' | 'updated'

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

function App() {
  const [state, setState] = useState<PersistedState>(createDefaultState())
  const [windowState, setWindowState] = useState<WindowSnapshot>(emptyWindowState)
  const [bridgeMode, setBridgeMode] = useState<BridgeMode>(() => getDesktopBridgeMode())
  const [draftTitle, setDraftTitle] = useState('')
  const [draftNotes, setDraftNotes] = useState('')
  const [isWidgetCreateDialogOpen, setIsWidgetCreateDialogOpen] = useState(false)
  const [widgetCreateTitle, setWidgetCreateTitle] = useState('')
  const titleInputRef = useRef<HTMLInputElement>(null)
  const widgetCreateTitleTrimmed = widgetCreateTitle.trim()
  const canSubmitWidgetCreate = widgetCreateTitleTrimmed.length > 0
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [editingNotes, setEditingNotes] = useState('')
  const [editingDueDate, setEditingDueDate] = useState('')

  function openWidgetCreateDialog(): void {
    setWidgetCreateTitle('')
    setIsWidgetCreateDialogOpen(true)
  }

  function closeWidgetCreateDialog(): void {
    setWidgetCreateTitle('')
    setIsWidgetCreateDialogOpen(false)
  }

  function openWidgetEditDialog(todo: TodoItem): void {
    setEditingTodoId(todo.id)
    setEditingTitle(todo.title)
    setEditingNotes(todo.notes)
    setEditingDueDate(todo.dueDate ?? '')
  }

  function closeWidgetEditDialog(): void {
    setEditingTodoId(null)
    setEditingTitle('')
    setEditingNotes('')
    setEditingDueDate('')
  }

  function handleWidgetEditSave(): void {
    if (!editingTodoId || !editingTitle.trim()) {
      return
    }

    updateTodos((todos) =>
      todos.map((todo) =>
        todo.id === editingTodoId
          ? {
              ...todo,
              title: editingTitle.trim(),
              notes: editingNotes.trim(),
              dueDate: editingDueDate || null,
              updatedAt: new Date().toISOString(),
            }
          : todo,
      ),
    )
    closeWidgetEditDialog()
  }

  function handleWidgetEditDelete(): void {
    if (!editingTodoId) {
      return
    }

    handleDeleteTodo(editingTodoId)
    closeWidgetEditDialog()
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
  const [searchQuery, setSearchQuery] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('created')
  const [showTrash, setShowTrash] = useState(false)
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

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme)
  }, [state.theme])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.ctrlKey || event.metaKey) {
        if (event.key === 'n' || event.key === 'N') {
          event.preventDefault()
          if (windowState.widgetMode) {
            openWidgetCreateDialog()
          }
        }

        if (event.key === 'f' || event.key === 'F') {
          event.preventDefault()
          const searchInput = document.querySelector<HTMLInputElement>('.search-bar .text-input')
          searchInput?.focus()
        }
      }

      if (event.key === 'Escape') {
        if (editingTodoId) {
          closeWidgetEditDialog()
        } else if (isWidgetCreateDialogOpen) {
          closeWidgetCreateDialog()
        } else if (state.selectedTodoId) {
          selectTodo('')
        }
      }

      if (event.key === 'Delete' && state.selectedTodoId && !editingTodoId) {
        const active = document.activeElement
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
          return
        }
        const todoId = state.selectedTodoId
        setState((current) => {
          const todo = current.todos.find((t) => t.id === todoId)

          if (!todo) {
            return current
          }

          return {
            ...current,
            todos: current.todos.filter((t) => t.id !== todoId),
            trash: [{ ...todo, deletedAt: new Date().toISOString() }, ...current.trash],
            selectedTodoId: current.selectedTodoId === todoId ? current.todos.find((t) => t.id !== todoId)?.id ?? null : current.selectedTodoId,
          }
        })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [windowState.widgetMode, editingTodoId, isWidgetCreateDialogOpen, state.selectedTodoId])

  const selectedTodo = useMemo(
    () => state.todos.find((todo) => todo.id === state.selectedTodoId) ?? null,
    [state.selectedTodoId, state.todos],
  )

  const filteredTodos = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const byStatus = (() => {
      switch (filter) {
        case 'open':
          return state.todos.filter((todo) => !todo.isCompleted)
        case 'done':
          return state.todos.filter((todo) => todo.isCompleted)
        default:
          return state.todos
      }
    })()

    const searched = query
      ? byStatus.filter(
          (todo) => todo.title.toLowerCase().includes(query) || todo.notes.toLowerCase().includes(query),
        )
      : byStatus

    return [...searched].sort((a, b) => {
      const key = sortMode === 'created' ? 'createdAt' : 'updatedAt'
      return new Date(b[key]).getTime() - new Date(a[key]).getTime()
    })
  }, [filter, searchQuery, sortMode, state.todos])

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
  const focusTodo = useMemo(
    () =>
      state.todos.find((todo) => !todo.isCompleted && todo.columnId === 'today') ??
      state.todos.find((todo) => !todo.isCompleted) ??
      state.todos[0] ??
      null,
    [state.todos],
  )
  const recentTodos = useMemo(
    () =>
      [...state.todos]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 3),
    [state.todos],
  )
  const distributionItems = useMemo(
    () =>
      widgetColumnDefinitions.map((column) => {
        const count = state.todos.filter((todo) => todo.columnId === column.id).length
        return {
          ...column,
          count,
          percent: state.todos.length === 0 ? 0 : Math.max(8, Math.round((count / state.todos.length) * 100)),
        }
      }),
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
    const todo = state.todos.find((t) => t.id === todoId)
    if (!todo) return

    setState((current) => ({
      ...current,
      todos: current.todos.filter((t) => t.id !== todoId),
      trash: [{ ...todo, deletedAt: new Date().toISOString() }, ...current.trash],
      selectedTodoId: current.selectedTodoId === todoId ? current.todos.find((t) => t.id !== todoId)?.id ?? null : current.selectedTodoId,
    }))
  }

  function handleRestoreFromTrash(trashItemId: string): void {
    const item = state.trash.find((t) => t.id === trashItemId)
    if (!item) return

    const todo: TodoItem = {
      id: item.id,
      title: item.title,
      notes: item.notes,
      isCompleted: item.isCompleted,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      dueDate: item.dueDate,
      accent: item.accent,
      columnId: item.columnId,
    }

    setState((current) => ({
      ...current,
      todos: [todo, ...current.todos],
      trash: current.trash.filter((t) => t.id !== trashItemId),
      selectedTodoId: todo.id,
    }))
  }

  function handlePermanentDelete(trashItemId: string): void {
    setState((current) => ({
      ...current,
      trash: current.trash.filter((t) => t.id !== trashItemId),
    }))
  }

  function handleEmptyTrash(): void {
    setState((current) => ({ ...current, trash: [] }))
  }

  function handleSelectedTodoChange<K extends keyof Pick<TodoItem, 'title' | 'notes' | 'dueDate'>>(
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
    return (
      <WidgetBoard
        state={state}
        windowState={windowState}
        isWidgetRevealActive={isWidgetRevealActive}
        widgetColumns={widgetColumns}
        completedCount={completedCount}
        isWidgetCreateDialogOpen={isWidgetCreateDialogOpen}
        widgetCreateTitle={widgetCreateTitle}
        canSubmitWidgetCreate={canSubmitWidgetCreate}
        editingTodoId={editingTodoId}
        editingTitle={editingTitle}
        editingNotes={editingNotes}
        onSelectTodo={selectTodo}
        onWidgetModeToggle={() => void handleWidgetModeToggle()}
        onShowWidgetMenu={() => void desktopApi.showWidgetMenu()}
        onOpenCreateDialog={openWidgetCreateDialog}
        onCloseCreateDialog={closeWidgetCreateDialog}
        onWidgetCreateTitleChange={setWidgetCreateTitle}
        onWidgetCreateSubmit={handleWidgetCreateSubmit}
        onOpenEditDialog={openWidgetEditDialog}
        onCloseEditDialog={closeWidgetEditDialog}
        onEditingTitleChange={setEditingTitle}
        onEditingNotesChange={setEditingNotes}
        onEditingDueDateChange={setEditingDueDate}
        editingDueDate={editingDueDate}
        onEditSave={handleWidgetEditSave}
        onEditDelete={handleWidgetEditDelete}
        onDragEnd={clearWidgetDragState}
        onDragStart={(todoId, columnId) => {
          setDraggedTodoId(todoId)
          setDragOverColumnId(columnId)
          setDragOverTodoId(todoId)
        }}
        onDragOverColumn={(columnId) => {
          if (dragOverColumnId !== columnId) {
            setDragOverColumnId(columnId)
          }
          if (dragOverTodoId !== null) {
            setDragOverTodoId(null)
          }
        }}
        onDragOverTodo={(todoId, columnId) => {
          if (dragOverColumnId !== columnId) {
            setDragOverColumnId(columnId)
          }
          if (dragOverTodoId !== todoId) {
            setDragOverTodoId(todoId)
          }
        }}
        onDrop={handleWidgetTodoDrop}
        dragOverTodoId={dragOverTodoId}
        dragOverColumnId={dragOverColumnId}
        onToggleTodo={handleToggleTodo}
      />
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
          <button
            className={`status-pill status-pill--action ${showTrash ? 'status-pill--action-active' : ''}`}
            onClick={() => setShowTrash((prev) => !prev)}
            title="回收站"
            type="button"
          >
            <TrashIcon size={14} />
            回收站 {state.trash.length > 0 ? `(${state.trash.length})` : ''}
          </button>
          <button
            className="status-pill status-pill--action"
            onClick={() => setState((current) => ({ ...current, theme: current.theme === 'dark' ? 'light' : 'dark' }))}
            title={state.theme === 'dark' ? '切换到亮色主题' : '切换到暗色主题'}
            type="button"
          >
            {state.theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            {state.theme === 'dark' ? '亮色' : '暗色'}
          </button>
          <button
            className="status-pill status-pill--action"
            onClick={() => void desktopApi.exportState()}
            title="导出数据"
            type="button"
          >
            <Download size={14} />
            导出
          </button>
          <button
            className="status-pill status-pill--action"
            onClick={async () => {
              const imported = await desktopApi.importState()
              if (imported) {
                setState((current) => ({ ...current, ...imported }))
              }
            }}
            title="导入数据"
            type="button"
          >
            <Upload size={14} />
            导入
          </button>
        </div>
      </header>

      <main className="dashboard">
        <section className="panel hero-panel">
          <div className="hero-panel__content">
            <StatsGrid totalCount={state.todos.length} openCount={openCount} completedCount={completedCount} />
            <ProgressBar completionRate={completionRate} />

            <div className="dashboard-focus">
              <div>
                <span className="dashboard-eyebrow">今日焦点</span>
                <h2>{focusTodo ? focusTodo.title : '今天还没有任务'}</h2>
                <p>
                  {focusTodo
                    ? focusTodo.notes || `当前在「${widgetColumnLabelMap[focusTodo.columnId]}」中，适合优先处理。`
                    : '添加一条任务后，这里会自动展示你最需要关注的事项。'}
                </p>
              </div>
              <button
                className="secondary-button secondary-button--glow"
                disabled={!focusTodo}
                onClick={() => focusTodo && selectTodo(focusTodo.id)}
                type="button"
              >
                <Pin size={15} />
                查看
              </button>
            </div>

            <div className="dashboard-grid">
              <div className="dashboard-distribution">
                <div className="dashboard-section-title">
                  <span>任务分布</span>
                  <strong>{completionRate}%</strong>
                </div>
                <div className="distribution-list">
                  {distributionItems.map((item) => (
                    <div className="distribution-item" key={item.id}>
                      <div className="distribution-item__label">
                        <span>{item.title}</span>
                        <strong>{item.count}</strong>
                      </div>
                      <div className="distribution-track">
                        <div className="distribution-track__value" style={{ width: `${item.percent}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="dashboard-activity">
                <div className="dashboard-section-title">
                  <span>最近更新</span>
                  <strong>{recentTodos.length}</strong>
                </div>
                {recentTodos.length === 0 ? (
                  <p className="dashboard-empty">任务更新会显示在这里。</p>
                ) : (
                  <div className="activity-list">
                    {recentTodos.map((todo) => (
                      <button className="activity-item" key={todo.id} onClick={() => selectTodo(todo.id)} type="button">
                        <CheckCircle2 size={14} />
                        <span>{todo.title}</span>
                        <small>{formatTimestamp(todo.updatedAt)}</small>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <Composer
            draftTitle={draftTitle}
            draftNotes={draftNotes}
            onDraftTitleChange={setDraftTitle}
            onDraftNotesChange={setDraftNotes}
            onAdd={handleAddTodo}
          />
        </section>

        <section className="panel list-panel">
          <div className="section-header">
            <h2>任务列表</h2>
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
            <button
              className="chip-button"
              onClick={() => setSortMode((prev) => (prev === 'created' ? 'updated' : 'created'))}
              title={sortMode === 'created' ? '按创建时间排序' : '按更新时间排序'}
              type="button"
            >
              {sortMode === 'created' ? '创建时间' : '更新时间'}
            </button>
          </div>

          <div className="search-bar">
            <input
              className="text-input"
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="搜索任务标题或备注…"
              value={searchQuery}
            />
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
                  } ${todo.isCompleted ? 'todo-card--completed' : ''} ${isOverdue(todo) ? 'todo-card--overdue' : ''}`}
                  onClick={() => selectTodo(todo.id)}
                  onDoubleClick={() => {
                    selectTodo(todo.id)
                    setTimeout(() => titleInputRef.current?.focus(), 0)
                  }}
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

        {showTrash ? (
          <aside className="panel detail-panel">
            <div className="section-header">
              <div>
                <h2>回收站</h2>
                <p>已删除的任务保留 30 天。</p>
              </div>
              {state.trash.length > 0 && (
                <button className="chip-button" onClick={handleEmptyTrash} type="button">
                  清空
                </button>
              )}
            </div>
            <div className="todo-list">
              {state.trash.length === 0 ? (
                <div className="empty-card">
                  <TrashIcon size={20} />
                  <div>
                    <strong>回收站是空的</strong>
                    <p>删除的任务会出现在这里。</p>
                  </div>
                </div>
              ) : (
                state.trash.map((item) => (
                  <div key={item.id} className="todo-card todo-card--trashed">
                    <div className="todo-card__main">
                      <div className="todo-card__copy">
                        <div className="todo-card__title-row">
                          <h3>{item.title}</h3>
                        </div>
                        <p>{item.notes || '没有备注'}</p>
                      </div>
                    </div>
                    <div className="todo-card__meta">
                      <span>删除于 {formatTimestamp(item.deletedAt)}</span>
                    </div>
                    <div className="todo-card__trash-actions">
                      <button
                        className="chip-button"
                        onClick={() => handleRestoreFromTrash(item.id)}
                        type="button"
                      >
                        恢复
                      </button>
                      <button
                        className="chip-button chip-button--danger"
                        onClick={() => handlePermanentDelete(item.id)}
                        type="button"
                      >
                        永久删除
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>
        ) : (
          <TodoDetailPanel
            selectedTodo={selectedTodo}
            titleInputRef={titleInputRef}
            widgetMode={windowState.widgetMode}
            onSelectedTodoChange={handleSelectedTodoChange}
            onToggle={handleToggleTodo}
            onDelete={handleDeleteTodo}
          />
        )}
      </main>
    </div>
  )
}

export default App
