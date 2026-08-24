// Bespoke wordmark: an abstracted single serpent coiled around a staff (echoing the Rod of
// Asclepius motif used elsewhere on the page) rendered as a flat-vector glyph, paired with a
// Syne wordmark — distinct from the generic circle/cross icon this used to be.
export default function Logo({ className = '', iconClassName = 'w-[26px] h-[26px]' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 font-display font-extrabold text-lg tracking-tight text-ink ${className}`}>
      <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={iconClassName}>
        <line x1="16" y1="4" x2="16" y2="28" stroke="currentColor" strokeWidth="1.5" opacity="0.55" />
        <path
          d="M8 8c4 1.7 4 5.3 8 7s4 5.3 8 7"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
          className="text-primary"
        />
      </svg>
      Healthify
    </span>
  );
}
