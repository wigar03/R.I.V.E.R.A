'use client';
import { useEffect, useRef, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { BrandMark } from './BrandMark';

export interface NavLink {
  href: string;
  label: string;
  cta?: boolean;
}

export function Header({ links }: { links: NavLink[] }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    const onResize = () => window.innerWidth >= 900 && setOpen(false);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  return (
    <header className="site-header" data-scrolled={scrolled}>
      <div className="header-inner">
        <a className="brand" href="/" aria-label="R.I.V.E.R.A., inicio">
          <BrandMark className="brand-mark" />
          <span className="brand-name">
            R.I.V.E.R.A.
            <small>ECO-RIEGO VERTICAL</small>
          </span>
        </a>
        <button
          ref={toggleRef}
          className="nav-toggle"
          aria-expanded={open}
          aria-controls="site-nav"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
          <span>{open ? 'Cerrar' : 'Menú'}</span>
        </button>
        <nav id="site-nav" className="nav-panel" data-open={open} aria-label="Navegación principal">
          <ul className="nav-list">
            {links.map((link) => (
              <li key={link.href}>
                <a href={link.href} className={link.cta ? 'nav-cta' : undefined} onClick={() => setOpen(false)}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
