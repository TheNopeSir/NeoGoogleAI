import React, { ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("🔴 [ErrorBoundary] Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[10000] p-4 md:p-10 bg-black text-green-500 font-mono h-screen overflow-auto">
          <h1 className="text-2xl font-bold mb-4 border-b border-green-500 pb-2 animate-pulse">
            SYSTEM FAILURE [FATAL ERROR]
          </h1>
          <p className="mb-4 text-sm opacity-80">
            Произошел сбой визуализации. Данные для отладки:
          </p>
          <pre className="text-xs bg-green-900/20 p-4 border border-green-500/50 rounded overflow-auto mb-4 whitespace-pre-wrap break-all">
             {this.state.error && this.state.error.toString()}
             <br/>
             {this.state.errorInfo?.componentStack}
          </pre>
          <button 
             onClick={() => window.location.reload()}
             className="border border-green-500 px-4 py-2 hover:bg-green-500 hover:text-black transition-colors uppercase text-sm font-bold"
          >
             ПЕРЕЗАГРУЗКА / REBOOT
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;