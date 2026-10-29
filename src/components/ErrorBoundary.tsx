import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

type Props = { children: ReactNode; resetKey?: string }
type State = { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error:', error, info.componentStack)
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null })
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="card w-full max-w-md p-8 text-center">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-[#fde3e6] text-[#f3263a]">
            <AlertTriangle className="size-7" />
          </div>
          <h1 className="font-display text-xl font-semibold text-[#0f2a3a]">Something went wrong</h1>
          <p className="mt-2 text-sm text-[#64748b]">
            This page hit an unexpected error. Your saved data is safe. Try again, or go back to your home screen.
          </p>
          <p className="mt-3 break-words rounded-lg bg-[#f1f5f9] px-3 py-2 text-left font-mono text-[11px] text-[#475569]">
            {this.state.error.message || 'Unknown error'}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button onClick={() => window.location.reload()} className="btn-primary px-5 py-2.5">
              Try again
            </button>
            <button onClick={() => (window.location.href = '/')} className="btn-secondary px-5 py-2.5">
              Go home
            </button>
          </div>
        </div>
      </div>
    )
  }
}
