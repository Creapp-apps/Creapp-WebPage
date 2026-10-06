import React, { useEffect, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import AuthGuard from './components/auth/AuthGuard';
import { AuthProvider } from './context/AuthContext';
import { SmoothScroll } from './components/systems/SmoothScroll';
import PwaSplashScreen from './components/systems/PwaSplashScreen';

// Lazy loading de vistas para evitar cargar 4MB de golpe en dispositivos móviles
const LandingPage = React.lazy(() => import('./pages/LandingPage'));
const ProposalView = React.lazy(() => import('./pages/ProposalView'));
const ContractView = React.lazy(() => import('./pages/ContractView'));
const AdminLogin = React.lazy(() => import('./pages/admin/AdminLogin'));
const AdminPanel = React.lazy(() => import('./pages/admin/AdminPanel'));
const ProposalEditor = React.lazy(() => import('./pages/admin/ProposalEditor'));
const ControlCenter = React.lazy(() => import('./pages/admin/ControlCenter'));

// Fallback de carga visual elegante (evita pantalla en negro total)
const RouteLoadingFallback: React.FC = () => (
  <div className="min-h-screen bg-[#070709] flex flex-col items-center justify-center gap-4 text-white">
    <div className="relative flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-purple-500/20 border-t-pink-500 rounded-full animate-spin" />
    </div>
    <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
      Cargando CreAPP OS...
    </span>
  </div>
);

// Error Boundary para evitar que un fallo de render deje la pantalla 100% en negro
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[CreAPP App ErrorBoundary]', error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.removeItem('creapp-os-v1');
    } catch (e) {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#070709] text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4 text-2xl font-bold">
            !
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Hubo un problema al cargar esta sección</h2>
          <p className="text-xs text-zinc-400 max-w-sm mb-6 leading-relaxed">
            {this.state.error?.message || 'Error de inicialización del entorno o caché residual.'}
          </p>
          <div className="flex gap-3">
            <button
              onClick={this.handleReset}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-semibold uppercase tracking-wider shadow-lg active:scale-95 transition-all"
            >
              Recargar Aplicación
            </button>
            <a
              href="/"
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold uppercase tracking-wider transition-all"
            >
              Ir al Inicio
            </a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Restore native cursor on non-landing pages
const CursorRestorer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  useEffect(() => {
    const isLanding = location.pathname === '/';
    if (!isLanding) {
      document.body.classList.add('admin-cursor');
    } else {
      document.body.classList.remove('admin-cursor');
    }
    return () => {
      document.body.classList.remove('admin-cursor');
    };
  }, [location.pathname]);

  return <>{children}</>;
};

// SmoothScroll solo debe envolver la Landing Page
const LandingSmoothScrollWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const isLanding = location.pathname === '/';

  if (!isLanding) {
    return <>{children}</>;
  }

  return <SmoothScroll>{children}</SmoothScroll>;
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <PwaSplashScreen />
      <AuthProvider>
        <ErrorBoundary>
          <CursorRestorer>
            <LandingSmoothScrollWrapper>
              <Suspense fallback={<RouteLoadingFallback />}>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/propuesta/:slug" element={<ProposalView />} />
                  <Route path="/contrato/:id" element={<ContractView />} />

                  {/* Admin Routes (Protected) */}
                  <Route path="/admin/login" element={<AdminLogin />} />
                  <Route path="/admin" element={<AuthGuard><AdminPanel /></AuthGuard>} />
                  <Route path="/admin/propuesta/:id" element={<AuthGuard><ProposalEditor /></AuthGuard>} />
                  <Route path="/admin/propuesta/nueva" element={<AuthGuard><ProposalEditor /></AuthGuard>} />
                  <Route
                    path="/admin/control-center"
                    element={<AuthGuard allowedRoles={['admin']}><ControlCenter /></AuthGuard>}
                  />
                </Routes>
              </Suspense>
            </LandingSmoothScrollWrapper>
          </CursorRestorer>
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
