// Animated loader: a silver ring with an orbiting lemon dot (echoes the logo).
export default function Loader({ label, size = 56, inline }) {
  return (
    <div role="status" aria-live="polite" style={{ display: 'flex', flexDirection: inline ? 'row' : 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: inline ? 0 : '8px 0' }}>
      <svg className="ld" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r="24" fill="none" stroke="#E3E5E8" strokeWidth="6" />
        <circle cx="32" cy="32" r="24" fill="none" stroke="#0A0A0A" strokeWidth="6" strokeLinecap="round" strokeDasharray="42 109" />
        <circle cx="32" cy="8" r="5.5" fill="#C8F135" stroke="#0A0A0A" strokeWidth="2" />
      </svg>
      {label && <span className="m" style={{ fontSize: 14, textAlign: 'center' }}>{label}</span>}
    </div>
  );
}
