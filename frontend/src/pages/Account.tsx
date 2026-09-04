import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthFlow } from '@/hooks/useAuthFlow';
import { TripCard } from '@/components/trip/TripCard';
import { Eyebrow } from '@/components/site/Eyebrow';
import { SEED_IMAGES } from '@/lib/seed-images';
import {
  changePassword,
  getMe,
  updateNotificationPrefs,
  updateProfile,
  type UserView,
} from '@/lib/api/users';
import { listMyBookings, type BookingResponse } from '@/lib/api/bookings';
import { ApiError } from '@/lib/api/client';
import { formatPrice, formatTourDate } from '@/lib/api/format';
import { useLocale } from '@/i18n';

type AccountTab = 'profile' | 'tours' | 'security' | 'notifications';
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const TABS: { key: AccountTab; label: string }[] = [
  { key: 'profile', label: 'My Profile' },
  { key: 'tours', label: 'My Tours' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'security', label: 'Security' },
];

const FALLBACK_COVER = SEED_IMAGES.rasSedr;

/**
 * Phase 15E — Account page wired to /api/users/me + /api/users/me/* + /api/bookings.
 *
 * §13 / §18 — every form here maps to a real backend endpoint.
 * No submitStub, no local-only toasts. On save the response updates
 * local state via setMe() so the UI reflects the persisted values.
 *
 * Email is shown read-only on the Profile tab (changing the
 * address requires re-verification — that's a separate flow).
 *
 * Bookings list:
 *   - GET /api/bookings (authenticated) — returns the user's own
 *     bookings joined with tour + tourDate.
 *   - TripCard status mapping per the BookingStatus enum (PENDING →
 *     'pending', CONFIRMED/PAID → 'upcoming', COMPLETED → 'completed').
 *   - Cancelled / failed / expired rows still render with a
 *     'completed' status (TripCard doesn't differentiate those —
 *     a future polish could add badges for those states).
 */
