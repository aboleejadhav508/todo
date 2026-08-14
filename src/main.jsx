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
