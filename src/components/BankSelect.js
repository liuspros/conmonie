import { BANKS } from '@/lib/banks';
export default function BankSelect({ value, onChange, dark, required }) {
  const list = value && !BANKS.includes(value) ? [value, ...BANKS] : BANKS;
  return (
    <select className="inp" required={required} value={value || ''} onChange={(e) => onChange(e.target.value)} aria-label="Bank"
      style={dark ? { background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.14)', color: '#fff' } : undefined}>
      <option value="" style={{ color: '#0A0A0A' }}>Select bank</option>
      {list.map((b) => <option key={b} value={b} style={{ color: '#0A0A0A' }}>{b}</option>)}
    </select>
  );
}
