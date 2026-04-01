import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext.tsx'
import { ViewModeProvider } from './context/ViewModeContext.tsx'
import { Toaster } from './components/ui/toaster.tsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,           // always re-fetch — never serve stale data from cache
      gcTime: 1000 * 60 * 2, // discard unused cache after 2 min
      retry: 1,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ViewModeProvider>
            <App />
            <Toaster />
          </ViewModeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
)
