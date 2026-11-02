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
import GoogleSignInButton from '../../components/auth/GoogleSignInButton';

export default function PatientRegister() {
  const { t } = useTranslation();
  const { registerPatient, loginPatientWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');

  const schema = z
    .object({
      name: z.string().trim().min(2, t('auth.errors.nameMin')),
      email: z.string().trim().email(t('auth.errors.emailInvalid')),
      phone: z.string().trim().min(7, t('auth.errors.phoneMin')),
      password: z.string().min(8, t('auth.errors.passwordMin')),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('auth.errors.passwordMismatch'),
      path: ['confirmPassword'],
    });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data) => {
    setServerError('');
    try {
      const { confirmPassword, ...payload } = data;
      await registerPatient(payload);
      navigate('/patient');
    } catch (err) {
      setServerError(err.response?.data?.message || 'Registration failed');
    }
  };

  const onGoogleCredential = async (credential) => {
    setServerError('');
    try {
      await loginPatientWithGoogle(credential);
      navigate('/patient');
    } catch (err) {
      setServerError(err.response?.data?.message || t('auth.googleFailed'));
    }
  };

  return (
    <AuthLayout
      title={t('auth.registerTitle')}
      subtitle={t('auth.registerSubtitle')}
      footer={
        <>
          {t('auth.haveAccount')}{' '}
          <Link
            to="/login/patient"
            className="font-semibold text-primary-light underline decoration-primary/40 underline-offset-4 hover:text-primary hover:decoration-primary transition-colors"
          >
            {t('auth.loginLink')}
          </Link>
        </>
      }
    >
      {serverError && (
        <p className="mb-4 text-sm text-danger bg-danger-bg border border-danger/20 rounded-control p-3">
          {serverError}
        </p>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input label={t('auth.name')} autoComplete="name" {...register('name')} error={errors.name?.message} />
        <Input
          label={t('auth.email')}
          type="email"
          autoComplete="email"
          {...register('email')}
          error={errors.email?.message}
        />
        <Input
          label={t('auth.phone')}
          type="tel"
          autoComplete="tel"
          {...register('phone')}
          error={errors.phone?.message}
        />
        <Input
          label={t('auth.password')}
          type="password"
          autoComplete="new-password"
          {...register('password')}
          error={errors.password?.message}
        />
        <Input
          label={t('auth.confirmPassword')}
          type="password"
          autoComplete="new-password"
          {...register('confirmPassword')}
          error={errors.confirmPassword?.message}
        />
        <Button type="submit" disabled={isSubmitting} fullWidth size="lg">
          {isSubmitting ? t('auth.creatingAccount') : t('auth.registerButton')}
        </Button>
      </form>
      <GoogleSignInButton text="signup_with" onCredential={onGoogleCredential} />
    </AuthLayout>
  );
}
