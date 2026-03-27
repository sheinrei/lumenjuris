import React from 'react';

interface ErrorBoundaryState { hasError: boolean; error?: any; info?: any }

export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, info: any) {
    console.error('🔥 Erreur non interceptée React:', error, info);
    this.setState({ info });
  }

  handleReset = () => {
    // Recharger proprement l'app
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-6 text-center font-sans">
        <div className="max-w-lg bg-white shadow-lg rounded-lg p-6 border border-red-200">
          <h1 className="text-xl font-bold text-red-700 mb-4">⚠️ Une erreur est survenue</h1>
          <p className="text-sm text-red-600 mb-4">L'interface a rencontré un problème inattendu. Aucune donnée n'a été perdue.</p>
          {this.state.error && (
            <pre className="text-xs text-left bg-red-100 p-3 rounded max-h-48 overflow-auto mb-4">
{String(this.state.error?.message || this.state.error)}
            </pre>
          )}
          <button onClick={this.handleReset} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium">Recharger l'application</button>
        </div>
      </div>
    );
  }
}
