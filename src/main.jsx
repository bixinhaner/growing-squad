import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import './pages/comfort.css'
import './pages/comfort-polish.css'
import './pages/comfort-controls.css'
import './styles/evolution.css'
import { appPath } from './data/paths.js'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register(appPath('sw.js'), { scope: appPath() }))
}
