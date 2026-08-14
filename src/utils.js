import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, isBefore, isToday, parseISO } from 'date-fns'

/**
 * Soonest deadline first; tasks with no deadline sink to the bottom rather
 * than sorting as epoch 0. Ties fall back to planned date, then creation
 * order, so the result is stable instead of shuffling on every render.
 */
export function byDeadlineAsc(a, b) {
  const time = (iso) => (iso ? parseISO(iso).getTime() : Infinity)

  const da = time(a.deadline)
  const db = time(b.deadline)
  if (da !== db) return da - db

  const pa = time(a.plannedDate)
  const pb = time(b.plannedDate)
  if (pa !== pb) return pa - pb

  return (a.createdAt || '').localeCompare(b.createdAt || '')
}

/** 'overdue' | 'today' | null — completed tasks are never flagged. */
export function deadlineState(task) {
  if (!task.deadline || task.status === 'done') return null
  const d = parseISO(task.deadline)
  if (isToday(d)) return 'today'
  return isBefore(d, startOfDay(new Date())) ? 'overdue' : null
}

export function groupTasks(tasks, views) {
  const now = new Date()
  const dayInterval = { start: startOfDay(now), end: endOfDay(now) }
  const weekInterval = { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) }
  const monthInterval = { start: startOfMonth(now), end: endOfMonth(now) }

  const inDay = (t) => {
    const d = t.plannedDate || t.deadline
    return d && isWithinInterval(parseISO(d), dayInterval)
  }
  const inWeek = (t) => {
    const d = t.plannedDate || t.deadline
    return d && isWithinInterval(parseISO(d), weekInterval)
  }
  const inMonth = (t) => {
    const d = t.plannedDate || t.deadline
    return d && isWithinInterval(parseISO(d), monthInterval)
  }

  const active = tasks.filter((t) => t.status !== 'done')
  const done = tasks.filter((t) => t.status === 'done')

  const groups = []

  const showDay = views.includes('day')
  const showWeek = views.includes('week')
  const showMonth = views.includes('month')

  // A task belongs to the narrowest visible bucket. Only subtract a narrower
  // range when that group is actually rendered — otherwise the task falls
  // through every bucket and ends up in "Other".
  if (showDay) {
    groups.push({ label: 'Today', tasks: active.filter(inDay) })
  }
  if (showWeek) {
    const weekTasks = active.filter((t) => inWeek(t) && !(showDay && inDay(t)))
    groups.push({ label: 'This Week', tasks: weekTasks })
  }
  if (showMonth) {
    const monthTasks = active.filter((t) => inMonth(t) && !(showWeek && inWeek(t)) && !(showDay && inDay(t)))
    groups.push({ label: 'This Month', tasks: monthTasks })
  }
  if (!views.length || views.includes('categories') || (!views.includes('day') && !views.includes('week') && !views.includes('month'))) {
    const shown = new Set(groups.flatMap((g) => g.tasks.map((t) => t.id)))
    const rest = active.filter((t) => !shown.has(t.id))
    if (rest.length || !groups.length) groups.push({ label: 'All Tasks', tasks: rest })
  } else {
    const shown = new Set(groups.flatMap((g) => g.tasks.map((t) => t.id)))
    const rest = active.filter((t) => !shown.has(t.id))
    if (rest.length) groups.push({ label: 'Other', tasks: rest })
  }

  groups.push({ label: 'Done', tasks: done, isDone: true })

  // Every group's array is already a fresh filter() result, so sorting in
  // place here never mutates store state.
  groups.forEach((g) => g.tasks.sort(byDeadlineAsc))
  return groups
}
