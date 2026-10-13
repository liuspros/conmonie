'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from '@/components/Icon';

const TABS = [['/', 'Home', 'home'], ['/feed', 'Explore', 'compass'], ['/activities', 'Activities', 'activity'], ['/me', 'Me', 'user']];
export default function TabBar() {
  const p = usePathname(), [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const on = (h) => (h === '/' ? p === '/' || p.startsWith('/g/') || p.startsWith('/goal') || p.startsWith('/ajos') : h === '/activities' ? p.startsWith('/activities') || p.startsWith('/receipt') : p.startsWith(h));
  if (!mounted) return null;
  // In <body> so no page wrapper (lock screen, transforms) can ever move it away from the bottom edge.
  return createPortal(
    <div className="tabw">
      <nav className="tab" aria-label="Main">
        {TABS.map(([h, l, i]) => <Link key={h} href={h} data-tour={'tab-' + l.toLowerCase()} className={'ti' + (on(h) ? ' on' : '')} aria-current={on(h) ? 'page' : undefined}><Icon n={i} s={21} />{l}</Link>)}
      </nav>
    </div>, document.body);
}
