export interface AppTabItem<T extends string> {
  id: T;
  label: string;
}

export function HorizontalTabs<T extends string>({
  activeTab,
  ariaLabel,
  onTabChange,
  tabs,
}: {
  activeTab: T;
  ariaLabel: string;
  onTabChange: (tab: T) => void;
  tabs: Array<AppTabItem<T>>;
}) {
  return (
    <div className="app-tabs app-tabs-horizontal" role="tablist" aria-label={ariaLabel}>
      {tabs.map((tab) => (
        <AppTabButton
          active={activeTab === tab.id}
          key={tab.id}
          label={tab.label}
          orientation="horizontal"
          onClick={() => onTabChange(tab.id)}
        />
      ))}
    </div>
  );
}

export function VerticalTabs<T extends string>({
  activeTab,
  ariaLabel,
  emptyLabel,
  onTabChange,
  tabs,
}: {
  activeTab: T;
  ariaLabel: string;
  emptyLabel?: string;
  onTabChange: (tab: T) => void;
  tabs: Array<AppTabItem<T>>;
}) {
  return (
    <div className="app-tabs app-tabs-vertical" role="tablist" aria-label={ariaLabel}>
      {tabs.length === 0 && emptyLabel ? <span className="app-tabs-empty">{emptyLabel}</span> : null}
      {tabs.map((tab) => (
        <AppTabButton
          active={activeTab === tab.id}
          key={tab.id}
          label={tab.label}
          orientation="vertical"
          onClick={() => onTabChange(tab.id)}
        />
      ))}
    </div>
  );
}

function AppTabButton({
  active,
  label,
  onClick,
  orientation,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  orientation: 'horizontal' | 'vertical';
}) {
  return (
    <button
      aria-selected={active}
      className={`app-tab app-tab-${orientation}${active ? ' active' : ''}`}
      data-ui="app-tab"
      role="tab"
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  );
}
