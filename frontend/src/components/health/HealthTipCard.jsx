import { useTranslation } from 'react-i18next';
import waterPhoto from '../../assets/images/tips/tip-water.jpg';
import sleepPhoto from '../../assets/images/tips/tip-sleep.jpg';
import walkPhoto from '../../assets/images/tips/tip-walk.jpg';
import platePhoto from '../../assets/images/tips/tip-plate.jpg';
import medicinePhoto from '../../assets/images/tips/tip-medicine.jpg';
import handwashPhoto from '../../assets/images/tips/tip-handwash.jpg';

// Photos are from Unsplash (free Unsplash License) — see assets/images/tips/CREDITS.md.
export const HEALTH_TIPS = [
  { key: 'water', photo: waterPhoto },
  { key: 'sleep', photo: sleepPhoto },
  { key: 'walk', photo: walkPhoto },
  { key: 'plate', photo: platePhoto },
  { key: 'medicine', photo: medicinePhoto },
  { key: 'handwash', photo: handwashPhoto },
];

// Same tip all day, a different one tomorrow — deterministic so it doesn't flicker on re-render.
export function tipOfTheDay(date = new Date()) {
  const dayNumber = Math.floor(date.getTime() / 86400000);
  return HEALTH_TIPS[dayNumber % HEALTH_TIPS.length];
}

// A photo "poster" tile: the tip's headline is written over the photo under a dark gold-tinted
// wash (same treatment as the hero portrait), with a short explanation underneath.
// `layout="row"` puts the photo beside the text for wider, shorter slots like the dashboard.
export default function HealthTipCard({ tip, index, layout = 'stack', label, className = '' }) {
  const { t } = useTranslation();
  const isRow = layout === 'row';
  const title = t(`tips.items.${tip.key}.title`);

  return (
    <article
      className={`group h-full overflow-hidden rounded-card border border-line bg-surface transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-pop ${
        isRow ? 'flex flex-col sm:flex-row' : 'flex flex-col'
      } ${className}`}
    >
      <div className={`relative overflow-hidden ${isRow ? 'h-48 sm:h-auto sm:w-72 shrink-0' : 'h-44 sm:h-56'}`}>
        <img
          src={tip.photo}
          alt=""
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(165deg, rgba(233,201,120,0.18) 0%, rgba(10,8,6,0.05) 40%, rgba(8,6,4,0.55) 100%)',
            mixBlendMode: 'multiply',
          }}
        />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

        <span className="absolute top-3 left-3 rounded-full bg-black/55 border border-primary/40 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary-light backdrop-blur-sm">
          {label || t('tips.badge', { number: String(index + 1).padStart(2, '0') })}
        </span>
        <h3 className="absolute inset-x-4 bottom-4 font-display font-bold text-base sm:text-xl leading-snug text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
          {title}
        </h3>
      </div>
      <div className="p-4 sm:p-5 flex-1 flex items-center">
        <p className="text-sm text-ink-muted leading-relaxed">{t(`tips.items.${tip.key}.desc`)}</p>
      </div>
    </article>
  );
}
