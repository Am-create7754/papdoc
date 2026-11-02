export default function Card({ className = '', children, ...props }) {
  return (
    <div
      className={`bg-surface/80 backdrop-blur-sm rounded-card border border-line/70 shadow-soft ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
