import React from 'react'
import ReactDOM from 'react-dom/client'
import { Buffer } from 'buffer'
import App from '@/App.jsx'
import '@/index.css'

if (typeof globalThis !== 'undefined' && !globalThis.Buffer) {
  globalThis.Buffer = Buffer
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
