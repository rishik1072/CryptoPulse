import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { AlertCircle, RotateCcw } from 'lucide-react'

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
        <div className="flex min-h-[50vh] items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl border border-[#FF5252]/20 bg-[#151921] p-6 text-center shadow-xl">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#FF5252]/10 text-[#FF5252] border border-[#FF5252]/20">
              <AlertCircle className="h-5 w-5" />
            </div>
            <h2 className="text-base font-semibold text-[#F0F4F8] font-heading">Something went wrong</h2>
            <p className="mt-1 text-xs text-[#94A3B8] leading-relaxed">
              An unexpected display error occurred while rendering this view. You can reload the application to restore view state.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFB300] hover:bg-[#FFA000] px-3.5 py-1.5 text-xs font-semibold text-slate-950 transition-colors cursor-pointer shadow-md shadow-[#FFB300]/15"
              >
                <RotateCcw className="h-3.5 w-3.5 text-slate-950" />
                <span>Reload page</span>
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}