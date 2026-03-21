import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { LeagueProvider } from './context/LeagueContext.jsx'

// 这里的 'root' 必须对应 index.html 里的 <div id="root"></div>
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LeagueProvider>
      <App />
    </LeagueProvider>
  </React.StrictMode>,
)