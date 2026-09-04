import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { WhatsAppFloat } from '@/components/site/WhatsAppFloat';
import { CookieConsent } from '@/components/site/CookieConsent';
import { trackPageView } from '@/lib/analytics/analytics';

interface PublicLayoutProps {
  /**
   * Header variant — `overlay` for hero pages (home, about, tours,
   * tour-detail, contact, build-trip*, checkout); `default` for
   * auth + account pages where the header is always solid.
   */
  variant?: 'default' | 'overlay';
}

/**
 * §31 — Page view tracker. Fires a GA page_view event on every
 * location change (only when consent has been granted and the GA
 * script is loaded). The callback is intentionally isolated from
 * booking/payment logic so a tracking failure can never block a
 * real transaction.
 */
function PageViewTracker() {
  const { pathname } = useLocation();
  useEffect(() => {
    trackPageView(pathname);
  }, [pathname]);
  return null;
}

/**
 * Public-site chrome wrapper — header + main + footer + WA float.
 * Routes nest inside via <Outlet />.
 *
 * The flex-column structure lets `.footer-shell` use `margin-top: auto`
 * to push itself to the bottom of the viewport on short pages.
 */
export function PublicLayout({ variant = 'default' }: PublicLayoutProps) {
  return (
    <div className="public-layout">
      <PageViewTracker />
      <SiteHeader variant={variant} />
      <main className="public-main">
        <Outlet />
      </main>
      <SiteFooter />
      <WhatsAppFloat />
      <CookieConsent />
    </div>
  );
}
