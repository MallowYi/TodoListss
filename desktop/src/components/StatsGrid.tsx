interface StatsGridProps {
  totalCount: number
  openCount: number
  completedCount: number
}

export function StatsGrid({ totalCount, openCount, completedCount }: StatsGridProps) {
  return (
    <div className="stat-grid">
      <div className="stat-card">
        <span>全部任务</span>
        <strong>{totalCount}</strong>
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
  )
}
