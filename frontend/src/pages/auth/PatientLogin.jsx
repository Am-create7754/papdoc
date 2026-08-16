import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import AuthLayout from './AuthLayout';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

export default function PatientLogin() {
  const { t } = useTranslation();
  const { loginPatient } = useAuth();
  const navigate = useNavigate();
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
      await loginPatient(data);
      navigate('/patient');
    } catch (err) {
      setServerError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <AuthLayout title={t('auth.patientLoginTitle')} subtitle={t('auth.patientLoginSubtitle')}>
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
      <p className="text-sm text-ink-muted mt-6 text-center">
        {t('auth.noAccount')}{' '}
        <Link to="/register/patient" className="text-primary-dark font-medium hover:underline">
          {t('auth.registerLink')}
        </Link>
      </p>
    </AuthLayout>
  );
}
