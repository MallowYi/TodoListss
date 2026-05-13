import type { TodoAccent, TodoColumnId, TodoItem } from '../../shared/contracts'
import { completedTodoColumnId, defaultTodoColumnId, normalizeTodoColumnId, todoAccents } from '../../shared/contracts'

export const accentClassMap: Record<TodoAccent, string> = {
  violet: 'todo-card--violet',
  cyan: 'todo-card--cyan',
  rose: 'todo-card--rose',
  amber: 'todo-card--amber',
  emerald: 'todo-card--emerald',
}

export const accentSequence: TodoAccent[] = [...todoAccents]

export const widgetRevealTransitionMs = 264

export const widgetColumnLabelMap: Record<TodoColumnId, string> = {
  backlog: '收集箱',
  today: '今天',
  inProgress: '进行中',
  waiting: '待跟进',
  done: '已完成',
}

export const widgetColumnDefinitions: ReadonlyArray<{ id: TodoColumnId; title: string; subtitle: string }> = [
  { id: 'backlog', title: '收集箱', subtitle: '新的想法和刚进来的卡片' },
  { id: 'today', title: '今天', subtitle: '这会儿最值得推进的事' },
  { id: 'inProgress', title: '进行中', subtitle: '已经开始，继续往前推' },
  { id: 'waiting', title: '待跟进', subtitle: '等反馈、等确认或稍后处理' },
  { id: 'done', title: '已完成', subtitle: '今天已经落地的内容' },
]

export function formatTimestamp(isoValue: string): string {
  const value = new Date(isoValue)
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value)
}

export function createTodo(title: string, notes: string, accent: TodoAccent): TodoItem {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    title: title.trim(),
    notes: notes.trim(),
    isCompleted: false,
    createdAt: now,
    updatedAt: now,
    dueDate: null,
    accent,
    columnId: defaultTodoColumnId,
  }
}

export function isOverdue(todo: TodoItem): boolean {
  if (todo.isCompleted || !todo.dueDate) {
    return false
  }
  return new Date(todo.dueDate).getTime() < Date.now()
}

export function getBoardInsertionIndex(todos: TodoItem[], targetColumnId: TodoColumnId, targetTodoId: string | null): number {
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

export function moveTodoInBoard(
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
