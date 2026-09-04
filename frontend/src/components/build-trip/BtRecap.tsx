import type { ReactNode } from 'react';

interface BtRecapChip {
  label: string;
  value: ReactNode;
}

interface BtRecapProps {
  chips: BtRecapChip[];
  className?: string;
}

/**
 * Recap chip row — shows what's been chosen so far across the wizard.
 * Each chip is "Label: <b>value</b>".
 */
export function BtRecap({ chips, className = '' }: BtRecapProps) {
  return (
    <div className={`bt-recap ${className}`.trim()}>
      {chips.map((c, i) => (
        <span key={i} className="bt-recap-chip">
          {c.label}: <b>{c.value}</b>
        </span>
      ))}
    </div>
  );
}
