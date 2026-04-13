// @ts-nocheck
import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-red-100 p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="text-red-600" size={32} />
            </div>
            <h1 className="text-2xl font-black text-slate-900 mb-2">Something went wrong</h1>
            <p className="text-slate-500 mb-8 font-medium">
              An unexpected error occurred in the dashboard.
            </p>
            <div className="bg-slate-50 rounded-xl p-4 mb-8 text-left overflow-auto max-h-32">
              <code className="text-xs text-red-600 font-mono">
                {this.state.error?.message || 'Unknown error'}
              </code>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-slate-900 text-white font-black py-4 rounded-xl hover:bg-black transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw size={20} />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
