import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-brand-background flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center bg-white rounded-2xl shadow-sm border border-brand-border p-8">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="text-xl font-bold text-brand-text mb-2">Something went wrong</h2>
            <p className="text-brand-grey mb-6">An unexpected error occurred. Please refresh the page and try again.</p>
            <Button onClick={() => window.location.reload()} className="bg-brand-primary hover:bg-brand-secondary">
              Refresh Page
            </Button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
