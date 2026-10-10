'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const svg = (d) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);
const TABS = [
  ['/', 'Home', svg(<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />)],
  ['/activities', 'Activities', svg(<path d="M3 12h4l3-8 4 16 3-8h4" />)],
  ['/me', 'Me', svg(<><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>)],
];
export default function TabBar() {
  const p = usePathname();
  const on = (h) => (h === '/' ? p === '/' || p.startsWith('/g/') : p.startsWith(h));
  return (
    <nav className="tab" aria-label="Main">
      {TABS.map(([h, l, i]) => (
        <Link key={h} href={h} className={'ti' + (on(h) ? ' on' : '')}>{i}{l}</Link>
      ))}
    </nav>
  );
}
