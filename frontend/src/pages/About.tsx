import { useEffect, useState, type ReactElement } from 'react';
import { Eyebrow } from '@/components/site/Eyebrow';
import { Perf } from '@/components/site/Perf';
import { Reveal } from '@/components/site/Reveal';
import { Link } from 'react-router-dom';
import { SEED_IMAGES } from '@/lib/seed-images';
import { getSiteContentBatch, type SiteContentRow } from '@/lib/api/site-content';

/**
 * Phase 15B (revised) — About page is fully DB-driven per §4 + §15 +
 * §26: every user-facing string on this page (founder blurb, gallery,
 * pillars, contact) is now editable from `/admin/settings` via
 * SiteContent keys.
 *
 * Keys:
 *   about.body       short blurb in the "Our Story" section
 *   about.founder    { quote, body[], name, role, sig, photoAlt }
 *   about.gallery    { items: [{ src, caption }] }   — admin pastes URLs
 *   about.pillars    { items: [{ num, title, body, iconKey }] }
 *                    iconKey is one of the predefined PILLAR_ICONS keys
 *                    below — admin picks from a dropdown in the future
 *                    editor, no SVG paste required.
 *   company.contact  { phone, email, whatsapp, address }
 *
 * Founder photo (`/brand/founder.jpg`) is a static brand asset —
 * the spec reserves `logo & branding upload` (§15) as a separate
 * admin feature for when the media pipeline lands. Until then, the
 * image stays in /public/brand/ and only its alt text is editable.
 *
 * Locale hardcoded to 'en' — LocaleProvider (Phase 15F) will thread
 * the current locale through; the rest of the wiring is ready.
 */

const CONTACT_KEYS = [
  'about.body',
  'about.founder',
  'about.gallery',
  'about.pillars',
  'company.contact',
] as const;

interface FounderContent {
  quote: string;
  body: string[];
  name: string;
  role: string;
  sig: string;
  photoAlt: string;
}

interface GalleryItem {
  src: string;
  caption: string;
}

interface GalleryContent {
  items: GalleryItem[];
}

interface PillarItem {
  num: string;
  title: string;
  body: string;
  iconKey: string;
}

interface PillarsContent {
  items: PillarItem[];
}

interface CompanyContact {
  phone?: string;
  email?: string;
  whatsapp?: string;
  address?: string;
}

// ─── type guards ────────────────────────────────────────────────────

function isFounder(x: unknown): x is FounderContent {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.quote === 'string' &&
    Array.isArray(o.body) &&
    o.body.every((p) => typeof p === 'string') &&
    typeof o.name === 'string' &&
    typeof o.role === 'string' &&
    typeof o.sig === 'string' &&
    typeof o.photoAlt === 'string'
  );
}

function isGalleryItem(x: unknown): x is GalleryItem {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return typeof o.src === 'string' && typeof o.caption === 'string';
}

function isGallery(x: unknown): x is GalleryContent {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return Array.isArray(o.items) && o.items.every(isGalleryItem);
}

function isPillar(x: unknown): x is PillarItem {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.num === 'string' &&
    typeof o.title === 'string' &&
    typeof o.body === 'string' &&
    typeof o.iconKey === 'string'
  );
}

function isPillars(x: unknown): x is PillarsContent {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return Array.isArray(o.items) && o.items.every(isPillar);
}

function extractHtml(row: SiteContentRow | null): string | null {
  if (!row) return null;
  const c = row.content;
  if (typeof c.html === 'string') return c.html;
  if (typeof c.body === 'string') return c.body;
  if (typeof c.markdown === 'string') return c.markdown;
  return null;
}

function extractContact(row: SiteContentRow | null): CompanyContact | null {
  if (!row) return null;
  const c = row.content;
  if (
    typeof c.phone === 'string' ||
    typeof c.email === 'string' ||
    typeof c.whatsapp === 'string' ||
    typeof c.address === 'string'
  ) {
    return {
      ...(typeof c.phone === 'string' ? { phone: c.phone } : {}),
      ...(typeof c.email === 'string' ? { email: c.email } : {}),
      ...(typeof c.whatsapp === 'string' ? { whatsapp: c.whatsapp } : {}),
      ...(typeof c.address === 'string' ? { address: c.address } : {}),
    };
  }
  return null;
}

// ─── pillar icons — admin picks an iconKey, never pastes SVG ────────

