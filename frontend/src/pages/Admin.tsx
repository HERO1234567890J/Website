import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ImageUpload } from '@/lib/api/image-upload';
import {
  getDashboard,
  getRevenueTimeseries,
  type DashboardSnapshot,
  type RevenueTimeseriesResponse,
} from '@/lib/api/admin-dashboard';
import {
  createAdminTour,
  listAdminTours,
  unpublishAdminTour,
  updateAdminTour,
  type AdminTour,
  type AdminTourCategory,
  type AdminTourDestination,
  type AdminTourPayload,
} from '@/lib/api/admin-tours';
import {
  listTourDates,
  createTourDate,
  updateTourDate,
  deleteTourDate,
  cancelTourDate,
  type AdminTourDate,
} from '@/lib/api/admin-tour-dates';
import {
  getAdminBooking,
  listAdminBookings,
  updateAdminBooking,
  getBookingsStats,
  type AdminBooking,
  type AdminBookingStatus,
  type BookingsStats,
} from '@/lib/api/admin-bookings';
import {
  exportUsersCsv,
  listAdminUsers,
  setAdminUserBlocked,
  updateAdminUserRole,
  type AdminUser,
  type AdminUserRole,
} from '@/lib/api/admin-users';
import {
  approveAdminReview,
  listAdminReviews,
  rejectAdminReview,
  type AdminReview,
  type AdminReviewStatus,
} from '@/lib/api/admin-reviews';
import {
  createAdminFaq,
  deactivateAdminFaq,
  listAdminFaqs,
  updateAdminFaq,
  type AdminFaq,
  type AdminFaqPayload,
} from '@/lib/api/admin-faqs';
import {
  listAdminLanguages,
  createAdminLanguage,
  updateAdminLanguage,
  setAdminLanguageDefault,
  type AdminLanguage,
  type AdminLanguageCreate,
  type AdminLanguageUpdate,
} from '@/lib/api/admin-languages';
import {
  listAdminCurrencies,
  createAdminCurrency,
  updateAdminCurrency,
  type AdminCurrency,
  type AdminCurrencyCreate,
  type AdminCurrencyUpdate,
} from '@/lib/api/admin-currencies';
import {
  createAdminPromoCode,
  deactivateAdminPromoCode,
  listAdminPromoCodes,
  listAdminPromoRedemptions,
  updateAdminPromoCode,
  type AdminPromoCode,
  type AdminPromoCodeCreate,
  type AdminPromoRedemption,
} from '@/lib/api/admin-promo-codes';
import {
  listAdminContactMessages,
  updateAdminContactMessage,
  type AdminContactMessage,
  type ContactMessageStatus,
} from '@/lib/api/admin-contact-messages';
import {
  listAdminAuditLog,
  type AuditLogEntry,
} from '@/lib/api/admin-audit-log';
import {
  getSiteContentBatch,
  putAdminSiteContent,
} from '@/lib/api/admin-site-content';
import { useAuth } from '@/auth/AuthContext';
import { listCategories } from '@/lib/api/categories';
import { listDestinations } from '@/lib/api/destinations';
import { formatPrice, formatTourDate } from '@/lib/api/format';
import { useLocale } from '@/i18n';

type AdminPage = 'dashboard' | 'tours' | 'bookings' | 'users' | 'reviews' | 'faqs' | 'settings';

const TITLES: Record<AdminPage, string> = {
  dashboard: 'Dashboard & Analytics',
  tours: 'Tours & Trips',
  bookings: 'Bookings & Orders',
  users: 'Users',
  reviews: 'Reviews & Testimonials',
  faqs: 'FAQs',
  settings: 'Site Content & Settings',
};

