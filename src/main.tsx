import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const root = document.getElementById('root')

if (!root) {
  throw new Error('ForkRoom could not find its application root.')
}

createRoot(root).render(<App />)
