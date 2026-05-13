import { Plus } from 'lucide-react'

interface ComposerProps {
  draftTitle: string
  draftNotes: string
  onDraftTitleChange: (value: string) => void
  onDraftNotesChange: (value: string) => void
  onAdd: () => void
}

export function Composer({ draftTitle, draftNotes, onDraftTitleChange, onDraftNotesChange, onAdd }: ComposerProps) {
  return (
    <div className="composer">
      <div className="composer__label">快速添加</div>
      <div className="composer__input-group">
        <input
          className="text-input"
          maxLength={80}
          onChange={(event) => onDraftTitleChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              onAdd()
            }
          }}
          placeholder="今天最重要的一件事是什么？"
          value={draftTitle}
        />
        <textarea
          className="text-area"
          maxLength={240}
          onChange={(event) => onDraftNotesChange(event.target.value)}
          placeholder="补充一点备注，会显示在右侧详情里。"
          rows={4}
          value={draftNotes}
        />
      </div>
      <button className="primary-button" onClick={onAdd} type="button">
        <Plus size={16} />
        添加任务
      </button>
    </div>
  )
}
