// ConGoal's signature visual: a progress ring in ConGoal blue. (Ajo's is the rotating ring with a dot.)
export default function GoalRing({ pct = 0, size = 160, stroke = 14, light, children }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, p = Math.max(0, Math.min(100, pct)), id = 'gr' + size + '-' + stroke + (light ? 'l' : 'd');
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }} role="img" aria-label={Math.round(p) + ' percent of the target'}>
        <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#2F7DE1" /><stop offset="1" stopColor="#7CC7FF" /></linearGradient></defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={light ? 'rgba(255,255,255,.28)' : '#D5E5F7'} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={'url(#' + id + ')'} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - p / 100)} style={{ transition: 'stroke-dashoffset .8s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', textAlign: 'center' }}>{children}</div>
    </div>
  );
}
