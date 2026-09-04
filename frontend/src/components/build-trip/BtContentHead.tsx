import type { ReactNode } from 'react';

interface BtContentHeadProps {
  /** The h2 text — can include <em> for the script-font highlight. */
  title: ReactNode;
  /** Optional body sub-line shown below the underline. */
  subtitle?: ReactNode;
  /** Hide the divider (e.g. when used for a second headline within a section). */
  underline?: boolean;
  className?: string;
}

/**
 * Build-trip centered h2 + sun-yellow underline (and optional subtitle).
 * Used at the top of every Scene's content area.
 */
export function BtContentHead({
  title,
  subtitle,
  underline = true,
  className = '',
}: BtContentHeadProps) {
  return (
    <div className={`bt-content-head ${className}`.trim()}>
      <h2>{title}</h2>
      {underline && <div className="bt-underline" aria-hidden />}
      {subtitle && (
        <p style={{ marginTop: 14, color: 'var(--ink-soft)', fontSize: 14.5 }}>{subtitle}</p>
      )}
    </div>
  );
}
