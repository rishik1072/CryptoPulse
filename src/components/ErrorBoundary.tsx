import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-[60vh] items-center justify-center text-center">
          <div>
            <h2 className="text-2xl font-semibold">Something went wrong</h2>
            <p className="mt-2 text-muted">Please refresh the page.</p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}