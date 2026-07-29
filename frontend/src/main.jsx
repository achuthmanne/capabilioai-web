import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initAnalytics } from './lib/analytics.js'
import ErrorBoundary from './components/ErrorBoundary.jsx'

initAnalytics()

// Vite fires this specific event when a lazy-loaded chunk fails to load
// (e.g. the browser's cached index.html points at a chunk hash that a
// newer deploy has since replaced/purged). This is the same failure mode
// ErrorBoundary guards against for in-tree render errors, but preload
// failures can also surface here, outside a component's render cycle —
// so both are handled. Guarded to reload at most once per session so a
// genuinely broken chunk can't loop forever.
window.addEventListener('vite:preloadError', () => {
  let alreadyTried = false
  try {
    alreadyTried = sessionStorage.getItem('capabilio_chunk_reload_attempted') === '1'
  } catch (_) { /* sessionStorage unavailable */ }

  if (!alreadyTried) {
    try { sessionStorage.setItem('capabilio_chunk_reload_attempted', '1') } catch (_) {}
    window.location.reload()
  }
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
