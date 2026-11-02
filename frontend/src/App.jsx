import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'framer-motion';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import AppRoutes from './routes/AppRoutes';
import ErrorBoundary from './components/ErrorBoundary';
import OfflineBanner from './components/OfflineBanner';

const queryClient = new QueryClient();

export default function App() {
  return (
    <ErrorBoundary>
      <MotionConfig reducedMotion="user">
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ToastProvider>
              <BrowserRouter>
                <OfflineBanner />
                <AppRoutes />
              </BrowserRouter>
            </ToastProvider>
          </AuthProvider>
        </QueryClientProvider>
      </MotionConfig>
    </ErrorBoundary>
  );
}
