const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };

export function HomeIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9a1 1 0 001 1H9a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h2.5a1 1 0 001-1v-9" />
    </svg>
  );
}

export function ConsultIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

export function HistoryIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M4 6h16M4 12h16M4 18h10" />
    </svg>
  );
}

export function PillIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <rect x="3.5" y="8.5" width="17" height="7" rx="3.5" transform="rotate(-45 12 12)" />
      <path d="M9.5 9.5l5 5" />
    </svg>
  );
}

export function UserIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20a7.5 7.5 0 0115 0" />
    </svg>
  );
}

export function LogoutIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M9 4H6a1.5 1.5 0 00-1.5 1.5v13A1.5 1.5 0 006 20h3" />
      <path d="M14 16l4-4-4-4M18 12H9" />
    </svg>
  );
}
