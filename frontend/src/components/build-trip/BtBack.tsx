import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface BtBackProps {
  to: string;
  children: ReactNode;
}

/**
 * Build-trip "Back to …" link with a left-arrow icon.
 * Hover slides the arrow left by 3px.
 */
export function BtBack({ to, children }: BtBackProps) {
  return (
    <Link to={to} className="bt-back">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 12H5M11 18l-6-6 6-6" />
      </svg>
      {children}
    </Link>
  );
}
