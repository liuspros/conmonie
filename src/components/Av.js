export const PRESETS = [
  'linear-gradient(145deg,#fff,#B9BDC3)', 'linear-gradient(145deg,#4A4D53,#050506)', 'linear-gradient(145deg,#E3E5E8,#8C9097)',
  'linear-gradient(145deg,#C8F135,#7BA10C)', 'linear-gradient(145deg,#D3D6DA,#6B7076)', 'linear-gradient(145deg,#2E2E31,#D3D6DA)', 'linear-gradient(145deg,#B8D8FF,#6C9BD6)',
];
// Round avatar: photo, colour preset, with initials when a name is given.
export default function Av({ i = 0, size = 40, src, label }) {
  if (src) return <img src={src} alt="" className="av" style={{ width: size, height: size, objectFit: 'cover' }} />;
  const dark = i === 1 || i === 5;
  return <div className="av" aria-hidden="true" style={{ width: size, height: size, background: label ? '#ECEDEF' : PRESETS[i % PRESETS.length], color: dark && !label ? '#fff' : '#3A3D41', fontSize: size * 0.34, fontWeight: 600 }}>{label ? label.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() : ''}</div>;
}
// Group picture: uploaded photo, a colour preset (1-6), or the silver rocket by default.
export function GroupAv({ g, size = 48 }) {
  if (g.dp) return <img src={g.dp} alt="" style={{ width: size, height: size, borderRadius: size * 0.28, objectFit: 'cover', flex: 'none' }} />;
  if (g.avatar > 0) return <div style={{ width: size, height: size, borderRadius: size * 0.28, background: PRESETS[g.avatar % PRESETS.length], flex: 'none' }} aria-hidden="true" />;
  return <div style={{ width: size, height: size, borderRadius: size * 0.28, background: '#ECECEC', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><img src="/3d/rocket.jpg" alt="" width={size * 0.8} height={size * 0.8} style={{ mixBlendMode: 'multiply' }} /></div>;
}
