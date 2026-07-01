import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mb-6">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-2 font-heading">
            Something went wrong
          </h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-md">
            An unexpected error occurred while rendering this section.
            {this.state.error?.message && (
              <span className="block mt-2 text-xs font-mono bg-muted p-2 rounded border border-border">
                {this.state.error.message}
              </span>
            )}
          </p>
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-on-primary text-sm font-medium hover:opacity-90 transition-all duration-200 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}