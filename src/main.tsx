import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// StrictMode disabled: it double-invokes effects in dev, which makes
// MapLibre's WebGL context get lost on remount (the first map's WebGL
// context is destroyed mid-init by the second mount). Re-enable behind
// a wrapper that excludes BasesMap if we want the StrictMode checks back.
createRoot(document.getElementById('root')!).render(<App />)
