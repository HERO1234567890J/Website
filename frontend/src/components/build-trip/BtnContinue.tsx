import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface BtnContinueProps {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
  ariaDisabled?: boolean;
}

/**
 * Black CTA pill with arrow that nudges right on hover. Used as the
 * "Continue to …" / "Send My Trip Request" button across the build-trip
 * wizard. Pass `href` to render as a <Link>, otherwise as <button>.
 */
export function BtnContinue({
  children,
  onClick,
  href,
  disabled,
  type = 'button',
  ariaDisabled,
}: BtnContinueProps) {
  const inner = (
    <>
      {children}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </>
  );
  if (href) {
    return (
      <Link
        to={href}
        className="btn-continue"
        aria-disabled={ariaDisabled || disabled}
        tabIndex={disabled ? -1 : undefined}
        onClick={(e) => {
          if (disabled) {
            e.preventDefault();
            return;
          }
          onClick?.();
        }}
      >
        {inner}
      </Link>
    );
  }
  return (
    <button type={type} className="btn-continue" onClick={onClick} disabled={disabled}>
      {inner}
    </button>
  );
}
