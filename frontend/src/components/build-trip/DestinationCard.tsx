interface DestinationCardProps {
  imageSrc: string;
  imageAlt: string;
  tag: string;
  title: string;
  selected: boolean;
  onSelect: () => void;
  /** Stored on the element as data-dest="…". */
  dataDest?: string;
  className?: string;
}

/**
 * Smaller square selectable card used on /build-trip/destinations (Scene 2).
 * Checkbox is in the top-right corner, square (not round), white-bg → sun
 * with sun-yellow fill when selected.
 */
export function DestinationCard({
  imageSrc,
  imageAlt,
  tag,
  title,
  selected,
  onSelect,
  dataDest,
  className = '',
}: DestinationCardProps) {
  return (
    <div
      className={`dest-card${selected ? ' selected' : ''} ${className}`.trim()}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      data-dest={dataDest}
    >
      <img src={imageSrc} alt={imageAlt} loading="lazy" />
      <div className="dest-scrim" aria-hidden />
      <div className="dest-check" aria-hidden>
        <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>
      <div className="dest-copy">
        <span className="tag">{tag}</span>
        <h3>{title}</h3>
      </div>
    </div>
  );
}
