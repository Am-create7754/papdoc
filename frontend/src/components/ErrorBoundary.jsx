import { Component } from 'react';
import { useTranslation } from 'react-i18next';
import Button from './ui/Button';

function ErrorFallback({ onReload }) {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-md text-center bg-surface border border-line rounded-card shadow-pop p-8">
        <h1 className="font-display font-bold text-2xl text-ink tracking-tight">{t('errors.crashTitle')}</h1>
        <p className="mt-3 text-ink-muted text-[15px]">{t('errors.crashMessage')}</p>
        <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={onReload}>{t('errors.reload')}</Button>
          <a href="/" className="w-full sm:w-auto">
            <Button variant="outline" fullWidth className="sm:w-auto">
              {t('errors.goHome')}
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}

// Catches render-time crashes anywhere below it so the patient sees a way out instead of a blank
// white screen. Error details go to the console in development only.
export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) {
      console.error('Unhandled UI error:', error, info.componentStack);
    }
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onReload={() => window.location.reload()} />;
    }
    return this.props.children;
  }
}
