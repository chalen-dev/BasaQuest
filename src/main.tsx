import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from "./contexts/AuthContext.tsx"
import { ThemeProvider } from "./contexts/ThemeContext.tsx"
import {LangProvider} from "./contexts/LangContext.tsx";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
      <ThemeProvider>
          <LangProvider>
              <AuthProvider>
                  <App />
              </AuthProvider>
          </LangProvider>
      </ThemeProvider>
  </StrictMode>,
)
