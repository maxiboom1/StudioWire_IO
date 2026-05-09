import { useState, type FormEvent } from 'react';
import { allocateCableRange, formatCableNumber, previewCableRange } from '../../domain/cableNumbers';
import type { Device, ProjectRoot, Rack } from '../../domain/types';
import { useProject } from '../../state/ProjectContext';
import type { DeviceDraft, DevicePortGroupDraft } from '../../state/projectReducer';
import { ModalFrame } from '../common/ModalFrame';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

interface DevicePortGroupForm extends DevicePortGroupDraft {
  localId: string;
}

const NONE_VALUE = '__none__';

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

  function handlePlannedCablesToggle(localId: string, checked: boolean) {
    setPortGroups((current) =>
      current.map((group) => {
        if (group.localId !== localId) {
          return group;
        }

        return {
          ...group,
          createPlannedCables: checked,
          firstCableNumber: checked
            ? getSuggestedFirstCableNumber(project, group.cablePrefix, current.filter((item) => item.localId !== localId))
            : null,
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
      portGroups: portGroups.map(({ localId: _localId, ...group }) => ({
        ...group,
        firstCableNumber: group.createPlannedCables ? group.firstCableNumber : null,
      })),
    });
    onCreated(id);
  }

  return (
    <ModalFrame
      title="Add Device"
      description="Create a device, its port groups, generated ports, and optional planned cables."
      onClose={onClose}
    >
      <form className="editor-form add-device-form" onSubmit={handleSubmit}>
        <section className="modal-section">
          <h3>Basic</h3>
          <div className="form-grid two">
            <div className="form-field">
              <Label htmlFor="device-name">Device name</Label>
              <Input
                autoFocus
                id="device-name"
                required
                value={device.name}
                onChange={(event) => setDevice({ ...device, name: event.target.value })}
              />
            </div>
            <div className="form-field">
              <Label htmlFor="device-code">Device code</Label>
              <Input
                id="device-code"
                required
                value={device.code}
                onChange={(event) => setDevice({ ...device, code: event.target.value.toUpperCase() })}
              />
            </div>
            <div className="form-field">
              <Label htmlFor="device-manufacturer">Manufacturer</Label>
              <Input
                id="device-manufacturer"
                value={device.manufacturer}
                onChange={(event) => setDevice({ ...device, manufacturer: event.target.value })}
              />
            </div>
            <div className="form-field">
              <Label htmlFor="device-model">Model</Label>
              <Input
                id="device-model"
                value={device.model}
                onChange={(event) => setDevice({ ...device, model: event.target.value })}
              />
            </div>
            <div className="form-field">
              <Label htmlFor="device-category">Category</Label>
              <Select value={device.categoryId} onValueChange={handleCategoryChange}>
                <SelectTrigger id="device-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                {project.settings.categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
                </SelectContent>
              </Select>
            </div>
            <div className="form-field">
              <Label htmlFor="device-location">Location</Label>
              <Select
                value={device.locationId ?? NONE_VALUE}
                onValueChange={(value) => setDevice({ ...device, locationId: value === NONE_VALUE ? null : value, rackId: null })}
              >
                <SelectTrigger id="device-location">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                <SelectItem value={NONE_VALUE}>No location</SelectItem>
                {project.locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
                </SelectContent>
              </Select>
            </div>
            <div className="form-field">
              <Label htmlFor="device-role">Role</Label>
              <Input id="device-role" value={device.role} onChange={(event) => setDevice({ ...device, role: event.target.value })} />
            </div>
            <div className="form-field">
              <Label htmlFor="device-label-prefix">Label prefix</Label>
              <Input
                id="device-label-prefix"
                value={device.labelPrefix}
                placeholder={device.code || device.name || 'MTX'}
                onChange={(event) => setDevice({ ...device, labelPrefix: event.target.value.toUpperCase() })}
              />
            </div>
          </div>
        </section>

        <section className="modal-section">
          <h3>Physical</h3>
          <div className="form-grid two">
            <div className="form-field">
              <Label htmlFor="device-mount-type">Mount type</Label>
              <Select
                value={device.mountType}
                onValueChange={(value) =>
                  setDevice({
                    ...device,
                    mountType: value as Device['mountType'],
                    rackId: value === 'rack' ? device.rackId : null,
                  })
                }
              >
                <SelectTrigger id="device-mount-type">
                  <SelectValue placeholder="Select mount type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rack">Rack</SelectItem>
                  <SelectItem value="non_rack">Non-rack</SelectItem>
                  <SelectItem value="virtual">Virtual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="form-field">
              <Label htmlFor="device-rack">Rack</Label>
              <Select
                disabled={device.mountType !== 'rack'}
                value={device.rackId ?? NONE_VALUE}
                onValueChange={(value) => setDevice({ ...device, rackId: value === NONE_VALUE ? null : value })}
              >
                <SelectTrigger id="device-rack">
                  <SelectValue placeholder="Select rack" />
                </SelectTrigger>
                <SelectContent>
                <SelectItem value={NONE_VALUE}>No rack</SelectItem>
                {locationRacks.map((rack) => (
                  <SelectItem key={rack.id} value={rack.id}>
                    {rack.name}
                  </SelectItem>
                ))}
                </SelectContent>
              </Select>
            </div>
            <div className="form-field">
              <Label htmlFor="device-rack-size">Rack size RU</Label>
              <Input
                disabled={device.mountType !== 'rack'}
                id="device-rack-size"
                min="1"
                type="number"
                value={device.rackSizeRu ?? ''}
                onChange={(event) =>
                  setDevice({ ...device, rackSizeRu: event.target.value ? Number(event.target.value) : null })
                }
              />
            </div>
            <div className="form-field">
              <Label htmlFor="device-rack-bottom">Rack bottom RU</Label>
              <Input
                disabled={device.mountType !== 'rack'}
                id="device-rack-bottom"
                min="1"
                type="number"
                value={device.rackBottomRu ?? ''}
                onChange={(event) =>
                  setDevice({ ...device, rackBottomRu: event.target.value ? Number(event.target.value) : null })
                }
              />
            </div>
          </div>
        </section>

        <section className="modal-section">
          <div className="section-heading">
            <h3>Port Groups</h3>
            <Button variant="outline" size="sm" type="button" onClick={addPortGroup}>
              Add Port Group
            </Button>
          </div>
          <div className="port-group-editor-list">
            {portGroups.map((group) => {
              const lastCableNumber =
                group.createPlannedCables && group.firstCableNumber && group.count > 0
                  ? group.firstCableNumber + group.count - 1
                  : null;

              return (
                <Card className="port-group-editor" key={group.localId}>
                  <CardHeader className="port-group-editor-heading">
                    <CardTitle>{group.name || 'Port group'}</CardTitle>
                    <Button variant="outline" size="sm" type="button" onClick={() => removePortGroup(group.localId)}>
                      Remove
                    </Button>
                  </CardHeader>
                  <CardContent>
                  <div className="form-grid three">
                    <div className="form-field">
                      <Label htmlFor={`port-group-name-${group.localId}`}>Name</Label>
                      <Input
                        id={`port-group-name-${group.localId}`}
                        value={group.name}
                        onChange={(event) => updatePortGroup(group.localId, { name: event.target.value })}
                      />
                    </div>
                    <div className="form-field">
                      <Label htmlFor={`port-group-direction-${group.localId}`}>Direction</Label>
                      <Select
                        value={group.direction}
                        onValueChange={(value) =>
                          updatePortGroup(group.localId, {
                            direction: value as DevicePortGroupDraft['direction'],
                          })
                        }
                      >
                        <SelectTrigger id={`port-group-direction-${group.localId}`}>
                          <SelectValue placeholder="Select direction" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="input">Input</SelectItem>
                          <SelectItem value="output">Output</SelectItem>
                          <SelectItem value="bidirectional">Bidirectional</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="form-field">
                      <Label htmlFor={`port-group-category-${group.localId}`}>Category</Label>
                      <Select
                        value={group.categoryId}
                        onValueChange={(value) => updatePortGroup(group.localId, { categoryId: value })}
                      >
                        <SelectTrigger id={`port-group-category-${group.localId}`}>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                        {project.settings.categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="form-field">
                      <Label htmlFor={`port-group-connector-${group.localId}`}>Connector type</Label>
                      <Select
                        value={group.connectorTypeId}
                        onValueChange={(value) => updatePortGroup(group.localId, { connectorTypeId: value })}
                      >
                        <SelectTrigger id={`port-group-connector-${group.localId}`}>
                          <SelectValue placeholder="Select connector" />
                        </SelectTrigger>
                        <SelectContent>
                        {project.settings.connectorTypes.map((connectorType) => (
                          <SelectItem key={connectorType.id} value={connectorType.id}>
                            {connectorType.name}
                          </SelectItem>
                        ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="form-field">
                      <Label htmlFor={`port-group-count-${group.localId}`}>Count</Label>
                      <Input
                        id={`port-group-count-${group.localId}`}
                        min="1"
                        type="number"
                        value={group.count}
                        onChange={(event) => updatePortGroup(group.localId, { count: Number(event.target.value) })}
                      />
                    </div>
                    <div className="form-field">
                      <Label htmlFor={`port-group-pattern-${group.localId}`}>Port label pattern</Label>
                      <Input
                        id={`port-group-pattern-${group.localId}`}
                        value={group.portLabelPattern}
                        onChange={(event) =>
                          updatePortGroup(group.localId, { portLabelPattern: event.target.value })
                        }
                      />
                    </div>
                    <div className="form-field">
                      <Label htmlFor={`port-group-prefix-${group.localId}`}>Cable prefix</Label>
                      <Select
                        value={group.cablePrefix}
                        onValueChange={(value) =>
                          updatePortGroup(group.localId, {
                            cablePrefix: value,
                            firstCableNumber: group.createPlannedCables
                              ? getSuggestedFirstCableNumber(project, value, portGroups)
                              : null,
                          })
                        }
                      >
                        <SelectTrigger id={`port-group-prefix-${group.localId}`}>
                          <SelectValue placeholder="Select prefix" />
                        </SelectTrigger>
                        <SelectContent>
                        {project.settings.cablePrefixes.map((prefix) => (
                          <SelectItem key={prefix.id} value={prefix.prefix}>
                            {prefix.prefix}
                          </SelectItem>
                        ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="form-field">
                      <Label htmlFor={`port-group-first-cable-${group.localId}`}>First cable number</Label>
                      <Input
                        disabled={!group.createPlannedCables}
                        id={`port-group-first-cable-${group.localId}`}
                        min="1"
                        type="number"
                        value={group.firstCableNumber ?? ''}
                        onChange={(event) =>
                          updatePortGroup(group.localId, {
                            firstCableNumber: event.target.value ? Number(event.target.value) : null,
                          })
                        }
                      />
                    </div>
                    <div className="form-field">
                      <Label htmlFor={`port-group-last-cable-${group.localId}`}>Last cable number</Label>
                      <Input
                        disabled={!group.createPlannedCables}
                        id={`port-group-last-cable-${group.localId}`}
                        readOnly
                        value={lastCableNumber ? formatCableNumber(group.cablePrefix, lastCableNumber) : ''}
                      />
                    </div>
                  </div>
                  <Label className="checkbox-row">
                    <input
                      checked={group.createPlannedCables}
                      type="checkbox"
                      onChange={(event) => handlePlannedCablesToggle(group.localId, event.target.checked)}
                    />
                    <span>Create planned cables</span>
                  </Label>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <div className="form-messages">
            {validation.warnings.map((warning) => (
              <Alert className="border-amber-200 bg-amber-50 text-amber-800" key={warning}>
                <AlertDescription>{warning}</AlertDescription>
              </Alert>
            ))}
            {validation.errors.map((error) => (
              <Alert className="border-red-200 bg-red-50 text-red-800" key={error}>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ))}
          </div>
        </section>

        <DialogFooter>
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={validation.errors.length > 0} type="submit">
            Create Device
          </Button>
        </DialogFooter>
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
