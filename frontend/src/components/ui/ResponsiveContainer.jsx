export default function ResponsiveContainer({ className = '', children }) {
  return <div className={`max-w-content mx-auto px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>;
}
