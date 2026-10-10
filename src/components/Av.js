export const PRESETS = [
  'linear-gradient(145deg,#fff,#B9BDC3)', 'linear-gradient(145deg,#4A4D53,#050506)', 'linear-gradient(145deg,#E3E5E8,#8C9097)',
  'linear-gradient(145deg,#fff,#2E2E31)', 'linear-gradient(145deg,#D3D6DA,#6B7076)', 'linear-gradient(145deg,#2E2E31,#D3D6DA)',
];
export default function Av({ i = 0, size = 40, name = '' }) {
  return (
    <div className="av" style={{ width: size, height: size, background: PRESETS[i % PRESETS.length], fontSize: size / 2.6 }} aria-hidden="true">
      {size >= 36 ? '' : (name[0] || '').toUpperCase()}
    </div>
  );
}
