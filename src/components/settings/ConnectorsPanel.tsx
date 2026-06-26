import { useState, type FormEvent } from 'react';
import type { ConnectorType } from '../../domain/types';
import type { ConnectorTypeInput, ConnectorTypeUpdates } from '../../state/projectContextTypes';

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
            <span className="settings-future-slot">Future icon</span>
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
