import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[REACT ERROR]", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '20px', 
          background: '#1a0f0f', 
          color: '#ff4444',
          fontFamily: 'monospace',
          border: '1px solid #ff4444',
          margin: '20px',
          borderRadius: '8px'
        }}>
          <h2>💥 Dashboard crashed - check console</h2>
          <pre>{this.state.error?.message}</pre>
          <p>Refresh the page to retry</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
