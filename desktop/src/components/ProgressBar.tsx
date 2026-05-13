interface ProgressBarProps {
  completionRate: number
}

export function ProgressBar({ completionRate }: ProgressBarProps) {
  return (
    <div className="progress-card">
      <div className="progress-card__header">
        <span>今日进度</span>
        <strong>{completionRate}%</strong>
      </div>
      <div className="progress-track">
        <div className="progress-track__value" style={{ width: `${completionRate}%` }} />
      </div>
    </div>
  )
}
