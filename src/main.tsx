import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import favicon from './assets/favicon.png'

// Set favicon dynamically (works with Vite's asset processing)
const faviconLink = document.getElementById('favicon') as HTMLLinkElement;
if (faviconLink) {
  faviconLink.href = favicon;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
