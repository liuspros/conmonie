'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from '@/components/Icon';

const TABS = [['/', 'Home', 'home'], ['/feed', 'Explore', 'compass'], ['/activities', 'Activities', 'activity'], ['/me', 'Me', 'user']];
export default function TabBar() {
  const p = usePathname();
  const on = (h) => (h === '/' ? p === '/' || p.startsWith('/g/') : h === '/activities' ? p.startsWith('/activities') || p.startsWith('/receipt') : p.startsWith(h));
  return (
    <nav className="tab" aria-label="Main">
      {TABS.map(([h, l, i]) => <Link key={h} href={h} data-tour={'tab-' + l.toLowerCase()} className={'ti' + (on(h) ? ' on' : '')} aria-current={on(h) ? 'page' : undefined}><Icon n={i} s={21} />{l}</Link>)}
    </nav>
  );
}
