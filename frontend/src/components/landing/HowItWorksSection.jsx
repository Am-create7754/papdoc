import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { VIDEO_CONSULTATIONS_LIVE } from '../../constants/features';
import ResponsiveContainer from '../ui/ResponsiveContainer';
import Reveal from './Reveal';
import { UserIcon, MessageIcon, CardIcon, FileTextIcon, CheckCircleIcon } from '../layout/icons';
import FloatingMotif from './decor/FloatingMotif';
import { HeartbeatMotif } from './decor/MedicalMotifIcons';

// Each step gets a slightly deeper shade of the gold accent, so the path reads top-to-bottom
// like the reference infographic while staying inside the theme tokens.
const STEPS = [
  { key: 'step1', icon: UserIcon, tone: 'bg-primary-light' },
  { key: 'step2', icon: MessageIcon, tone: 'bg-primary' },
  { key: 'step3', icon: CardIcon, tone: 'bg-primary/85' },
  { key: 'step4', icon: FileTextIcon, tone: 'bg-primary/70' },
];

// Step 3 talks about video calls; while they're "coming soon" it uses the no-video wording.
function stepKey(stepId, field) {
  const noVideo = !VIDEO_CONSULTATIONS_LIVE && stepId === 'step3' && (field === 'Desc' || field === 'Point2');
  return `landing.steps.${stepId}${field}${noVideo ? 'NoVideo' : ''}`;
}

function StepNumber({ index, align }) {
  const { t } = useTranslation();
  return (
    <div className={align === 'right' ? 'text-right' : 'text-left'}>
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-muted">{t('landing.steps.stepLabel')}</p>
      <p className="font-display font-extrabold text-5xl lg:text-6xl leading-none text-primary-light">
        {String(index + 1).padStart(2, '0')}
      </p>
    </div>
  );
}

