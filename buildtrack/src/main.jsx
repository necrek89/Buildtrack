import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import LandingPage from './pages/LandingPage.jsx'
import InstallPage from './pages/InstallPage.jsx'
import { TermsPage, PrivacyPage, RefundPage } from './pages/LegalPage.jsx'

// Card magic glow — event delegation, works for dynamically added cards
document.addEventListener('mousemove', e => {
  const card = e.target.closest('.card, .card-glow')
  if (card) {
    const r = card.getBoundingClientRect()
    card.style.setProperty('--mouse-x', ((e.clientX - r.left) / r.width * 100) + '%')
    card.style.setProperty('--mouse-y', ((e.clientY - r.top) / r.height * 100) + '%')
  }
})

function Router() {
  const [path, setPath] = useState(window.location.pathname)

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // Expose navigate globally for use in App.jsx and LandingPage
  window.__navigate = (to) => {
    window.history.pushState({}, '', to)
    setPath(to)
  }

  if (path === '/') return <LandingPage />
  if (path === '/install') return <InstallPage />
  if (path === '/terms') return <TermsPage />
  if (path === '/privacy') return <PrivacyPage />
  if (path === '/refund') return <RefundPage />
  return <App />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Router />
  </StrictMode>
)
