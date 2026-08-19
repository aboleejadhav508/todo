# Todo

A local-first task app that optionally syncs. Run it with no backend at all and everything lives in your browser; add two environment variables and it gains email/password accounts with per-user data isolation enforced by the database.

The app name is editable at runtime — rename it in Appearance settings and it updates the sidebar and the browser tab.

## Features

- Tasks with a **deadline** and a separate **plan-to-do** date, categories, notes, and three states
- Grouping by Today / This Week / This Month, sorted by deadline with overdue and due-today flags
- Search across titles, notes and category names (<kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>K</kbd>)
- Light and dark themes, plus a user-configurable accent colour that retints the whole app
- Calendar with a free-text note per day
- Everything local by default; optional accounts via Supabase

## Licence

MIT — see [LICENSE](LICENSE).

## Running it

```bash
npm install
npm run dev
```

Opens on http://localhost:5173 (override with `PORT=3000 npm run dev`).

| Script | Does |
| --- | --- |
| `npm run dev` | Dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the built output |
| `npm run lint` | ESLint over the project |

## Going online (accounts + deploy)

The app runs in two modes. With no Supabase credentials it stays exactly as it was — local-only, no sign-in, works offline. Set the two env vars and it gains email/password accounts, with each account's data private to them.

### 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com) (free tier).
2. **SQL Editor → New query** → paste [`supabase/schema.sql`](supabase/schema.sql) → Run.
3. **Project Settings → Data API** for the URL, **API Keys** for the *anon* (publishable) key.
4. `cp .env.example .env.local` and paste both in. Restart `npm run dev`.

The anon key is meant to be public and ships in the bundle. The row level security policy in the schema is the thing that keeps accounts separate — **if you skip step 2, every signed-in user can read everyone's rows.** Never put the *service role* key in a `VITE_` variable; it bypasses RLS entirely.

### 2. Deploy

This folder isn't a git repo yet, so:

```bash
git init && git add -A && git commit -m "Initial commit"
```

