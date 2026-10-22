import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './funciones.css'
import { AuthProvider } from './context/AuthContext.jsx'
import { CatalogoProvider } from './context/CatalogoContext.jsx'
import { IdiomaProvider } from './context/IdiomaContext.jsx'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <CatalogoProvider>
        <IdiomaProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </IdiomaProvider>
      </CatalogoProvider>
    </BrowserRouter>
  </StrictMode>,
)
