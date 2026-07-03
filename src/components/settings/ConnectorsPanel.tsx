import { useState, type FormEvent } from 'react';
import type { ConnectorIconKey, ConnectorType } from '../../domain/types';
import type { ConnectorTypeInput, ConnectorTypeUpdates } from '../../state/projectContextTypes';
import { ConnectorIcon } from '../common/ConnectorIcon';
import { CONNECTOR_ICON_OPTIONS } from '../common/connectorVisuals';

export function ConnectorsPanel({
  connectorTypes,
  onAddConnectorType,
  onUpdateConnectorType,
}: {
  connectorTypes: ConnectorType[];
  onAddConnectorType: (input: ConnectorTypeInput) => string;
  onUpdateConnectorType: (id: string, updates: ConnectorTypeUpdates) => void;
}) {
  const [newConnectorName, setNewConnectorName] = useState('');

  function handleAddConnector(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!newConnectorName.trim()) {
      return;
    }

    onAddConnectorType({ name: newConnectorName.trim() });
    setNewConnectorName('');
  }

  return (
    <section className="settings-section settings-tab-panel">
      <div className="section-heading">
        <h2>Connector Catalog</h2>
        <span>{connectorTypes.length}</span>
      </div>
      <div className="settings-table">
        <div className="settings-table-row settings-table-head">
          <span>Connector</span>
          <span>Icon</span>
        </div>
        {connectorTypes.map((connectorType) => (
          <div className="settings-table-row" key={connectorType.id}>
            <input
              aria-label={`${connectorType.name} connector name`}
              defaultValue={connectorType.name}
              onBlur={(event) => {
                const name = event.target.value.trim();

                if (name && name !== connectorType.name) {
                  onUpdateConnectorType(connectorType.id, { name });
                }
              }}
            />
            <div className="connector-icon-select">
              <ConnectorIcon iconKey={connectorType.iconKey} label={`${connectorType.name} icon`} />
              <select
                aria-label={`${connectorType.name} connector icon`}
                value={connectorType.iconKey}
                onChange={(event) =>
                  onUpdateConnectorType(connectorType.id, {
                    iconKey: event.target.value as ConnectorIconKey,
                  })
                }
              >
                {CONNECTOR_ICON_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>
      <form className="inline-form" onSubmit={handleAddConnector}>
        <input
          placeholder="New connector"
          value={newConnectorName}
          onChange={(event) => setNewConnectorName(event.target.value)}
        />
        <button type="submit">Add Connector</button>
      </form>
    </section>
  );
}
