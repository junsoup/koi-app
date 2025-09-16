import { createRoot } from 'react-dom/client'
import KoiPond from './App'
import './index.css'

// Read URL param once, no need for state
const params = new URLSearchParams(window.location.search)
const headless = params.get('headless') === 'true'

// Optional: a tighter container style for iframe usage
const className = headless ? 'fixed inset-0 w-full h-full' : 'relative w-screen h-screen'



createRoot(document.getElementById('root')).render(
  <KoiPond headless={headless} className={className} />
)
