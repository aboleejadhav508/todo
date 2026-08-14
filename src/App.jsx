import { useState, useEffect, useRef } from 'react'
import { useStore } from './store'
import { groupTasks, byDeadlineAsc } from './utils'
import Sidebar from './components/Sidebar'
import AddTask from './components/AddTask'
import TaskGroup from './components/TaskGroup'
import Calendar from './components/Calendar'
import { CalendarDays, Search, X, Inbox, SearchX } from 'lucide-react'

export default function App() {
  const { tasks, categories, sidebarView, theme, accent, appName } = useStore()
  const [activeCategoryId, setActiveCategoryId] = useState(null)
  const [showCalendar, setShowCalendar] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const searchRef = useRef(null)

  const closeSearch = () => { setQuery(''); setSearchOpen(false) }

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  // Only --accent is set; every other accent shade is color-mix'd from it in CSS.
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', accent)
  }, [accent])

  useEffect(() => {
    document.title = appName
  }, [appName])

  // Cmd/Ctrl+K opens search, Escape closes it
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(true)
        searchRef.current?.focus()
      }
      if (e.key === 'Escape' && document.activeElement === searchRef.current) closeSearch()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const inCategory = activeCategoryId
    ? tasks.filter((t) => t.categoryIds?.includes(activeCategoryId))
    : tasks

  const q = query.trim().toLowerCase()
  const isSearching = q.length > 0

  // Search spans title, notes and category names — done tasks included.
  const results = isSearching
    ? inCategory.filter((t) => {
        const catLabels = categories
          .filter((c) => t.categoryIds?.includes(c.id))
          .map((c) => c.label)
          .join(' ')
        return `${t.title || ''} ${t.notes || ''} ${catLabels}`.toLowerCase().includes(q)
      }).sort(byDeadlineAsc)
    : []

  const groups = groupTasks(inCategory, sidebarView)
  const activeCategory = categories.find((c) => c.id === activeCategoryId)
  const doneCount = inCategory.filter((t) => t.status === 'done').length
  const todoCount = inCategory.filter((t) => t.status !== 'done').length

  return (
    <div className="app">
      <Sidebar
        activeCategoryId={activeCategoryId}
        onSelectCategory={(id) => setActiveCategoryId(id)}
        onSelectAll={() => setActiveCategoryId(null)}
      />

      <main className="main">
        <div className="topbar">
          <div>
            <h1 className="topbar__heading">
              {activeCategory && <span className="dot" style={{ background: activeCategory.color }} />}
              {activeCategory ? activeCategory.label : 'All tasks'}
            </h1>
            <p className="topbar__meta">
              {isSearching
                ? `${results.length} ${results.length === 1 ? 'match' : 'matches'}`
                : `${todoCount} to do · ${doneCount} done`}
            </p>
          </div>

          {searchOpen ? (
            <div className="search">
              <span className="search__icon"><Search size={15} /></span>
              <input
                ref={searchRef}
                autoFocus
                className="input search__input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tasks, notes, tags..."
              />
              <button className="search__clear" onClick={closeSearch} aria-label="Close search">
                <X size={15} />
              </button>
            </div>
          ) : (
            <div className="topbar__actions">
              <button className="btn" onClick={() => setSearchOpen(true)}>
                <Search size={15} /> Search
              </button>
              <button className="btn" onClick={() => setShowCalendar(true)}>
                <CalendarDays size={15} /> Calendar
              </button>
            </div>
          )}
        </div>

        <div className="content">
          <div style={{ marginBottom: 28 }}>
            <AddTask defaultCategoryId={activeCategoryId} />
          </div>

          {isSearching ? (
            results.length > 0 ? (
              <TaskGroup label="Results" tasks={results} />
            ) : (
              <div className="empty">
                <span className="empty__icon"><SearchX size={22} /></span>
                <div className="empty__title">No matches</div>
                <div className="empty__text">Nothing found for “{query.trim()}”.</div>
              </div>
            )
          ) : (
            <>
              {groups.map((group) => (
                <TaskGroup
                  key={group.label}
                  label={group.label}
                  tasks={group.tasks}
                  isDone={group.isDone}
                  defaultCollapsed={group.isDone}
                />
              ))}

              {inCategory.length === 0 && (
                <div className="empty">
                  <span className="empty__icon"><Inbox size={22} /></span>
                  <div className="empty__title">Nothing here yet</div>
                  <div className="empty__text">Add your first task above to get started.</div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {showCalendar && <Calendar onClose={() => setShowCalendar(false)} />}
    </div>
  )
}
