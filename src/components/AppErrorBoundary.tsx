import { Component, type ErrorInfo, type ReactNode } from 'react'
import { logger } from '@/lib/logger'
import { reportError } from '@/lib/error-handling'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError(error, 'AppErrorBoundary')
    logger.error('React component stack', 'AppErrorBoundary', { componentStack: info.componentStack })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive" aria-hidden />
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            The app hit an error. Try refreshing the page. If it keeps happening, check the browser console (F12) for details.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button asChild>
              <Link to="/">Go home</Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
            >
              Refresh page
            </Button>
          </div>
          {import.meta.env.DEV && this.state.error && (
            <pre className="mt-4 max-w-2xl overflow-auto rounded-lg border bg-muted p-4 text-left text-xs">
              {this.state.error.message}
              {'\n\n'}
              {this.state.error.stack}
            </pre>
          )}
        </div>
      )
    }
    return this.props.children
  }
}
