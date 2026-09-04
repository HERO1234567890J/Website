import { useEffect, useState } from 'react';
import { Eyebrow } from '@/components/site/Eyebrow';
import { Perf } from '@/components/site/Perf';
import { getSiteContent, type SiteContentRow } from '@/lib/api/site-content';
import { renderMarkdown } from '@/lib/markdown.jsx';
import { useCurrentLocale } from '@/i18n';

/**
 * Terms & Conditions — public legal page (§27).
 *
 * Phase 14: content is now DB-driven from `/api/site-content` keyed
 * by `(terms_conditions.body, locale)`. The backend defaults to the
 * English copy when the requested locale is missing — so an
 * un-translated row never 404s the page.
 *
 * Phase 15F: locale is driven by the LocaleProvider, not the URL.
 * Document direction (`<html dir>`) is set globally by the provider
 * so RTL mirrors the whole layout per §25.
 */
export function TermsConditions() {
  const locale = useCurrentLocale();
  const [row, setRow] = useState<SiteContentRow | null | 'loading'>('loading');

  useEffect(() => {
    let cancelled = false;
    setRow('loading');
    getSiteContent('terms_conditions.body', locale.code)
      .then((r) => {
        if (!cancelled) setRow(r);
      })
      .catch(() => {
        if (!cancelled) setRow(null);
      });
    return () => {
      cancelled = true;
    };
  }, [locale.code]);

  const markdown = extractMarkdown(row);
  const showDraftBanner = markdown ? /draft/i.test(markdown) : true;

  return (
    <>
      <section className="wrap" style={{ paddingTop: 56, paddingBottom: 0 }}>
        <Eyebrow>Legal</Eyebrow>
        <h1
          className="hero-title"
          style={{
            fontFamily: 'var(--script)',
            fontSize: 'clamp(38px, 5.5vw, 60px)',
            lineHeight: 1,
            margin: '14px 0 16px',
          }}
        >
          {locale.code === 'ar' ? 'الشروط والأحكام' : 'Terms & Conditions'}
        </h1>
        <p
          className="hero-sub"
          style={{ maxWidth: 620, fontSize: 16, marginBottom: 28 }}
        >
          {locale.code === 'ar'
            ? 'القواعد التي تحكم استخدامك لـ d-trips.com والرحلات التي نرتبها لك.'
            : 'The rules that govern your use of d-trips.com and the trips we arrange on your behalf.'}
        </p>
        {showDraftBanner && (
          <div className="legal-banner" role="status">
            <strong>DRAFT.</strong> {locale.code === 'ar'
              ? 'هذه الصفحة محتوى placeholder. ستستبدلها الإدارة بعد المراجعة القانونية.'
              : 'This page is placeholder content. The published Terms & Conditions will be supplied by the business\'s legal counsel and rendered from the backend SiteContent table.'}
          </div>
        )}
      </section>

      <Perf />

      <section className="wrap" style={{ paddingTop: 70, paddingBottom: 90 }}>
        <article className="legal-article">
          {row === 'loading' && <p className="legal-meta">…</p>}
          {row === null && (
            <p className="legal-meta">
              {locale.code === 'ar' ? 'لا يوجد محتوى منشور بعد.' : 'No content has been published yet.'}
            </p>
          )}
          {markdown && <div>{renderMarkdown(markdown)}</div>}
        </article>
      </section>
    </>
  );
}

function extractMarkdown(row: SiteContentRow | null | 'loading'): string | null {
  if (!row || row === 'loading') return null;
  const c = row.content;
  if (typeof c.markdown === 'string') return c.markdown;
  if (typeof c.body === 'string') return c.body;
  if (typeof c.html === 'string') return c.html;
  return null;
}
