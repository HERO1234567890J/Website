interface StepperInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
}

/**
 * Circular + / - stepper with a script-font count.
 * Used by BookingWidget (travelers) and build-trip-details (travelers).
 */
export function StepperInput({
  value,
  onChange,
  min = 1,
  max = 20,
  className = '',
}: StepperInputProps) {
  return (
    <div className={`stepper-input ${className}`.trim()}>
      <button
        type="button"
        className="stepper-btn"
        onClick={() => onChange(Math.max(min, value - 1))}
        aria-label="Decrease"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
        >
          <path d="M5 12h14" />
        </svg>
      </button>
      <span className="stepper-count">{value}</span>
      <button
        type="button"
        className="stepper-btn"
        onClick={() => onChange(Math.min(max, value + 1))}
        aria-label="Increase"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </div>
  );
}
