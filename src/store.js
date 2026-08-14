import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { isConfigured } from './lib/supabase'
import { cloudStorage } from './lib/cloudStorage'

export const STORE_KEY = 'temp-todo-store'

export const DEFAULT_APP_NAME = 'Todo'
export const DEFAULT_ACCENT = '#e9631a'

export const CATEGORY_COLORS = [
  '#5b5bd6', // indigo
  '#0d9668', // emerald
  '#e5484d', // red
  '#8b5cf6', // violet
  '#0891b2', // cyan
  '#d97706', // amber
  '#db2777', // pink
  '#4f7a28', // olive
  '#0f766e', // teal
  '#64748b', // slate
]

const DEFAULT_CATEGORIES = [
  { id: 'college', label: 'College Work', color: CATEGORY_COLORS[0] },
  { id: 'stocks', label: 'Stocks', color: CATEGORY_COLORS[1] },
  { id: 'ai', label: 'AI', color: CATEGORY_COLORS[3] },
  { id: 'articles', label: 'Article to Read', color: CATEGORY_COLORS[5] },
  { id: 'research', label: 'Research', color: CATEGORY_COLORS[4] },
  { id: 'watch', label: 'Video to Watch', color: CATEGORY_COLORS[6] },
  { id: 'misc', label: 'Misc', color: CATEGORY_COLORS[9] },
]

/** First palette colour not already in use, so new categories look distinct. */
export const nextFreeColor = (categories) => {
  const used = categories.map((c) => c.color)
  return CATEGORY_COLORS.find((c) => !used.includes(c)) || CATEGORY_COLORS[0]
}

// The OS preference is only a starting point — once the user picks a side it
// sticks, so this is read on first run and at the v2 migration, never after.
const preferredTheme = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'

/** The persisted fields only — no actions. Used to reset cleanly on sign-out. */
const defaultData = () => ({
  tasks: [],
  categories: DEFAULT_CATEGORIES,
  calendarNotes: {},
  sidebarView: ['month'],
  theme: preferredTheme(), // 'light' | 'dark'
  appName: DEFAULT_APP_NAME,
  accent: DEFAULT_ACCENT,
})

export const useStore = create(
  persist(
    (set, get) => ({
      ...defaultData(),

      /**
       * Wipe in-memory data on sign-out. Without this, zustand's shallow merge
       * could leak one account's values into the next sign-in for any key the
       * new user's row happens not to contain.
       */
      resetData: () => set(defaultData()),

      addTask: (task) => set((s) => ({
        tasks: [...s.tasks, {
          id: crypto.randomUUID(),
          title: '',
          categoryIds: [],
          status: 'todo',
          deadline: null,
          plannedDate: null,
          notes: '',
          createdAt: new Date().toISOString(),
          ...task,
        }]
      })),

      updateTask: (id, patch) => set((s) => ({
        tasks: s.tasks.map((t) => t.id === id ? { ...t, ...patch } : t)
      })),

      deleteTask: (id) => set((s) => ({
        tasks: s.tasks.filter((t) => t.id !== id)
      })),

      addCategory: (label, color) => {
        const cat = { id: crypto.randomUUID(), label, color: color || nextFreeColor(get().categories) }
        set((s) => ({ categories: [...s.categories, cat] }))
        return cat
      },

      updateCategory: (id, patch) => set((s) => ({
        categories: s.categories.map((c) => c.id === id ? { ...c, ...patch } : c)
      })),

      deleteCategory: (id) => set((s) => ({
        categories: s.categories.filter((c) => c.id !== id),
        tasks: s.tasks.map((t) => ({
          ...t,
          categoryIds: (t.categoryIds || []).filter((cid) => cid !== id)
        }))
      })),

      setCalendarNote: (dateKey, note) => set((s) => ({
        calendarNotes: { ...s.calendarNotes, [dateKey]: note }
      })),

      setTheme: (theme) => set({ theme }),

      setAppName: (appName) => set({ appName: appName.trim() || DEFAULT_APP_NAME }),

      setAccent: (accent) => set({ accent }),

      // Functional update so rapid toggles can't overwrite each other with a
      // stale copy of sidebarView.
      toggleSidebarView: (id) => set((s) => ({
        sidebarView: s.sidebarView.includes(id)
          ? s.sidebarView.filter((v) => v !== id)
          : [...s.sidebarView, id]
      })),
    }),
    {
      name: STORE_KEY,
      // Signed in: read/write the user's Supabase row. Not configured: stay
      // fully local, so the app still runs offline exactly as it did before.
      storage: createJSONStorage(() => (isConfigured ? cloudStorage : localStorage)),
      // With a cloud backend there's no session at module load, so hydration
      // waits until App rehydrates it after sign-in.
      skipHydration: isConfigured,
      version: 2,
      migrate: (state, fromVersion) => {
        // v1 replaced the muted palette. Categories live in persisted state, so
        // already-saved ones need repainting on upgrade.
        if (fromVersion < 1 && state?.categories) {
          const defaults = Object.fromEntries(DEFAULT_CATEGORIES.map((c) => [c.id, c.color]))
          state.categories = state.categories.map((cat, i) => ({
            ...cat,
            color: defaults[cat.id] || CATEGORY_COLORS[i % CATEGORY_COLORS.length],
          }))
        }
        // v2 dropped the 'system' theme option; resolve it to a real side once.
        if (fromVersion < 2 && state && state.theme !== 'light' && state.theme !== 'dark') {
          state.theme = preferredTheme()
        }
        return state
      },
    }
  )
)
