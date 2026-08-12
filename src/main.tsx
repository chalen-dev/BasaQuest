
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from "./contexts/AuthContext.tsx"
import { ThemeProvider } from "./contexts/ThemeContext.tsx"
import { LangProvider } from "./contexts/LangContext.tsx";
import { HintProvider } from "./contexts/HintContext.tsx";
const queryClient = new QueryClient()
createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <ThemeProvider>
                <LangProvider>
                    <AuthProvider>
                        <HintProvider>
                            <App />
                        </HintProvider>
                    </AuthProvider>
                </LangProvider>
            </ThemeProvider>
        </QueryClientProvider>
    </StrictMode>,
)