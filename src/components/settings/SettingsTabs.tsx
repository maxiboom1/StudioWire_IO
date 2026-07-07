import { HorizontalTabs } from '../common/AppTabs';
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
    <HorizontalTabs
      activeTab={activeTab}
      ariaLabel="Settings sections"
      tabs={SETTINGS_TABS}
      onTabChange={onActiveTabChange}
    />
  );
}
