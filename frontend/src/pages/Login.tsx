import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthFlow } from '@/hooks/useAuthFlow';
import { SEED_IMAGES } from '@/lib/seed-images';

export function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') ?? '/account';
  const { login, isLoading, error, resetError } = useAuthFlow();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (isLoading) return;
    try {
      const loggedInUser = await login(email, password);
      const hasExplicitNext = params.get('next') !== null;
      if (!hasExplicitNext && loggedInUser.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate(decodeURIComponent(next));
      }
    } catch {
      // error already surfaced via useAuthFlow; nothing else to do.
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-visual">
        <img src={SEED_IMAGES.authLogin} alt="Friends celebrating together at sunset" />
        <div className="auth-visual-scrim" />
        <div className="auth-visual-copy">
          <div className="eyebrow">Your Ticket In</div>
          <h2>Every great trip starts with an account, not an itinerary.</h2>
        </div>
      </div>
      <div className="auth-panel">
        <div className="auth-perf" />
        <div className="eyebrow" style={{ marginBottom: 18 }}>Welcome Back</div>
        <h1 className="auth-title">Log in to D—Trips</h1>
        <p className="auth-sub">Pick up your itinerary, message your trip director, or book your next premiere.</p>
        <form onSubmit={submit} noValidate>
          <div className="auth-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="sara@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) resetError();
              }}
              autoComplete="email"
              required
            />
          </div>
          <div className="auth-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) resetError();
              }}
              autoComplete="current-password"
              required
            />
          </div>
          <div className="auth-row">
            <label className="remember">
              <input type="checkbox" defaultChecked /> Keep me signed in
            </label>
            <a href="#">Forgot password?</a>
          </div>
          {error && (
            <p
              role="alert"
              style={{ marginTop: 4, color: 'var(--error)', fontSize: 13.5 }}
            >
              {error}
            </p>
          )}
          <button
            type="submit"
            className="btn-full"
            disabled={isLoading}
            aria-busy={isLoading}
          >
            {isLoading ? 'Signing in…' : 'Continue'}
            {!isLoading && (
              <span className="arrow-dot">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </span>
            )}
          </button>
        </form>
        <div className="auth-divider">or continue with</div>
        <div className="social-row">
          <div className="social-btn">
            <svg viewBox="0 0 24 24"><path fill="#000" d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81z" /></svg>
            Google
          </div>
          <div className="social-btn">
            <svg viewBox="0 0 24 24"><path fill="#000" d="M13.5 9H15V6.5h-1.5C11.6 6.5 10 8.1 10 10.2V12H8.5v2.5H10V21h2.5v-6.5H14l.5-2.5h-2V10.2c0-.66.54-1.2 1-1.2z" /></svg>
            Facebook
          </div>
        </div>
        <p className="auth-footer-text">
          New to D-Trips? <a href="/signup">Create an account</a>
        </p>
        <div className="boarding-meta">
          <div>Destination <span>Everywhere</span></div>
          <div>Status <span>Boarding Now</span></div>
          <div>Gate <span>Always Open</span></div>
        </div>
      </div>
    </div>
  );
}