const PILLAR_ICONS: Record<string, ReactElement> = {
  script: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3 8l2.5-4h3L6 8h3l2.5-4h3L12 8h3l2.5-4h3L18 8h3v12H3V8z" />
    </svg>
  ),
  location: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 21s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12z" />
      <circle cx="12" cy="9" r="2.4" />
    </svg>
  ),
  cast: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="9" cy="8" r="3" />
      <path d="M2 20c0-3.9 3.1-7 7-7s7 3.1 7 7" />
      <circle cx="18" cy="9" r="2.2" />
      <path d="M15.5 13.2c2.9.3 5.1 2.8 5.5 6.3" />
    </svg>
  ),
  premiere: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M7 5l12 7-12 7V5z" />
    </svg>
  ),
};

// ─── component ──────────────────────────────────────────────────────

export function About() {
  const [aboutHtml, setAboutHtml] = useState<string | null>(null);
  const [founder, setFounder] = useState<FounderContent | null>(null);
  const [gallery, setGallery] = useState<GalleryItem[] | null>(null);
  const [pillars, setPillars] = useState<PillarItem[] | null>(null);
  const [contact, setContact] = useState<CompanyContact | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSiteContentBatch([...CONTACT_KEYS], 'en')
      .then((rows) => {
        if (cancelled) return;
        const map = new Map(rows.map((r) => [r.key, r.row]));
        setAboutHtml(extractHtml(map.get('about.body') ?? null));

        const founderRow = map.get('about.founder') ?? null;
        const founderContent = founderRow?.content;
        setFounder(isFounder(founderContent) ? founderContent : null);

        const galleryRow = map.get('about.gallery') ?? null;
        const galleryContent = galleryRow?.content;
        setGallery(isGallery(galleryContent) ? galleryContent.items : null);

        const pillarsRow = map.get('about.pillars') ?? null;
        const pillarsContent = pillarsRow?.content;
        setPillars(isPillars(pillarsContent) ? pillarsContent.items : null);

        setContact(extractContact(map.get('company.contact') ?? null));
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      {/* HERO */}
      <div className="hero">
        <div className="hero-frame" style={{ minHeight: '92vh' }}>
          <img src={SEED_IMAGES.heroAerial} alt="Turquoise coastline seen from above" />
          <div className="hero-scrim" aria-hidden />
          <span className="hero-corner l">D-TRIPS / ABOUT</span>
          <span className="hero-corner r">EST. CAIRO</span>
          <div className="hero-content">
            <Eyebrow>D-Trips Presents</Eyebrow>
            <h1 className="hero-title">
              We Don't Just Organize Trips,
              <br />
              We Direct Adventures.
            </h1>
            <p className="hero-sub">
              A travel house built like a film set — every detail scouted, staged, and directed
              for the story you'll end up telling for years.
            </p>
          </div>
          <div className="hero-scroll" aria-hidden>
            <span>Scroll</span>
            <span className="dot" />
          </div>
        </div>
      </div>

      <Perf />

      {/* FOUNDER — DB-driven from `about.founder` */}
      {founder && (
        <section className="wrap">
          <div className="founder reveal">
            <div className="founder-photo-wrap">
              <div className="founder-photo">
                <div className="bracket tl" />
                <div className="bracket br" />
                <img src="/brand/founder.jpg" alt={founder.photoAlt} />
                <div className="founder-tag">Founder's Cut</div>
              </div>
            </div>
            <div>
              <Eyebrow>The Director</Eyebrow>
              <div className="founder-name">{founder.name}</div>
              <div className="founder-role">{founder.role}</div>
              <p className="founder-quote">&ldquo;{founder.quote}&rdquo;</p>
              <div className="founder-body">
                {founder.body.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
              <div className="founder-sig">{founder.sig}</div>
            </div>
          </div>
        </section>
      )}

      {/* OUR STORY — DB-driven from `about.body` */}
      <section className="wrap">
        <Reveal>
          <div className="section-head">
            <Eyebrow>Our Story</Eyebrow>
            <h2 className="section-title">
              A travel house built
              <br />
              around the director's cut.
            </h2>
          </div>
          {error && (
            <p role="alert" style={{ color: 'var(--error)', fontSize: 14 }}>
              Could not load our story.
            </p>
          )}
          {!error && aboutHtml === null && (
            <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>Loading…</p>
          )}
          {aboutHtml && (
            // about.body is admin-authored HTML via SiteContent (§13).
            // For untrusted HTML the right play is DOMPurify — defer
            // until we accept non-admin input. Phase 30 hardening.
            <div
              className="about-body"
              style={{ maxWidth: 760, fontSize: 16, lineHeight: 1.7, color: 'var(--ink-soft)' }}
              dangerouslySetInnerHTML={{ __html: aboutHtml }}
            />
          )}
        </Reveal>
      </section>

      <Perf variant="sun" />

      {/* GALLERY — DB-driven from `about.gallery` */}
      {gallery && gallery.length > 0 && (
        <section className="section-sand">
          <div className="wrap">
            <div className="gallery-head reveal">
              <div>
                <Eyebrow>Dailies</Eyebrow>
                <h2 className="section-title">
                  Behind the scenes of
                  <br />
                  every journey we direct.
                </h2>
              </div>
              <p style={{ maxWidth: 340, fontSize: 14.5, color: 'var(--ink-soft)' }}>
                Unedited frames from trips we've scouted, staged, and sent our travelers into —
                no stock photography, no filters doing the heavy lifting.
              </p>
            </div>
            <div className="masonry reveal">
              {gallery.map((g, i) => (
                <div key={`${g.src}-${i}`} className="m-item">
                  <span className="m-index">{String(i + 1).padStart(2, '0')}</span>
                  <img src={g.src} alt={g.caption} loading="lazy" />
                  <div className="m-cap">{g.caption}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <Perf />

      {/* PILLARS — DB-driven from `about.pillars` */}
      {pillars && pillars.length > 0 && (
        <section className="wrap">
          <Reveal>
            <div className="section-head">
              <Eyebrow>Production Notes</Eyebrow>
              <h2 className="section-title">
                Four stages. One production.
                <br />
                Every trip goes through all of them.
              </h2>
            </div>
            <div className="pillars">
              {pillars.map((p) => {
                const icon = PILLAR_ICONS[p.iconKey] ?? PILLAR_ICONS.script;
                return (
                  <div key={`${p.num}-${p.title}`} className="pillar">
                    <div className="pillar-icon">{icon}</div>
                    <span className="pillar-num">{p.num}</span>
                    <div className="pillar-title">{p.title}</div>
                    <p>{p.body}</p>
                  </div>
                );
              })}
            </div>
          </Reveal>
        </section>
      )}

      {/* GET IN TOUCH — DB-driven from `company.contact` */}
      {(contact?.phone || contact?.email || contact?.address) && (
        <section className="wrap">
          <Reveal>
            <div className="section-head">
              <Eyebrow>Visit / Call</Eyebrow>
              <h2 className="section-title">Stop by. Or just call.</h2>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 24,
                fontSize: 15,
              }}
            >
              {contact.phone && (
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      letterSpacing: 1.5,
                      textTransform: 'uppercase',
                      color: 'var(--ink-soft)',
                    }}
                  >
                    Phone
                  </div>
                  <a href={`tel:${contact.phone.replace(/\s+/g, '')}`} style={{ color: 'var(--ink)' }}>
                    {contact.phone}
                  </a>
                </div>
              )}
              {contact.email && (
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      letterSpacing: 1.5,
                      textTransform: 'uppercase',
                      color: 'var(--ink-soft)',
                    }}
                  >
                    Email
                  </div>
                  <a href={`mailto:${contact.email}`} style={{ color: 'var(--ink)' }}>
                    {contact.email}
                  </a>
                </div>
              )}
              {contact.whatsapp && (
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      letterSpacing: 1.5,
                      textTransform: 'uppercase',
                      color: 'var(--ink-soft)',
                    }}
                  >
                    WhatsApp
                  </div>
                  <a
                    href={`https://wa.me/${contact.whatsapp.replace(/[^\d+]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: 'var(--ink)' }}
                  >
                    {contact.whatsapp}
                  </a>
                </div>
              )}
              {contact.address && (
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      letterSpacing: 1.5,
                      textTransform: 'uppercase',
                      color: 'var(--ink-soft)',
                    }}
                  >
                    Studio
                  </div>
                  <span style={{ color: 'var(--ink)' }}>{contact.address}</span>
                </div>
              )}
            </div>
          </Reveal>
        </section>
      )}

      {/* CTA — pure copy + routing, kept inline (not user-editable
          brand creative; doesn't need admin control per §26). */}
      <section className="cta" id="cta">
        <div className="cta-eyebrow">Now Boarding</div>
        <h2 className="cta-title">Ready For Your Premiere?</h2>
        <p className="cta-sub">
          Tell us the story you want to live. We'll scout the locations, cast the crew, and
          direct the rest.
        </p>
        <Link to="/contact" className="btn-ink">
          Start Your Adventure
        </Link>
      </section>
    </>
  );
}
