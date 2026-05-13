import { Pin, Sparkles, StickyNote, Trash2, CheckCircle2, Calendar } from 'lucide-react'
import type { TodoItem } from '../../shared/contracts'
import { formatTimestamp, isOverdue, widgetColumnLabelMap } from '../lib/todoUtils'

interface TodoDetailPanelProps {
  selectedTodo: TodoItem | null
  titleInputRef: React.Ref<HTMLInputElement>
  widgetMode: boolean
  onSelectedTodoChange: <K extends keyof Pick<TodoItem, 'title' | 'notes' | 'dueDate'>>(field: K, value: TodoItem[K]) => void
  onToggle: (todoId: string) => void
  onDelete: (todoId: string) => void
}

export function TodoDetailPanel({ selectedTodo, titleInputRef, widgetMode, onSelectedTodoChange, onToggle, onDelete }: TodoDetailPanelProps) {
  return (
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
              ref={titleInputRef}
              className="text-input"
              maxLength={80}
              onChange={(event) => onSelectedTodoChange('title', event.target.value)}
              value={selectedTodo.title}
            />
          </label>

          <label className="field">
            <span>备注</span>
            <textarea
              className="text-area text-area--detail"
              maxLength={240}
              onChange={(event) => onSelectedTodoChange('notes', event.target.value)}
              rows={8}
              value={selectedTodo.notes}
            />
          </label>

          <label className="field">
            <span>截止日期</span>
            <input
              className="text-input"
              onChange={(event) => onSelectedTodoChange('dueDate', event.target.value || null)}
              type="date"
              value={selectedTodo.dueDate ?? ''}
            />
          </label>

          <div className="detail-meta">
            <div className="meta-item">
              <StickyNote size={16} />
              <span>创建于 {formatTimestamp(selectedTodo.createdAt)}</span>
            </div>
            {selectedTodo.dueDate && (
              <div className={`meta-item ${isOverdue(selectedTodo) ? 'meta-item--overdue' : ''}`}>
                <Calendar size={16} />
                <span>截止 {new Date(selectedTodo.dueDate).toLocaleDateString('zh-CN')}</span>
              </div>
            )}
            <div className="meta-item">
              <Pin size={16} />
              <span>
                当前列：{widgetColumnLabelMap[selectedTodo.columnId]} ·{' '}
                {widgetMode ? '挂件看板里可直接拖到其他列' : '切到挂件模式可用看板整理'}
              </span>
            </div>
          </div>

          <div className="detail-actions">
            <button className="secondary-button" onClick={() => onToggle(selectedTodo.id)} type="button">
              <CheckCircle2 size={16} />
              {selectedTodo.isCompleted ? '重新打开' : '标记完成'}
            </button>
            <button className="secondary-button secondary-button--danger" onClick={() => onDelete(selectedTodo.id)} type="button">
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
  )
}
