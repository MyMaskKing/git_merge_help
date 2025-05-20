import React from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class DiffEditorErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('DiffEditor error:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-4 space-y-4 border rounded-md bg-background text-foreground">
          <h3 className="text-lg font-semibold">编辑器加载失败</h3>
          <p className="text-sm text-muted-foreground">
            {this.state.error?.message || '发生了未知错误'}
          </p>
          <Button onClick={this.handleRetry}>重试</Button>
        </div>
      )
    }

    return this.props.children
  }
} 