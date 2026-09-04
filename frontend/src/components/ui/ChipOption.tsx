import type { ReactNode } from 'react';

interface ChipOptionProps {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}

/**
 * Selectable pill. Renders as <button> for accessibility (aria-pressed).
 * Used for build-trip-details duration/budget chips and admin settings tabs.
 */
export function ChipOption({ selected, onClick, children, className = '' }: ChipOptionProps) {
  return (
    <button
      type="button"
      className={`chip-opt${selected ? ' selected' : ''} ${className}`.trim()}
      onClick={onClick}
      aria-pressed={selected}
    >
      {children}
    </button>
  );
}
