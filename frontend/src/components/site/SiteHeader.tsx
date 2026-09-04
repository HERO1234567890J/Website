import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LocaleToggle, CurrencyToggle } from '@/i18n';

interface SiteHeaderProps {
  /**
   * `overlay` = transparent over a hero image. Toggles `.scrolled` class
   * at scrollY > 40px to switch into the solid-white pill state.
   * `default` = always solid (auth + account pages).
   */
  variant?: 'default' | 'overlay';
}

const NAV = [
  { to: '/tours', label: 'Tours' },
  { to: '/build-trip', label: 'Build My Trip' },
  { to: '/about', label: 'About Us' },
];

/**
 * Site header chrome — util-bar (black) + nav row.
 *
 * Stage 2: adds scroll-overlay state, mobile burger menu, active-link
 * highlighting, and body-scroll-lock when the menu is open.
 */
export function SiteHeader({ variant = 'default' }: SiteHeaderProps) {
  const isOverlay = variant === 'overlay';
  const headerRef = useRef<HTMLElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Overlay headers: toggle .scrolled when past 40px (matches Website/*.html
  // scroll handler logic). Uses classList.toggle for the boolean value.
  useEffect(() => {
    if (!isOverlay) return;
    const el = headerRef.current;
    if (!el) return;
    const onScroll = () => el.classList.toggle('scrolled', window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isOverlay]);

  // Close mobile menu whenever the route changes.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const isActive = (path: string) =>
    location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

  return (
    <header ref={headerRef} className={isOverlay ? 'header-overlay' : ''}>
      <div className="util-bar">
        <div className="wrap util-bar-row">
          <a href="tel:+201092878580" aria-label="Call us">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.362 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0122 16.92z" />
            </svg>
            Call us: 010 9287 8580
          </a>
          <span className="dot-sep" aria-hidden />
          <a href="#" aria-label="Instagram">
            Instagram
          </a>
          <span className="dot-sep" aria-hidden />
          <a href="#" aria-label="Facebook">
            Facebook
          </a>
          <span className="dot-sep" aria-hidden />
          <CurrencyToggle />
          <span className="dot-sep" aria-hidden />
          <LocaleToggle />
        </div>
      </div>
      <nav className="wrap nav-row">
        <Link to="/" className="brand" aria-label="D-Trips home">
          <img src="/brand/logo.png" alt="" className="brand-logo" />
          <div className="brand-text">
            <span className="brand-name">D—TRIPS</span>
            <span className="brand-tag">Directed trips, unforgettable premieres.</span>
          </div>
        </Link>
        <div className={`navlinks${mobileOpen ? ' show' : ''}`}>
          {NAV.map((item) => (
            <Link key={item.to} to={item.to} className={isActive(item.to) ? 'active' : ''}>
              {item.label}
            </Link>
          ))}
          <Link to="/login" className="nav-account">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
            </svg>
            My Account
          </Link>
        </div>
        <button
          className={`navtoggle${mobileOpen ? ' open' : ''}`}
          aria-label="Menu"
          aria-expanded={mobileOpen}
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
        >
          <span />
        </button>
        <Link to="/contact" className="btn-sun">
          Get in Touch
          <span className="arrow-dot" aria-hidden>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
        </Link>
      </nav>
    </header>
  );
}
