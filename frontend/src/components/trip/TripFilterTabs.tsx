interface Tab {
  key: string;
  label: string;
}

interface TripFilterTabsProps {
  tabs: Tab[];
  activeKey: string;
  onChange: (key: string) => void;
  className?: string;
}

/**
 * Pill-shaped filter tabs (All / Local / International). Controlled — parent
 * owns the active state and applies the visibility filter on the trip grid.
 */
export function TripFilterTabs({ tabs, activeKey, onChange, className = '' }: TripFilterTabsProps) {
  return (
    <div className={`filter-tabs ${className}`.trim()}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={`filter-tab${activeKey === tab.key ? ' active' : ''}`}
          data-filter={tab.key}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
