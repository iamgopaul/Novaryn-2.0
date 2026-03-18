import { Component, type ErrorInfo, type ReactNode } from 'react'
import { logger } from '@/lib/logger'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'
import { Link } from 'react-router-dom'

interface Props {
  children: ReactNode
  onClose?: () => void
  /** Optional label for the close button */
  closeLabel?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class NovaChatErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error('Nova chat error', 'NovaChatErrorBoundary', error)
    logger.debug('Component stack', 'NovaChatErrorBoundary', { componentStack: info.componentStack })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 p-4 h-full min-h-[200px] text-center bg-muted/30 rounded-lg">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <p className="text-sm font-medium">Chat couldn’t load</p>
          <p className="text-xs text-muted-foreground max-w-[260px]">
            You can use the full Chat page instead, or try again later.
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Button variant="outline" size="sm" asChild>
              <Link to="/chatbot">Open Chat page</Link>
            </Button>
            {this.props.onClose && (
              <Button variant="ghost" size="sm" onClick={this.props.onClose}>
                {this.props.closeLabel ?? 'Close'}
              </Button>
            )}
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
