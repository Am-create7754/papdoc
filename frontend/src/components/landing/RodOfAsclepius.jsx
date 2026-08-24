// Decorative line-art only — a single serpent coiled around a staff (the traditional medical
// emblem), not the winged double-serpent caduceus used elsewhere in this app's PDF seal.
// Always pair with `pointer-events-none`, low opacity, and keep it clear of interactive elements.
export default function RodOfAsclepius({ className = '' }) {
  return (
    <svg viewBox="0 0 200 520" fill="none" className={className} aria-hidden="true">
      <circle cx="100" cy="24" r="10" stroke="currentColor" strokeWidth="3" />
      <line x1="100" y1="34" x2="100" y2="500" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path
        d="M 88 480
           C 40 460, 40 410, 100 390
           C 160 370, 160 320, 100 300
           C 40 280, 40 230, 100 210
           C 160 190, 160 140, 100 120
           C 70 108, 55 95, 60 78"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M 60 78 C 55 65, 65 52, 80 55 C 90 57, 92 68, 84 74 C 78 78, 66 80, 60 78 Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
