import { Check, CheckCircle2, LayoutGrid, ListTodo, Pin, Plus } from 'lucide-react'
import type { PersistedState, TodoColumnId, TodoItem, WindowSnapshot } from '../../shared/contracts'
import { formatTimestamp, widgetColumnLabelMap } from '../lib/todoUtils'

interface WidgetBoardProps {
  state: PersistedState
  windowState: WindowSnapshot
  isWidgetRevealActive: boolean
  widgetColumns: ReadonlyArray<{ id: TodoColumnId; title: string; subtitle: string; todos: TodoItem[] }>
  completedCount: number
  isWidgetCreateDialogOpen: boolean
  widgetCreateTitle: string
  canSubmitWidgetCreate: boolean
  editingTodoId: string | null
  editingTitle: string
  editingNotes: string
  editingDueDate: string
  onSelectTodo: (todoId: string) => void
  onWidgetModeToggle: () => void
  onShowWidgetMenu: () => void
  onOpenCreateDialog: () => void
  onCloseCreateDialog: () => void
  onWidgetCreateTitleChange: (value: string) => void
  onWidgetCreateSubmit: () => void
  onOpenEditDialog: (todo: TodoItem) => void
  onCloseEditDialog: () => void
  onEditingTitleChange: (value: string) => void
  onEditingNotesChange: (value: string) => void
  onEditingDueDateChange: (value: string) => void
  onEditSave: () => void
  onEditDelete: () => void
  onDragEnd: () => void
  onDragStart: (todoId: string, columnId: TodoColumnId) => void
  onDragOverColumn: (columnId: TodoColumnId) => void
  onDragOverTodo: (todoId: string, columnId: TodoColumnId) => void
  onDrop: (targetColumnId: TodoColumnId, targetTodoId?: string | null) => void
  dragOverTodoId: string | null
  dragOverColumnId: TodoColumnId | null
  onToggleTodo: (todoId: string) => void
}

export function WidgetBoard(props: WidgetBoardProps) {
  const {
    state,
    windowState,
    isWidgetRevealActive,
    widgetColumns,
    completedCount,
    isWidgetCreateDialogOpen,
    widgetCreateTitle,
    canSubmitWidgetCreate,
    editingTodoId,
    editingTitle,
    editingNotes,
    editingDueDate,
    onSelectTodo,
    onWidgetModeToggle,
    onShowWidgetMenu,
    onOpenCreateDialog,
    onCloseCreateDialog,
    onWidgetCreateTitleChange,
    onWidgetCreateSubmit,
    onOpenEditDialog,
    onCloseEditDialog,
    onEditingTitleChange,
    onEditingNotesChange,
    onEditingDueDateChange,
    onEditSave,
    onEditDelete,
    onDragEnd,
    onDragStart,
    onDragOverColumn,
    onDragOverTodo,
    onDrop,
    dragOverTodoId,
    dragOverColumnId,
    onToggleTodo,
  } = props

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
        onShowWidgetMenu()
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
            onDoubleClick={() => onWidgetModeToggle()}
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
              <button className="widget-board-button widget-board-button--primary" onClick={onOpenCreateDialog} type="button">
                <Plus size={16} />
                新增待办
              </button>
              <button className="widget-board-button" onClick={() => onWidgetModeToggle()} type="button">
                退出挂件
              </button>
            </div>
          </header>

          {isWidgetCreateDialogOpen ? (
            <div className="widget-dialog-backdrop" onClick={onCloseCreateDialog} role="presentation">
              <div
                aria-describedby="widget-create-dialog-description"
                aria-labelledby="widget-create-dialog-title"
                aria-modal="true"
                className="widget-dialog"
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    event.preventDefault()
                    onCloseCreateDialog()
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
                  onChange={(event) => onWidgetCreateTitleChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && canSubmitWidgetCreate) {
                      event.preventDefault()
                      onWidgetCreateSubmit()
                    }
                  }}
                  placeholder="比如：整理今天最先推进的一件事"
                  value={widgetCreateTitle}
                />
                <div className="widget-dialog__actions">
                  <button className="widget-board-button widget-board-button--subtle" onClick={onCloseCreateDialog} type="button">
                    取消
                  </button>
                  <button
                    className="widget-board-button widget-board-button--primary"
                    disabled={!canSubmitWidgetCreate}
                    onClick={onWidgetCreateSubmit}
                    type="button"
                  >
                    创建
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {editingTodoId ? (
            <div className="widget-dialog-backdrop" onClick={onCloseEditDialog} role="presentation">
              <div
                aria-describedby="widget-edit-dialog-description"
                aria-labelledby="widget-edit-dialog-title"
                aria-modal="true"
                className="widget-dialog"
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    event.preventDefault()
                    onCloseEditDialog()
                  }
                }}
                role="dialog"
              >
                <h2 id="widget-edit-dialog-title">编辑任务</h2>
                <p id="widget-edit-dialog-description">修改标题或备注后保存。</p>
                <input
                  autoFocus
                  className="widget-dialog__input"
                  maxLength={80}
                  onChange={(event) => onEditingTitleChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && editingTitle.trim()) {
                      event.preventDefault()
                      onEditSave()
                    }
                  }}
                  placeholder="任务标题"
                  value={editingTitle}
                />
                <textarea
                  className="widget-dialog__textarea"
                  maxLength={240}
                  onChange={(event) => onEditingNotesChange(event.target.value)}
                  placeholder="补充备注"
                  rows={4}
                  value={editingNotes}
                />
                <label className="widget-dialog__field">
                  <span>截止日期</span>
                  <input
                    className="widget-dialog__input"
                    onChange={(event) => onEditingDueDateChange(event.target.value)}
                    type="date"
                    value={editingDueDate}
                  />
                </label>
                <div className="widget-dialog__actions">
                  <button className="widget-board-button widget-board-button--danger" onClick={onEditDelete} type="button">
                    删除
                  </button>
                  <div style={{ flex: 1 }} />
                  <button className="widget-board-button widget-board-button--subtle" onClick={onCloseEditDialog} type="button">
                    取消
                  </button>
                  <button
                    className="widget-board-button widget-board-button--primary"
                    disabled={!editingTitle.trim()}
                    onClick={onEditSave}
                    type="button"
                  >
                    保存
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
                  onDragOverColumn(column.id)
                }}
                onDrop={(event) => {
                  event.preventDefault()
                  onDrop(column.id)
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
                        onClick={() => onSelectTodo(todo.id)}
                        onDoubleClick={(event) => {
                          event.preventDefault()
                          onOpenEditDialog(todo)
                        }}
                        onDragEnd={onDragEnd}
                        onDragOver={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          onDragOverTodo(todo.id, column.id)
                        }}
                        onDragStart={() => onDragStart(todo.id, column.id)}
                        onDrop={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          onDrop(column.id, todo.id)
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            onSelectTodo(todo.id)
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
                              onToggleTodo(todo.id)
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
