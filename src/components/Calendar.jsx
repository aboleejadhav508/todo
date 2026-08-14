import { useState } from 'react'
import { useStore } from '../store'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay } from 'date-fns'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

function CalendarMonth({ date, calendarNotes, onDayClick, selectedDate }) {
  const start = startOfMonth(date)
  const end = endOfMonth(date)
  const days = eachDayOfInterval({ start, end })
  const startDow = (getDay(start) + 6) % 7 // Mon=0

  return (
    <div>
      <div className="cal-month__title">
        {MONTHS[date.getMonth()]} {date.getFullYear()}
      </div>
      <div className="cal-grid">
        {DAYS.map((d) => (
          <div key={d} className="cal-dow">{d}</div>
        ))}
        {Array.from({ length: startDow }).map((_, i) => <div key={`e${i}`} />)}
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const hasNote = !!calendarNotes[key]
          const isSelected = selectedDate && isSameDay(day, selectedDate)
          const isToday = isSameDay(day, new Date())
          return (
            <button
              key={key}
              className={`cal-day${isToday ? ' is-today' : ''}${isSelected ? ' is-selected' : ''}`}
              onClick={() => onDayClick(day)}
            >
              {format(day, 'd')}
              {hasNote && <span className="cal-day__dot" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function Calendar({ onClose }) {
  const { calendarNotes, setCalendarNote } = useStore()
  const [viewDate, setViewDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [noteText, setNoteText] = useState('')
  const [noteOpen, setNoteOpen] = useState(false)

  const openNote = (day) => {
    setSelectedDate(day)
    const key = format(day, 'yyyy-MM-dd')
    setNoteText(calendarNotes[key] || '')
    setNoteOpen(true)
  }

  const saveNote = () => {
    if (!selectedDate) return
    const key = format(selectedDate, 'yyyy-MM-dd')
    setCalendarNote(key, noteText)
    setNoteOpen(false)
  }

  // Show 2 months at a time
  const month2 = addMonths(viewDate, 1)

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="modal__header">
          <button className="btn btn--ghost btn--icon" onClick={() => setViewDate((d) => subMonths(d, 2))} aria-label="Previous months">
            <ChevronLeft size={17} />
          </button>
          <span className="modal__title">
            {viewDate.getFullYear() === month2.getFullYear()
              ? viewDate.getFullYear()
              : `${viewDate.getFullYear()} – ${month2.getFullYear()}`}
          </span>
          <button className="btn btn--ghost btn--icon" onClick={() => setViewDate((d) => addMonths(d, 2))} aria-label="Next months">
            <ChevronRight size={17} />
          </button>
          <button className="btn btn--ghost btn--icon" onClick={onClose} aria-label="Close calendar">
            <X size={17} />
          </button>
        </div>

        <div className="cal-months">
          <CalendarMonth date={viewDate} calendarNotes={calendarNotes} onDayClick={openNote} selectedDate={selectedDate} />
          <CalendarMonth date={month2} calendarNotes={calendarNotes} onDayClick={openNote} selectedDate={selectedDate} />
        </div>

        {noteOpen && selectedDate && (
          <div className="cal-note">
            <div className="cal-note__date">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</div>
            <textarea
              autoFocus
              className="input textarea"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add a note for this day..."
            />
            <div className="cal-note__actions">
              <button className="btn" onClick={() => setNoteOpen(false)}>Cancel</button>
              <button className="btn btn--primary" onClick={saveNote}>Save</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
