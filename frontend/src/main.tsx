import React from 'react'
import ReactDOM from 'react-dom/client'
// @ts-ignore - App.jsx is JavaScript, not TypeScript
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
