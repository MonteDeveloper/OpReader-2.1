import React from 'react'
import ReactDOM from 'react-dom/client'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import App from './App.jsx'
import theme from './theme'
import './index.css'
import { ReaderProvider } from './context/ReaderContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ReaderProvider>
        <App />
      </ReaderProvider>
    </ThemeProvider>
  </React.StrictMode>
)
