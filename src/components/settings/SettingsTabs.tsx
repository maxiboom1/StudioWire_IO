import type { SettingsTab } from './settingsTypes';

const SETTINGS_TABS: Array<{ id: SettingsTab; label: string }> = [
  { id: 'project', label: 'Project' },
  { id: 'connectors', label: 'Connectors' },
  { id: 'categories', label: 'Categories' },
  { id: 'groups', label: 'Connector Groups' },
];

export function SettingsTabs({
  activeTab,
  onActiveTabChange,
}: {
  activeTab: SettingsTab;
  onActiveTabChange: (tab: SettingsTab) => void;
}) {
  return (
    <div className="settings-tabs" role="tablist" aria-label="Settings sections">
      {SETTINGS_TABS.map((tab) => (
        <SettingsTabButton
          active={activeTab === tab.id}
          key={tab.id}
          label={tab.label}
          onClick={() => onActiveTabChange(tab.id)}
        />
      ))}
    </div>
  );
}

function SettingsTabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-selected={active}
      className={active ? 'active' : ''}
      role="tab"
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  );
}
