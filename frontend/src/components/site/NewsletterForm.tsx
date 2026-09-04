import { useState } from 'react';
import { api } from '@/lib/api/client';

/**
 * Newsletter email-capture — used inside <SiteFooter>.
 *
 * Phase 15A — real persistence via `POST /api/newsletter/subscribe`.
 * The endpoint upserts on duplicate email so a returning visitor
 * silently re-subscribes instead of seeing a 409. No double-opt-in
 * in v1 (deferred to a future "admin management" milestone).
 *
 * Visual parity: matches /Website/index.html:840-843 exactly.
 */
export function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [thanks, setThanks] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending || !email.trim()) return;
    setPending(true);
    setError(null);
    try {
      await api('/newsletter/subscribe', {
        method: 'POST',
        body: { email: email.trim() },
        skipRefresh: true,
      });
      setThanks(true);
      setEmail('');
      setTimeout(() => setThanks(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not subscribe.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="newsletter-form" onSubmit={handleSubmit} noValidate>
      <input
        type="email"
        placeholder="Enter your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-label="Email"
        required
      />
      <button type="submit" aria-label="Subscribe" disabled={pending}>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </button>
      {thanks && <span className="newsletter-thanks">Thanks — we'll be in touch.</span>}
      {error && (
        <span role="alert" className="newsletter-error">
          {error}
        </span>
      )}
    </form>
  );
}
