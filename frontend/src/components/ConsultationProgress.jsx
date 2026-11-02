import { useTranslation } from 'react-i18next';
import { CheckCircleIcon } from './layout/icons';

// Where a consultation is on its journey: submitted → paid → reviewed → prescription.
function progressOf(c) {
  return [
    { key: 'submitted', done: true },
    { key: 'paid', done: c.paymentStatus === 'paid' },
    { key: 'reviewed', done: ['responded', 'completed'].includes(c.status) },
    { key: 'prescription', done: c.prescriptionStatus === 'generated' },
  ];
}

export default function ConsultationProgress({ consultation }) {
  const { t } = useTranslation();
  const steps = progressOf(consultation);
  const reached = steps.filter((s) => s.done).length;

  return (
    <div className="mt-4">
      <div className="relative h-1.5 rounded-full bg-line/70 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-primary-light transition-all duration-700"
          style={{ width: `${(reached / steps.length) * 100}%` }}
        />
      </div>
      <ol className="mt-2 grid grid-cols-4 gap-1">
        {steps.map((s) => (
          <li
            key={s.key}
            className={`flex items-center gap-1 text-[11px] leading-tight ${s.done ? 'text-primary-light' : 'text-ink-muted/70'}`}
          >
            {s.done && <CheckCircleIcon className="w-3 h-3 shrink-0" />}
            <span className="truncate">{t(`home.progress.${s.key}`)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
