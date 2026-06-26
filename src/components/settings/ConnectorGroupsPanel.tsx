import { useState, type FormEvent } from 'react';
import type { Category, ConnectorCompatibilityGroup, ConnectorType } from '../../domain/types';
import type {
  ConnectorGroupInput,
  ConnectorGroupMemberInput,
  ConnectorGroupUpdates,
} from '../../state/projectContextTypes';

export function ConnectorGroupsPanel({
  activeCategoryId,
  activeGroupId,
  categories,
  groupConnectorOptions,
  groupConnectors,
  groupsForCategory,
  selectedGroup,
  totalGroupCount,
  onActiveCategoryChange,
  onActiveGroupChange,
  onAddConnectorGroup,
  onAddConnectorToGroup,
  onRemoveConnectorFromGroup,
  onUpdateConnectorGroup,
}: {
  activeCategoryId: string;
  activeGroupId: string;
  categories: Category[];
  groupConnectorOptions: ConnectorType[];
  groupConnectors: ConnectorType[];
  groupsForCategory: ConnectorCompatibilityGroup[];
  selectedGroup: ConnectorCompatibilityGroup | null;
  totalGroupCount: number;
  onActiveCategoryChange: (categoryId: string) => void;
  onActiveGroupChange: (groupId: string) => void;
  onAddConnectorGroup: (input: ConnectorGroupInput) => string;
  onAddConnectorToGroup: (input: ConnectorGroupMemberInput) => string;
  onRemoveConnectorFromGroup: (input: ConnectorGroupMemberInput) => void;
  onUpdateConnectorGroup: (id: string, updates: ConnectorGroupUpdates) => void;
}) {
  const [newConnectorGroupName, setNewConnectorGroupName] = useState('');
  const [connectorToGroup, setConnectorToGroup] = useState('');

  function handleAddConnectorGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeCategoryId || !newConnectorGroupName.trim()) {
      return;
    }

    onAddConnectorGroup({
      categoryId: activeCategoryId,
      name: newConnectorGroupName.trim(),
    });
    setNewConnectorGroupName('');
  }

  function handleAddConnectorToGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const connectorTypeId = connectorToGroup || groupConnectorOptions[0]?.id;

    if (!selectedGroup || !connectorTypeId) {
      return;
    }

    onAddConnectorToGroup({ groupId: selectedGroup.id, connectorTypeId });
    setConnectorToGroup('');
  }

  return (
    <div className="settings-tab-panel">
      <section className="settings-section">
        <div className="section-heading">
          <h2>Connector Groups</h2>
          <span>{totalGroupCount}</span>
        </div>
        <div className="settings-inner-tabs" role="tablist" aria-label="Connector group categories">
          {categories.map((category) => (
            <button
              aria-selected={category.id === activeCategoryId}
              className={category.id === activeCategoryId ? 'active' : ''}
              key={category.id}
              role="tab"
              type="button"
              onClick={() => onActiveCategoryChange(category.id)}
            >
              {category.name}
            </button>
          ))}
        </div>
        <form className="inline-form" onSubmit={handleAddConnectorGroup}>
          <input
            placeholder="New connector group"
            value={newConnectorGroupName}
            onChange={(event) => setNewConnectorGroupName(event.target.value)}
          />
          <button type="submit">Add Group</button>
        </form>
      </section>

      <section className="settings-section">
        <div className="settings-inner-tabs" role="tablist" aria-label="Connector groups">
          {groupsForCategory.length === 0 ? (
            <span className="settings-empty-inline">No groups yet.</span>
          ) : null}
          {groupsForCategory.map((group) => (
            <button
              aria-selected={group.id === activeGroupId}
              className={group.id === activeGroupId ? 'active' : ''}
              key={group.id}
              role="tab"
              type="button"
              onClick={() => onActiveGroupChange(group.id)}
            >
              {group.name}
            </button>
          ))}
        </div>

        {selectedGroup ? (
          <>
            <div className="settings-detail-grid">
              <label>
                <span>Group name</span>
                <input
                  defaultValue={selectedGroup.name}
                  onBlur={(event) => {
                    const name = event.target.value.trim();

                    if (name && name !== selectedGroup.name) {
                      onUpdateConnectorGroup(selectedGroup.id, { name });
                    }
                  }}
                />
              </label>
            </div>
            <div className="settings-token-list">
              {groupConnectors.length === 0 ? (
                <span className="settings-empty-inline">No connectors in this group.</span>
              ) : (
                groupConnectors.map((connectorType) => (
                  <button
                    key={connectorType.id}
                    type="button"
                    onClick={() =>
                      onRemoveConnectorFromGroup({
                        groupId: selectedGroup.id,
                        connectorTypeId: connectorType.id,
                      })
                    }
                  >
                    {connectorType.name}
                    <span>Remove</span>
                  </button>
                ))
              )}
            </div>
            <form className="inline-form" onSubmit={handleAddConnectorToGroup}>
              <select
                disabled={groupConnectorOptions.length === 0}
                value={connectorToGroup || groupConnectorOptions[0]?.id || ''}
                onChange={(event) => setConnectorToGroup(event.target.value)}
              >
                {groupConnectorOptions.length === 0 ? (
                  <option value="">No available connectors</option>
                ) : null}
                {groupConnectorOptions.map((connectorType) => (
                  <option key={connectorType.id} value={connectorType.id}>
                    {connectorType.name}
                  </option>
                ))}
              </select>
              <button disabled={groupConnectorOptions.length === 0} type="submit">
                Add Connector
              </button>
            </form>
          </>
        ) : null}
      </section>
    </div>
  );
}
