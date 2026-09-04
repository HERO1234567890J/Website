import type { ReactNode } from 'react';

interface EyebrowProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Uppercase eyebrow label with a 26×2px sun-yellow bar to the left.
 * Mirrors the .eyebrow class used across the original HTMLs (e.g.
 * Website/index.html:65-80). Works on both light and dark backgrounds
 * — the parent sets color via CSS and the ::before bar stays sun-yellow.
 */
export function Eyebrow({ children, className = '', style }: EyebrowProps) {
  return (
    <div className={['eyebrow', className].filter(Boolean).join(' ')} style={style}>
      {children}
    </div>
  );
}
