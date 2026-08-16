import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { PageLoader } from '../components/ui/Loader';

export default function ProtectedRoute({ role, children }) {
  const { t } = useTranslation();
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return <PageLoader label={t('common.loading')} />;
  }

  if (!isAuthenticated) {
    return <Navigate to={role === 'doctor' ? '/login/doctor' : '/login/patient'} replace />;
  }

  if (role && user.role !== role) {
    return <Navigate to="/" replace />;
  }

  return children;
}
