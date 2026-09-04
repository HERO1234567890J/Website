interface BtHeroProps {
  eyebrow?: string;
  title: string;
  /** Scene label like "Scene 2 of 4" — uses the cine italic style. */
  sceneLabel: string;
  className?: string;
}

/**
 * Build-trip wizard page header (eyebrow + script title + scene label).
 * Mirrors Website/build-trip*.html lines 599-603.
 */
export function BtHero({
  eyebrow = 'Build My Trip',
  title,
  sceneLabel,
  className = '',
}: BtHeroProps) {
  return (
    <section className={`wrap bt-hero ${className}`.trim()}>
      <div className="eyebrow">{eyebrow}</div>
      <h1>{title}</h1>
      <p className="scene-label">{sceneLabel}</p>
    </section>
  );
}
