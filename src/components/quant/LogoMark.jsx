export default function LogoMark({ className = 'w-9 h-9' }) {
  return (
    <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
      <g className="fill-primary">
        {[0, 45, 90, 135].map((r) => (
          <rect key={r} x="16" y="3" width="4" height="30" rx="2" transform={`rotate(${r} 18 18)`} />
        ))}
      </g>
    </svg>
  );
}