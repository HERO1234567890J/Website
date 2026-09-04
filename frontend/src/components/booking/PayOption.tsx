import type { ReactNode } from 'react';

interface PayOptionProps {
  /** Radio value (e.g. "card", "bank", "office"). */
  value: string;
  /** Radio group name — all PayOptions in the same form must share a name. */
  name: string;
  selected: boolean;
  onSelect: () => void;
  icon: ReactNode;
  title: string;
  subtitle: string;
}

/**
 * Visual payment-option radio card. Per §11 the real payment logic
 * (Stripe / Tap / Fawry etc.) lives in the NestJS PaymentService —
 * THIS component is purely presentational. No API calls, no Stripe
 * imports, no token handling.
 *
 * Visual parity with Website/checkout.html:834-852.
 */
export function PayOption({
  value,
  name,
  selected,
  onSelect,
  icon,
  title,
  subtitle,
}: PayOptionProps) {
  return (
    <label className={`pay-opt${selected ? ' selected' : ''}`}>
      <input
        type="radio"
        name={name}
        value={value}
        checked={selected}
        onChange={onSelect}
      />
      <span className="pay-ic" aria-hidden>
        {icon}
      </span>
      <span className="pay-opt-copy">
        <b>{title}</b>
        <span>{subtitle}</span>
      </span>
    </label>
  );
}
