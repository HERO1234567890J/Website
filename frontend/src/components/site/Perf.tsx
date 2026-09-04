interface PerfProps {
  variant?: 'default' | 'sun';
  className?: string;
}

/**
 * 16px film-reel perforation divider.
 * `variant="sun"` paints dots in sun-yellow (used between the trip grid
 * and the first teaser-split on the home page).
 *
 * Mirrors .perf / .perf-sun in /Website/index.html:82-93.
 */
export function Perf({ variant = 'default', className = '' }: PerfProps) {
  return (
    <div
      className={['perf', variant === 'sun' ? 'perf-sun' : '', className]
        .filter(Boolean)
        .join(' ')}
      aria-hidden
    />
  );
}
