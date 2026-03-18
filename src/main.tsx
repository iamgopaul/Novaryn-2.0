import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import { AppErrorBoundary } from '@/components/AppErrorBoundary'
import { logger } from '@/lib/logger'
import App from './App'
import './globals.css'

// Global error handlers so we see uncaught errors and promise rejections in logs
function setupGlobalErrorHandlers() {
  window.onerror = (message, source, lineno, colno, error) => {
    logger.error(
      String(message),
      'window.onerror',
      { source, lineno, colno, error: error != null ? { name: error.name, message: error.message, stack: error.stack } : undefined }
    )
    return false // let default handling still run if any
  }
  window.onunhandledrejection = (event) => {
    logger.error(
      'Unhandled promise rejection',
      'unhandledrejection',
      { reason: event.reason }
    )
    // Don't prevent default so devtools still show the rejection
  }
}
setupGlobalErrorHandlers()

const root = document.getElementById('root')
if (!root) {
  logger.error('Root element #root not found', 'main.tsx')
} else {
  createRoot(root).render(
    <StrictMode>
      <AppErrorBoundary>
        <BrowserRouter>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <App />
            <Toaster />
          </ThemeProvider>
        </BrowserRouter>
      </AppErrorBoundary>
    </StrictMode>
  )
}
