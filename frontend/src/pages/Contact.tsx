import { Eyebrow } from '@/components/site/Eyebrow';
import { Perf } from '@/components/site/Perf';
import { SEED_IMAGES } from '@/lib/seed-images';
import { CONTACT_COUNTRY_CODES, useContactForm } from '@/hooks/useContactForm';
import { Link } from 'react-router-dom';

export function Contact() {
  const { values, errors, isSubmitting, submitted, submitError, canSubmit, setField, submit } =
    useContactForm();

  return (
    <>
      <div className="hero">
        <div className="hero-frame" style={{ minHeight: '62vh' }}>
          <img src={SEED_IMAGES.heroContact} alt="Van parked on a coastal road at golden hour" />
          <div className="hero-scrim" aria-hidden />
          <span className="hero-corner l">D-TRIPS / CONTACT</span>
          <span className="hero-corner r">CAIRO, EGYPT</span>
          <div className="hero-content">
            <Eyebrow>Get In Touch</Eyebrow>
            <h1 className="hero-title">
              Let's Talk
              <br />
              Locations.
            </h1>
            <p className="hero-sub">
              Ready to start planning, or just want to pick a director's brain about where to go
              next? We usually reply within one working day.
            </p>
          </div>
          <div className="hero-scroll" aria-hidden>
            <span>Scroll</span>
            <span className="dot" />
          </div>
        </div>
      </div>

      <Perf />

      <section className="wrap">
        <div className="contact-grid" style={{ marginTop: 70 }}>
          <div className="reveal">
            <div className="call-sheet">
              <div className="call-sheet-top">
                <span className="csnum">Call Sheet No. 001</span>
                <span className="csscene">Send an Enquiry</span>
              </div>
              <div className="call-sheet-body">
                <form onSubmit={submit} noValidate>
                  <div className="field-row">
                    <div className={`field ${errors.first ? 'error' : ''}`}>
                      <label htmlFor="first">First Name</label>
                      <input
                        id="first"
                        type="text"
                        placeholder="Sara"
                        value={values.first}
                        onChange={(e) => setField('first', e.target.value)}
                      />
                      {errors.first && <span className="field-error">{errors.first}</span>}
                    </div>
                    <div className={`field ${errors.last ? 'error' : ''}`}>
                      <label htmlFor="last">Last Name</label>
                      <input
                        id="last"
                        type="text"
                        placeholder="Ahmed"
                        value={values.last}
                        onChange={(e) => setField('last', e.target.value)}
                      />
                      {errors.last && <span className="field-error">{errors.last}</span>}
                    </div>
                  </div>
                  <div className={`field ${errors.email ? 'error' : ''}`}>
                    <label htmlFor="email">Email</label>
                    <input
                      id="email"
                      type="email"
                      placeholder="sara@email.com"
                      value={values.email}
                      onChange={(e) => setField('email', e.target.value)}
                    />
                    {errors.email && <span className="field-error">{errors.email}</span>}
                  </div>
                  <div className={`field ${errors.phone ? 'error' : ''}`}>
                    <label htmlFor="phone">Phone Number</label>
                    <div className="phone-field">
                      <select
                        value={values.countryCode}
                        onChange={(e) => setField('countryCode', e.target.value)}
                      >
                        {CONTACT_COUNTRY_CODES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <input
                        id="phone"
                        type="tel"
                        placeholder="10 123 4567"
                        value={values.phone}
                        onChange={(e) => setField('phone', e.target.value)}
                      />
                    </div>
                    {errors.phone && <span className="field-error">{errors.phone}</span>}
                  </div>
                  <div className={`field ${errors.subject ? 'error' : ''}`}>
                    <label htmlFor="subject">Subject</label>
                    <input
                      id="subject"
                      type="text"
                      placeholder="e.g. Honeymoon in Vietnam, group trip to Turkey..."
                      value={values.subject}
                      onChange={(e) => setField('subject', e.target.value)}
                    />
                    {errors.subject && <span className="field-error">{errors.subject}</span>}
                  </div>
                  <div className={`field ${errors.message ? 'error' : ''}`}>
                    <label htmlFor="message">Your Story</label>
                    <textarea
                      id="message"
                      placeholder="Tell us who's travelling, roughly when, and the kind of trip you're picturing."
                      value={values.message}
                      onChange={(e) => setField('message', e.target.value)}
                    />
                    {errors.message && <span className="field-error">{errors.message}</span>}
                  </div>
                  <div className="submit-row">
                    <p className="consent-text">
                      By sending this, you agree to be contacted by D-Trips about your enquiry, per our{' '}
                      <Link to="/privacy-policy">Privacy Policy</Link>.
                    </p>
                    <button
                      type="submit"
                      className="btn-sun"
                      style={{ padding: '15px 18px 15px 24px' }}
                      disabled={!canSubmit || isSubmitting}
                      aria-busy={isSubmitting}
                    >
                      {isSubmitting ? 'Sending…' : 'Send My Message'}
                      {!isSubmitting && (
                        <span className="arrow-dot">
                          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14M13 6l6 6-6 6" />
                          </svg>
                        </span>
                      )}
                    </button>
                  </div>
                  {submitted && (
                    <p
                      role="status"
                      style={{ marginTop: 16, color: 'var(--success)', fontSize: 13.5 }}
                    >
                      Thanks — your message is on its way. We'll reply within 1 working day.
                    </p>
                  )}
                  {submitError && !submitted && (
                    <p
                      role="alert"
                      style={{ marginTop: 16, color: 'var(--error)', fontSize: 13.5 }}
                    >
                      {submitError}
                    </p>
                  )}
                </form>
              </div>
            </div>
          </div>

          <div className="reveal">
            <div className="eyebrow support-eyebrow">Get Support</div>
            <h2 className="support-title">Or skip the form entirely.</h2>

            <div className="support-card">
              <div className="support-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M4 4h16v16H4z" />
                  <path d="M4 6l8 7 8-7" />
                </svg>
              </div>
              <div>
                <h4>Email</h4>
                <a href="mailto:hello@d-trips.com">hello@d-trips.com</a>
                <span className="subline">Answers within 1 working day</span>
              </div>
            </div>

            <div className="support-card">
              <div className="support-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.362 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0122 16.92z" />
                </svg>
              </div>
              <div>
                <h4>Phone</h4>
                <a href="tel:+201092878580">+20 010 9287 8580</a>
                <span className="subline">Sun–Thu, 10am – 6pm Cairo time</span>
              </div>
            </div>

            <div className="support-card">
              <div className="support-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
                </svg>
              </div>
              <div>
                <h4>WhatsApp</h4>
                <a href="https://wa.me/201092878580">+20 010 9287 8580</a>
                <span className="subline">Fastest way to reach a real human</span>
              </div>
            </div>

            <div className="support-photo">
              <img src={SEED_IMAGES.contactSunset} alt="Traveler silhouette at sunset on a mountain ridge" />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
