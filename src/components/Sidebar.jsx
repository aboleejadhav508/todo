import { useState } from 'react'
import { useStore, nextFreeColor } from '../store'
import ConfirmDialog from './ConfirmDialog'
import CategoryDialog from './CategoryDialog'
import SettingsDialog from './SettingsDialog'
import { Plus, Trash2, Check, ListTodo, Sun, Moon, Settings } from 'lucide-react'

const VIEW_OPTIONS = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'categories', label: 'Categories' },
]

const THEMES = [
  { id: 'light', label: 'Light theme', Icon: Sun },
  { id: 'dark', label: 'Dark theme', Icon: Moon },
]

export default function Sidebar({ activeCategoryId, onSelectCategory, onSelectAll }) {
  const { tasks, categories, appName, sidebarView, toggleSidebarView, addCategory, updateCategory, deleteCategory, theme, setTheme } = useStore()
  // null = closed, 'new' = create, otherwise the category being edited
  const [catDialog, setCatDialog] = useState(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [confirmCat, setConfirmCat] = useState(null)

  // Deleting a category also strips it from every task carrying it, so the
  // prompt says how many that is.
  const affectedCount = confirmCat
    ? tasks.filter((t) => t.categoryIds?.includes(confirmCat.id)).length
    : 0

  const saveCategory = ({ label, color }) => {
    if (catDialog === 'new') addCategory(label, color)
    else updateCategory(catDialog.id, { label, color })
    setCatDialog(null)
  }

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span className="sidebar__mark">
          <ListTodo size={15} strokeWidth={2.4} />
        </span>
        <span className="sidebar__name">{appName}</span>
      </div>

      <div className="sidebar__scroll">
      {/* View filters */}
      <div className="sidebar__section">
        <div className="sidebar__label">Show</div>
        <div className="sidebar__list">
          {VIEW_OPTIONS.map((v) => {
            const active = sidebarView.includes(v.id)
            return (
              <button
                key={v.id}
                className={`nav-item${active ? ' is-active' : ''}`}
                onClick={() => toggleSidebarView(v.id)}
              >
                <span className={`checkbox${active ? ' is-checked' : ''}`}>
                  {active && <Check size={11} color="#fff" strokeWidth={3.5} />}
                </span>
                <span className="nav-item__text">{v.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Categories */}
      <div className="sidebar__section">
        <div className="sidebar__label">Categories</div>
        <div className="sidebar__list">
          <button
            className={`nav-item${!activeCategoryId ? ' is-active' : ''}`}
            onClick={onSelectAll}
          >
            <span className="nav-item__text">All tasks</span>
          </button>

          {categories.map((cat) => (
            <div key={cat.id} className={`cat-row${activeCategoryId === cat.id ? ' is-active' : ''}`}>
              <button
                className={`nav-item${activeCategoryId === cat.id ? ' is-active' : ''}`}
                onClick={() => onSelectCategory(cat.id)}
                onDoubleClick={() => setCatDialog(cat)}
                title="Double-click to edit name and colour"
              >
                <span className="dot" style={{ background: cat.color }} />
                <span className="nav-item__text">{cat.label}</span>
              </button>
              <button
                className="cat-del"
                onClick={() => setConfirmCat(cat)}
                aria-label={`Delete ${cat.label}`}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>

        <button className="btn-dashed" onClick={() => setCatDialog('new')}>
          <Plus size={14} /> New category
        </button>
      </div>
      </div>

      <div className="sidebar__footer">
        <div className="theme-toggle">
          {THEMES.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`theme-toggle__btn${theme === id ? ' is-active' : ''}`}
              onClick={() => setTheme(id)}
              title={label}
              aria-label={label}
              aria-pressed={theme === id}
            >
              <Icon size={15} />
            </button>
          ))}
        </div>
        <button
          className="settings-btn"
          onClick={() => setSettingsOpen(true)}
          title="Appearance settings"
          aria-label="Appearance settings"
        >
          <Settings size={16} />
        </button>
      </div>

      {catDialog && (
        <CategoryDialog
          category={catDialog === 'new' ? null : catDialog}
          defaultColor={nextFreeColor(categories)}
          onSave={saveCategory}
          onCancel={() => setCatDialog(null)}
        />
      )}

      {settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} />}

      {confirmCat && (
        <ConfirmDialog
          title={`Delete “${confirmCat.label}”?`}
          message={
            affectedCount > 0
              ? `This category will be removed and untagged from ${affectedCount} ${affectedCount === 1 ? 'task' : 'tasks'}. The tasks themselves are kept. This can't be undone.`
              : "No tasks use this category. It will be removed permanently. This can't be undone."
          }
          confirmLabel="Delete category"
          onCancel={() => setConfirmCat(null)}
          onConfirm={() => { deleteCategory(confirmCat.id); setConfirmCat(null) }}
        />
      )}
    </aside>
  )
}
