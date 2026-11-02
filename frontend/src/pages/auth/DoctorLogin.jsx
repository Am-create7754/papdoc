import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import AuthLayout from './AuthLayout';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

export default function DoctorLogin() {
  const { t } = useTranslation();
  const { loginDoctor } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState('');

  const schema = z.object({
    email: z.string().trim().email(t('auth.errors.emailInvalid')),
    password: z.string().min(1, t('auth.errors.passwordRequired')),
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data) => {
    setServerError('');
    try {
      await loginDoctor(data);
      // Only ever return the doctor into their own section of the app — location.state is
      // same-origin in practice, but this keeps an open-redirect impossible by construction.
      const from = location.state?.from;
      const destination = typeof from === 'string' && from.startsWith('/doctor') ? from : '/doctor';
      navigate(destination, { replace: true });
    } catch (err) {
      setServerError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <AuthLayout title={t('auth.doctorLoginTitle')} subtitle={t('auth.doctorLoginSubtitle')}>
      {serverError && (
        <p className="mb-4 text-sm text-danger bg-danger-bg border border-danger/20 rounded-control p-3">
          {serverError}
        </p>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label={t('auth.email')}
          type="email"
          autoComplete="email"
          {...register('email')}
          error={errors.email?.message}
        />
        <Input
          label={t('auth.password')}
          type="password"
          autoComplete="current-password"
          {...register('password')}
          error={errors.password?.message}
        />
        <Button type="submit" disabled={isSubmitting} fullWidth size="lg">
          {isSubmitting ? t('auth.loggingIn') : t('auth.loginButton')}
        </Button>
      </form>
    </AuthLayout>
  );
}
