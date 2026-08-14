import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import TaskCard from './TaskCard'

export default function TaskGroup({ label, tasks, isDone, defaultCollapsed }) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed || false)

  if (!tasks.length && !isDone) return null

  return (
    <div className="group">
      <button className="group__header" onClick={() => setCollapsed((v) => !v)}>
        {collapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
        <span className="group__label">{label}</span>
        <span className="group__count">{tasks.length}</span>
      </button>

      {!collapsed && (
        <div className="group__list">
          {tasks.length === 0 ? (
            <div className="group__empty">
              {isDone ? 'Nothing completed yet.' : 'Nothing here yet.'}
            </div>
          ) : (
            tasks.map((task) => <TaskCard key={task.id} task={task} />)
          )}
        </div>
      )}
    </div>
  )
}