export function Account() {
  const navigate = useNavigate();
  const { user, logout } = useAuthFlow();
  const [tab, setTab] = useState<AccountTab>('profile');
  const [me, setMe] = useState<UserView | null>(null);
  const [bookings, setBookings] = useState<BookingResponse[] | null>(null);
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [meError, setMeError] = useState<string | null>(null);

  // ─── Load the full /me view on mount ─────────────────────────────
  useEffect(() => {
    let cancelled = false;
    getMe()
      .then((m) => {
        if (!cancelled) setMe(m);
      })
      .catch((err: Error) => {
        if (!cancelled) setMeError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ─── Load bookings on My-Tours tab activation ───────────────────
  useEffect(() => {
    if (tab !== 'tours') return;
    if (bookings !== null) return; // already loaded (or attempted)
    let cancelled = false;
    listMyBookings()
      .then((rows) => {
        if (!cancelled) setBookings(rows);
      })
      .catch((err: Error) => {
        if (!cancelled) setBookingsError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, bookings]);

  // Local form state for the editable fields — initialised from /me
  // once it loads, falls back to the auth-context user for the very
  // first paint (so the form isn't blank while /me is in flight).
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState('');
  useEffect(() => {
    if (me) {
      setName(me.name ?? '');
      setPhone(me.phone ?? '');
    }
  }, [me]);

  async function signOutNow() {
    if (confirm('Sign out of your D-Trips account?')) {
      await logout();
      navigate('/login');
    }
  }

  const i = initials(name || me?.name || user?.name || '');

  return (
    <>
      <section className="wrap" style={{ paddingTop: 60, paddingBottom: 0 }}>
        <div className="acc-header">
          <div className="acc-id">
            <div className="acc-avatar">{i}</div>
            <div>
              <h1>{name || me?.name || user?.name}</h1>
              <p>{me ? `Member since ${formatMemberSince(me.createdAt)}` : 'Loading…'}</p>
            </div>
          </div>
          <button className="btn-signout" onClick={signOutNow}>
            Sign Out{' '}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <path d="M16 17l5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
          </button>
        </div>

        <div className="acc-tabs">
          {TABS.map((t) => (
            <div
              key={t.key}
              className={`acc-tab ${tab === t.key ? 'active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </div>
          ))}
        </div>
      </section>

      <section className="wrap" style={{ paddingTop: 0 }}>
        {tab === 'profile' && (
          <ProfileTab
            me={me}
            meError={meError}
            name={name}
            phone={phone}
            onNameChange={setName}
            onPhoneChange={setPhone}
            onSaved={(next) => setMe(next)}
          />
        )}
        {tab === 'tours' && (
          <ToursTab
            bookings={bookings}
            error={bookingsError}
          />
        )}
        {tab === 'notifications' && (
          <NotificationsTab
            me={me}
            onSaved={(next) => setMe(next)}
          />
        )}
        {tab === 'security' && <SecurityTab />}
      </section>
    </>
  );
}

// ─── profile tab ─────────────────────────────────────────────────────

function ProfileTab({
  me,
  meError,
  name,
  phone,
  onNameChange,
  onPhoneChange,
  onSaved,
}: {
  me: UserView | null;
  meError: string | null;
  name: string;
  phone: string;
  onNameChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  onSaved: (next: UserView) => void;
}) {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const phoneValid = phone === '' || /^[0-9+\-\s()]{8,32}$/.test(phone);
  const nameValid = name.trim().length >= 1 && name.trim().length <= 100;
  const dirty = me ? name.trim() !== (me.name ?? '') || phone !== (me.phone ?? '') : false;
  const canSave = !!me && dirty && nameValid && phoneValid && status !== 'saving';

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setStatus('saving');
    setError(null);
    try {
      const next = await updateProfile({
        name: name.trim(),
        phone: phone.trim(),
      });
      onSaved(next);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2600);
    } catch (err) {
      const msg =
        err instanceof ApiError && err.status >= 500
          ? 'Server error — please try again.'
          : err instanceof Error
            ? err.message
            : 'Could not save your profile.';
      setError(msg);
      setStatus('error');
    }
  }

  return (
    <div className="acc-panel">
      <div className="profile-grid">
        <div className="profile-avatar-col">
          <div className="profile-avatar-big">{initials(name)}</div>
          <p>Your initials are shown across D-Trips until you upload a photo.</p>
        </div>
        <form onSubmit={submit}>
          <div className="acc-form-row">
            <div className="auth-field">
              <label htmlFor="p-name">Full Name</label>
              <input
                id="p-name"
                type="text"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                disabled={!me}
              />
            </div>
            <div className="auth-field">
              <label htmlFor="p-email">Email</label>
              <input
                id="p-email"
                type="email"
                value={me?.email ?? ''}
                disabled
                title="Email is locked to your account — contact us to change it."
              />
            </div>
          </div>
          <div className="acc-form-row">
            <div className="auth-field">
              <label htmlFor="p-phone">Phone / WhatsApp</label>
              <input
                id="p-phone"
                type="tel"
                value={phone}
                onChange={(e) => onPhoneChange(e.target.value)}
                disabled={!me}
              />
              {!phoneValid && (
                <p style={{ fontSize: 12, color: 'var(--error)', marginTop: 6 }}>
                  Phone format looks off.
                </p>
              )}
            </div>
            <div className="auth-field">
              <label htmlFor="p-role">Role</label>
              <input
                id="p-role"
                type="text"
                value={me?.role ?? ''}
                disabled
              />
            </div>
          </div>
          {meError && (
            <p role="alert" style={{ color: 'var(--error)', fontSize: 13.5, marginTop: 12 }}>
              {meError}
            </p>
          )}
          <button type="submit" className="btn-ink" style={{ borderRadius: 100 }} disabled={!canSave}>
            {status === 'saving' ? 'Saving…' : 'Save Changes'}
          </button>
          {error && (
            <p role="alert" style={{ color: 'var(--error)', fontSize: 13.5, marginTop: 12 }}>
              {error}
            </p>
          )}
          {status === 'saved' && <SaveToast message="Profile updated." />}
        </form>
      </div>
    </div>
  );
}

// ─── tours tab ───────────────────────────────────────────────────────

function ToursTab({
  bookings,
  error,
}: {
  bookings: BookingResponse[] | null;
  error: string | null;
}) {
  return (
    <div className="acc-panel">
      <div className="tours-toolbar">
        <Eyebrow>Your Bookings &amp; Requests</Eyebrow>
        <a href="/build-trip" className="trip-link" style={{ textDecoration: 'none' }}>
          Build a New Trip{' '}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </a>
      </div>

      {bookings === null && !error && (
        <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>Loading your bookings…</p>
      )}
      {error && (
        <p role="alert" style={{ color: 'var(--error)', fontSize: 14 }}>
          {error}
        </p>
      )}
      {bookings && bookings.length === 0 && (
        <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>
          You don't have any bookings yet — your future trips will show up here.
        </p>
      )}

      {bookings && bookings.length > 0 && (
        <div className="trip-grid">
          {bookings.map((b) => (
            <BookingCard key={b.id} booking={b} />
          ))}
        </div>
      )}
    </div>
  );
}

function BookingCard({ booking }: { booking: BookingResponse }) {
  const { dateLocale } = useLocale();
  // The frontend's BookingResponse type doesn't model the include fields
  // (the api() helper returns the raw Booking row). Cast to the real
  // backend shape to read the joined fields.
  const enriched = booking as BookingResponse & {
    tour?: {
      id: string;
      slug: string;
      title: string;
      coverImageId: string | null;
      destination?: { name: string } | null;
    } | null;
    tourDate?: { startDate: string; endDate: string } | null;
  };

  const tripTitle = enriched.tour?.title ?? 'Custom trip';
  const tripSlug = enriched.tour?.slug ?? null;
  const dateLabel = enriched.tourDate
    ? formatTourDate(enriched.tourDate.startDate, dateLocale)
    : 'Date TBA';
  const imageSrc = enriched.tour?.coverImageId ?? FALLBACK_COVER;
  const location = enriched.tour?.destination?.name ?? tripTitle;
  const price = formatPrice(booking.total, booking.currency);
  const status = mapBookingStatus(booking.status);
  const href = tripSlug ? `/tours/${tripSlug}` : '/tours';
  const ctaLabel = tripSlug ? 'View Trip' : 'Browse Tours';

  return (
    <TripCard
      tag={enriched.tour ? 'Tour' : 'Custom'}
      imageSrc={imageSrc}
      imageAlt={tripTitle}
      location={location}
      date={dateLabel}
      groupType={`${booking.travelerCount} Traveler${booking.travelerCount === 1 ? '' : 's'}`}
      price={price}
      href={href}
      status={status}
      ctaLabel={ctaLabel}
    />
  );
}

function mapBookingStatus(s: BookingResponse['status']): 'upcoming' | 'pending' | 'completed' {
  switch (s) {
    case 'PENDING':
    case 'PAYMENT_PENDING':
    case 'DRAFT':
      return 'pending';
    case 'PAID':
    case 'CONFIRMED':
      return 'upcoming';
    case 'COMPLETED':
    case 'CANCELLED':
    case 'FAILED':
    case 'EXPIRED':
    default:
      return 'completed';
  }
}

// ─── notifications tab ──────────────────────────────────────────────

function NotificationsTab({
  me,
  onSaved,
}: {
  me: UserView | null;
  onSaved: (next: UserView) => void;
}) {
  const [bookingEmails, setBookingEmails] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [smsReminders, setSmsReminders] = useState(false);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  // Sync from server view once it lands.
  useEffect(() => {
    if (!me) return;
    setBookingEmails(me.bookingEmails);
    setMarketingEmails(me.marketingEmails);
    setSmsReminders(me.smsReminders);
  }, [me]);

  const dirty = !!me && (
    bookingEmails !== me.bookingEmails ||
    marketingEmails !== me.marketingEmails ||
    smsReminders !== me.smsReminders
  );
  const canSave = dirty && status !== 'saving';

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setStatus('saving');
    setError(null);
    try {
      const next = await updateNotificationPrefs({
        bookingEmails,
        marketingEmails,
        smsReminders,
      });
      onSaved(next);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2600);
    } catch (err) {
      const msg =
        err instanceof ApiError && err.status >= 500
          ? 'Server error — please try again.'
          : err instanceof Error
            ? err.message
            : 'Could not save your preferences.';
      setError(msg);
      setStatus('error');
    }
  }

  return (
    <div className="acc-panel" style={{ maxWidth: 640 }}>
      <Eyebrow style={{ marginBottom: 12 }}>Email &amp; SMS</Eyebrow>
      <p style={{ color: 'var(--ink-soft)', fontSize: 14, marginBottom: 24 }}>
        Choose which updates we send your way. Booking-related emails stay on by default — turning
        them off means you won't receive payment receipts or schedule changes.
      </p>
      <form onSubmit={submit}>
        <ToggleRow
          id="n-booking"
          label="Booking updates"
          hint="Payment receipts, schedule changes, trip reminders, and post-trip follow-ups."
          checked={bookingEmails}
          onChange={setBookingEmails}
        />
        <ToggleRow
          id="n-marketing"
          label="Marketing emails"
          hint="New tours, seasonal trips, and director's-cut features. Low frequency."
          checked={marketingEmails}
          onChange={setMarketingEmails}
        />
        <ToggleRow
          id="n-sms"
          label="SMS reminders"
          hint="Day-of-trip SMS reminders. Carrier rates may apply."
          checked={smsReminders}
          onChange={setSmsReminders}
        />

        <button
          type="submit"
          className="btn-ink"
          style={{ borderRadius: 100, marginTop: 12 }}
          disabled={!canSave}
        >
          {status === 'saving' ? 'Saving…' : 'Save Preferences'}
        </button>
        {error && (
          <p role="alert" style={{ color: 'var(--error)', fontSize: 13.5, marginTop: 12 }}>
            {error}
          </p>
        )}
        {status === 'saved' && <SaveToast message="Preferences saved." />}
      </form>
    </div>
  );
}

function ToggleRow({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '14px 0',
        borderBottom: '1px solid var(--line)',
        cursor: 'pointer',
      }}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ marginTop: 4, flexShrink: 0 }}
      />
      <span>
        <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{label}</div>
        <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 4, lineHeight: 1.5 }}>
          {hint}
        </div>
      </span>
    </label>
  );
}

// ─── security tab ────────────────────────────────────────────────────

function SecurityTab() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const matchOk = next.length > 0 && next === confirm;
  const minLenOk = next.length >= 8;
  const asciiOk = /^[\x21-\x7E]+$/.test(next);
  const allOk = current.length > 0 && matchOk && minLenOk && asciiOk && status !== 'saving';

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!allOk) return;
    setStatus('saving');
    setError(null);
    try {
      await changePassword({
        currentPassword: current,
        newPassword: next,
        confirmPassword: confirm,
      });
      // Backend revokes OTHER refresh tokens; current session may
      // or may not still be valid depending on timing. AuthContext's
      // next refresh-on-401 will recover transparently.
      setStatus('saved');
      setCurrent('');
      setNext('');
      setConfirm('');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      let msg: string;
      if (err instanceof ApiError) {
        if (err.status === 401) msg = 'Current password is incorrect.';
        else if (err.status === 400) msg = 'New password and confirmation do not match.';
        else if (err.status >= 500) msg = 'Server error — please try again.';
        else msg = err.message;
      } else {
        msg = err instanceof Error ? err.message : 'Could not update your password.';
      }
      setError(msg);
      setStatus('error');
    }
  }

  return (
    <div className="acc-panel" style={{ maxWidth: 480 }}>
      <Eyebrow style={{ marginBottom: 24 }}>Password &amp; Security</Eyebrow>
      <form onSubmit={submit}>
        <div className="auth-field">
          <label htmlFor="s-current">Current Password</label>
          <input
            id="s-current"
            type="password"
            placeholder="••••••••"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <div className="auth-field">
          <label htmlFor="s-new">New Password</label>
          <input
            id="s-new"
            type="password"
            placeholder="••••••••"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
          />
          {next.length > 0 && !minLenOk && (
            <p style={{ fontSize: 12, color: 'var(--error)', marginTop: 6 }}>
              Use at least 8 characters.
            </p>
          )}
          {next.length > 0 && minLenOk && !asciiOk && (
            <p style={{ fontSize: 12, color: 'var(--error)', marginTop: 6 }}>
              Use printable ASCII characters only.
            </p>
          )}
        </div>
        <div className="auth-field">
          <label htmlFor="s-confirm">Confirm New Password</label>
          <input
            id="s-confirm"
            type="password"
            placeholder="••••••••"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
          {confirm.length > 0 && !matchOk && (
            <p style={{ fontSize: 12, color: 'var(--error)', marginTop: 6 }}>
              Passwords don't match.
            </p>
          )}
        </div>
        <button type="submit" className="btn-ink" style={{ borderRadius: 100 }} disabled={!allOk}>
          {status === 'saving' ? 'Updating…' : 'Update Password'}
        </button>
        {error && (
          <p role="alert" style={{ color: 'var(--error)', fontSize: 13.5, marginTop: 12 }}>
            {error}
          </p>
        )}
        {status === 'saved' && <SaveToast message="Password updated." />}
      </form>
    </div>
  );
}

// ─── helpers ─────────────────────────────────────────────────────────

function SaveToast({ message }: { message: string }) {
  return (
    <div className="save-toast show" role="status">
      <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4">
        <path d="M20 6L9 17l-5-5" />
      </svg>
      {message}
    </div>
  );
}

function initials(s: string): string {
  return (
    s
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('') || 'SA'
  );
}

function formatMemberSince(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
