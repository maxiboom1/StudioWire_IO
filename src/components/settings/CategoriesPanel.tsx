import { useState, type FormEvent } from 'react';
import type { CablePrefix, Category, ConnectorType } from '../../domain/types';
import type {
  CategoryConnectorAssignmentInput,
  CategoryInput,
  CategoryUpdates,
} from '../../state/projectContextTypes';
import type { NewCategoryFormValue } from './settingsTypes';

export function CategoriesPanel({
  activeCategoryId,
  cablePrefixes,
  categories,
  categoryConnectors,
  selectedCategory,
  unassignedConnectors,
  onActiveCategoryChange,
  onAddCategory,
  onAssignConnector,
  onRemoveAssignment,
  onUpdateCategory,
}: {
  activeCategoryId: string;
  cablePrefixes: CablePrefix[];
  categories: Category[];
  categoryConnectors: ConnectorType[];
  selectedCategory: Category | null;
  unassignedConnectors: ConnectorType[];
  onActiveCategoryChange: (categoryId: string) => void;
  onAddCategory: (input: CategoryInput) => string;
  onAssignConnector: (input: CategoryConnectorAssignmentInput) => string;
  onRemoveAssignment: (input: CategoryConnectorAssignmentInput) => void;
  onUpdateCategory: (id: string, updates: CategoryUpdates) => void;
}) {
  const [newCategory, setNewCategory] = useState<NewCategoryFormValue>({
    name: '',
    defaultCablePrefix: cablePrefixes[0]?.prefix ?? 'V',
  });
  const [connectorToAssign, setConnectorToAssign] = useState('');

  function updateSelectedCategoryColor(value: string) {
    if (!selectedCategory) {
      return;
    }

    if (value === selectedCategory.color) {
      return;
    }

    onUpdateCategory(selectedCategory.id, { color: value.toUpperCase() });
  }

  function handleAddCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!newCategory.name.trim()) {
      return;
    }

    onAddCategory({
      name: newCategory.name.trim(),
      defaultCablePrefix: newCategory.defaultCablePrefix,
    });
    setNewCategory({
      name: '',
      defaultCablePrefix: cablePrefixes[0]?.prefix ?? 'V',
    });
  }

  function handleAssignConnector(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const connectorTypeId = connectorToAssign || unassignedConnectors[0]?.id;

    if (!selectedCategory?.id || !connectorTypeId) {
      return;
    }

    onAssignConnector({ categoryId: selectedCategory.id, connectorTypeId });
    setConnectorToAssign('');
  }

  return (
    <div className="settings-tab-panel">
      <section className="settings-section">
        <div className="section-heading">
          <h2>Categories</h2>
          <span>{categories.length}</span>
        </div>
        <div className="settings-inner-tabs" role="tablist" aria-label="Categories">
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
        <form className="inline-form" onSubmit={handleAddCategory}>
          <input
            placeholder="New category"
            value={newCategory.name}
            onChange={(event) => setNewCategory({ ...newCategory, name: event.target.value })}
          />
          <select
            value={newCategory.defaultCablePrefix}
            onChange={(event) => setNewCategory({ ...newCategory, defaultCablePrefix: event.target.value })}
          >
            {cablePrefixes.map((prefix) => (
              <option key={prefix.id} value={prefix.prefix}>
                {prefix.prefix}
              </option>
            ))}
          </select>
          <button type="submit">Add Category</button>
        </form>
      </section>

      {selectedCategory ? (
        <section className="settings-section">
          <div className="section-heading">
            <h2>{selectedCategory.name}</h2>
            <span>{categoryConnectors.length} connectors</span>
          </div>
          <div className="settings-detail-grid">
            <label>
              <span>Name</span>
              <input
                defaultValue={selectedCategory.name}
                onBlur={(event) => {
                  const name = event.target.value.trim();

                  if (name && name !== selectedCategory.name) {
                    onUpdateCategory(selectedCategory.id, {
                      name,
                    });
                  }
                }}
              />
            </label>
            <label>
              <span>Default prefix</span>
              <select
                value={selectedCategory.defaultCablePrefix}
                onChange={(event) =>
                  onUpdateCategory(selectedCategory.id, {
                    defaultCablePrefix: event.target.value,
                  })
                }
              >
                {cablePrefixes.map((prefix) => (
                  <option key={prefix.id} value={prefix.prefix}>
                    {prefix.prefix}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Color</span>
              <input
                aria-label={`${selectedCategory.name} color picker`}
                type="color"
                value={selectedCategory.color}
                onChange={(event) => updateSelectedCategoryColor(event.target.value)}
              />
            </label>
          </div>
          <div className="settings-token-list">
            {categoryConnectors.length === 0 ? (
              <span className="settings-empty-inline">No connectors assigned.</span>
            ) : (
              categoryConnectors.map((connectorType) => (
                <button
                  key={connectorType.id}
                  type="button"
                  onClick={() =>
                    onRemoveAssignment({
                      categoryId: selectedCategory.id,
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
          <form className="inline-form" onSubmit={handleAssignConnector}>
            <select
              disabled={unassignedConnectors.length === 0}
              value={connectorToAssign || unassignedConnectors[0]?.id || ''}
              onChange={(event) => setConnectorToAssign(event.target.value)}
            >
              {unassignedConnectors.length === 0 ? <option value="">All connectors assigned</option> : null}
              {unassignedConnectors.map((connectorType) => (
                <option key={connectorType.id} value={connectorType.id}>
                  {connectorType.name}
                </option>
              ))}
            </select>
            <button disabled={unassignedConnectors.length === 0} type="submit">
              Assign Connector
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