export function Admin() {
  const [page, setPage] = useState<AdminPage>('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="shell">
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`} id="sidebar">
        <a href="/" className="side-brand">
          <img src="/brand/logo.png" alt="" />
          <div>
            <span className="brand-name">D—TRIPS</span>
            <span className="brand-tag">Admin Panel</span>
          </div>
        </a>
        <nav className="side-nav">
          <div className="side-group-label">Overview</div>
          <a
            className={`side-link ${page === 'dashboard' ? 'active' : ''}`}
            data-page="dashboard"
            onClick={(e) => {
              e.preventDefault();
              setPage('dashboard');
              setMobileOpen(false);
            }}
            href="#"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="3" width="8" height="8" rx="2" />
              <rect x="13" y="3" width="8" height="8" rx="2" />
              <rect x="3" y="13" width="8" height="8" rx="2" />
              <rect x="13" y="13" width="8" height="8" rx="2" />
            </svg>
            Dashboard &amp; Analytics
          </a>

          <div className="side-group-label">Manage</div>
          <a
            className={`side-link ${page === 'tours' ? 'active' : ''}`}
            data-page="tours"
            onClick={(e) => {
              e.preventDefault();
              setPage('tours');
              setMobileOpen(false);
            }}
            href="#"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M21 10c0 6-9 12-9 12S3 16 3 10a9 9 0 0118 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            Tours &amp; Trips<span className="count">18</span>
          </a>
          <a
            className={`side-link ${page === 'bookings' ? 'active' : ''}`}
            data-page="bookings"
            onClick={(e) => {
              e.preventDefault();
              setPage('bookings');
              setMobileOpen(false);
            }}
            href="#"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M3 10h18M8 3v4M16 3v4" />
            </svg>
            Bookings &amp; Orders<span className="count">7</span>
          </a>
          <a
            className={`side-link ${page === 'users' ? 'active' : ''}`}
            data-page="users"
            onClick={(e) => {
              e.preventDefault();
              setPage('users');
              setMobileOpen(false);
            }}
            href="#"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="9" cy="8" r="3" />
              <path d="M2 20c0-3.9 3.1-7 7-7s7 3.1 7 7" />
              <circle cx="18" cy="9" r="2.2" />
              <path d="M15.5 13.2c2.9.3 5.1 2.8 5.5 6.3" />
            </svg>
            Users
          </a>
          <a
            className={`side-link ${page === 'reviews' ? 'active' : ''}`}
            data-page="reviews"
            onClick={(e) => {
              e.preventDefault();
              setPage('reviews');
              setMobileOpen(false);
            }}
            href="#"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 17.3 6.2 20l1.1-6.5L2.5 9l6.5-.9L12 2.2l3 5.9 6.5.9-4.8 4.5 1.1 6.5z" />
            </svg>
            Reviews
          </a>

          <div className="side-group-label">Content</div>
          <a
            className={`side-link ${page === 'faqs' ? 'active' : ''}`}
            data-page="faqs"
            onClick={(e) => {
              e.preventDefault();
              setPage('faqs');
              setMobileOpen(false);
            }}
            href="#"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="9" />
              <path d="M9.5 9a2.5 2.5 0 015 .3c0 1.7-2.2 1.9-2.5 3.5M12 17h.01" />
            </svg>
            FAQs
          </a>
          <a
            className={`side-link ${page === 'settings' ? 'active' : ''}`}
            data-page="settings"
            onClick={(e) => {
              e.preventDefault();
              setPage('settings');
              setMobileOpen(false);
            }}
            href="#"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="3.2" />
              <path d="M19.4 13a1.7 1.7 0 00.34 1.87l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.7 1.7 0 00-1.87-.34 1.7 1.7 0 00-1 1.55V19a2 2 0 11-4 0v-.09a1.7 1.7 0 00-1-1.56 1.7 1.7 0 00-1.87.34l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.7 1.7 0 00.34-1.87 1.7 1.7 0 00-1.55-1H4a2 2 0 110-4h.09a1.7 1.7 0 001.56-1 1.7 1.7 0 00-.34-1.87l-.06-.06a2 2 0 112.83-2.83l.06.06a1.7 1.7 0 001.87.34H10a1.7 1.7 0 001-1.55V4a2 2 0 114 0v.09a1.7 1.7 0 001 1.55 1.7 1.7 0 001.87-.34l.06-.06a2 2 0 112.83 2.83l-.06.06a1.7 1.7 0 00-.34 1.87V10a1.7 1.7 0 001.55 1H20a2 2 0 110 4h-.09a1.7 1.7 0 00-1.55 1z" />
            </svg>
            Site Content &amp; Settings
          </a>
        </nav>
        <div className="side-foot">
          <a href="/" className="side-view-site">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
              <path d="M15 3h6v6M10 14L21 3" />
            </svg>
            View Live Site
          </a>
        </div>
      </aside>

      <div className="main-col">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              className="icon-btn menu-toggle"
              aria-label="Menu"
              onClick={() => setMobileOpen((o) => !o)}
              type="button"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
            <div className="topbar-title">
              <div className="eyebrow eyebrow-soft">D-Trips / Admin</div>
              <h1 id="pageTitle">{TITLES[page]}</h1>
            </div>
          </div>
          <div className="topbar-right">
            <div className="search-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
              <input type="text" placeholder="Search tours, bookings, users…" />
            </div>
            <div className="bell-wrap icon-btn" aria-label="Notifications">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.7 21a2 2 0 01-3.4 0" />
              </svg>
              <span className="bell-dot" />
            </div>
            <div className="admin-chip">
              <div className="admin-avatar">DF</div>
              <div className="who">
                <b>David Fakher</b>
                <span>Super Admin</span>
              </div>
            </div>
          </div>
        </header>

        <div className="content">
          {/* DASHBOARD */}
          {page === 'dashboard' && <DashboardSection onNavigate={setPage} />}

          {/* TOURS */}
          {page === 'tours' && <ToursSection />}

          {/* BOOKINGS */}
          {page === 'bookings' && <BookingsSection />}

          {/* USERS */}
          {page === 'users' && <UsersSection />}

          {/* REVIEWS */}
          {page === 'reviews' && <ReviewsSection />}

          {/* FAQS */}
          {page === 'faqs' && <FaqsSection />}

          {/* SETTINGS */}
          {page === 'settings' && <SettingsSection />}
        </div>
      </div>
    </div>
  );
}

// ─── dashboard section ───────────────────────────────────────────────

const CATEGORY_DONUT_COLORS = ['var(--sun)', 'var(--ink)', 'var(--line)', '#888c92', '#b3b7bd'];

function DashboardSection({ onNavigate }: { onNavigate: (p: AdminPage) => void }) {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getDashboard()
      .then((s) => {
        if (!cancelled) setSnapshot(s);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="page-section active" id="page-dashboard">
      <div className="page-head">
        <div>
          <div className="eyebrow">Overview</div>
          <h2>Dashboard &amp; Analytics</h2>
        </div>
        <div className="page-head-actions">
          <a href="#" className="btn-ghost">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 3v13m0 0l-4-4m4 4l4-4M4 21h16" />
            </svg>
            Export Report
          </a>
        </div>
      </div>

      {error && (
        <p role="alert" style={{ color: 'var(--error)', fontSize: 14, marginBottom: 16 }}>
          {error}
        </p>
      )}

      {!snapshot && !error && (
        <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>Loading dashboard…</p>
      )}

      {snapshot && (
        <>
          <DashboardStatGrid snapshot={snapshot} />

          <RevenueChart />

          <div className="grid-2">
            <DashboardStatusCard snapshot={snapshot} />
            <DashboardCategoryCard snapshot={snapshot} />
          </div>

          <div className="grid-2">
            <DashboardRecentCard snapshot={snapshot} onNavigate={onNavigate} />
            <DashboardSystemCard snapshot={snapshot} />
          </div>
        </>
      )}
    </section>
  );
}

function DashboardStatGrid({ snapshot }: { snapshot: DashboardSnapshot }) {
  const totalBookings = Object.values(snapshot.bookings.byStatus).reduce((s, n) => s + n, 0);
  return (
    <div className="stat-grid">
      <div className="stat-card">
        <div className="stat-top">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--sun-dark)" strokeWidth="1.8">
              <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          </div>
        </div>
        <div className="stat-value">{formatPrice(snapshot.revenue.totalEgp, 'EGP')}</div>
        <div className="stat-label">Total Revenue</div>
      </div>
      <div className="stat-card">
        <div className="stat-top">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--sun-dark)" strokeWidth="1.8">
              <path d="M22 12s-4-7-10-7S2 12 2 12s4 7 10 7 10-7 10-7z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
        </div>
        <div className="stat-value">{formatPrice(snapshot.revenue.last30dEgp, 'EGP')}</div>
        <div className="stat-label">Revenue (30 Days)</div>
      </div>
      <div className="stat-card">
        <div className="stat-top">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--sun-dark)" strokeWidth="1.8">
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M3 10h18" />
            </svg>
          </div>
        </div>
        <div className="stat-value">{totalBookings}</div>
        <div className="stat-label">Total Bookings</div>
      </div>
      <div className="stat-card">
        <div className="stat-top">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--sun-dark)" strokeWidth="1.8">
              <path d="M12 17.3 6.2 20l1.1-6.5L2.5 9l6.5-.9L12 2.2l3 5.9 6.5.9-4.8 4.5 1.1 6.5z" />
            </svg>
          </div>
        </div>
        <div className="stat-value">{snapshot.reviews.pendingCount}</div>
        <div className="stat-label">Pending Reviews</div>
      </div>
    </div>
  );
}

function DashboardStatusCard({ snapshot }: { snapshot: DashboardSnapshot }) {
  const entries = Object.entries(snapshot.bookings.byStatus);
  const maxCount = Math.max(1, ...entries.map(([, c]) => c));
  return (
    <div className="card">
      <div className="card-head">
        <h3>Bookings by Status</h3>
      </div>
      {entries.length === 0 ? (
        <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>No bookings yet.</p>
      ) : (
        <div className="bars">
          {entries.map(([status, count]) => {
            const pct = Math.max(4, Math.round((count / maxCount) * 100));
            const label = BOOKING_STATUS_LABELS[status as AdminBookingStatus] ?? status;
            return (
              <div key={status} className="bar-col">
                <div className="bar filled" style={{ height: `${pct}%` }} title={`${label}: ${count}`} />
                <span>{label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DashboardCategoryCard({ snapshot }: { snapshot: DashboardSnapshot }) {
  const total = snapshot.bookings.byCategory.reduce((s, c) => s + c.count, 0);
  const top = snapshot.bookings.byCategory.slice(0, 5);
  const conic = buildConicGradient(top, total);
  return (
    <div className="card">
      <div className="card-head">
        <h3>Bookings by Category</h3>
      </div>
      {total === 0 ? (
        <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>No categorized bookings yet.</p>
      ) : (
        <div className="donut-wrap">
          <div className="donut" style={{ background: conic }}>
            <div className="donut-center">
              <b>{total}</b>
              <span>Total</span>
            </div>
          </div>
          <div className="legend">
            {top.map((c, i) => {
              const pct = total > 0 ? Math.round((c.count / total) * 100) : 0;
              return (
                <div key={c.categoryId ?? c.tourId ?? `c-${i}`} className="legend-row">
                  <span
                    className="legend-dot"
                    style={{ background: CATEGORY_DONUT_COLORS[i % CATEGORY_DONUT_COLORS.length] }}
                  />
                  {c.categoryName ?? 'Uncategorized'} — {pct}%
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function RevenueChart() {
  const [data, setData] = useState<RevenueTimeseriesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getRevenueTimeseries(8)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'));
  }, []);

  if (error) {
    return (
      <div className="card">
        <div className="card-head"><h3>Revenue, Last 8 Months</h3></div>
        <p style={{ color: 'var(--error)', fontSize: 13 }}>{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card">
        <div className="card-head"><h3>Revenue, Last 8 Months</h3></div>
        <p style={{ color: 'var(--ink-soft)', fontSize: 13 }}>Loading chart…</p>
      </div>
    );
  }

  const maxAmount = Math.max(1, ...data.points.map((p) => p.amount));

  return (
    <div className="card">
      <div className="card-head">
        <h3>Revenue, Last 8 Months</h3>
        <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>EGP (server-authoritative)</span>
      </div>
      {data.points.every((p) => p.amount === 0) ? (
        <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>No revenue recorded yet.</p>
      ) : (
        <div className="bars" style={{ height: 160, alignItems: 'flex-end' }}>
          {data.points.map((pt) => {
            const pct = Math.max(4, Math.round((pt.amount / maxAmount) * 100));
            const label = pt.month.slice(5); // "MM"
            return (
              <div key={pt.month} className="bar-col" style={{ flex: 1 }}>
                <div
                  className="bar filled"
                  style={{ height: `${pct}%`, background: 'var(--sun)' }}
                  title={`${pt.month}: ${formatPrice(pt.amount, 'EGP')}`}
                />
                <span style={{ fontSize: 10 }}>{label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DashboardRecentCard({
  snapshot,
  onNavigate,
}: {
  snapshot: DashboardSnapshot;
  onNavigate: (p: AdminPage) => void;
}) {
  return (
    <div className="card">
      <div className="card-head">
        <h3>Recent Bookings</h3>
        <a
          href="#"
          className="see-all"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('bookings');
          }}
        >
          View All →
        </a>
      </div>
      {snapshot.bookings.recent.length === 0 ? (
        <p style={{ color: 'var(--ink-soft)', fontSize: 14, padding: '12px 0' }}>No bookings yet.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Customer</th><th>Tour</th><th>Amount</th><th>Status</th></tr>
            </thead>
            <tbody>
              {snapshot.bookings.recent.map((b) => {
                const customer = b.user?.name ?? b.guestName ?? b.guestEmail;
                const tour = b.tour?.title ?? 'Custom trip';
                const badge = BOOKING_STATUS_BADGE[b.status as AdminBookingStatus] ?? 'pending';
                const statusLabel = BOOKING_STATUS_LABELS[b.status as AdminBookingStatus] ?? b.status;
                return (
                  <tr key={b.id}>
                    <td>{customer}</td>
                    <td>{tour}</td>
                    <td>{formatPrice(b.total, 'EGP')}</td>
                    <td>
                      <span className={`badge ${badge}`}>{statusLabel}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DashboardSystemCard({ snapshot }: { snapshot: DashboardSnapshot }) {
  return (
    <div className="card">
      <div className="card-head"><h3>System Monitoring</h3></div>
      <div className="status-list">
        <SystemRow
          dot={snapshot.reviews.pendingCount === 0 ? 'ok' : 'warn'}
          name="Pending Reviews"
          sub="Awaiting moderation"
          val={snapshot.reviews.pendingCount}
        />
        <SystemRow
          dot={snapshot.notifications.failedCount === 0 ? 'ok' : 'warn'}
          name="Failed Notifications"
          sub="Emails that didn't deliver"
          val={snapshot.notifications.failedCount}
        />
        <SystemRow
          dot={snapshot.notifications.retryingCount === 0 ? 'ok' : 'warn'}
          name="Retrying Notifications"
          sub="Queued for redelivery"
          val={snapshot.notifications.retryingCount}
        />
      </div>
    </div>
  );
}

function SystemRow({
  dot,
  name,
  sub,
  val,
}: {
  dot: 'ok' | 'warn';
  name: string;
  sub: string;
  val: number;
}) {
  return (
    <div className="status-row">
      <div className="status-left">
        <span className={`status-dot ${dot}`} />
        <div>
          <div className="status-name">{name}</div>
          <div className="status-sub">{sub}</div>
        </div>
      </div>
      <div className="status-val">{val}</div>
    </div>
  );
}

function buildConicGradient(
  rows: { count: number }[],
  total: number,
): string {
  if (total === 0 || rows.length === 0) return 'var(--line)';
  let acc = 0;
  const stops: string[] = [];
  rows.forEach((r, i) => {
    const start = (acc / total) * 360;
    acc += r.count;
    const end = (acc / total) * 360;
    const color = CATEGORY_DONUT_COLORS[i % CATEGORY_DONUT_COLORS.length];
    stops.push(`${color} ${start}deg ${end}deg`);
  });
  // Pad any remaining angle with the line color so the donut closes cleanly.
  if (acc < total) {
    const start = (acc / total) * 360;
    stops.push(`var(--line) ${start}deg 360deg`);
  }
  return `conic-gradient(${stops.join(', ')})`;
}

// ─── tours section ──────────────────────────────────────────────────

type StatusFilter = 'all' | 'published' | 'draft';

interface TourFormState {
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  categoryId: string;
  destinationId: string;
  /** Major units (display value, e.g. 13000 EGP). Converted to piasters on save. */
  startingPriceMajor: string;
  currency: string;
  durationDays: string;
  coverImageId: string;
  meetingInfo: string;
  cancellationPolicy: string;
  /** One item per line — parsed on save. */
  included: string;
  excluded: string;
  /** Day-by-day itinerary entries. */
  itinerary: Array<{ title: string; body: string }>;
  isPublished: boolean;
}

const EMPTY_TOUR_FORM: TourFormState = {
  slug: '',
  title: '',
  shortDescription: '',
  description: '',
  categoryId: '',
  destinationId: '',
  startingPriceMajor: '0',
  currency: 'EGP',
  durationDays: '1',
  coverImageId: '',
  meetingInfo: '',
  cancellationPolicy: '',
  included: '',
  excluded: '',
  itinerary: [],
  isPublished: false,
};

function tourFormFromTour(t: AdminTour): TourFormState {
  // Normalize itinerary from DB shape: { day, title, body }[] → { title, body }[]
  const rawItin = Array.isArray(t.itinerary) ? t.itinerary : [];
  const itinerary = rawItin
    .filter((d): d is { day: string; title: string; body: string } =>
      !!d && typeof d === 'object' && typeof (d as any).title === 'string' && typeof (d as any).body === 'string'
    )
    .map((d) => ({ title: d.title, body: d.body }));

  return {
    slug: t.slug,
    title: t.title,
    shortDescription: t.shortDescription,
    description: t.description,
    categoryId: t.categoryId,
    destinationId: t.destinationId ?? '',
    startingPriceMajor: String(t.startingPrice / 100),
    currency: t.currency,
    durationDays: String(t.durationDays),
    coverImageId: t.coverImageId ?? '',
    meetingInfo: t.meetingInfo ?? '',
    cancellationPolicy: t.cancellationPolicy ?? '',
    included: t.included.join('\n'),
    excluded: t.excluded.join('\n'),
    itinerary,
    isPublished: t.isPublished,
  };
}

function ToursSection() {
  const [tours, setTours] = useState<AdminTour[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState<AdminTourCategory[]>([]);
  const [destinations, setDestinations] = useState<AdminTourDestination[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const TOUR_PAGE_SIZE = 25;

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    t = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      listAdminTours({
        page,
        pageSize: TOUR_PAGE_SIZE,
        search: search || undefined,
        status: statusFilter === 'published' ? 'PUBLISHED' : statusFilter === 'draft' ? 'DRAFT' : undefined,
      }),
      categories.length === 0 ? listCategories() : Promise.resolve(categories),
      destinations.length === 0 ? listDestinations() : Promise.resolve(destinations),
    ])
      .then(([res, cs, ds]) => {
        if (cancelled) return;
        setTours(res.items);
        setTotal(res.total);
        setCategories(cs);
        setDestinations(ds);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => { cancelled = true; };
  }, [page, search, statusFilter]);

  async function refresh() {
    try {
      const res = await listAdminTours({
        page,
        pageSize: TOUR_PAGE_SIZE,
        search: search || undefined,
        status: statusFilter === 'published' ? 'PUBLISHED' : statusFilter === 'draft' ? 'DRAFT' : undefined,
      });
      setTours(res.items);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reload tours.');
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / TOUR_PAGE_SIZE));

  async function handleTogglePublish(t: AdminTour) {
    setMutatingId(t.id);
    setError(null);
    try {
      await updateAdminTour(t.id, { isPublished: !t.isPublished });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update tour status.');
    } finally {
      setMutatingId(null);
    }
  }

  async function handleDeleteConfirm() {
    if (!deletingId) return;
    const id = deletingId;
    setMutatingId(id);
    setError(null);
    try {
      await unpublishAdminTour(id);
      setDeletingId(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not unpublish tour.');
    } finally {
      setMutatingId(null);
    }
  }

  const editingTour = editingId ? tours?.find((t) => t.id === editingId) ?? null : null;
  const showModal = isAdding || editingTour !== null;

  return (
    <section className="page-section active" id="page-tours">
      <div className="page-head">
        <div>
          <div className="eyebrow">Manage</div>
          <h2>Tours &amp; Trips</h2>
        </div>
        <div className="page-head-actions">
          <button className="btn-sun" onClick={() => setIsAdding(true)} disabled={mutatingId !== null}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add New Tour
          </button>
        </div>
      </div>

      <div className="toolbar">
        <div className="toolbar-left">
          <div className="search-box" style={{ minWidth: 260 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              type="text"
              placeholder="Search tours by title or slug…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <select
            className="pill-select"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); setPage(1); }}
          >
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      {error && (
        <p role="alert" style={{ color: 'var(--error)', fontSize: 14, marginBottom: 16 }}>
          {error}
        </p>
      )}

      <div className="card">
        {tours === null && !error && (
          <p style={{ color: 'var(--ink-soft)', fontSize: 14, padding: '20px 0' }}>Loading tours…</p>
        )}
        {tours && tours.length === 0 && (
          <p style={{ color: 'var(--ink-soft)', fontSize: 14, padding: '20px 0' }}>
            No tours yet — click <b>Add New Tour</b> to create the first one.
          </p>
        )}
        {tours && tours.length > 0 && (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Tour</th>
                    <th>Category</th>
                    <th>Duration</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {tours.map((t) => (
                    <TourRow
                      key={t.id}
                      tour={t}
                      busy={mutatingId === t.id}
                      onEdit={() => setEditingId(t.id)}
                      onTogglePublish={() => handleTogglePublish(t)}
                      onDelete={() => setDeletingId(t.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pager">
              <span>
                Showing {(page - 1) * TOUR_PAGE_SIZE + 1}–{Math.min(page * TOUR_PAGE_SIZE, total)} of {total} tours
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn-ghost" style={{ fontSize: 12, padding: '4px 10px' }} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
                <span style={{ fontSize: 12, color: 'var(--ink-soft)', padding: '4px 8px' }}>Page {page} of {totalPages}</span>
                <button className="btn-ghost" style={{ fontSize: 12, padding: '4px 10px' }} disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next →</button>
              </div>
            </div>
          </>
        )}
      </div>

      {showModal && (
        <TourEditModal
          tour={editingTour}
          categories={categories}
          destinations={destinations}
          onClose={() => {
            setIsAdding(false);
            setEditingId(null);
          }}
          onSave={async (payload) => {
            setMutatingId(editingTour?.id ?? 'new');
            setError(null);
            try {
              if (editingTour) {
                await updateAdminTour(editingTour.id, payload);
              } else {
                await createAdminTour(payload);
              }
              await refresh();
              setIsAdding(false);
              setEditingId(null);
            } finally {
              setMutatingId(null);
            }
          }}
        />
      )}

      {deletingId && (
        <ConfirmDialog
          title="Unpublish this tour?"
          body="The tour will be hidden from the public site and the booking flow. Existing bookings are kept intact — you can re-publish it later from the Edit panel."
          confirmLabel="Unpublish"
          busy={mutatingId === deletingId}
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeletingId(null)}
        />
      )}
    </section>
  );
}

function TourRow({
  tour,
  busy,
  onEdit,
  onTogglePublish,
  onDelete,
}: {
  tour: AdminTour;
  busy: boolean;
  onEdit: () => void;
  onTogglePublish: () => void;
  onDelete: () => void;
}) {
  return (
    <tr>
      <td>
        <div className="cell-main">
          {tour.coverImageId ? (
            <img className="thumb" src={tour.coverImageId} alt={tour.title} />
          ) : (
            <div
              className="thumb"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                color: 'var(--ink-soft)',
                background: 'var(--sand)',
              }}
            >
              No img
            </div>
          )}
          <div>
            <div className="cell-title">{tour.title}</div>
            <div className="cell-sub">/{tour.slug}</div>
          </div>
        </div>
      </td>
      <td>{tour.category.name}</td>
      <td>
        {tour.durationDays} {tour.durationDays === 1 ? 'day' : 'days'}
      </td>
      <td>{formatPrice(tour.startingPrice, tour.currency)}</td>
      <td>
        <span className={`badge ${tour.isPublished ? 'published' : 'draft'}`}>
          {tour.isPublished ? 'Published' : 'Draft'}
        </span>
      </td>
      <td>
        <div className="row-actions">
          <button className="icon-btn" title="Edit" onClick={onEdit} disabled={busy}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />
            </svg>
          </button>
          <button
            className="icon-btn"
            title={tour.isPublished ? 'Unpublish (move to draft)' : 'Publish'}
            onClick={onTogglePublish}
            disabled={busy}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              {tour.isPublished ? (
                <path d="M3 12a9 9 0 109-9M3 12l4-4M3 12l4 4" />
              ) : (
                <path d="M5 12l5 5L20 7" />
              )}
            </svg>
          </button>
          <button className="icon-btn danger" title="Unpublish" onClick={onDelete} disabled={busy}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6h16z" />
            </svg>
          </button>
        </div>
      </td>
    </tr>
  );
}

function TourEditModal({
  tour,
  categories,
  destinations,
  onClose,
  onSave,
}: {
  tour: AdminTour | null;
  categories: AdminTourCategory[];
  destinations: AdminTourDestination[];
  onClose: () => void;
  onSave: (payload: AdminTourPayload) => Promise<void>;
}) {
  const isEdit = tour !== null;
  const [form, setForm] = useState<TourFormState>(() =>
    tour ? tourFormFromTour(tour) : { ...EMPTY_TOUR_FORM, categoryId: categories[0]?.id ?? '' },
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof TourFormState>(k: K, v: TourFormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const priceMajor = Number(form.startingPriceMajor);
  const duration = Number(form.durationDays);
  const priceValid = Number.isFinite(priceMajor) && priceMajor >= 0;
  const durationValid = Number.isInteger(duration) && duration >= 0 && duration <= 365;
  const slugValid = /^[a-z0-9-]{2,96}$/.test(form.slug.trim());
  const canSave =
    form.title.trim().length >= 2 &&
    form.shortDescription.trim().length >= 1 &&
    form.description.trim().length >= 1 &&
    !!form.categoryId &&
    priceValid &&
    durationValid &&
    slugValid &&
    !saving;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setError(null);
    setSaving(true);
    try {
      const payload: AdminTourPayload = {
        slug: form.slug.trim(),
        title: form.title.trim(),
        shortDescription: form.shortDescription.trim(),
        description: form.description.trim(),
        categoryId: form.categoryId,
        destinationId: form.destinationId || null,
        startingPrice: Math.round(priceMajor * 100),
        currency: form.currency.trim() || 'EGP',
        durationDays: duration,
        coverImageId: form.coverImageId.trim() || null,
        meetingInfo: form.meetingInfo.trim() || null,
        cancellationPolicy: form.cancellationPolicy.trim() || null,
        included: form.included
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        excluded: form.excluded
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        itinerary: form.itinerary.map((d, i) => ({
          day: `Day ${i + 1}`,
          title: d.title.trim(),
          body: d.body.trim(),
        })),
        isPublished: form.isPublished,
      };
      await onSave(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save tour.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal onClose={onClose} labelledBy="tour-modal-title">
      <form onSubmit={submit} noValidate>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h3 id="tour-modal-title" style={{ margin: 0, fontFamily: 'var(--cine)', fontSize: 22 }}>
            {isEdit ? `Edit Tour: ${tour.title}` : 'Add New Tour'}
          </h3>
          <button
            type="button"
            className="icon-btn"
            aria-label="Close"
            onClick={onClose}
            disabled={saving}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>
        </div>

        {error && (
          <p role="alert" style={{ color: 'var(--error)', fontSize: 13.5, marginBottom: 12 }}>
            {error}
          </p>
        )}

        <div className="field-grid">
          <div className="field full">
            <label htmlFor="t-title">Title</label>
            <input
              id="t-title"
              type="text"
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              required
              maxLength={160}
            />
          </div>
          <div className="field">
            <label htmlFor="t-slug">Slug</label>
            <input
              id="t-slug"
              type="text"
              value={form.slug}
              onChange={(e) => update('slug', e.target.value.toLowerCase())}
              required
              pattern="^[a-z0-9-]{2,96}$"
              title="Lowercase letters, digits, and hyphens only (2–96 chars)."
            />
            {!slugValid && form.slug.length > 0 && (
              <p style={{ fontSize: 12, color: 'var(--error)', marginTop: 6 }}>
                Use lowercase letters, digits, and hyphens only.
              </p>
            )}
          </div>
          <div className="field">
            <label htmlFor="t-duration">Duration (days)</label>
            <input
              id="t-duration"
              type="number"
              min={0}
              max={365}
              value={form.durationDays}
              onChange={(e) => update('durationDays', e.target.value)}
              required
            />
          </div>
          <div className="field full">
            <label htmlFor="t-short">Short Description</label>
            <input
              id="t-short"
              type="text"
              value={form.shortDescription}
              onChange={(e) => update('shortDescription', e.target.value)}
              required
              maxLength={280}
            />
          </div>
          <div className="field full">
            <label htmlFor="t-desc">Full Description</label>
            <textarea
              id="t-desc"
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              required
              maxLength={8000}
              rows={5}
            />
          </div>
          <div className="field">
            <label htmlFor="t-cat">Category</label>
            <select
              id="t-cat"
              value={form.categoryId}
              onChange={(e) => update('categoryId', e.target.value)}
              required
            >
              <option value="" disabled>
                Select…
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="t-dest">Destination (optional)</label>
            <select
              id="t-dest"
              value={form.destinationId}
              onChange={(e) => update('destinationId', e.target.value)}
            >
              <option value="">— None —</option>
              {destinations.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="t-price">Starting Price (major units)</label>
            <input
              id="t-price"
              type="number"
              min={0}
              step="0.01"
              value={form.startingPriceMajor}
              onChange={(e) => update('startingPriceMajor', e.target.value)}
              required
            />
            <div className="field-hint">
              Stored as integer piasters (§8). Display only — server recalculates.
            </div>
          </div>
          <div className="field">
            <label htmlFor="t-currency">Currency</label>
            <input
              id="t-currency"
              type="text"
              value={form.currency}
              onChange={(e) => update('currency', e.target.value.toUpperCase())}
              maxLength={3}
              minLength={3}
              required
            />
          </div>
          <div className="field full">
            <ImageUpload
              folder="tours"
              value={form.coverImageId}
              onChange={(url) => update('coverImageId', url)}
              label="Cover Image"
            />
          </div>
          <div className="field full">
            <label htmlFor="t-included">Included (one per line)</label>
            <textarea
              id="t-included"
              value={form.included}
              onChange={(e) => update('included', e.target.value)}
              rows={3}
            />
          </div>
          <div className="field full">
            <label htmlFor="t-excluded">Excluded (one per line)</label>
            <textarea
              id="t-excluded"
              value={form.excluded}
              onChange={(e) => update('excluded', e.target.value)}
              rows={3}
            />
          </div>
          <div className="field full">
            <label>Itinerary (day-by-day)</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {form.itinerary.map((day, idx) => (
                <div key={idx} style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 13, minWidth: 50 }}>Day {idx + 1}</span>
                    <input
                      type="text"
                      value={day.title}
                      onChange={(e) => {
                        const next = [...form.itinerary];
                        next[idx] = { ...next[idx], title: e.target.value };
                        update('itinerary', next);
                      }}
                      placeholder="Title"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="icon-btn danger"
                      title="Remove day"
                      onClick={() => {
                        const next = form.itinerary.filter((_, i) => i !== idx);
                        update('itinerary', next);
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <textarea
                    value={day.body}
                    onChange={(e) => {
                      const next = [...form.itinerary];
                      next[idx] = { ...next[idx], body: e.target.value };
                      update('itinerary', next);
                    }}
                    placeholder="Day activities (one per line for bullets)"
                    rows={3}
                    style={{ width: '100%' }}
                  />
                </div>
              ))}
              <button
                type="button"
                className="btn-outline"
                style={{ alignSelf: 'flex-start', fontSize: 13, padding: '6px 14px' }}
                onClick={() => update('itinerary', [...form.itinerary, { title: '', body: '' }])}
              >
                + Add Day
              </button>
            </div>
          </div>
          <div className="field full">
            <label htmlFor="t-meeting">Meeting / Pickup Info</label>
            <textarea
              id="t-meeting"
              value={form.meetingInfo}
              onChange={(e) => update('meetingInfo', e.target.value)}
              rows={2}
            />
          </div>
          <div className="field full">
            <label htmlFor="t-cancel">Cancellation Policy</label>
            <textarea
              id="t-cancel"
              value={form.cancellationPolicy}
              onChange={(e) => update('cancellationPolicy', e.target.value)}
              rows={2}
            />
          </div>
          <div className="field full">
            <label
              style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
            >
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(e) => update('isPublished', e.target.checked)}
                style={{ width: 16, height: 16 }}
              />
              <span>
                <b>Published</b>
                <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-soft)' }}>
                  Visible on the public site. Uncheck to save as draft.
                </span>
              </span>
            </label>
          </div>
        </div>

        <div className="form-actions" style={{ marginTop: 20 }}>
          <button type="button" onClick={onClose} disabled={saving} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" className="btn-sun" disabled={!canSave}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Tour'}
          </button>
        </div>
      </form>

      {isEdit && tour && <TourDatesManager tourId={tour.id} />}
    </Modal>
  );
}

// ─── tour dates manager (FU-4) ──────────────────────────────────────

function TourDatesManager({ tourId }: { tourId: string }) {
  const [dates, setDates] = useState<AdminTourDate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<AdminTourDate | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminTourDate | null>(null);

  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [newCap, setNewCap] = useState('20');

  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editCap, setEditCap] = useState('');

  async function load() {
    try {
      const data = await listTourDates(tourId);
      setDates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dates');
    }
  }

  useEffect(() => { load(); }, [tourId]);

  function startEdit(d: AdminTourDate) {
    setEditingId(d.id);
    setEditStart(d.startDate.slice(0, 10));
    setEditEnd(d.endDate.slice(0, 10));
    setEditCap(String(d.capacity));
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!newStart || !newEnd || !newCap) return;
    setBusyId('new');
    setError(null);
    try {
      await createTourDate(tourId, {
        startDate: newStart,
        endDate: newEnd,
        capacity: Number(newCap),
      });
      setAdding(false);
      setNewStart('');
      setNewEnd('');
      setNewCap('20');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add date');
    } finally {
      setBusyId(null);
    }
  }

  async function handleEdit(id: string) {
    if (!editStart || !editEnd || !editCap) return;
    setBusyId(id);
    setError(null);
    try {
      await updateTourDate(id, {
        startDate: editStart,
        endDate: editEnd,
        capacity: Number(editCap),
      });
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update date');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setBusyId(confirmDelete.id);
    setError(null);
    try {
      await deleteTourDate(confirmDelete.id);
      setConfirmDelete(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete date');
    } finally {
      setBusyId(null);
    }
  }

  async function handleCancelDate() {
    if (!confirmCancel) return;
    setBusyId(confirmCancel.id);
    setError(null);
    try {
      await cancelTourDate(confirmCancel.id);
      setConfirmCancel(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel date');
    } finally {
      setBusyId(null);
    }
  }

  function fmt(iso: string) {
    return iso.slice(0, 10);
  }

  return (
    <div style={{ marginTop: 24, borderTop: '1px solid var(--line)', paddingTop: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h4 style={{ margin: 0, fontFamily: 'var(--cine)', fontSize: 17 }}>Tour Dates</h4>
        {!adding && (
          <button type="button" className="btn-sun" style={{ fontSize: 13, padding: '6px 14px' }} onClick={() => setAdding(true)}>
            + Add Date
          </button>
        )}
      </div>

      {error && <p role="alert" style={{ color: 'var(--error)', fontSize: 13, marginBottom: 10 }}>{error}</p>}

      {adding && (
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: 10, alignItems: 'end', marginBottom: 14, flexWrap: 'wrap' }}>
          <div className="field">
            <label style={{ fontSize: 12 }}>Start</label>
            <input type="date" value={newStart} onChange={(e) => setNewStart(e.target.value)} required />
          </div>
          <div className="field">
            <label style={{ fontSize: 12 }}>End</label>
            <input type="date" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} required />
          </div>
          <div className="field" style={{ width: 90 }}>
            <label style={{ fontSize: 12 }}>Capacity</label>
            <input type="number" min={1} max={10000} value={newCap} onChange={(e) => setNewCap(e.target.value)} required />
          </div>
          <button type="submit" className="btn-sun" style={{ fontSize: 13, padding: '6px 14px' }} disabled={busyId === 'new'}>
            {busyId === 'new' ? 'Adding…' : 'Save'}
          </button>
          <button type="button" className="btn-ghost" style={{ fontSize: 13, padding: '6px 14px' }} onClick={() => setAdding(false)} disabled={busyId === 'new'}>
            Cancel
          </button>
        </form>
      )}

      {dates && dates.length === 0 && !adding && (
        <p style={{ color: 'var(--ink-soft)', fontSize: 13.5 }}>No dates scheduled yet.</p>
      )}

      {dates && dates.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 13.5 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Start</th>
                <th style={{ textAlign: 'left' }}>End</th>
                <th style={{ textAlign: 'right' }}>Capacity</th>
                <th style={{ textAlign: 'right' }}>Remaining</th>
                <th style={{ textAlign: 'right' }}>Booked</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {dates.map((d) => {
                const booked = d.capacity - d.remainingCapacity;
                const isEditing = editingId === d.id;
                return (
                  <tr key={d.id} style={{ background: isEditing ? 'var(--sand)' : undefined }}>
                    <td>
                      {isEditing
                        ? <input type="date" value={editStart} onChange={(e) => setEditStart(e.target.value)} style={{ fontSize: 13, padding: '4px 6px' }} />
                        : fmt(d.startDate)}
                    </td>
                    <td>
                      {isEditing
                        ? <input type="date" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} style={{ fontSize: 13, padding: '4px 6px' }} />
                        : fmt(d.endDate)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {isEditing
                        ? <input type="number" min={1} max={10000} value={editCap} onChange={(e) => setEditCap(e.target.value)} style={{ width: 70, fontSize: 13, padding: '4px 6px', textAlign: 'right' }} />
                        : d.capacity}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span style={{ color: d.remainingCapacity === 0 ? 'var(--error)' : undefined }}>
                        {d.remainingCapacity}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>{booked}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {isEditing ? (
                        <>
                          <button type="button" className="btn-sun" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => handleEdit(d.id)} disabled={busyId === d.id}>
                            {busyId === d.id ? '…' : 'Save'}
                          </button>
                          <button type="button" className="btn-ghost" style={{ fontSize: 12, padding: '4px 10px', marginLeft: 4 }} onClick={() => setEditingId(null)} disabled={busyId === d.id}>
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button type="button" className="icon-btn" title="Edit" onClick={() => startEdit(d)} disabled={!!busyId}>✏️</button>
                          <button type="button" className="icon-btn" title="Delete (no bookings)" onClick={() => setConfirmDelete(d)} disabled={!!busyId || booked > 0} style={{ opacity: booked > 0 ? 0.3 : 1 }}>🗑️</button>
                          <button type="button" className="icon-btn danger" title="Cancel date + notify customers" onClick={() => setConfirmCancel(d)} disabled={!!busyId || booked === 0} style={{ opacity: booked === 0 ? 0.3 : 1 }}>⚠️</button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete this tour date?"
          body={`Delete ${fmt(confirmDelete.startDate)} → ${fmt(confirmDelete.endDate)}? This only works if no active bookings exist.`}
          confirmLabel="Delete"
          busy={busyId === confirmDelete.id}
          onConfirm={handleDelete}
          onClose={() => setConfirmDelete(null)}
        />
      )}

      {confirmCancel && (
        <ConfirmDialog
          title="Cancel this tour date?"
          body={`This will cancel all active bookings on ${fmt(confirmCancel.startDate)} → ${fmt(confirmCancel.endDate)} and notify every customer. This cannot be undone.`}
          confirmLabel="Cancel Date & Notify Customers"
          busy={busyId === confirmCancel.id}
          onConfirm={handleCancelDate}
          onClose={() => setConfirmCancel(null)}
        />
      )}
    </div>
  );
}

function Modal({
  children,
  onClose,
  labelledBy,
}: {
  children: React.ReactNode;
  onClose: () => void;
  labelledBy?: string;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--paper)',
          borderRadius: 14,
          padding: 28,
          maxWidth: 760,
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        {children}
      </div>
    </div>
  );
}

function ConfirmDialog({
  title,
  body,
  confirmLabel,
  busy,
  onConfirm,
  onClose,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal onClose={onClose} labelledBy="confirm-title">
      <h3
        id="confirm-title"
        style={{ margin: '0 0 12px', fontFamily: 'var(--cine)', fontSize: 20 }}
      >
        {title}
      </h3>
      <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: 14, lineHeight: 1.5 }}>{body}</p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
        <button type="button" onClick={onClose} disabled={busy} className="btn-ghost">
          Cancel
        </button>
        <button type="button" className="btn-sun" onClick={onConfirm} disabled={busy}>
          {busy ? 'Working…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

// ─── bookings section ────────────────────────────────────────────────

const BOOKING_STATUS_LABELS: Record<AdminBookingStatus, string> = {
  DRAFT: 'Draft',
  PENDING: 'Pending',
  PAYMENT_PENDING: 'Awaiting Payment',
  PAID: 'Paid',
  CONFIRMED: 'Confirmed',
  CANCELLED: 'Cancelled',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  EXPIRED: 'Expired',
};

const BOOKING_STATUS_BADGE: Record<AdminBookingStatus, 'paid' | 'pending' | 'refunded' | 'published'> = {
  PAID: 'paid',
  CONFIRMED: 'paid',
  COMPLETED: 'published',
  PENDING: 'pending',
  PAYMENT_PENDING: 'pending',
  DRAFT: 'pending',
  CANCELLED: 'refunded',
  FAILED: 'refunded',
  EXPIRED: 'refunded',
};

/**
 * §10 — booking state-machine matrix, mirrored client-side for
 * button rendering. The backend enforces this strictly via
 * `assertTransition()` and rejects anything not in the matrix.
 */
const BOOKING_TRANSITIONS: Record<AdminBookingStatus, AdminBookingStatus[]> = {
  DRAFT: ['PENDING', 'CANCELLED'],
  PENDING: ['PAYMENT_PENDING', 'CANCELLED', 'FAILED', 'EXPIRED'],
  PAYMENT_PENDING: ['PAID', 'CANCELLED', 'FAILED', 'EXPIRED'],
  PAID: ['CONFIRMED'],
  CONFIRMED: ['COMPLETED', 'CANCELLED'],
  CANCELLED: [],
  COMPLETED: [],
  FAILED: [],
  EXPIRED: [],
};

const DEFAULT_PAGE_SIZE = 25;

function BookingsSection() {
  const { dateLocale } = useLocale();
  const [list, setList] = useState<AdminBooking[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<AdminBookingStatus | ''>('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [stats, setStats] = useState<BookingsStats | null>(null);

  useEffect(() => {
    getBookingsStats().then(setStats).catch(() => {});
  }, []);

  // Debounce search input → search state (300ms).
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Fetch on page / status / committed search changes.
  useEffect(() => {
    let cancelled = false;
    setList(null);
    setError(null);
    listAdminBookings({
      page,
      pageSize: DEFAULT_PAGE_SIZE,
      status: statusFilter || undefined,
      search: search || undefined,
    })
      .then((res) => {
        if (cancelled) return;
        setList(res.items);
        setTotal(res.total);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [page, statusFilter, search]);

  async function refresh() {
    try {
      const res = await listAdminBookings({
        page,
        pageSize: DEFAULT_PAGE_SIZE,
        status: statusFilter || undefined,
        search: search || undefined,
      });
      setList(res.items);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reload bookings.');
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / DEFAULT_PAGE_SIZE));
  const showingFrom = total === 0 ? 0 : (page - 1) * DEFAULT_PAGE_SIZE + 1;
  const showingTo = Math.min(page * DEFAULT_PAGE_SIZE, total);

  return (
    <section className="page-section active" id="page-bookings">
      <div className="page-head">
        <div>
          <div className="eyebrow">Manage</div>
          <h2>Bookings &amp; Orders</h2>
        </div>
      </div>

      {stats && (
        <div className="stat-row" style={{ marginBottom: 20 }}>
          <div className="stat-card">
            <div className="stat-label">Total Orders</div>
            <div className="stat-value">{stats.totalCount}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Revenue</div>
            <div className="stat-value">{formatPrice(stats.revenueEgp, 'EGP')}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Pending Payment</div>
            <div className="stat-value">{stats.pendingPaymentCount}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Cancelled</div>
            <div className="stat-value">{stats.cancelledCount}</div>
          </div>
        </div>
      )}

      <div className="toolbar">
        <div className="toolbar-left">
          <div className="search-box" style={{ minWidth: 260 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, email, or booking ID…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <select
            className="pill-select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as AdminBookingStatus | '');
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            {(Object.entries(BOOKING_STATUS_LABELS) as [AdminBookingStatus, string][]).map(([s, l]) => (
              <option key={s} value={s}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <p role="alert" style={{ color: 'var(--error)', fontSize: 14, marginBottom: 16 }}>
          {error}
        </p>
      )}

      <div className="card">
        {list === null && !error && (
          <p style={{ color: 'var(--ink-soft)', fontSize: 14, padding: '20px 0' }}>Loading bookings…</p>
        )}
        {list && list.length === 0 && (
          <p style={{ color: 'var(--ink-soft)', fontSize: 14, padding: '20px 0' }}>
            {search || statusFilter
              ? 'No bookings match the current filters.'
              : 'No bookings yet.'}
          </p>
        )}
        {list && list.length > 0 && (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Tour</th>
                    <th>Travel Date</th>
                    <th>Amount</th>
                    <th>Payment</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((b) => {
                    const customerName = b.user?.name ?? b.guestName;
                    const customerEmail = b.user?.email ?? b.guestEmail;
                    const tourLabel =
                      b.tour?.title ?? (b.origin === 'CUSTOM_TRIP' ? 'Custom trip' : '—');
                    const dateLabel = b.tourDate
                      ? formatTourDate(b.tourDate.startDate, dateLocale)
                      : '—';
                    const initials = bookingInitials(customerName);
                    return (
                      <tr key={b.id}>
                        <td>
                          <code style={{ fontSize: 12 }}>
                            #DT-{b.id.slice(0, 8).toUpperCase()}
                          </code>
                        </td>
                        <td>
                          <div className="cell-main">
                            <div className="avatar-sm">{initials}</div>
                            <div>
                              <div className="cell-title">{customerName}</div>
                              <div className="cell-sub">{customerEmail}</div>
                            </div>
                          </div>
                        </td>
                        <td>{tourLabel}</td>
                        <td>{dateLabel}</td>
                        <td>{formatPrice(b.total, b.currency)}</td>
                        <td>
                          {b.latestPayment
                            ? <span style={{ fontSize: 12.5 }}>{b.latestPayment.gateway}</span>
                            : <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>—</span>}
                        </td>
                        <td>
                          <span className={`badge ${BOOKING_STATUS_BADGE[b.status]}`}>
                            {BOOKING_STATUS_LABELS[b.status]}
                          </span>
                        </td>
                        <td>
                          <button
                            className="icon-btn"
                            title="View details"
                            onClick={() => setDetailId(b.id)}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                              <path d="M1 12s4-7 11-7 11 7-4 7-11-7-11-7z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="pager">
              <span>
                Showing {showingFrom}–{showingTo} of {total} bookings
              </span>
              <div className="pager-btns">
                <button onClick={() => setPage(1)} disabled={page === 1}>
                  «
                </button>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  ‹
                </button>
                <span style={{ padding: '6px 10px', fontSize: 12, color: 'var(--ink-soft)' }}>
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  ›
                </button>
                <button onClick={() => setPage(totalPages)} disabled={page >= totalPages}>
                  »
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {detailId && (
        <BookingDetailModal
          bookingId={detailId}
          onClose={() => setDetailId(null)}
          onTransitioned={async (updated) => {
            await refresh();
            // If the transitioned booking no longer matches the active
            // filter (e.g. we moved it out of the current status
            // selection), jump to page 1 so it stays visible.
            if (
              statusFilter &&
              updated.status !== statusFilter &&
              page !== 1
            ) {
              setPage(1);
            }
          }}
        />
      )}
    </section>
  );
}

function BookingDetailModal({
  bookingId,
  onClose,
  onTransitioned,
}: {
  bookingId: string;
  onClose: () => void;
  onTransitioned: (updated: AdminBooking) => Promise<void> | void;
}) {
  const { dateLocale } = useLocale();
  const [booking, setBooking] = useState<AdminBooking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    getAdminBooking(bookingId)
      .then((b) => {
        if (!cancelled) setBooking(b);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  async function doTransition(status: AdminBookingStatus, reason?: string) {
    if (!booking) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await updateAdminBooking(booking.id, { status, reason });
      setBooking(updated);
      await onTransitioned(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update booking.');
    } finally {
      setBusy(false);
      setCancelling(false);
      setCancelReason('');
    }
  }

  if (error && !booking) {
    return (
      <Modal onClose={onClose} labelledBy="booking-detail-title">
        <h3
          id="booking-detail-title"
          style={{ margin: '0 0 12px', fontFamily: 'var(--cine)', fontSize: 22 }}
        >
          Booking
        </h3>
        <p role="alert" style={{ color: 'var(--error)', fontSize: 14 }}>
          {error}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
          <button type="button" onClick={onClose} className="btn-ghost">
            Close
          </button>
        </div>
      </Modal>
    );
  }

  if (!booking) {
    return (
      <Modal onClose={onClose} labelledBy="booking-detail-title">
        <h3
          id="booking-detail-title"
          style={{ margin: '0 0 12px', fontFamily: 'var(--cine)', fontSize: 22 }}
        >
          Booking
        </h3>
        <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>Loading…</p>
      </Modal>
    );
  }

  const allowedTransitions = BOOKING_TRANSITIONS[booking.status] ?? [];

  return (
    <Modal onClose={onClose} labelledBy="booking-detail-title">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 18,
        }}
      >
        <h3
          id="booking-detail-title"
          style={{ margin: 0, fontFamily: 'var(--cine)', fontSize: 22 }}
        >
          Booking #{booking.id.slice(0, 8).toUpperCase()}
        </h3>
        <button
          type="button"
          className="icon-btn"
          aria-label="Close"
          onClick={onClose}
          disabled={busy}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M6 18L18 6" />
          </svg>
        </button>
      </div>

      {error && (
        <p
          role="alert"
          style={{
            color: 'var(--error)',
            fontSize: 13.5,
            marginBottom: 12,
          }}
        >
          {error}
        </p>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 14,
          marginBottom: 18,
        }}
      >
        <DetailField label="Status">
          <span className={`badge ${BOOKING_STATUS_BADGE[booking.status]}`}>
            {BOOKING_STATUS_LABELS[booking.status]}
          </span>
        </DetailField>
        <DetailField label="Origin">
          {booking.origin === 'TOUR' ? 'Tour' : 'Custom trip'}
        </DetailField>
        <DetailField label="Customer name">{booking.guestName}</DetailField>
        <DetailField label="Email">{booking.guestEmail}</DetailField>
        <DetailField label="Phone">{booking.guestPhone ?? '—'}</DetailField>
        <DetailField label="Travelers">{booking.travelerCount}</DetailField>
        <DetailField label="Subtotal">{formatPrice(booking.subtotal, booking.currency)}</DetailField>
        <DetailField label="Discount">
          {booking.discountAmount > 0
            ? `− ${formatPrice(booking.discountAmount, booking.currency)}`
            : '—'}
        </DetailField>
        <DetailField label="Total" full>
          <b>{formatPrice(booking.total, booking.currency)}</b>
        </DetailField>
        <DetailField label="Tour">
          {booking.tour?.title ?? (booking.tourId ? '—' : 'Custom trip request')}
        </DetailField>
        <DetailField label="Travel date">
          {booking.tourDate ? formatTourDate(booking.tourDate.startDate, dateLocale) : '—'}
        </DetailField>
        <DetailField label="Pickup location">{booking.pickupLocation ?? '—'}</DetailField>
        <DetailField label="Consent (§8)">
          {formatTourDate(booking.consentAcceptedAt, dateLocale)}
        </DetailField>
        {booking.specialRequests && (
          <DetailField label="Special requests" full>
            {booking.specialRequests}
          </DetailField>
        )}
        {booking.travelerNames.length > 0 && (
          <DetailField label="Traveler names" full>
            {booking.travelerNames.join(', ')}
          </DetailField>
        )}
        {booking.user && (
          <DetailField label="Linked user" full>
            {booking.user.name ?? booking.user.email} ({booking.user.email})
          </DetailField>
        )}
      </div>

      {allowedTransitions.length > 0 && (
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}>
          <div
            style={{
              fontFamily: 'var(--eyebrow)',
              fontWeight: 600,
              fontSize: 12,
              letterSpacing: '.04em',
              textTransform: 'uppercase',
              color: 'var(--ink-soft)',
              marginBottom: 10,
            }}
          >
            State-machine actions
          </div>
          {!cancelling && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {allowedTransitions.map((next) => (
                <button
                  key={next}
                  type="button"
                  className={next === 'CANCELLED' ? 'btn-ghost' : 'btn-sun'}
                  onClick={() => {
                    if (next === 'CANCELLED') {
                      setCancelling(true);
                    } else {
                      void doTransition(next);
                    }
                  }}
                  disabled={busy}
                  style={{ fontSize: 13 }}
                >
                  → {BOOKING_STATUS_LABELS[next]}
                </button>
              ))}
            </div>
          )}
          {cancelling && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label
                htmlFor="cancel-reason"
                style={{ fontSize: 13, color: 'var(--ink-soft)' }}
              >
                Cancellation reason (optional, recorded in the audit log)
              </label>
              <textarea
                id="cancel-reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                maxLength={500}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => {
                    setCancelling(false);
                    setCancelReason('');
                  }}
                  disabled={busy}
                  className="btn-ghost"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() =>
                    doTransition('CANCELLED', cancelReason.trim() || undefined)
                  }
                  disabled={busy}
                  className="btn-sun"
                >
                  {busy ? 'Working…' : 'Confirm Cancel'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {allowedTransitions.length === 0 && (
        <p
          style={{
            color: 'var(--ink-soft)',
            fontSize: 13,
            marginTop: 14,
            padding: 12,
            background: 'var(--sand)',
            borderRadius: 8,
          }}
        >
          This booking is in a terminal state — no further transitions are allowed.
        </p>
      )}
    </Modal>
  );
}

function DetailField({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div style={{ gridColumn: full ? '1 / -1' : undefined }}>
      <div
        style={{
          fontFamily: 'var(--eyebrow)',
          fontWeight: 600,
          fontSize: 10.5,
          letterSpacing: '.04em',
          textTransform: 'uppercase',
          color: 'var(--ink-soft)',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 14, color: 'var(--ink)' }}>{children}</div>
    </div>
  );
}

function bookingInitials(name: string | null | undefined): string {
  const parts = (name ?? '').split(' ').filter(Boolean).slice(0, 2);
  const chars = parts.map((w) => w[0]?.toUpperCase() ?? '').join('');
  return chars || '??';
}

// ─── users section ───────────────────────────────────────────────────

const ROLE_LABELS: Record<AdminUserRole, string> = {
  CUSTOMER: 'Customer',
  ADMIN: 'Admin',
};

const ROLE_BADGE: Record<AdminUserRole, 'paid' | 'pending'> = {
  ADMIN: 'paid',
  CUSTOMER: 'pending',
};

const USER_PAGE_SIZE = 25;

function UsersSection() {
  const { dateLocale } = useLocale();
  const { user: currentAdmin } = useAuth();
  const [list, setList] = useState<AdminUser[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [detailUser, setDetailUser] = useState<AdminUser | null>(null);
  const [blockUser, setBlockUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    setList(null);
    setError(null);
    listAdminUsers({ page, pageSize: USER_PAGE_SIZE, search: search || undefined })
      .then((res) => {
        if (cancelled) return;
        setList(res.items);
        setTotal(res.total);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [page, search]);

  async function refresh() {
    try {
      const res = await listAdminUsers({ page, pageSize: USER_PAGE_SIZE, search: search || undefined });
      setList(res.items);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reload users.');
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / USER_PAGE_SIZE));
  const showingFrom = total === 0 ? 0 : (page - 1) * USER_PAGE_SIZE + 1;
  const showingTo = Math.min(page * USER_PAGE_SIZE, total);

  return (
    <section className="page-section active" id="page-users">
      <div className="page-head">
        <div>
          <div className="eyebrow">Manage</div>
          <h2>Users</h2>
        </div>
      </div>

      <div className="toolbar">
        <div className="toolbar-left">
          <div className="search-box" style={{ minWidth: 260 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              type="text"
              placeholder="Search users by name or email…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
        </div>
        <div className="toolbar-right">
          <a
            href={exportUsersCsv(search || undefined)}
            className="btn-outline"
            style={{ fontSize: 13, padding: '6px 14px' }}
            target="_blank"
            rel="noopener noreferrer"
          >
            Export CSV
          </a>
        </div>
      </div>

      {error && (
        <p role="alert" style={{ color: 'var(--error)', fontSize: 14, marginBottom: 16 }}>
          {error}
        </p>
      )}

      <div className="card">
        {list === null && !error && (
          <p style={{ color: 'var(--ink-soft)', fontSize: 14, padding: '20px 0' }}>Loading users…</p>
        )}
        {list && list.length === 0 && (
          <p style={{ color: 'var(--ink-soft)', fontSize: 14, padding: '20px 0' }}>
            {search ? 'No users match the current search.' : 'No users yet.'}
          </p>
        )}
        {list && list.length > 0 && (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Phone</th>
                    <th>Role</th>
                    <th>Email Verified</th>
                    <th>Joined</th>
                    <th>Bookings</th>
                    <th>Total Spent</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((u) => {
                    const initials = userInitials(u.name, u.email);
                    const isSelf = u.id === currentAdmin?.id;
                    return (
                      <tr key={u.id}>
                        <td>
                          <div className="cell-main">
                            <div className="avatar-sm">{initials}</div>
                            <div>
                              <div className="cell-title">
                                {u.name ?? '—'}
                                {isSelf && (
                                  <span
                                    style={{
                                      marginLeft: 8,
                                      fontSize: 10,
                                      fontFamily: 'var(--eyebrow)',
                                      letterSpacing: '.04em',
                                      textTransform: 'uppercase',
                                      color: 'var(--ink-soft)',
                                    }}
                                  >
                                    (you)
                                  </span>
                                )}
                              </div>
                              <div className="cell-sub">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>{u.phone ?? '—'}</td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span className={`badge ${ROLE_BADGE[u.role]}`}>{ROLE_LABELS[u.role]}</span>
                            {u.isBlocked && (
                              <span className="badge refunded" title={u.blockReason ?? 'Blocked by admin'}>
                                Blocked
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          {u.emailVerifiedAt ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--good)' }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                              Verified
                            </span>
                          ) : (
                            <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Unverified</span>
                          )}
                        </td>
                        <td style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                          {formatTourDate(u.createdAt, dateLocale)}
                        </td>
                        <td style={{ fontSize: 13, textAlign: 'center' }}>
                          {u.bookingsCount}
                        </td>
                        <td style={{ fontSize: 13 }}>
                          {u.totalSpentEgp > 0 ? formatPrice(u.totalSpentEgp, 'EGP') : '—'}
                        </td>
                        <td>
                          <div className="row-actions">
                            <button
                              className="icon-btn"
                              title="View / edit role"
                              onClick={() => setDetailUser(u)}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <path d="M1 12s4-7 11-7 11 7-4 7-11-7-11-7z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            </button>
                            {!isSelf && (
                              <button
                                className={u.isBlocked ? 'icon-btn' : 'icon-btn danger'}
                                title={u.isBlocked ? 'Unblock user' : 'Block user'}
                                onClick={() => setBlockUser(u)}
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                  {u.isBlocked ? (
                                    <path d="M5 12l5 5L20 7" />
                                  ) : (
                                    <>
                                      <circle cx="12" cy="12" r="9" />
                                      <path d="M5.6 5.6l12.8 12.8" />
                                    </>
                                  )}
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="pager">
              <span>
                Showing {showingFrom}–{showingTo} of {total} users
              </span>
              <div className="pager-btns">
                <button onClick={() => setPage(1)} disabled={page === 1}>
                  «
                </button>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  ‹
                </button>
                <span style={{ padding: '6px 10px', fontSize: 12, color: 'var(--ink-soft)' }}>
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  ›
                </button>
                <button onClick={() => setPage(totalPages)} disabled={page >= totalPages}>
                  »
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {detailUser && (
        <UserDetailModal
          user={detailUser}
          isSelf={detailUser.id === currentAdmin?.id}
          onClose={() => setDetailUser(null)}
          onSaved={async (updated) => {
            await refresh();
            // Keep the modal in sync if it's still open against the same row.
            setDetailUser((prev) => (prev && prev.id === updated.id ? { ...prev, role: updated.role } : prev));
          }}
        />
      )}

      {blockUser && (
        <BlockConfirmModal
          user={blockUser}
          onClose={() => setBlockUser(null)}
          onConfirm={async (blocked, reason) => {
            await setAdminUserBlocked(blockUser.id, blocked, reason);
            setBlockUser(null);
            await refresh();
          }}
        />
      )}
    </section>
  );
}

function UserDetailModal({
  user,
  isSelf,
  onClose,
  onSaved,
}: {
  user: AdminUser;
  isSelf: boolean;
  onClose: () => void;
  onSaved: (updated: { id: string; role: AdminUserRole }) => Promise<void> | void;
}) {
  const { dateLocale } = useLocale();
  const [newRole, setNewRole] = useState<AdminUserRole>(user.role);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = newRole !== user.role;

  async function save() {
    if (!dirty || isSelf) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await updateAdminUserRole(user.id, newRole);
      await onSaved(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update role.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal onClose={onClose} labelledBy="user-detail-title">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 18,
        }}
      >
        <h3
          id="user-detail-title"
          style={{ margin: 0, fontFamily: 'var(--cine)', fontSize: 22 }}
        >
          {user.name ?? user.email}
        </h3>
        <button
          type="button"
          className="icon-btn"
          aria-label="Close"
          onClick={onClose}
          disabled={busy}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M6 18L18 6" />
          </svg>
        </button>
      </div>

      {error && (
        <p
          role="alert"
          style={{
            color: 'var(--error)',
            fontSize: 13.5,
            marginBottom: 12,
          }}
        >
          {error}
        </p>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 14,
          marginBottom: 18,
        }}
      >
        <DetailField label="Email">{user.email}</DetailField>
        <DetailField label="Phone">{user.phone ?? '—'}</DetailField>
        <DetailField label="Joined">{formatTourDate(user.createdAt, dateLocale)}</DetailField>
        <DetailField label="Email Verified">
          {user.emailVerifiedAt ? (
            <span style={{ color: 'var(--good)' }}>
              {formatTourDate(user.emailVerifiedAt, dateLocale)}
            </span>
          ) : (
            <span style={{ color: 'var(--ink-soft)' }}>Not verified</span>
          )}
        </DetailField>
      </div>

      <div
        style={{
          borderTop: '1px solid var(--line)',
          paddingTop: 16,
          marginBottom: 8,
        }}
      >
        <div
          style={{
            fontFamily: 'var(--eyebrow)',
            fontWeight: 600,
            fontSize: 12,
            letterSpacing: '.04em',
            textTransform: 'uppercase',
            color: 'var(--ink-soft)',
            marginBottom: 10,
          }}
        >
          Role
        </div>
        <select
          value={newRole}
          onChange={(e) => setNewRole(e.target.value as AdminUserRole)}
          disabled={busy || isSelf}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid var(--line)',
            background: 'var(--paper)',
            fontSize: 14,
            color: 'var(--ink)',
          }}
        >
          <option value="CUSTOMER">Customer</option>
          <option value="ADMIN">Admin</option>
        </select>
        {isSelf && (
          <p
            style={{
              marginTop: 8,
              padding: '10px 12px',
              background: 'var(--sand)',
              borderRadius: 8,
              fontSize: 13,
              color: 'var(--ink-soft)',
            }}
          >
            You can't change your own role — ask another admin to do it.
          </p>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 10,
          marginTop: 20,
        }}
      >
        <button type="button" onClick={onClose} disabled={busy} className="btn-ghost">
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void save()}
          disabled={!dirty || busy || isSelf}
          className="btn-sun"
        >
          {busy ? 'Saving…' : 'Save Role'}
        </button>
      </div>
    </Modal>
  );
}

function userInitials(name: string | null, email: string): string {
  const source = name ?? email;
  const parts = source.split(/[\s@.]/).filter(Boolean).slice(0, 2);
  const chars = parts.map((w) => w[0]?.toUpperCase() ?? '').join('');
  return chars || '??';
}

function BlockConfirmModal({
  user,
  onClose,
  onConfirm,
}: {
  user: AdminUser;
  onClose: () => void;
  onConfirm: (blocked: boolean, reason: string | undefined) => Promise<void>;
}) {
  const isBlocking = !user.isBlocked;
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      // The backend requires a reason only for blocking; unblock
      // clears the previous reason, no need to send a new one.
      const r = isBlocking ? reason.trim() || undefined : undefined;
      await onConfirm(isBlocking, r);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not ${isBlocking ? 'block' : 'unblock'} user.`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal onClose={onClose} labelledBy="block-confirm-title">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <h3
          id="block-confirm-title"
          style={{ margin: 0, fontFamily: 'var(--cine)', fontSize: 22 }}
        >
          {isBlocking ? 'Block user?' : 'Unblock user?'}
        </h3>
        <button
          type="button"
          className="icon-btn"
          aria-label="Close"
          onClick={onClose}
          disabled={busy}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M6 18L18 6" />
          </svg>
        </button>
      </div>

      <p
        style={{
          margin: '0 0 16px',
          color: 'var(--ink-soft)',
          fontSize: 14,
          lineHeight: 1.5,
        }}
      >
        <b>{user.name ?? user.email}</b>
        {user.name && (
          <>
            {' '}
            (<span style={{ fontSize: 13 }}>{user.email}</span>)
          </>
        )}
      </p>

      {isBlocking ? (
        <>
          <p
            style={{
              margin: '0 0 12px',
              color: 'var(--ink-soft)',
              fontSize: 13.5,
              lineHeight: 1.5,
            }}
          >
            Blocking revokes every active refresh token for this user — every device is
            force-logged-out and the user can't re-authenticate until you unblock them. Use
            this for abuse, fraud, or compromised accounts.
          </p>
          <label
            htmlFor="block-reason"
            style={{ display: 'block', fontSize: 13, color: 'var(--ink-soft)', marginBottom: 6 }}
          >
            Reason (optional, recorded in the audit log and shown to the admin team)
          </label>
          <textarea
            id="block-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="e.g. Fraudulent bookings, chargebacks, terms violation…"
            style={{ width: '100%' }}
          />
        </>
      ) : (
        <p
          style={{
            margin: '0 0 12px',
            color: 'var(--ink-soft)',
            fontSize: 13.5,
            lineHeight: 1.5,
          }}
        >
          Unblocking clears the block flag. The user's previous refresh tokens were already
          revoked on the original block — they'll need to log in again to get a new
          session.
        </p>
      )}

      {user.isBlocked && user.blockReason && (
        <p
          style={{
            margin: '12px 0 0',
            padding: '10px 12px',
            background: 'var(--sand)',
            borderRadius: 8,
            fontSize: 13,
            color: 'var(--ink-soft)',
          }}
        >
          <b style={{ color: 'var(--ink)' }}>Original reason:</b> {user.blockReason}
        </p>
      )}

      {error && (
        <p
          role="alert"
          style={{
            color: 'var(--error)',
            fontSize: 13.5,
            marginTop: 12,
          }}
        >
          {error}
        </p>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 10,
          marginTop: 20,
        }}
      >
        <button type="button" onClick={onClose} disabled={busy} className="btn-ghost">
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void go()}
          disabled={busy}
          className={isBlocking ? 'btn-sun' : 'btn-sun'}
          style={isBlocking ? { background: 'var(--bad)', color: 'white' } : undefined}
        >
          {busy ? 'Working…' : isBlocking ? 'Block User' : 'Unblock User'}
        </button>
      </div>
    </Modal>
  );
}

