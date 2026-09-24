import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './navigation.css'
import App from './App'
import { initObservability } from './utils/observability'

// Restore a direct GitHub Pages URL redirected by 404.html before routing.
const restoredPath = new URLSearchParams(window.location.search).get('__route');
if (restoredPath?.startsWith('/') && !restoredPath.startsWith('//')) {
  window.history.replaceState(null, '', `${import.meta.env.BASE_URL.replace(/\/$/, '')}${restoredPath}`);
}

initObservability()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