// The pill card. `side` is where the card sits relative to the centre line — its icon bubble
// always faces the line, and a small notch points at the line's marker.
function StepCard({ step, side }) {
  const { t } = useTranslation();
  const Icon = step.icon;
  const facesRight = side === 'left';

  return (
    <div
      className={`group relative flex items-center gap-4 ${step.tone} text-canvas rounded-[2.25rem] p-4 sm:p-5 shadow-pop transition-transform duration-300 hover:-translate-y-1 ${
        facesRight ? 'lg:flex-row-reverse lg:pl-7' : 'lg:pr-7'
      }`}
    >
      <span
        aria-hidden="true"
        className={`hidden lg:block absolute top-1/2 -translate-y-1/2 w-4 h-4 rotate-45 ${step.tone} ${
          facesRight ? '-right-1.5' : '-left-1.5'
        }`}
      />
      <span className="relative shrink-0 flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-surface text-primary-light ring-4 ring-canvas/15 shadow-soft">
        <Icon className="w-7 h-7 sm:w-8 sm:h-8" />
      </span>
      <div className={`relative min-w-0 ${facesRight ? 'lg:text-left' : ''}`}>
        <h3 className="font-display font-bold text-lg sm:text-xl leading-tight">{t(`landing.steps.${step.key}Title`)}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-canvas/80">{t(stepKey(step.key, 'Desc'))}</p>
        <ul className="mt-2.5 space-y-1">
          {['Point1', 'Point2'].map((p) => (
            <li key={p} className="flex items-start gap-1.5 text-[13px] font-medium text-canvas/90">
              <CheckCircleIcon className="w-4 h-4 shrink-0 mt-px" />
              <span>{t(stepKey(step.key, p))}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// Builds the dotted S-curve through the measured marker centres: a short tail above the first
// marker, a bulge between each pair (alternating sides, like the reference), and a tail below.
function buildPath(points) {
  if (points.length === 0) return '';
  const tail = 48;
  const bulge = 70;
  let d = `M ${points[0].x} ${points[0].y - tail} L ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const dx = i % 2 === 1 ? bulge : -bulge;
    const third = (b.y - a.y) / 3;
    d += ` C ${a.x + dx} ${a.y + third}, ${b.x + dx} ${b.y - third}, ${b.x} ${b.y}`;
  }
  const last = points[points.length - 1];
  return `${d} L ${last.x} ${last.y + tail}`;
}

// Measures where the desktop markers actually render so the path passes exactly through them
// at real pixel scale (a stretched viewBox would smear the dots). Re-measures on resize.
function useMarkerPath(containerRef, markerRefs) {
  const [path, setPath] = useState({ d: '', ends: [] });

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return undefined;

    // Layout offsets rather than getBoundingClientRect, so the rows' scroll-reveal slide-in
    // (a transform) doesn't shift the measured positions.
    const offsetWithin = (el) => {
      let x = el.offsetWidth / 2;
      let y = el.offsetHeight / 2;
      let node = el;
      while (node && node !== container) {
        x += node.offsetLeft;
        y += node.offsetTop;
        node = node.offsetParent;
      }
      return { x, y };
    };

    const measure = () => {
      const points = markerRefs.current.filter((el) => el && el.offsetParent !== null).map(offsetWithin);
      if (points.length === 0) return setPath({ d: '', ends: [] });
      const first = points[0];
      const last = points[points.length - 1];
      setPath({
        d: buildPath(points),
        ends: [
          { x: first.x, y: first.y - 48 },
          { x: last.x, y: last.y + 48 },
        ],
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef, markerRefs]);

  return path;
}

// Phone/tablet version of a step: a compact card in a horizontal swipe row, so the section stays
// about one screen tall instead of four stacked cards.
function MobileStepCard({ step, index }) {
  const { t } = useTranslation();
  const Icon = step.icon;
  return (
    <div className={`h-full flex flex-col rounded-[26px] p-5 text-canvas shadow-pop ${step.tone}`}>
      <div className="flex items-center justify-between">
        <span className="flex items-center justify-center w-12 h-12 rounded-full bg-surface text-primary-light ring-4 ring-canvas/15">
          <Icon className="w-6 h-6" />
        </span>
        <span className="text-right leading-none">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.25em] text-canvas/70">
            {t('landing.steps.stepLabel')}
          </span>
          <span className="font-display font-extrabold text-4xl">{String(index + 1).padStart(2, '0')}</span>
        </span>
      </div>
      <h3 className="mt-4 font-display font-bold text-lg leading-tight">{t(`landing.steps.${step.key}Title`)}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-canvas/80">{t(stepKey(step.key, 'Desc'))}</p>
      <ul className="mt-auto pt-3 space-y-1">
        {['Point1', 'Point2'].map((p) => (
          <li key={p} className="flex items-start gap-1.5 text-[13px] font-medium text-canvas/90">
            <CheckCircleIcon className="w-4 h-4 shrink-0 mt-px" />
            <span>{t(stepKey(step.key, p))}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Marker({ markerRef }) {
  return (
    <span
      ref={markerRef}
      className="relative z-10 flex items-center justify-center w-8 h-8 rounded-full bg-canvas ring-2 ring-primary-light">
      <span className="w-3 h-3 rounded-full bg-primary-light" />
    </span>
  );
}

export default function HowItWorksSection() {
  const { t } = useTranslation();
  const containerRef = useRef(null);
  const markerRefs = useRef([]);
  const path = useMarkerPath(containerRef, markerRefs);
  const [activeStep, setActiveStep] = useState(0);

  // Which card is mostly in view in the phone swipe row, for the step dots underneath.
  const onSwipe = (e) => {
    const el = e.currentTarget;
    const card = el.firstElementChild;
    if (!card) return;
    setActiveStep(Math.min(STEPS.length - 1, Math.round(el.scrollLeft / (card.offsetWidth + 12))));
  };

  return (
    <section id="how-it-works" className="relative scroll-mt-20 py-16 sm:py-20 lg:py-24">
      <FloatingMotif
        icon={HeartbeatMotif}
        className="hidden lg:block top-8 right-[4%]"
        size="w-10 h-10"
        tone="text-primary/20"
        duration={9}
        driftY={9}
      />
      <ResponsiveContainer>
        <Reveal className="max-w-2xl mx-auto text-center mb-8 lg:mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wide">{t('landing.steps.eyebrow')}</p>
          <h2 className="mt-2 font-display font-bold text-2xl sm:text-3xl text-ink tracking-tight">
            {t('landing.steps.title')}
          </h2>
          <p className="mt-3 text-ink-muted text-[15px] leading-relaxed">{t('landing.steps.subtitle')}</p>
        </Reveal>

        {/* Phones/tablets: swipeable row of step cards with progress dots. */}
        <div className="lg:hidden">
          <div
            onScroll={onSwipe}
            className="-mx-4 px-4 scroll-px-4 flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 [scrollbar-width:none]"
          >
            {STEPS.map((step, i) => (
              <div key={step.key} className="snap-start shrink-0 w-[80%] sm:w-[46%]">
                <MobileStepCard step={step} index={i} />
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-center gap-2" aria-hidden="true">
            {STEPS.map((step, i) => (
              <span
                key={step.key}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === activeStep ? 'w-6 bg-primary-light' : 'w-1.5 bg-line'
                }`}
              />
            ))}
          </div>
        </div>

        <div ref={containerRef} className="relative max-w-5xl mx-auto hidden lg:block">
          {/* Desktop: dotted S-curve through the markers. */}
          {path.d && (
            <svg aria-hidden="true" className="hidden lg:block absolute inset-0 w-full h-full overflow-visible pointer-events-none">
              <path
                d={path.d}
                fill="none"
                stroke="rgb(var(--color-primary-light) / 0.75)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeDasharray="0 10"
              />
              {path.ends.map((p) => (
                <circle key={`${p.x}-${p.y}`} cx={p.x} cy={p.y} r="6" fill="rgb(var(--color-ink-muted))" />
              ))}
            </svg>
          )}

          <ol className="relative space-y-6">
            {STEPS.map((step, i) => {
              const cardOnLeft = i % 2 === 0;
              return (
                <li key={step.key}>
                  <Reveal delay={i * 90}>
                    {/* Desktop: card | marker | number, alternating sides. */}
                    <div className="grid grid-cols-[1fr_5rem_1fr] items-center">
                      {cardOnLeft ? (
                        <StepCard step={step} side="left" />
                      ) : (
                        <div className="pr-6">
                          <StepNumber index={i} align="right" />
                        </div>
                      )}
                      <div className="flex justify-center">
                        <Marker
                          markerRef={(el) => {
                            markerRefs.current[i] = el;
                          }}
                        />
                      </div>
                      {cardOnLeft ? (
                        <div className="pl-6">
                          <StepNumber index={i} align="left" />
                        </div>
                      ) : (
                        <StepCard step={step} side="right" />
                      )}
                    </div>
                  </Reveal>
                </li>
              );
            })}
          </ol>
        </div>
      </ResponsiveContainer>
    </section>
  );
}
