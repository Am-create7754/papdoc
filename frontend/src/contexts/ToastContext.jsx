import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircleIcon, AlertIcon, VideoIcon, CloseIcon } from '../components/layout/icons';

const ToastContext = createContext(null);

const ICONS = { success: CheckCircleIcon, info: VideoIcon, warning: AlertIcon };
const TONES = {
  success: 'border-success/25 text-success',
  info: 'border-primary/25 text-primary',
  warning: 'border-warning/25 text-warning',
};

// Lightweight, client-only in-app notifications — no backend model, no persistence, no read
// state. A toast fires at the exact moment a meaningful event happens on the page the user is
// already looking at. This is deliberately not a notification center: nothing is stored, so
// nothing to sync, mark-as-read, or lose on refresh.
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    (message, { tone = 'success', duration = 4500 } = {}) => {
      const id = ++counter.current;
      setToasts((prev) => [...prev, { id, message, tone }]);
      if (duration) setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[calc(100%-2rem)] sm:w-auto sm:max-w-sm"
        aria-live="polite"
        aria-atomic="false"
      >
        <AnimatePresence>
          {toasts.map((toast) => {
            const Icon = ICONS[toast.tone] || CheckCircleIcon;
            return (
              <motion.div
                key={toast.id}
                role="status"
                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97 }}
                transition={{ duration: 0.2 }}
                className={`flex items-start gap-2.5 bg-surface border rounded-card shadow-pop px-4 py-3 ${
                  TONES[toast.tone] || TONES.success
                }`}
              >
                <Icon className="w-4.5 h-4.5 shrink-0 mt-0.5" />
                <p className="text-sm text-ink flex-1">{toast.message}</p>
                <button
                  type="button"
                  onClick={() => dismiss(toast.id)}
                  aria-label="Dismiss notification"
                  className="text-ink-muted hover:text-ink shrink-0"
                >
                  <CloseIcon className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