const REVIEW_STATUS_LABELS: Record<AdminReviewStatus, string> = {
  PENDING: 'Pending',
  PUBLISHED: 'Published',
  REJECTED: 'Rejected',
};

const REVIEW_STATUS_BADGE: Record<AdminReviewStatus, 'paid' | 'pending' | 'refunded'> = {
  PENDING: 'pending',
  PUBLISHED: 'paid',
  REJECTED: 'refunded',
};

const REVIEW_PAGE_SIZE = 25;

function renderStars(rating: number) {
  return (
    <span
      style={{ color: 'var(--sun)', letterSpacing: 2, whiteSpace: 'nowrap' }}
      aria-label={`${rating} out of 5 stars`}
    >
      {'★'.repeat(rating)}
      <span style={{ color: 'var(--line)' }}>{'★'.repeat(5 - rating)}</span>
    </span>
  );
}

function ReviewsSection() {
  const { dateLocale } = useLocale();
  const [list, setList] = useState<AdminReview[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<AdminReviewStatus | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [detailReview, setDetailReview] = useState<AdminReview | null>(null);

  useEffect(() => {
    let cancelled = false;
    setList(null);
    setError(null);
    listAdminReviews({ page, pageSize: REVIEW_PAGE_SIZE, status: statusFilter || undefined })
      .then((res) => {
        if (cancelled) return;
        setList(res.items);
        setTotal(res.total);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [page, statusFilter]);

  async function refresh() {
    try {
      const res = await listAdminReviews({ page, pageSize: REVIEW_PAGE_SIZE, status: statusFilter || undefined });
      setList(res.items);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reload reviews.');
    }
  }

  async function moderate(id: string, action: 'approve' | 'reject', reason?: string) {
    const updated =
      action === 'approve'
        ? await approveAdminReview(id)
        : await rejectAdminReview(id, reason);
    // PATCH responses carry the row without nested refs; merge the
    // moderation fields into the row we already hold and refresh the list.
    setDetailReview((prev) => (prev && prev.id === id ? { ...prev, status: updated.status, publishedAt: updated.publishedAt } : prev));
    await refresh();
  }

  const totalPages = Math.max(1, Math.ceil(total / REVIEW_PAGE_SIZE));
  const showingFrom = total === 0 ? 0 : (page - 1) * REVIEW_PAGE_SIZE + 1;
  const showingTo = Math.min(page * REVIEW_PAGE_SIZE, total);

  return (
    <section className="page-section active" id="page-reviews">
      <div className="page-head">
        <div>
          <div className="eyebrow">Moderation</div>
          <h2>Reviews</h2>
        </div>
      </div>

      <div className="toolbar">
        <div className="toolbar-left">
          <select
            className="pill-select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as AdminReviewStatus | '');
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            {(Object.entries(REVIEW_STATUS_LABELS) as [AdminReviewStatus, string][]).map(([s, l]) => (
              <option key={s} value={s}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <p role="alert" style={{ color: 'var(--error)', fontSize: 14, marginBottom: 16 }}>
          {error}
        </p>
      )}

      <div className="card">
        {list === null && !error && (
          <p style={{ color: 'var(--ink-soft)', fontSize: 14, padding: '20px 0' }}>Loading reviews…</p>
        )}
        {list && list.length === 0 && (
          <p style={{ color: 'var(--ink-soft)', fontSize: 14, padding: '20px 0' }}>
            {statusFilter ? 'No reviews match this status.' : 'No reviews yet.'}
          </p>
        )}
        {list && list.length > 0 && (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Tour</th>
                    <th>Rating</th>
                    <th>Review</th>
                    <th>Status</th>
                    <th>Submitted</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((r) => (
                    <ReviewRow key={r.id} review={r} dateLocale={dateLocale} onOpen={() => setDetailReview(r)} />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pager">
              <span>
                Showing {showingFrom}–{showingTo} of {total} reviews
              </span>
              <div className="pager-btns">
                <button onClick={() => setPage(1)} disabled={page === 1}>
                  «
                </button>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  ‹
                </button>
                <span style={{ padding: '6px 10px', fontSize: 12, color: 'var(--ink-soft)' }}>
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  ›
                </button>
                <button onClick={() => setPage(totalPages)} disabled={page >= totalPages}>
                  »
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {detailReview && (
        <ReviewDetailModal
          review={detailReview}
          onClose={() => setDetailReview(null)}
          onModerate={(action, reason) =>
            moderate(detailReview.id, action, reason).catch((err: Error) => {
              throw err;
            })
          }
        />
      )}
    </section>
  );
}

function ReviewRow({
  review,
  dateLocale,
  onOpen,
}: {
  review: AdminReview;
  dateLocale: string;
  onOpen: () => void;
}) {
  return (
    <tr>
      <td>
        <div className="cell-main">
          <div className="avatar-sm">{bookingInitials(review.user.name)}</div>
          <div>
            <div className="cell-title">{review.user.name ?? '—'}</div>
            <div className="cell-sub">{review.user.email}</div>
          </div>
        </div>
      </td>
      <td style={{ fontSize: 13 }}>
        <a
          href={`/tours/${review.tour.slug}`}
          target="_blank"
          rel="noreferrer"
          style={{ color: 'var(--link)', textDecoration: 'underline' }}
        >
          {review.tour.title}
        </a>
      </td>
      <td>{renderStars(review.rating)}</td>
      <td style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
        {review.title && <div className="cell-title">{review.title}</div>}
        <div style={{ maxWidth: 340, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {review.body}
        </div>
      </td>
      <td>
        <span className={`badge ${REVIEW_STATUS_BADGE[review.status]}`}>
          {REVIEW_STATUS_LABELS[review.status]}
        </span>
      </td>
      <td style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
        {formatTourDate(review.createdAt, dateLocale)}
      </td>
      <td>
        <div className="row-actions">
          <button
            className="icon-btn"
            title="Review details"
            onClick={onOpen}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M1 12s4-7 11-7 11 7-4 7-11-7-11-7z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>
      </td>
    </tr>
  );
}

function ReviewDetailModal({
  review,
  onClose,
  onModerate,
}: {
  review: AdminReview;
  onClose: () => void;
  onModerate: (action: 'approve' | 'reject', reason?: string) => Promise<void>;
}) {
  const { dateLocale } = useLocale();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPending = review.status === 'PENDING';

  function close() {
    if (busy) return;
    onClose();
  }

  async function go(action: 'approve' | 'reject') {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await onModerate(action, action === 'reject' ? reason.trim() || undefined : undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not ${action} review.`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal onClose={close} labelledBy="review-detail-title">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <h3
          id="review-detail-title"
          style={{ margin: 0, fontFamily: 'var(--cine)', fontSize: 22 }}
        >
          Review
        </h3>
        <button
          type="button"
          className="icon-btn"
          aria-label="Close"
          onClick={close}
          disabled={busy}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M6 18L18 6" />
          </svg>
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div className="avatar-sm" style={{ width: 40, height: 40, fontSize: 15 }}>
          {bookingInitials(review.user.name)}
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="cell-title">{review.user.name ?? '—'}</div>
          <div className="cell-sub">{review.user.email}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <DetailField label="Tour">
          <a
            href={`/tours/${review.tour.slug}`}
            target="_blank"
            rel="noreferrer"
            style={{ color: 'var(--link)', textDecoration: 'underline' }}
          >
            {review.tour.title}
          </a>
        </DetailField>
        <DetailField label="Rating">{renderStars(review.rating)}</DetailField>
        <DetailField label="Status">
          <span className={`badge ${REVIEW_STATUS_BADGE[review.status]}`}>
            {REVIEW_STATUS_LABELS[review.status]}
          </span>
        </DetailField>
        <DetailField label="Submitted">
          {formatTourDate(review.createdAt, dateLocale)}
        </DetailField>
        {review.publishedAt && (
          <DetailField label="Published">
            {formatTourDate(review.publishedAt, dateLocale)}
          </DetailField>
        )}
      </div>

      <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16, marginBottom: 16, display: 'grid', gap: 12 }}>
        {review.title && <DetailField label="Title" full>{review.title}</DetailField>}
        <DetailField label="Review" full>
          <span style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{review.body}</span>
        </DetailField>
      </div>

      {isPending && !rejecting && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setRejecting(true)}
            disabled={busy}
          >
            Reject…
          </button>
          <button
            type="button"
            className="btn-sun"
            onClick={() => void go('approve')}
            disabled={busy}
          >
            {busy ? 'Working…' : 'Approve & Publish'}
          </button>
        </div>
      )}

      {isPending && rejecting && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label
            htmlFor="reject-reason"
            style={{ fontSize: 13, color: 'var(--ink-soft)' }}
          >
            Rejection reason (optional, recorded in the audit log)
          </label>
          <textarea
            id="reject-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={500}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setRejecting(false);
                setReason('');
              }}
              disabled={busy}
            >
              Back
            </button>
            <button
              type="button"
              className="btn-sun"
              onClick={() => void go('reject')}
              disabled={busy}
            >
              {busy ? 'Working…' : 'Reject Review'}
            </button>
          </div>
        </div>
      )}

      {!isPending && (
        <p
          style={{
            color: 'var(--ink-soft)',
            fontSize: 13,
            marginTop: 14,
            padding: 12,
            background: 'var(--sand)',
            borderRadius: 8,
          }}
        >
          This review has already been moderated — no further actions are available.
        </p>
      )}

      {error && (
        <p
          role="alert"
          style={{
            color: 'var(--error)',
            fontSize: 13.5,
            marginTop: 12,
          }}
        >
          {error}
        </p>
      )}
    </Modal>
  );
}

const FAQ_PAGE_SIZE = 25;

function FaqsSection() {
  const { dateLocale } = useLocale();
  const [list, setList] = useState<AdminFaq[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [editingFaq, setEditingFaq] = useState<AdminFaq | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletingFaq, setDeletingFaq] = useState<AdminFaq | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setList(null);
    setError(null);
    listAdminFaqs({ page, pageSize: FAQ_PAGE_SIZE })
      .then((res) => {
        if (cancelled) return;
        setList(res.items);
        setTotal(res.total);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [page]);

  async function refresh() {
    try {
      const res = await listAdminFaqs({ page, pageSize: FAQ_PAGE_SIZE });
      setList(res.items);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reload FAQs.');
    }
  }

  async function save(payload: AdminFaqPayload) {
    if (editingFaq) {
      await updateAdminFaq(editingFaq.id, payload);
      setEditingFaq(null);
    } else {
      await createAdminFaq(payload);
      setCreating(false);
      setPage(1);
    }
    await refresh();
  }

  async function doDelete() {
    if (!deletingFaq || deleting) return;
    setDeleting(true);
    try {
      await deactivateAdminFaq(deletingFaq.id);
      setDeletingFaq(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not deactivate FAQ.');
      setDeletingFaq(null);
    } finally {
      setDeleting(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / FAQ_PAGE_SIZE));
  const showingFrom = total === 0 ? 0 : (page - 1) * FAQ_PAGE_SIZE + 1;
  const showingTo = Math.min(page * FAQ_PAGE_SIZE, total);

  return (
    <section className="page-section active" id="page-faqs">
      <div className="page-head">
        <div>
          <div className="eyebrow">Content</div>
          <h2>FAQs</h2>
        </div>
        <div className="page-head-actions">
          <button type="button" className="btn-sun" onClick={() => setCreating(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M12 5v14M5 12h14" /></svg>
            Add FAQ
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" style={{ color: 'var(--error)', fontSize: 14, marginBottom: 16 }}>
          {error}
        </p>
      )}

      <div className="card">
        {list === null && !error && (
          <p style={{ color: 'var(--ink-soft)', fontSize: 14, padding: '20px 0' }}>Loading FAQs…</p>
        )}
        {list && list.length === 0 && (
          <p style={{ color: 'var(--ink-soft)', fontSize: 14, padding: '20px 0' }}>No FAQs yet.</p>
        )}
        {list && list.length > 0 && (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Question</th>
                    <th>Category</th>
                    <th>Order</th>
                    <th>Status</th>
                    <th>Updated</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((f) => (
                    <tr key={f.id}>
                      <td>
                        <div className="cell-title">{f.question}</div>
                        <div className="cell-sub" style={{ maxWidth: 460, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {f.answer}
                        </div>
                      </td>
                      <td style={{ fontSize: 13 }}>{f.category ?? '—'}</td>
                      <td style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{f.displayOrder}</td>
                      <td>
                        <span className={`badge ${f.isActive ? 'paid' : 'pending'}`}>
                          {f.isActive ? 'Active' : 'Hidden'}
                        </span>
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                        {formatTourDate(f.updatedAt, dateLocale)}
                      </td>
                      <td>
                        <div className="row-actions">
                          <button className="icon-btn" title="Edit FAQ" onClick={() => setEditingFaq(f)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" /></svg>
                          </button>
                          <button className="icon-btn danger" title="Hide from site" onClick={() => setDeletingFaq(f)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6h16z" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pager">
              <span>
                Showing {showingFrom}–{showingTo} of {total} FAQs
              </span>
              <div className="pager-btns">
                <button onClick={() => setPage(1)} disabled={page === 1}>
                  «
                </button>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  ‹
                </button>
                <span style={{ padding: '6px 10px', fontSize: 12, color: 'var(--ink-soft)' }}>
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  ›
                </button>
                <button onClick={() => setPage(totalPages)} disabled={page >= totalPages}>
                  »
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {(creating || editingFaq) && (
        <FaqEditorModal
          faq={editingFaq}
          onClose={() => {
            setCreating(false);
            setEditingFaq(null);
          }}
          onSave={save}
        />
      )}

      {deletingFaq && (
        <ConfirmDialog
          title="Hide this FAQ?"
          body="The FAQ will be removed from the public site. You can edit it to bring it back — this doesn't delete it permanently."
          confirmLabel="Hide FAQ"
          busy={deleting}
          onConfirm={() => void doDelete()}
          onClose={() => setDeletingFaq(null)}
        />
      )}
    </section>
  );
}

function FaqEditorModal({
  faq,
  onClose,
  onSave,
}: {
  faq: AdminFaq | null;
  onClose: () => void;
  onSave: (payload: AdminFaqPayload) => Promise<void>;
}) {
  const isEdit = faq !== null;
  const [form, setForm] = useState(() => ({
    question: faq?.question ?? '',
    answer: faq?.answer ?? '',
    category: faq?.category ?? '',
    displayOrder: faq?.displayOrder ?? 0,
    isActive: faq?.isActive ?? true,
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const orderValid = Number.isInteger(form.displayOrder) && form.displayOrder >= 0 && form.displayOrder <= 9999;
  const canSave = form.question.trim().length >= 5 && form.answer.trim().length >= 5 && orderValid && !saving;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setError(null);
    setSaving(true);
    try {
      await onSave({
        question: form.question.trim(),
        answer: form.answer.trim(),
        category: form.category.trim() || undefined,
        displayOrder: form.displayOrder,
        isActive: form.isActive,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save FAQ.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal onClose={onClose} labelledBy="faq-modal-title">
      <form onSubmit={submit} noValidate>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h3 id="faq-modal-title" style={{ margin: 0, fontFamily: 'var(--cine)', fontSize: 22 }}>
            {isEdit ? 'Edit FAQ' : 'Add FAQ'}
          </h3>
          <button
            type="button"
            className="icon-btn"
            aria-label="Close"
            onClick={onClose}
            disabled={saving}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>
        </div>

        {error && (
          <p role="alert" style={{ color: 'var(--error)', fontSize: 13.5, marginBottom: 12 }}>
            {error}
          </p>
        )}

        <div className="field-grid">
          <div className="field full">
            <label htmlFor="faq-question">Question</label>
            <input
              id="faq-question"
              type="text"
              value={form.question}
              onChange={(e) => update('question', e.target.value)}
              required
              minLength={5}
              maxLength={280}
            />
          </div>
          <div className="field full">
            <label htmlFor="faq-answer">Answer</label>
            <textarea
              id="faq-answer"
              value={form.answer}
              onChange={(e) => update('answer', e.target.value)}
              rows={5}
              required
              minLength={5}
              maxLength={4000}
            />
          </div>
          <div className="field">
            <label htmlFor="faq-category">Category</label>
            <input
              id="faq-category"
              type="text"
              value={form.category}
              onChange={(e) => update('category', e.target.value)}
              maxLength={64}
              placeholder="e.g. Booking"
            />
          </div>
          <div className="field">
            <label htmlFor="faq-order">Display Order</label>
            <input
              id="faq-order"
              type="number"
              inputMode="numeric"
              value={form.displayOrder}
              onChange={(e) => update('displayOrder', Number(e.target.value))}
              min={0}
              max={9999}
              required
            />
          </div>
          <div className="field full toggle-row" style={{ border: 'none', paddingLeft: 0 }}>
            <div className="ti">
              <b>Visible on public site</b>
            </div>
            <div className={`switch ${form.isActive ? 'on' : ''}`} onClick={() => update('isActive', !form.isActive)} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button type="button" onClick={onClose} disabled={saving} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" className="btn-sun" disabled={!canSave}>
            {saving ? 'Working…' : isEdit ? 'Save Changes' : 'Add FAQ'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── settings section ─────────────────────────────────────────────────

type SettingsTab =
  | 'general'
  | 'social'
  | 'homepage'
  | 'languages'
  | 'currencies'
  | 'promo'
  | 'inbox'
  | 'audit';

const SETTINGS_TABS: Array<{ id: SettingsTab; label: string }> = [
  { id: 'general', label: 'General Info' },
  { id: 'social', label: 'Social Media' },
  { id: 'homepage', label: 'Homepage & About' },
  { id: 'languages', label: 'Languages' },
  { id: 'currencies', label: 'Currencies' },
  { id: 'promo', label: 'Promo Codes' },
  { id: 'inbox', label: 'Contact Inbox' },
  { id: 'audit', label: 'Audit Log' },
];

/**
 * §27 — Site Content & Settings editor. All sub-tabs are backed by
 * real `/api/admin/*` endpoints:
 *
 *   General / Social / Homepage → SiteContent editor
 *   Languages                    → /api/admin/languages
 *   Currencies                   → /api/admin/currencies
 *   Promo Codes                  → /api/admin/promo-codes
 *   Contact Inbox                → /api/admin/contact-messages
 *   Audit Log                    → /api/admin/audit-log (read-only)
 */
function SettingsSection() {
  const [tab, setTab] = useState<SettingsTab>('general');
  return (
    <section className="page-section active" id="page-settings">
      <div className="page-head">
        <div>
          <div className="eyebrow">Content</div>
          <h2>Site Content &amp; Settings</h2>
        </div>
      </div>
      <div className="settings-nav">
        {SETTINGS_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tab-pill-btn ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'general' && (
        <SiteContentEditor groups={GENERAL_GROUPS} heading="General Information" />
      )}
      {tab === 'social' && (
        <SiteContentEditor groups={SOCIAL_GROUPS} heading="Social Media Links" />
      )}
      {tab === 'homepage' && (
        <SiteContentEditor groups={HOMEPAGE_GROUPS} heading="Homepage & About" />
      )}
      {tab === 'languages' && <LanguagesPanel />}
      {tab === 'currencies' && <CurrenciesPanel />}
      {tab === 'promo' && <PromoCodesPanel />}
      {tab === 'inbox' && <ContactMessagesPanel />}
      {tab === 'audit' && <AuditLogPanel />}
    </section>
  );
}

interface ScFieldDef {
  name: string;
  label: string;
  kind?: 'text' | 'textarea';
  full?: boolean;
}

interface ScGroupDef {
  key: string;
  title: string;
  fields: ScFieldDef[];
}

const GENERAL_GROUPS: ScGroupDef[] = [
  {
    key: 'company.contact',
    title: 'Contact Details',
    fields: [
      { name: 'phone', label: 'Contact Phone' },
      { name: 'email', label: 'Contact Email' },
      { name: 'whatsapp', label: 'WhatsApp' },
      { name: 'address', label: 'Office Address', full: true },
    ],
  },
  {
    key: 'footer.contact',
    title: 'Footer Contact',
    fields: [
      { name: 'phone', label: 'Footer Phone' },
      { name: 'email', label: 'Footer Email' },
    ],
  },
];

const SOCIAL_GROUPS: ScGroupDef[] = [
  {
    key: 'company.social',
    title: 'Social Media Links',
    fields: [
      { name: 'instagram', label: 'Instagram' },
      { name: 'facebook', label: 'Facebook' },
    ],
  },
];

const HOMEPAGE_GROUPS: ScGroupDef[] = [
  {
    key: 'homepage.hero',
    title: 'Homepage Hero',
    fields: [
      { name: 'eyebrow', label: 'Eyebrow' },
      { name: 'title', label: 'Hero Title', full: true },
      { name: 'sub', label: 'Hero Subtitle', kind: 'textarea', full: true },
    ],
  },
  {
    key: 'about.body',
    title: 'About Page Text',
    fields: [
      { name: 'html', label: 'About Us Text (HTML)', kind: 'textarea', full: true },
    ],
  },
];

/**
 * Reusable site-content editor. Loads the batch for the active locale
 * (backend falls back to the default locale row when a translation
 * is missing) and saves per-group with PUT /api/admin/site-content/:key/:locale.
 */
function SiteContentEditor({ groups, heading }: { groups: ScGroupDef[]; heading: string }) {
  const keys = useMemo(() => groups.map((g) => g.key), [groups]);
  const [locale, setLocale] = useState<'en' | 'ar'>('en');
  const [form, setForm] = useState<Record<string, Record<string, string>>>({});
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setError(null);
    getSiteContentBatch(keys, locale)
      .then((rows) => {
        if (cancelled) return;
        const next: Record<string, Record<string, string>> = {};
        rows.forEach(({ key, row }) => {
          const group = groups.find((g) => g.key === key);
          if (!group) return;
          const values: Record<string, string> = {};
          group.fields.forEach((f) => {
            const v = row?.content?.[f.name];
            values[f.name] = typeof v === 'string' ? v : '';
          });
          next[key] = values;
        });
        setForm(next);
        setLoaded(true);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [groups, keys, locale]);

  function setValue(key: string, name: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: { ...(prev[key]), [name]: value } }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await Promise.all(
        groups.map((g) => putAdminSiteContent(g.key, locale, (form[g.key] ?? {}) as Record<string, unknown>)),
      );
      setSavedAt(new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save content.');
    } finally {
      setSaving(false);
    }
  }

  async function saveAll() {
    setSaving(true);
    setError(null);
    try {
      const locales = ['en', 'ar'] as const;
      for (const loc of locales) {
        await Promise.all(
          groups.map((g) => putAdminSiteContent(g.key, loc, (form[g.key] ?? {}) as Record<string, unknown>)),
        );
      }
      setSavedAt(new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save content.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <div className="card-head">
        <h3>{heading}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['en', 'ar'] as const).map((l) => (
              <button
                key={l}
                type="button"
                className={`tab-pill-btn ${locale === l ? 'active' : ''}`}
                onClick={() => setLocale(l)}
              >
                {l === 'en' ? 'English' : 'العربية'}
              </button>
            ))}
          </div>
          {savedAt && (
            <span style={{ fontSize: 12, color: 'var(--good)' }}>Saved ✓</span>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" style={{ color: 'var(--error)', fontSize: 13.5, marginBottom: 12 }}>
          {error}
        </p>
      )}
      {!loaded && !error && (
        <p style={{ color: 'var(--ink-soft)', fontSize: 14, padding: '20px 0' }}>
          Loading content…
        </p>
      )}

      {loaded &&
        groups.map((g) => (
          <div key={g.key} style={{ marginBottom: 24 }}>
            <div className="card-head" style={{ marginBottom: 12 }}>
              <h4
                style={{
                  fontFamily: 'var(--eyebrow)',
                  fontSize: 12,
                  letterSpacing: '.08em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-soft)',
                }}
              >
                {g.title} <span style={{ color: 'var(--line-strong)', marginInlineStart: 6 }}>{g.key}</span>
              </h4>
            </div>
            <div className="field-grid">
              {g.fields.map((f) => (
                <div key={f.name} className={`field ${f.full ? 'full' : ''}`}>
                  <label>{f.label}</label>
                  {f.kind === 'textarea' ? (
                    <textarea
                      value={form[g.key]?.[f.name] ?? ''}
                      onChange={(e) => setValue(g.key, f.name, e.target.value)}
                      rows={5}
                    />
                  ) : (
                    <input
                      type="text"
                      value={form[g.key]?.[f.name] ?? ''}
                      onChange={(e) => setValue(g.key, f.name, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

      <div className="form-actions" style={{ gap: 12 }}>
        <button type="button" className="btn-sun" onClick={() => void save()} disabled={saving || !loaded}>
          {saving ? 'Working…' : `Save ${locale === 'en' ? 'English' : 'العربية'}`}
        </button>
        <button type="button" className="btn-outline" onClick={() => void saveAll()} disabled={saving || !loaded}>
          {saving ? 'Working…' : 'Save All Locales'}
        </button>
      </div>
    </div>
  );
}

// ─── languages panel ──────────────────────────────────────────────────

function LanguagesPanel() {
  const [list, setList] = useState<AdminLanguage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [form, setForm] = useState<AdminLanguageCreate>({
    code: '',
    name: '',
    isEnabled: true,
    isRtl: false,
  });

  async function refresh() {
    try {
      setList(await listAdminLanguages());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load languages.');
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function toggle(code: string, patch: AdminLanguageUpdate) {
    setBusy(code);
    setError(null);
    try {
      await updateAdminLanguage(code, patch);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update language.');
    } finally {
      setBusy(null);
    }
  }

  async function makeDefault(code: string) {
    setBusy(code);
    setError(null);
    try {
      await setAdminLanguageDefault(code);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not set default language.');
    } finally {
      setBusy(null);
    }
  }

  async function create(e: FormEvent) {
    e.preventDefault();
    const code = form.code.trim().toLowerCase();
    const name = form.name.trim();
    if (!code || !name) return;
    setBusy('new');
    setError(null);
    try {
      await createAdminLanguage({ ...form, code, name });
      setForm({ code: '', name: '', isEnabled: true, isRtl: false });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add language.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="card">
      <div className="card-head">
        <h3>Languages</h3>
      </div>
      {error && (
        <p role="alert" style={{ color: 'var(--error)', fontSize: 13.5, marginBottom: 12 }}>
          {error}
        </p>
      )}
      {list === null && !error && (
        <p style={{ color: 'var(--ink-soft)', fontSize: 14, padding: '20px 0' }}>Loading languages…</p>
      )}
      {list && list.length === 0 && (
        <p style={{ color: 'var(--ink-soft)', fontSize: 14, padding: '20px 0' }}>No languages yet.</p>
      )}
      {list && list.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Enabled</th>
                <th>RTL</th>
                <th>Default</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((l) => (
                <tr key={l.code}>
                  <td>
                    <div className="cell-title">{l.code}</div>
                  </td>
                  <td><span style={{ fontSize: 13.5 }}>{l.name}</span></td>
                  <td>
                    <div
                      className={`switch ${l.isEnabled ? 'on' : ''}`}
                      onClick={() => toggle(l.code, { isEnabled: !l.isEnabled })}
                      aria-label={`Toggle ${l.code}`}
                    />
                  </td>
                  <td>
                    <div
                      className={`switch ${l.isRtl ? 'on' : ''}`}
                      onClick={() => toggle(l.code, { isRtl: !l.isRtl })}
                      aria-label={`Toggle RTL for ${l.code}`}
                    />
                  </td>
                  <td>
                    {l.isDefault ? (
                      <span className="badge paid">Default</span>
                    ) : (
                      <button
                        type="button"
                        className="btn-ghost"
                        disabled={busy === l.code}
                        onClick={() => void makeDefault(l.code)}
                      >
                        Set Default
                      </button>
                    )}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                    {busy === l.code ? '…' : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form onSubmit={create} className="settings-form-below">
        <div className="card-head" style={{ marginTop: 24, marginBottom: 12 }}>
          <h4
            style={{
              fontFamily: 'var(--eyebrow)',
              fontSize: 12,
              letterSpacing: '.08em',
              textTransform: 'uppercase',
              color: 'var(--ink-soft)',
            }}
          >
            Add Language
          </h4>
        </div>
        <div className="field-grid">
          <div className="field">
            <label>Code</label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              placeholder="e.g. fr"
              maxLength={8}
              required
            />
          </div>
          <div className="field">
            <label>Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Français"
              maxLength={80}
              required
            />
          </div>
          <div className="field toggle-row" style={{ border: 'none', paddingLeft: 0 }}>
            <div className="ti"><b>Right-to-left</b></div>
            <div
              className={`switch ${form.isRtl ? 'on' : ''}`}
              onClick={() => setForm((f) => ({ ...f, isRtl: !f.isRtl }))}
            />
          </div>
        </div>
        <div className="form-actions">
          <button type="submit" className="btn-sun" disabled={busy === 'new' || !form.code.trim() || !form.name.trim()}>
            {busy === 'new' ? 'Working…' : 'Add Language'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── currencies panel ─────────────────────────────────────────────────

function CurrenciesPanel() {
  const [list, setList] = useState<AdminCurrency[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [form, setForm] = useState<AdminCurrencyCreate>({
    code: '',
    symbol: '',
    exchangeRateToEgp: 1,
    displayOrder: 0,
    isEnabled: true,
  });

  async function refresh() {
    try {
      setList(await listAdminCurrencies());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load currencies.');
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function toggle(code: string, isEnabled: boolean) {
    setBusy(code);
    setError(null);
    try {
      await updateAdminCurrency(code, { isEnabled });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update currency.');
    } finally {
      setBusy(null);
    }
  }

  async function saveRow(c: AdminCurrency, symbol: string, rate: number, order: number) {
    const patch: AdminCurrencyUpdate = { symbol, exchangeRateToEgp: rate, displayOrder: order };
    if (c.isBase) delete patch.exchangeRateToEgp; // base rate is fixed at 1
    setBusy(c.code);
    setError(null);
    try {
      await updateAdminCurrency(c.code, patch);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update currency.');
    } finally {
      setBusy(null);
    }
  }

  async function create(e: FormEvent) {
    e.preventDefault();
    const code = form.code.trim().toUpperCase();
    if (!code || !form.symbol.trim()) return;
    setBusy('new');
    setError(null);
    try {
      await createAdminCurrency({ ...form, code });
      setForm({ code: '', symbol: '', exchangeRateToEgp: 1, displayOrder: 0, isEnabled: true });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add currency.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="card">
      <div className="card-head">
        <h3>Currencies</h3>
        <span className="field-hint" style={{ margin: 0 }}>
          Display-only — all bookings settle in EGP (base).
        </span>
      </div>
      {error && (
        <p role="alert" style={{ color: 'var(--error)', fontSize: 13.5, marginBottom: 12 }}>
          {error}
        </p>
      )}
      {list === null && !error && (
        <p style={{ color: 'var(--ink-soft)', fontSize: 14, padding: '20px 0' }}>Loading currencies…</p>
      )}
      {list && list.length === 0 && (
        <p style={{ color: 'var(--ink-soft)', fontSize: 14, padding: '20px 0' }}>No currencies yet.</p>
      )}
      {list && list.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Symbol</th>
                <th>Rate → EGP</th>
                <th>Order</th>
                <th>Enabled</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <CurrencyRow
                  key={c.code}
                  currency={c}
                  busy={busy === c.code}
                  onToggle={(v) => void toggle(c.code, v)}
                  onSave={(symbol, rate, order) => void saveRow(c, symbol, rate, order)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form onSubmit={create} className="settings-form-below">
        <div className="card-head" style={{ marginTop: 24, marginBottom: 12 }}>
          <h4
            style={{
              fontFamily: 'var(--eyebrow)',
              fontSize: 12,
              letterSpacing: '.08em',
              textTransform: 'uppercase',
              color: 'var(--ink-soft)',
            }}
          >
            Add Currency
          </h4>
        </div>
        <div className="field-grid">
          <div className="field">
            <label>Code</label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              placeholder="e.g. EUR"
              maxLength={3}
              required
            />
          </div>
          <div className="field">
            <label>Symbol</label>
            <input
              type="text"
              value={form.symbol}
              onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value }))}
              placeholder="€"
              maxLength={8}
              required
            />
          </div>
          <div className="field">
            <label>Rate → EGP</label>
            <input
              type="number"
              inputMode="decimal"
              min={0.000001}
              step="any"
              value={String(form.exchangeRateToEgp)}
              onChange={(e) => setForm((f) => ({ ...f, exchangeRateToEgp: Number(e.target.value) }))}
              required
            />
          </div>
          <div className="field">
            <label>Display Order</label>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={String(form.displayOrder)}
              onChange={(e) => setForm((f) => ({ ...f, displayOrder: Number(e.target.value) }))}
            />
          </div>
        </div>
        <div className="form-actions">
          <button type="submit" className="btn-sun" disabled={busy === 'new' || !form.code.trim() || !form.symbol.trim()}>
            {busy === 'new' ? 'Working…' : 'Add Currency'}
          </button>
        </div>
      </form>
    </div>
  );
}

function CurrencyRow({
  currency,
  busy,
  onToggle,
  onSave,
}: {
  currency: AdminCurrency;
  busy: boolean;
  onToggle: (v: boolean) => void;
  onSave: (symbol: string, rate: number, order: number) => void;
}) {
  const [symbol, setSymbol] = useState(currency.symbol);
  const [rate, setRate] = useState(String(currency.exchangeRateToEgp));
  const [order, setOrder] = useState(String(currency.displayOrder));
  const dirty =
    symbol !== currency.symbol ||
    rate !== String(currency.exchangeRateToEgp) ||
    order !== String(currency.displayOrder);
  const rateNum = Number(rate);
  const rateValid = rate.trim() !== '' && Number.isFinite(rateNum) && rateNum > 0;

  return (
    <tr>
      <td>
        <div className="cell-title">
          {currency.code} {currency.isBase && <span className="badge paid">Base</span>}
        </div>
      </td>
      <td>
        <input
          type="text"
          className="cell-input"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          maxLength={8}
          disabled={currency.isBase}
        />
      </td>
      <td>
        <input
          type="number"
          className="cell-input"
          inputMode="decimal"
          min={0.000001}
          step="any"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          disabled={currency.isBase}
        />
      </td>
      <td>
        <input
          type="number"
          className="cell-input"
          inputMode="numeric"
          min={0}
          value={order}
          onChange={(e) => setOrder(e.target.value)}
          style={{ width: 70 }}
        />
      </td>
      <td>
        <div className={`switch ${currency.isEnabled ? 'on' : ''}`} onClick={() => onToggle(!currency.isEnabled)} />
      </td>
      <td>
        <div className="row-actions">
          <button
            type="button"
            className="btn-ghost"
            disabled={busy || !dirty || (currency.isBase ? false : !rateValid)}
            onClick={() => onSave(symbol, Number(rate), Number(order))}
          >
            {busy ? '…' : 'Save'}
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── promo codes panel ────────────────────────────────────────────────

interface PromoFormState {
  code: string;
  type: AdminPromoCode['type'];
  valueMajor: string;
  minBookingMajor: string;
  scope: AdminPromoCode['scope'];
  startDate: string;
  endDate: string;
  totalUsageLimit: string;
  perCustomerUsageLimit: string;
}

const EMPTY_PROMO_FORM: PromoFormState = {
  code: '',
  type: 'PERCENTAGE',
  valueMajor: '10',
  minBookingMajor: '',
  scope: 'ALL',
  startDate: '',
  endDate: '',
  totalUsageLimit: '',
  perCustomerUsageLimit: '',
};

function PromoCodesPanel() {
  const [list, setList] = useState<AdminPromoCode[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<AdminPromoCode | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [viewing, setViewing] = useState<AdminPromoCode | null>(null);

  async function refresh() {
    try {
      setList(await listAdminPromoCodes());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load promo codes.');
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function toggleActive(code: AdminPromoCode) {
    setError(null);
    try {
      await updateAdminPromoCode(code.id, { isActive: !code.isActive });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update promo code.');
    }
  }

  async function doDelete() {
    if (!deleting || deletingBusy) return;
    setDeletingBusy(true);
    setError(null);
    try {
      await deactivateAdminPromoCode(deleting.id);
      await refresh();
      setDeleting(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not deactivate promo code.');
      setDeleting(null);
    } finally {
      setDeletingBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="card-head">
        <h3>Promo Codes</h3>
        <button type="button" className="btn-sun" onClick={() => setCreating(true)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M12 5v14M5 12h14" /></svg>
          New Promo Code
        </button>
      </div>
      {error && (
        <p role="alert" style={{ color: 'var(--error)', fontSize: 13.5, marginBottom: 12 }}>
          {error}
        </p>
      )}
      {list === null && !error && (
        <p style={{ color: 'var(--ink-soft)', fontSize: 14, padding: '20px 0' }}>Loading promo codes…</p>
      )}
      {list && list.length === 0 && (
        <p style={{ color: 'var(--ink-soft)', fontSize: 14, padding: '20px 0' }}>No promo codes yet.</p>
      )}
      {list && list.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Type</th>
                <th>Value</th>
                <th>Scope</th>
                <th>Redeemed</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="cell-title" style={{ letterSpacing: '.08em' }}>{c.code}</div>
                    <div className="cell-sub">Created {formatTourDate(c.createdAt, 'en')}</div>
                  </td>
                  <td style={{ fontSize: 13 }}>
                    {c.type === 'PERCENTAGE' ? 'Percent' : 'Fixed Amount'}
                  </td>
                  <td style={{ fontSize: 13 }}>
                    {c.type === 'PERCENTAGE' ? `${c.value}%` : formatPrice(c.value, 'EGP')}
                    {c.minBookingAmount !== null && (
                      <div className="cell-sub">min {formatPrice(c.minBookingAmount, 'EGP')}</div>
                    )}
                  </td>
                  <td style={{ fontSize: 13 }}>{c.scope}</td>
                  <td style={{ fontSize: 13 }}>{c.redeemedCount}</td>
                  <td>
                    <span className={`badge ${c.isActive ? 'paid' : 'refunded'}`}>
                      {c.isActive ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="icon-btn" title="View redemptions" onClick={() => setViewing(c)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>
                      </button>
                      {c.isActive && (
                        <button className="icon-btn" title="Toggle active" onClick={() => void toggleActive(c)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M18.4 4a8 8 0 11-8 12.8L9 16l1-3 3 3 1 1 1-4-3 1A10 10 0 0018.4 4z" /></svg>
                        </button>
                      )}
                      <button className="icon-btn danger" title="Deactivate" onClick={() => setDeleting(c)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6h16z" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <PromoCodeEditor
          onClose={() => setCreating(false)}
          onSaved={async () => {
            setCreating(false);
            await refresh();
          }}
        />
      )}

      {viewing && (
        <PromoRedemptionsModal code={viewing} onClose={() => setViewing(null)} />
      )}

      {deleting && (
        <ConfirmDialog
          title="Deactivate this promo code?"
          body={`"${deleting.code}" will stop being accepted at checkout. It stays in the database for audit history.`}
          confirmLabel="Deactivate"
          busy={deletingBusy}
          onConfirm={() => void doDelete()}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

function promoPayloadFromForm(f: PromoFormState): AdminPromoCodeCreate {
  const payload: AdminPromoCodeCreate = {
    code: f.code.trim(),
    type: f.type,
    value: Math.round(Number(f.valueMajor || 0) * (f.type === 'PERCENTAGE' ? 1 : 100)),
    scope: f.scope,
  };
  if (f.minBookingMajor.trim()) payload.minBookingAmount = Math.round(Number(f.minBookingMajor) * 100);
  if (f.startDate.trim()) payload.startDate = f.startDate.trim();
  if (f.endDate.trim()) payload.endDate = f.endDate.trim();
  if (f.totalUsageLimit.trim()) payload.totalUsageLimit = Math.round(Number(f.totalUsageLimit));
  if (f.perCustomerUsageLimit.trim()) payload.perCustomerUsageLimit = Math.round(Number(f.perCustomerUsageLimit));
  return payload;
}

function PromoCodeEditor({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [form, setForm] = useState<PromoFormState>(EMPTY_PROMO_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof PromoFormState>(k: K, v: PromoFormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.code.trim() || !form.valueMajor.trim() || Number(form.valueMajor) <= 0) return;
    setSaving(true);
    setError(null);
    try {
      await createAdminPromoCode(promoPayloadFromForm(form));
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create promo code.');
      setSaving(false);
    }
  }

  const canSave = form.code.trim().length >= 2 && form.valueMajor.trim() !== '' && Number(form.valueMajor) > 0;

  return (
    <Modal onClose={onClose} labelledBy="promo-title">
      <form onSubmit={submit} className="modal-form">
        <div className="modal-head">
          <h3 id="promo-title">New Promo Code</h3>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose} disabled={saving}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M6 18L18 6" /></svg>
          </button>
        </div>

        {error && (
          <p role="alert" style={{ color: 'var(--error)', fontSize: 13.5, marginBottom: 12 }}>
            {error}
          </p>
        )}

        <div className="field-grid">
          <div className="field">
            <label>Code</label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => update('code', e.target.value.toUpperCase())}
              placeholder="e.g. SUMMER25"
              minLength={2}
              maxLength={32}
              pattern="[A-Z0-9_-]+"
              required
            />
          </div>
          <div className="field">
            <label>Type</label>
            <select value={form.type} onChange={(e) => update('type', e.target.value as AdminPromoCode['type'])}>
              <option value="PERCENTAGE">Percentage off</option>
              <option value="FIXED_AMOUNT">Fixed amount (EGP)</option>
            </select>
          </div>
          <div className="field">
            <label>{form.type === 'PERCENTAGE' ? 'Percent Off' : 'Amount Off (EGP)'}</label>
            <input
              type="number"
              inputMode="decimal"
              min={form.type === 'PERCENTAGE' ? 1 : 0.01}
              step="any"
              value={form.valueMajor}
              onChange={(e) => update('valueMajor', e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>Min Booking (EGP)</label>
            <input
              type="number"
              inputMode="decimal"
              min={1}
              step="any"
              value={form.minBookingMajor}
              onChange={(e) => update('minBookingMajor', e.target.value)}
              placeholder="optional"
            />
          </div>
          <div className="field">
            <label>Scope</label>
            <select value={form.scope} onChange={(e) => update('scope', e.target.value as AdminPromoCode['scope'])}>
              <option value="ALL">All tours</option>
              <option value="TOURS">Specific tours</option>
              <option value="CATEGORIES">Specific categories</option>
            </select>
          </div>
          <div className="field">
            <label>Start Date</label>
            <input type="date" value={form.startDate} onChange={(e) => update('startDate', e.target.value)} />
          </div>
          <div className="field">
            <label>End Date</label>
            <input type="date" value={form.endDate} onChange={(e) => update('endDate', e.target.value)} />
          </div>
          <div className="field">
            <label>Total Usage Limit</label>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={form.totalUsageLimit}
              onChange={(e) => update('totalUsageLimit', e.target.value)}
              placeholder="optional"
            />
          </div>
          <div className="field">
            <label>Per-Customer Limit</label>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={form.perCustomerUsageLimit}
              onChange={(e) => update('perCustomerUsageLimit', e.target.value)}
              placeholder="optional"
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button type="button" onClick={onClose} disabled={saving} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" className="btn-sun" disabled={!canSave || saving}>
            {saving ? 'Working…' : 'Create Code'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function PromoRedemptionsModal({
  code,
  onClose,
}: {
  code: AdminPromoCode;
  onClose: () => void;
}) {
  const [list, setList] = useState<AdminPromoRedemption[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listAdminPromoRedemptions(code.id, { page: 1, pageSize: 100 })
      .then((res) => {
        if (!cancelled) setList(res.items);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [code.id]);

  return (
    <Modal onClose={onClose} labelledBy="redemptions-title">
      <div className="modal-head">
        <h3 id="redemptions-title">Redemptions — {code.code}</h3>
        <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M6 18L18 6" /></svg>
        </button>
      </div>
      {error && (
        <p role="alert" style={{ color: 'var(--error)', fontSize: 13.5, marginBottom: 12 }}>
          {error}
        </p>
      )}
      {list === null && !error && (
        <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>Loading redemptions…</p>
      )}
      {list && list.length === 0 && (
        <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>This code has not been redeemed yet.</p>
      )}
      {list && list.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Email</th>
                <th>Discount</th>
                <th>Booking</th>
                <th>Redeemed</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="cell-title">{r.user?.name ?? '—'}</div>
                  </td>
                  <td style={{ fontSize: 13 }}>{r.user?.email ?? 'Guest'}</td>
                  <td style={{ fontSize: 13 }}>{formatPrice(r.discountAmount, 'EGP')}</td>
                  <td style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{r.bookingId.slice(0, 8)}…</td>
                  <td style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{formatTourDate(r.redeemedAt, 'en')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}

// ─── contact messages panel ───────────────────────────────────────────

const CONTACT_STATUS_LABELS: Record<ContactMessageStatus, string> = {
  NEW: 'NEW',
  REPLIED: 'REPLIED',
  ARCHIVED: 'ARCHIVED',
};

const CONTACT_STATUS_BADGE: Record<ContactMessageStatus, 'pending' | 'paid' | 'published'> = {
  NEW: 'pending',
  REPLIED: 'paid',
  ARCHIVED: 'published',
};

const CONTACT_PAGE_SIZE = 25;

function ContactMessagesPanel() {
  const { dateLocale } = useLocale();
  const [list, setList] = useState<AdminContactMessage[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ContactMessageStatus | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<AdminContactMessage | null>(null);

  useEffect(() => {
    let cancelled = false;
    setList(null);
    setError(null);
    listAdminContactMessages({ page, pageSize: CONTACT_PAGE_SIZE, status: statusFilter || undefined })
      .then((res) => {
        if (cancelled) return;
        setList(res.items);
        setTotal(res.total);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [page, statusFilter]);

  async function refresh() {
    try {
      const res = await listAdminContactMessages({
        page,
        pageSize: CONTACT_PAGE_SIZE,
        status: statusFilter || undefined,
      });
      setList(res.items);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reload messages.');
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / CONTACT_PAGE_SIZE));
  const showingFrom = total === 0 ? 0 : (page - 1) * CONTACT_PAGE_SIZE + 1;
  const showingTo = Math.min(page * CONTACT_PAGE_SIZE, total);

  return (
    <div className="card">
      <div className="card-head">
        <h3>Contact Messages</h3>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(['', 'NEW', 'REPLIED', 'ARCHIVED'] as const).map((s) => (
            <button
              key={s}
              type="button"
              className={`tab-pill-btn ${statusFilter === s ? 'active' : ''}`}
              onClick={() => {
                setStatusFilter(s);
                setPage(1);
              }}
            >
              {s === '' ? 'All' : CONTACT_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>
      {error && (
        <p role="alert" style={{ color: 'var(--error)', fontSize: 13.5, marginBottom: 12 }}>
          {error}
        </p>
      )}
      {list === null && !error && (
        <p style={{ color: 'var(--ink-soft)', fontSize: 14, padding: '20px 0' }}>Loading messages…</p>
      )}
      {list && list.length === 0 && (
        <p style={{ color: 'var(--ink-soft)', fontSize: 14, padding: '20px 0' }}>
          No {statusFilter ? statusFilter.toLowerCase() : ''} messages.
        </p>
      )}
      {list && list.length > 0 && (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>From</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Received</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {list.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div className="cell-title">{m.name}</div>
                      <div className="cell-sub">{m.email}</div>
                    </td>
                    <td>
                      <div className="cell-title" style={{ fontWeight: 500, maxWidth: 360, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {m.subject}
                      </div>
                      <div className="cell-sub" style={{ maxWidth: 360, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {m.body}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${CONTACT_STATUS_BADGE[m.status]}`}>
                        {CONTACT_STATUS_LABELS[m.status]}
                      </span>
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                      {formatTourDate(m.receivedAt, dateLocale)}
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="icon-btn" title="Open message" onClick={() => setViewing(m)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 11l3 3 8-8" /><path d="M20 12v6a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h9" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pager">
            <span>
              Showing {showingFrom}–{showingTo} of {total} messages
            </span>
            <div className="pager-btns">
              <button onClick={() => setPage(1)} disabled={page === 1}>«</button>
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
              <span style={{ padding: '6px 10px', fontSize: 12, color: 'var(--ink-soft)' }}>
                Page {page} of {totalPages}
              </span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>›</button>
              <button onClick={() => setPage(totalPages)} disabled={page >= totalPages}>»</button>
            </div>
          </div>
        </>
      )}

      {viewing && (
        <ContactMessageModal
          message={viewing}
          onClose={() => setViewing(null)}
          onSaved={async () => {
            setViewing(null);
            await refresh();
          }}
        />
      )}
    </div>
  );
}

function ContactMessageModal({
  message,
  onClose,
  onSaved,
}: {
  message: AdminContactMessage;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { dateLocale } = useLocale();
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function setStatus(status: ContactMessageStatus) {
    setBusy(true);
    setError(null);
    try {
      await updateAdminContactMessage(message.id, {
        status,
        ...(status === 'REPLIED' && reply.trim() ? { reply: reply.trim() } : {}),
      });
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update message.');
      setBusy(false);
    }
  }

  return (
    <Modal onClose={onClose} labelledBy="contact-msg-title">
      <div className="modal-head">
        <h3 id="contact-msg-title">{message.subject}</h3>
        <button type="button" className="icon-btn" aria-label="Close" onClick={onClose} disabled={busy}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M6 18L18 6" /></svg>
        </button>
      </div>

      <div className="contact-msg-head">
        <div>
          <b>{message.name}</b>
          <span>{message.email}{message.phone ? ` · ${message.phone}` : ''}</span>
        </div>
        <span className={`badge ${CONTACT_STATUS_BADGE[message.status]}`}>
          {CONTACT_STATUS_LABELS[message.status]}
        </span>
      </div>
      <p style={{ color: 'var(--ink-soft)', fontSize: 12, marginTop: 4 }}>
        Received {formatTourDate(message.receivedAt, dateLocale)}
      </p>

      <p style={{ fontSize: 14.5, lineHeight: 1.7, whiteSpace: 'pre-wrap', color: 'var(--ink)' }}>{message.body}</p>

      {message.status !== 'REPLIED' && (
        <div className="field" style={{ marginTop: 8 }}>
          <label>Reply (recorded for the team)</label>
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Paste / draft the reply sent to the customer…"
          />
        </div>
      )}

      {error && (
        <p role="alert" style={{ color: 'var(--error)', fontSize: 13.5, marginTop: 12 }}>
          {error}
        </p>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
        {message.status !== 'NEW' && (
          <button type="button" className="btn-ghost" disabled={busy} onClick={() => void setStatus('NEW')}>
            Mark New
          </button>
        )}
        {message.status !== 'ARCHIVED' && (
          <button type="button" className="btn-ghost" disabled={busy} onClick={() => void setStatus('ARCHIVED')}>
            Archive
          </button>
        )}
        {message.status !== 'REPLIED' && (
          <button type="button" className="btn-sun" disabled={busy} onClick={() => void setStatus('REPLIED')}>
            {busy ? 'Working…' : 'Mark Replied'}
          </button>
        )}
      </div>
    </Modal>
  );
}

// ─── audit log panel ──────────────────────────────────────────────────

const AUDIT_PAGE_SIZE = 100;

function AuditLogPanel() {
  const { dateLocale } = useLocale();
  const [list, setList] = useState<AuditLogEntry[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [committed, setCommitted] = useState({ action: '', entityType: '' });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setList(null);
    setError(null);
    listAdminAuditLog({
      page,
      pageSize: AUDIT_PAGE_SIZE,
      action: committed.action || undefined,
      entityType: committed.entityType || undefined,
    })
      .then((res) => {
        if (cancelled) return;
        setList(res.items);
        setTotal(res.total);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [page, committed]);

  const totalPages = Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE));
  const showingFrom = total === 0 ? 0 : (page - 1) * AUDIT_PAGE_SIZE + 1;
  const showingTo = Math.min(page * AUDIT_PAGE_SIZE, total);

  return (
    <div className="card">
      <div className="card-head">
        <h3>Audit Log <span style={{ fontSize: 12, color: 'var(--ink-soft)', fontFamily: 'var(--body)' }}>(read-only)</span></h3>
      </div>

      <form
        className="audit-filters"
        onSubmit={(e) => {
          e.preventDefault();
          setCommitted({ action: action.trim(), entityType: entityType.trim() });
          setPage(1);
        }}
      >
        <div className="field" style={{ margin: 0 }}>
          <label>Action</label>
          <input
            type="text"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="e.g. REVIEW_PUBLISHED"
          />
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label>Entity Type</label>
          <input
            type="text"
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            placeholder="e.g. Review, Tour, Booking"
          />
        </div>
        <button type="submit" className="btn-ink" style={{ marginTop: 24 }}>
          Filter
        </button>
      </form>

      {error && (
        <p role="alert" style={{ color: 'var(--error)', fontSize: 13.5, margin: '14px 0' }}>
          {error}
        </p>
      )}
      {list === null && !error && (
        <p style={{ color: 'var(--ink-soft)', fontSize: 14, padding: '20px 0' }}>Loading audit log…</p>
      )}
      {list && list.length === 0 && (
        <p style={{ color: 'var(--ink-soft)', fontSize: 14, padding: '20px 0' }}>No audit entries.</p>
      )}
      {list && list.length > 0 && (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Admin</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {list.map((e) => (
                  <tr key={e.id}>
                    <td style={{ fontSize: 12.5, color: 'var(--ink-soft)', whiteSpace: 'nowrap' }}>
                      {formatTourDate(e.createdAt, dateLocale)}
                    </td>
                    <td>
                      <div className="cell-title" style={{ fontSize: 12.5 }}>{e.admin.name ?? e.admin.email}</div>
                    </td>
                    <td>
                      <span className="badge pending">{e.action}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: 12.5 }}>{e.entityType}</span>
                      <div className="cell-sub" style={{ fontSize: 11.5 }}>{e.entityId.slice(0, 10)}…</div>
                    </td>
                    <td>
                      <code className="audit-meta">
                        {JSON.stringify(e.metadata).slice(0, 120)}
                        {JSON.stringify(e.metadata).length > 120 ? '…' : ''}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pager">
            <span>
              Showing {showingFrom}–{showingTo} of {total} entries
            </span>
            <div className="pager-btns">
              <button onClick={() => setPage(1)} disabled={page === 1}>«</button>
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
              <span style={{ padding: '6px 10px', fontSize: 12, color: 'var(--ink-soft)' }}>
                Page {page} of {totalPages}
              </span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>›</button>
              <button onClick={() => setPage(totalPages)} disabled={page >= totalPages}>»</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
