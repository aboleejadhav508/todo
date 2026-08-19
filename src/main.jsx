import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Root from './Root.jsx'
import { isConfigured } from './lib/supabase'

// Without Supabase credentials the app runs exactly as before: local-only,
// no sign-in. That keeps `npm run dev` working with no backend set up.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isConfigured ? <Root /> : <App />}
  </StrictMode>,
)

// Service worker: makes the app shell load with no network. Registered only in
// production builds — in dev it would serve stale assets and fight HMR.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('[sw] registration failed:', err.message)
    })
  })
}
