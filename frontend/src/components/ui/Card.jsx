export default function Card({ className = '', children, ...props }) {
  return (
    <div
      className={`bg-white rounded-card border border-line/70 shadow-soft ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
