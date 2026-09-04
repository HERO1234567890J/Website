import { Link } from 'react-router-dom';
import { NewsletterForm } from './NewsletterForm';

/**
 * Public-site footer — newsletter band + 4-col link grid + bottom row.
 * Wraps everything in the rounded black `.footer-shell` card.
 *
 * Visual parity: /Website/index.html:833-879.
 *
 * Stage 7: social URLs and legal-page links now route to real targets —
 * Instagram / Facebook open externally, Privacy Policy and Terms &
 * Conditions are internal SPA routes. Replace the placeholder social
 * handles with the business's actual accounts when known.
 */
export function SiteFooter() {
  return (
    <div className="footer-shell">
      <section className="newsletter">
        <div className="wrap newsletter-row">
          <div>
            <div className="newsletter-title">Newsletter — sign up.</div>
            <p className="newsletter-sub">
              One dispatch a month. Real trips, real notes, no stock inspiration.
            </p>
          </div>
          <NewsletterForm />
        </div>
      </section>

      <footer>
        <div className="wrap">
          <div className="foot-grid">
            <div>
              <div className="foot-brand">
                <img src="/brand/logo.png" alt="" />
                <span>D—TRIPS</span>
              </div>
              <p className="foot-tag">
                Directed trips,
                <br />
                unforgettable premieres.
              </p>
            </div>
            <div className="foot-col">
              <h4>Company</h4>
              <Link to="/tours">Tours</Link>
              <Link to="/build-trip">Build My Trip</Link>
              <Link to="/about">About</Link>
              <Link to="/contact">Contact</Link>
              <Link to="/#faqs">FAQs</Link>
            </div>
            <div className="foot-col">
              <h4>Get in touch</h4>
              <a href="tel:+201092878580">010 9287 8580</a>
              <a href="mailto:hello@d-trips.com">hello@d-trips.com</a>
              {/* TODO: replace placeholder social handles with real accounts */}
              <a
                href="https://facebook.com/dtrips"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
              >
                Facebook
              </a>
              <a
                href="https://instagram.com/dtrips"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
              >
                Instagram
              </a>
            </div>
          </div>
          <div className="foot-bottom">
            <span>&copy; 2026 D-Trips. All adventures reserved.</span>
            <span className="foot-legal">
              <Link to="/privacy-policy">Privacy Policy</Link>
              <Link to="/terms-conditions">Terms &amp; Conditions</Link>
            </span>
            <span>Directed by David Fakher</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
