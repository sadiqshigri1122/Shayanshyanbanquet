import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App render error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', padding: 32, fontFamily: 'system-ui', background: '#f8f9fa', color: '#1a1a1a' }}>
          <h1 style={{ fontSize: 24, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ marginBottom: 16, color: '#666' }}>
            The app hit an error while loading. Try refreshing the page. If API mode is on, make sure the backend is running on port 3001.
          </p>
          <pre style={{ background: '#fff', border: '1px solid #e0e0e0', padding: 16, borderRadius: 8, overflow: 'auto', fontSize: 13 }}>
            {this.state.error.message}
          </pre>
          <p style={{ marginTop: 16 }}>
            <a href="/login" style={{ color: '#3282B8' }}>Go to login</a>
            {' · '}
            <a href="http://localhost:5173" style={{ color: '#3282B8' }}>Open frontend (5173)</a>
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