Push it to a GitHub repo, then import that repo at [vercel.com](https://vercel.com). Vercel detects Vite automatically (build `npm run build`, output `dist`). Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under **Settings → Environment Variables**, then redeploy.

Finally, in Supabase under **Authentication → URL Configuration**, set **Site URL** to your Vercel domain and add it to **Redirect URLs** — password-reset and confirmation links point at whatever is configured there, so they break silently if it still says `localhost`.

### Notes

- **Supabase's built-in email service is rate limited to roughly 2 emails per hour.** It exists for testing, not production. Once exhausted, sign-ups fail with `email rate limit exceeded` — which looks like a bug in the app but isn't. Two ways out: turn off **Authentication → Sign In / Providers → Email → Confirm email** (instant sign-ups, no email sent, unverified addresses), or add your own SMTP under **Authentication → Emails** ([Resend](https://resend.com) has a free tier) and keep confirmation on. Do the latter before more than a couple of people use your instance.
- **Writes are debounced ~700ms** ([`cloudStorage.js`](src/lib/cloudStorage.js)). Task notes update state per keystroke, so without this every character would be a network round trip. Sign-out flushes pending writes first.
- **Last write wins.** The whole state is one row, so two devices editing at once will overwrite each other. Fine for one person; it is not real sync.
- **Works offline.** A service worker ([`public/sw.js`](public/sw.js)) caches the app shell, and the storage adapter mirrors every write to `localStorage` under a per-user key. With no connection the app loads, shows your last known data, and accepts edits; queued writes are pushed on the `online` event. The header shows an "Offline" pill while disconnected.
- **Session reads must not touch the network.** `supabase.auth.getSession()` reads the persisted session locally; `getUser()` validates over the network and fails offline, which would strand a signed-in user on the sign-in screen. Use `getSession()` anywhere the offline path depends on it.
- **Offline edits win on reconnect.** Reconnecting pushes the local mirror over whatever the server holds. Combined with last-write-wins, editing offline on one device while another device edits online will lose one set of changes.
- **Local data is imported once**, on first sign-in, and only if that account's row is empty, so it can never clobber existing cloud data.
- Supabase free projects pause after ~a week of inactivity; the dashboard resumes them.

## How it works

**State** — one Zustand store in [`src/store.js`](src/store.js), wrapped in `persist`. Everything is saved under the localStorage key `temp-todo-store` — kept under the old project name deliberately, since renaming the key would orphan existing tasks. Because storage is per-browser and per-origin, your tasks don't travel with the project folder; copying the repo elsewhere starts you empty.

A task looks like:

```js
{
  id, title,
  categoryIds: [],              // many-to-many with categories
  status: 'todo' | 'inprogress' | 'done',
  deadline: '2026-08-14' | null,   // when it's due
  plannedDate: '2026-08-14' | null, // when you intend to do it
  notes, createdAt
}
```

**Grouping** — [`src/utils.js`](src/utils.js) files tasks into sections based on which of Day / Week / Month / Categories are ticked in the sidebar. A task is placed by `plannedDate`, falling back to `deadline`. Each task appears once: Today wins over This Week, which wins over This Month. Anything left over lands in "All Tasks" (or "Other" when date views are active), and completed tasks collect in "Done".

**Sorting** — within every group, `byDeadlineAsc` orders by deadline, soonest first. Undated tasks sort to the bottom rather than to the top (they're treated as `Infinity`, not epoch 0). Ties fall back to planned date, then `createdAt`, so ordering is stable and doesn't shuffle between renders. Note this is a *different* date from the one grouping uses — a task is filed by when you plan to do it, but ranked by when it's actually due.

**Overdue** — `deadlineState` returns `'overdue'` for a deadline before today, `'today'` for one landing today, and `null` otherwise. Completed tasks are never flagged, however old their deadline. The state drives the colour of the DUE chip on the card.

**Search** — the header search button (or <kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>K</kbd>) filters on task title, notes and category names at once. Results bypass grouping and render as one list that *includes* completed tasks, so a finished task is still findable while the Done group is collapsed. <kbd>Esc</kbd> closes.

**Components** — [`Sidebar`](src/components/Sidebar.jsx) drives view toggles and category CRUD (double-click a category to rename, hover to delete). [`AddTask`](src/components/AddTask.jsx) is a collapsed button that expands into the full form. [`TaskCard`](src/components/TaskCard.jsx) edits in place — the title is contenteditable, everything else is a plain input. Its header is one row — title, then PLAN and DUE chips at a fixed width so they line up column-to-column across cards. A native date input can't render a custom format, so each chip is a button showing `EEEE, d MMM yy` with the real `input[type=date]` sitting transparent behind it, opened via `showPicker()`; hovering a set date reveals a clear button. [`Calendar`](src/components/Calendar.jsx) is a modal showing two months with a free-text note per day. [`CategoryDialog`](src/components/CategoryDialog.jsx) handles both creating and editing a category (name + colour) — double-click a category to edit it. [`SettingsDialog`](src/components/SettingsDialog.jsx) holds the app name and accent colour, both persisted. Both use [`ColorField`](src/components/ColorField.jsx), which offers preset swatches, a native picker and a hex box with a live rgb readout; it commits as soon as the typed text is a valid colour, and snaps back on invalid input. [`ConfirmDialog`](src/components/ConfirmDialog.jsx) gates the two destructive actions — deleting a task, and deleting a category (which also untags it from every task, so the prompt states how many are affected). Cancel takes focus on open, so a stray Enter can never delete.

## Styling

All styling lives in [`src/index.css`](src/index.css) as design tokens plus semantic component classes — components carry `className`, not inline style objects. Change a token and it propagates everywhere:

```css
--bg: #f7f8fb;      /* page */
--surface: #ffffff; /* cards, inputs, sidebar */
--accent: #e9631a;  /* orange — fills; --accent-hover is the darker text shade */
--text: #16181f;
```

Every typing surface (`.input`, `.textarea`, and their `--title` / `--date` / `--flush` variants) shares one padding, radius and focus-ring rule, so fields line up across the add form, task cards, sidebar and calendar.

### Dark mode

Light/dark, toggled from the sidebar footer and persisted in the store. The theme is always pinned explicitly as `data-theme` on `<html>` — the OS preference is read only to pick the starting value on first run, after which your choice sticks.

Two rules when touching the palette:

1. **`:root` must hold the complete light palette**, with `[data-theme="dark"]` redefining the same names. Never give a color its only definition in the dark block, or light mode inherits a hole.
2. **`--accent` is a fill, `--accent-text` is text.** A vivid colour is unreadable as small text on white, and its dark shade is unreadable on near-black, so the two move in opposite directions between themes.

### Accent colour

`--accent` is the only authored accent value and is **user-configurable** (Appearance settings, sidebar footer). Every other shade — `--accent-hover`, `--accent-text`, `--accent-soft`, `--accent-border`, `--ring-color` — is derived from it with `color-mix()`: light mode darkens toward `#000`, dark mode lightens toward `#fff`. So setting one variable retints the whole app in both themes, and `[data-theme="dark"]` deliberately does *not* redefine `--accent` — it's the shared user value.

At runtime only `document.documentElement.style.setProperty('--accent', …)` is set; CSS does the rest. The pre-paint script in [`index.html`](index.html) applies the saved accent alongside the theme so there's no flash of the default orange.

### Layout and scrolling

`.app` owns the viewport (`height: 100dvh; overflow: hidden`) and never scrolls itself. Two independent scroll regions sit inside it: `.main` for the task column, and `.sidebar__scroll` for the nav body. The sidebar brand and the theme switcher sit outside that region so they stay pinned, and both regions use `overscroll-behavior: contain` so reaching the end of one doesn't start scrolling the other.

Below 720px this is all undone — the panes stack and the page goes back to a single normal scroll. Any new full-height layout rule needs a matching reset in that media query.

`color-scheme` is set per theme so native controls (date pickers, scrollbars) follow along. Category tags are tinted at runtime with `color-mix()` from an inline `--tag-color`, using per-theme mix ratios — that's what keeps an indigo tag legible on both a white and a near-black card. A small inline script in [`index.html`](index.html) applies the saved theme before first paint to avoid a flash of light.

Category colors come from `CATEGORY_COLORS` in [`src/store.js`](src/store.js). Because categories are persisted, changing that list needs a `persist` version bump and a `migrate` step — see the existing v1 migration.

Tailwind is still listed as a dependency and registered in [`vite.config.js`](vite.config.js), but nothing imports it. Safe to remove if you don't plan to use it.

## Stack

React 19 · Vite 8 · Zustand 5 · date-fns 4 · lucide-react
