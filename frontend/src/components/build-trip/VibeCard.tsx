interface VibeCardProps {
  imageSrc: string;
  imageAlt: string;
  tag: string;
  title: string;
  selected: boolean;
  onSelect?: () => void;
  /** Stored on the element as data-vibe="…" — useful for selectors/tests. */
  dataVibe?: string;
  className?: string;
}

/**
 * Large selectable image card used on /build-trip (Scene 1).
 * Renders the round sun-yellow check badge top-right when selected.
 * A11y: when onSelect is provided, behaves as a button (role + tabindex).
 */
export function VibeCard({
  imageSrc,
  imageAlt,
  tag,
  title,
  selected,
  onSelect,
  dataVibe,
  className = '',
}: VibeCardProps) {
  const interactive = !!onSelect;
  const role = interactive ? 'button' : undefined;
  const tabIndex = interactive ? 0 : undefined;
  return (
    <div
      className={`vibe-card${selected ? ' selected' : ''} ${className}`.trim()}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (!onSelect) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      role={role}
      tabIndex={tabIndex}
      aria-pressed={interactive ? selected : undefined}
      data-vibe={dataVibe}
    >
      <img src={imageSrc} alt={imageAlt} loading="lazy" />
      <div className="vibe-scrim" aria-hidden />
      <div className="vibe-check" aria-hidden>
        <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>
      <div className="vibe-copy">
        <span className="tag">{tag}</span>
        <h3>{title}</h3>
      </div>
    </div>
  );
}
