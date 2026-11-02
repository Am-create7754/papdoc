// Ambient decorative icons only — thin line-art matching the app's icon style (fill: none,
// currentColor stroke), meant to be rendered small, low-opacity, and pointer-events-none via
// FloatingMotif. None of these carry semantic meaning on their own.
const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' };

export function CapsuleMotif({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <rect x="3" y="8.5" width="18" height="7" rx="3.5" transform="rotate(-35 12 12)" />
      <line x1="10.5" y1="6.3" x2="13.5" y2="17.7" transform="rotate(-35 12 12)" />
    </svg>
  );
}

export function TabletMotif({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <circle cx="12" cy="12" r="8.5" />
      <line x1="12" y1="3.5" x2="12" y2="20.5" />
    </svg>
  );
}

export function StethoscopeMotif({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M6 3.5v6a4 4 0 008 0v-6" />
      <path d="M10 13v2.5a5 5 0 0010 0V13" />
      <circle cx="20" cy="11.5" r="1.6" />
      <circle cx="6" cy="3.5" r="1.3" />
      <circle cx="10" cy="3.5" r="1.3" />
    </svg>
  );
}

export function MedicalCrossMotif({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

export function HeartbeatMotif({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M2 12h4l2 6 3-14 2.5 8H15l2-4 1.5 4H22" />
    </svg>
  );
}

export function MoleculeMotif({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <circle cx="6" cy="6" r="2" />
      <circle cx="18" cy="7" r="2" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="16" cy="16" r="2.4" />
      <path d="M7.6 7.3L14 15M8 16.3L15 8.7" />
    </svg>
  );
}
