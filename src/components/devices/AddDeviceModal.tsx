import { useState, type FormEvent } from 'react';
import { allocateCableRange, formatCableNumber, previewCableRange } from '../../domain/cableNumbers';
import type { Device, ProjectRoot, Rack } from '../../domain/types';
import { useProject } from '../../state/ProjectContext';
import type { DeviceDraft, DevicePortGroupDraft } from '../../state/projectReducer';
import { ModalFrame } from '../common/ModalFrame';

interface DevicePortGroupForm extends DevicePortGroupDraft {
  localId: string;
}

export function AddDeviceModal({
  initialLocationId,
  onClose,
  onCreated,
}: {
  initialLocationId: string | null;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { project, addDevice } = useProject();
  const firstCategory = project.settings.categories[0];
  const [device, setDevice] = useState<DeviceDraft>({
    name: '',
    code: '',
    manufacturer: '',
    model: '',
    categoryId: firstCategory?.id ?? '',
    locationId: initialLocationId ?? project.locations[0]?.id ?? null,
    role: '',
    labelPrefix: '',
    mountType: 'non_rack',
    rackId: null,
    rackSizeRu: null,
    rackBottomRu: null,
    notes: '',
  });
  const [portGroups, setPortGroups] = useState<DevicePortGroupForm[]>(() =>
    createQuickPortGroups(project, firstCategory?.id ?? '', ''),
  );
  const locationRacks = project.racks.filter((rack) => rack.locationId === device.locationId);
  const validation = getAddDeviceValidation(project, device, portGroups);

  function handleCategoryChange(categoryId: string) {
    setDevice({ ...device, categoryId });
    setPortGroups(createQuickPortGroups(project, categoryId, device.labelPrefix || device.code));
  }

  function updatePortGroup(localId: string, updates: Partial<DevicePortGroupForm>) {
    setPortGroups((current) =>
      current.map((group) => {
        if (group.localId !== localId) {
          return group;
        }

        const updated = { ...group, ...updates };
        const count = Number(updated.count);

        return {
          ...updated,
          count,
          firstCableNumber: updated.firstCableNumber === null ? null : Number(updated.firstCableNumber),
        };
      }),
    );
  }

  function addPortGroup() {
    const category = project.settings.categories.find((item) => item.id === device.categoryId);
    const prefix = category?.defaultCablePrefix ?? project.settings.cablePrefixes[0]?.prefix ?? 'V';

    setPortGroups((current) => [
      ...current,
      {
        localId: `group-${Date.now()}`,
        name: 'PORTS',
        direction: 'bidirectional',
        categoryId: device.categoryId,
        connectorTypeId: project.settings.connectorTypes[0]?.id ?? '',
        count: 1,
        portLabelPattern: '{DEVICE}-{000}',
        cablePrefix: prefix,
        firstCableNumber: getSuggestedFirstCableNumber(project, prefix, current),
        createPlannedCables: true,
      },
    ]);
  }

  function removePortGroup(localId: string) {
    setPortGroups((current) => current.filter((group) => group.localId !== localId));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (validation.errors.length > 0) {
      return;
    }

    if (validation.warnings.length > 0) {
      const confirmed = window.confirm(
        `${validation.warnings.join('\n')}\n\nContinue and reserve these cable number gaps?`,
      );

      if (!confirmed) {
        return;
      }
    }

    const id = addDevice({
      device: {
        ...device,
        name: device.name.trim(),
        code: device.code.trim(),
        labelPrefix: (device.labelPrefix || device.code || device.name).trim(),
        rackId: device.mountType === 'rack' ? device.rackId : null,
        rackSizeRu: device.mountType === 'rack' ? device.rackSizeRu : null,
        rackBottomRu: device.mountType === 'rack' ? device.rackBottomRu : null,
      },
      portGroups: portGroups.map(({ localId: _localId, ...group }) => group),
    });
    onCreated(id);
  }

  return (
    <ModalFrame title="Add Device" onClose={onClose}>
      <form className="editor-form add-device-form" onSubmit={handleSubmit}>
        <section className="modal-section">
          <h3>Basic</h3>
          <div className="form-grid two">
            <label>
              <span>Device name</span>
              <input
                autoFocus
                required
                value={device.name}
                onChange={(event) => setDevice({ ...device, name: event.target.value })}
              />
            </label>
            <label>
              <span>Device code</span>
              <input
                required
                value={device.code}
                onChange={(event) => setDevice({ ...device, code: event.target.value.toUpperCase() })}
              />
            </label>
            <label>
              <span>Manufacturer</span>
              <input
                value={device.manufacturer}
                onChange={(event) => setDevice({ ...device, manufacturer: event.target.value })}
              />
            </label>
            <label>
              <span>Model</span>
              <input
                value={device.model}
                onChange={(event) => setDevice({ ...device, model: event.target.value })}
              />
            </label>
            <label>
              <span>Category</span>
              <select value={device.categoryId} onChange={(event) => handleCategoryChange(event.target.value)}>
                {project.settings.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Location</span>
              <select
                value={device.locationId ?? ''}
                onChange={(event) =>
                  setDevice({ ...device, locationId: event.target.value || null, rackId: null })
                }
              >
                <option value="">No location</option>
                {project.locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Role</span>
              <input value={device.role} onChange={(event) => setDevice({ ...device, role: event.target.value })} />
            </label>
            <label>
              <span>Label prefix</span>
              <input
                value={device.labelPrefix}
                placeholder={device.code || device.name || 'MTX'}
                onChange={(event) => setDevice({ ...device, labelPrefix: event.target.value.toUpperCase() })}
              />
            </label>
          </div>
        </section>

        <section className="modal-section">
          <h3>Physical</h3>
          <div className="form-grid two">
            <label>
              <span>Mount type</span>
              <select
                value={device.mountType}
                onChange={(event) =>
                  setDevice({
                    ...device,
                    mountType: event.target.value as Device['mountType'],
                    rackId: event.target.value === 'rack' ? device.rackId : null,
                  })
                }
              >
                <option value="rack">Rack</option>
                <option value="non_rack">Non-rack</option>
                <option value="virtual">Virtual</option>
              </select>
            </label>
            <label>
              <span>Rack</span>
              <select
                disabled={device.mountType !== 'rack'}
                value={device.rackId ?? ''}
                onChange={(event) => setDevice({ ...device, rackId: event.target.value || null })}
              >
                <option value="">No rack</option>
                {locationRacks.map((rack) => (
                  <option key={rack.id} value={rack.id}>
                    {rack.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Rack size RU</span>
              <input
                disabled={device.mountType !== 'rack'}
                min="1"
                type="number"
                value={device.rackSizeRu ?? ''}
                onChange={(event) =>
                  setDevice({ ...device, rackSizeRu: event.target.value ? Number(event.target.value) : null })
                }
              />
            </label>
            <label>
              <span>Rack bottom RU</span>
              <input
                disabled={device.mountType !== 'rack'}
                min="1"
                type="number"
                value={device.rackBottomRu ?? ''}
                onChange={(event) =>
                  setDevice({ ...device, rackBottomRu: event.target.value ? Number(event.target.value) : null })
                }
              />
            </label>
          </div>
        </section>

        <section className="modal-section">
          <div className="section-heading">
            <h3>Port Groups</h3>
            <button type="button" onClick={addPortGroup}>
              Add Port Group
            </button>
          </div>
          <div className="port-group-editor-list">
            {portGroups.map((group) => {
              const lastCableNumber =
                group.firstCableNumber && group.count > 0
                  ? group.firstCableNumber + group.count - 1
                  : null;

              return (
                <section className="port-group-editor" key={group.localId}>
                  <div className="port-group-editor-heading">
                    <strong>{group.name || 'Port group'}</strong>
                    <button type="button" onClick={() => removePortGroup(group.localId)}>
                      Remove
                    </button>
                  </div>
                  <div className="form-grid three">
                    <label>
                      <span>Name</span>
                      <input
                        value={group.name}
                        onChange={(event) => updatePortGroup(group.localId, { name: event.target.value })}
                      />
                    </label>
                    <label>
                      <span>Direction</span>
                      <select
                        value={group.direction}
                        onChange={(event) =>
                          updatePortGroup(group.localId, {
                            direction: event.target.value as DevicePortGroupDraft['direction'],
                          })
                        }
                      >
                        <option value="input">Input</option>
                        <option value="output">Output</option>
                        <option value="bidirectional">Bidirectional</option>
                      </select>
                    </label>
                    <label>
                      <span>Category</span>
                      <select
                        value={group.categoryId}
                        onChange={(event) => updatePortGroup(group.localId, { categoryId: event.target.value })}
                      >
                        {project.settings.categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Connector type</span>
                      <select
                        value={group.connectorTypeId}
                        onChange={(event) =>
                          updatePortGroup(group.localId, { connectorTypeId: event.target.value })
                        }
                      >
                        {project.settings.connectorTypes.map((connectorType) => (
                          <option key={connectorType.id} value={connectorType.id}>
                            {connectorType.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Count</span>
                      <input
                        min="1"
                        type="number"
                        value={group.count}
                        onChange={(event) => updatePortGroup(group.localId, { count: Number(event.target.value) })}
                      />
                    </label>
                    <label>
                      <span>Port label pattern</span>
                      <input
                        value={group.portLabelPattern}
                        onChange={(event) =>
                          updatePortGroup(group.localId, { portLabelPattern: event.target.value })
                        }
                      />
                    </label>
                    <label>
                      <span>Cable prefix</span>
                      <select
                        value={group.cablePrefix}
                        onChange={(event) =>
                          updatePortGroup(group.localId, {
                            cablePrefix: event.target.value,
                            firstCableNumber: getSuggestedFirstCableNumber(project, event.target.value, portGroups),
                          })
                        }
                      >
                        {project.settings.cablePrefixes.map((prefix) => (
                          <option key={prefix.id} value={prefix.prefix}>
                            {prefix.prefix}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>First cable number</span>
                      <input
                        min="1"
                        type="number"
                        value={group.firstCableNumber ?? ''}
                        onChange={(event) =>
                          updatePortGroup(group.localId, {
                            firstCableNumber: event.target.value ? Number(event.target.value) : null,
                          })
                        }
                      />
                    </label>
                    <label>
                      <span>Last cable number</span>
                      <input readOnly value={lastCableNumber ? formatCableNumber(group.cablePrefix, lastCableNumber) : ''} />
                    </label>
                  </div>
                  <label className="checkbox-row">
                    <input
                      checked={group.createPlannedCables}
                      type="checkbox"
                      onChange={(event) =>
                        updatePortGroup(group.localId, { createPlannedCables: event.target.checked })
                      }
                    />
                    <span>Create planned cables</span>
                  </label>
                </section>
              );
            })}
          </div>
          <div className="form-messages">
            {validation.warnings.map((warning) => (
              <p className="form-warning" key={warning}>
                {warning}
              </p>
            ))}
            {validation.errors.map((error) => (
              <p className="form-error" key={error}>
                {error}
              </p>
            ))}
          </div>
        </section>

        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button disabled={validation.errors.length > 0} type="submit">
            Create Device
          </button>
        </div>
      </form>
    </ModalFrame>
  );
}

function createQuickPortGroups(
  project: ProjectRoot,
  categoryId: string,
  _deviceLabelPrefix: string,
): DevicePortGroupForm[] {
  const category = project.settings.categories.find((item) => item.id === categoryId);
  const categoryName = category?.name.toLowerCase() ?? '';
  const defaultPrefix = category?.defaultCablePrefix ?? project.settings.cablePrefixes[0]?.prefix ?? 'V';
  const nextByPrefix = new Map(project.numberingLedgers.map((ledger) => [ledger.prefix, ledger.nextSuggested]));

  function makeGroup(input: {
    name: string;
    direction: DevicePortGroupDraft['direction'];
    connectorName: string;
    prefix: string;
    pattern: string;
    count?: number;
  }): DevicePortGroupForm {
    const count = input.count ?? 4;
    const firstCableNumber = nextByPrefix.get(input.prefix) ?? 1;

    nextByPrefix.set(input.prefix, firstCableNumber + count);

    return {
      localId: `${input.name}-${Date.now()}-${Math.random()}`,
      name: input.name,
      direction: input.direction,
      categoryId,
      connectorTypeId: findConnectorTypeId(project, input.connectorName),
      count,
      portLabelPattern: input.pattern,
      cablePrefix: input.prefix,
      firstCableNumber,
      createPlannedCables: true,
    };
  }

  if (categoryName === 'video') {
    return [
      makeGroup({
        name: 'SDI IN',
        direction: 'input',
        connectorName: 'BNC',
        prefix: 'V',
        pattern: '{DEVICE}-IN-{000}',
      }),
      makeGroup({
        name: 'SDI OUT',
        direction: 'output',
        connectorName: 'BNC',
        prefix: 'V',
        pattern: '{DEVICE}-OUT-{000}',
      }),
    ];
  }

  if (categoryName === 'audio') {
    return [
      makeGroup({
        name: 'AUDIO IN',
        direction: 'input',
        connectorName: 'XLR',
        prefix: 'A',
        pattern: '{DEVICE}-AIN-{000}',
      }),
      makeGroup({
        name: 'AUDIO OUT',
        direction: 'output',
        connectorName: 'XLR',
        prefix: 'A',
        pattern: '{DEVICE}-AOUT-{000}',
      }),
    ];
  }

  if (categoryName === 'network') {
    return [
      makeGroup({
        name: 'NETWORK',
        direction: 'bidirectional',
        connectorName: 'RJ45',
        prefix: 'N',
        pattern: '{DEVICE}-NET-{000}',
      }),
    ];
  }

  return [
    makeGroup({
      name: 'PORTS',
      direction: 'bidirectional',
      connectorName: project.settings.connectorTypes[0]?.name ?? 'Other',
      prefix: defaultPrefix,
      pattern: '{DEVICE}-{000}',
    }),
  ];
}

function findConnectorTypeId(project: ProjectRoot, name: string): string {
  return (
    project.settings.connectorTypes.find(
      (connectorType) => connectorType.name.toLowerCase() === name.toLowerCase(),
    )?.id ??
    project.settings.connectorTypes[0]?.id ??
    ''
  );
}

function getSuggestedFirstCableNumber(
  project: ProjectRoot,
  prefix: string,
  currentGroups: DevicePortGroupForm[],
): number {
  let nextSuggested = project.numberingLedgers.find((ledger) => ledger.prefix === prefix)?.nextSuggested ?? 1;

  for (const group of currentGroups) {
    if (
      group.cablePrefix === prefix &&
      group.createPlannedCables &&
      group.firstCableNumber !== null &&
      group.count > 0
    ) {
      nextSuggested = Math.max(nextSuggested, group.firstCableNumber + group.count);
    }
  }

  return nextSuggested;
}

function getAddDeviceValidation(
  project: ProjectRoot,
  device: DeviceDraft,
  portGroups: DevicePortGroupForm[],
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  let previewProject = project;

  if (!device.name.trim()) {
    errors.push('Device name is required.');
  }

  if (!device.code.trim()) {
    errors.push('Device code is required.');
  }

  if (!device.categoryId) {
    errors.push('Device category is required.');
  }

  if (device.mountType !== 'virtual' && !device.locationId) {
    errors.push('Location is required unless the device is virtual.');
  }

  if (device.mountType === 'rack') {
    const rack = device.rackId ? project.racks.find((candidate) => candidate.id === device.rackId) : null;

    if (!rack || !device.rackSizeRu || !device.rackBottomRu) {
      errors.push('Rack-mounted devices require rack, rack size, and rack bottom RU.');
    } else if (
      device.rackBottomRu < 1 ||
      device.rackSizeRu < 1 ||
      device.rackBottomRu + device.rackSizeRu - 1 > rack.heightRu
    ) {
      errors.push('Rack position must fit inside the rack height.');
    }
  }

  if (portGroups.length === 0) {
    errors.push('At least one port group is required.');
  }

  for (const group of portGroups) {
    if (!group.name.trim()) {
      errors.push('Port group name is required.');
    }

    if (!Number.isSafeInteger(group.count) || group.count <= 0) {
      errors.push(`${group.name || 'Port group'} count must be positive.`);
    }

    if (!project.settings.cablePrefixes.some((prefix) => prefix.prefix === group.cablePrefix)) {
      errors.push(`${group.name || 'Port group'} uses an unknown cable prefix.`);
    }

    if (group.createPlannedCables) {
      if (!group.firstCableNumber || group.firstCableNumber < 1) {
        errors.push(`${group.name || 'Port group'} needs a positive first cable number.`);
        continue;
      }

      const preview = previewCableRange(previewProject, group.cablePrefix, group.firstCableNumber, group.count);

      for (const error of preview.errors) {
        errors.push(`${group.name}: ${error.message}`);
      }

      if (preview.reservedGap) {
        warnings.push(
          `Numbers ${formatCableNumber(preview.reservedGap.prefix, preview.reservedGap.from)} to ${formatCableNumber(
            preview.reservedGap.prefix,
            preview.reservedGap.to,
          )} will be reserved and cannot be used later.`,
        );
      }

      if (preview.errors.length === 0) {
        previewProject = allocateCableRange(previewProject, {
          prefix: group.cablePrefix,
          firstCableNumber: group.firstCableNumber,
          count: group.count,
          ownerType: 'preview',
          ownerId: group.localId,
          reason: 'Preview device allocation',
        }).project;
      }
    }
  }

  return {
    errors: Array.from(new Set(errors)),
    warnings: Array.from(new Set(warnings)),
  };
}
