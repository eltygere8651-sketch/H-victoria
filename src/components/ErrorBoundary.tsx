import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = 'Ha ocurrido un error inesperado.';
      let details = '';

      try {
        // Check if it's a Firestore JSON error
        const parsed = JSON.parse(this.state.error?.message || '');
        if (parsed.error && parsed.authInfo) {
          errorMessage = 'Error de permisos en la base de datos.';
          details = `Operación: ${parsed.operationType} en ${parsed.path}`;
        }
      } catch (e) {
        // Not a JSON error
        details = this.state.error?.message || '';
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl border border-red-100 dark:border-red-900/20 text-center">
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600 dark:text-red-400"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">¡Ups! Algo salió mal</h1>
            <p className="text-slate-600 dark:text-slate-400 font-medium mb-6">{errorMessage}</p>
            
            {details && (
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 mb-6 text-left">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Detalles técnicos</p>
                <p className="text-xs font-mono text-slate-500 dark:text-slate-400 break-all">{details}</p>
              </div>
            )}

            <button
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-red-600/20"
            >
              Recargar Aplicación
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
