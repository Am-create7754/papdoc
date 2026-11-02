import { Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { PageLoader } from '../components/ui/Loader';

export default function ProtectedRoute({ role, children }) {
  const { t } = useTranslation();
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return <PageLoader label={t('common.loading')} />;
  }

  if (!isAuthenticated) {
    // Preserves the page a WhatsApp CTA (or any deep link) pointed at, so the doctor lands back
    // on the intended VideoSession/consultation screen after logging in instead of the generic
    // dashboard — see DoctorLogin's use of location.state.from.
    const loginPath = role === 'doctor' ? '/login/doctor' : '/login/patient';
    return <Navigate to={loginPath} replace state={{ from: `${location.pathname}${location.search}` }} />;
  }

  if (role && user.role !== role) {
    return <Navigate to="/" replace />;
  }

  return children;
}
