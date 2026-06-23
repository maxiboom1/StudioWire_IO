import { X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { allocateCableRange, formatCableNumber, previewCableRange } from '../../domain/cableNumbers';
import {
  getConnectorsForCategory,
  getDefaultConnectorForCategory,
  isConnectorAssignedToCategory,
} from '../../domain/connectorCompatibility';
import type { ProjectRoot } from '../../domain/types';
import { useProject } from '../../state/ProjectContext';
import type { DeviceDraft, DevicePortGroupDraft } from '../../state/projectReducer';
import { ModalFrame } from '../common/ModalFrame';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
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
    locationId: initialLocationId ?? null,
    role: '',
    labelPrefix: '',
    mountType: 'virtual',
    rackId: null,
    rackSizeRu: null,
    rackBottomRu: null,
    notes: '',
  });
  const [portGroups, setPortGroups] = useState<DevicePortGroupForm[]>(() =>
    createQuickPortGroups(project, firstCategory?.id ?? ''),
  );
  const validation = getAddDeviceValidation(project, device, portGroups);
  const effectiveLabelPrefix = normalizeDeviceToken(device.labelPrefix || device.name);

  function handleCategoryChange(categoryId: string) {
    setDevice({ ...device, categoryId });
    setPortGroups(createQuickPortGroups(project, categoryId));
  }

  function updatePortGroup(localId: string, updates: Partial<DevicePortGroupForm>) {
    setPortGroups((current) =>
      rebalancePlannedCableRanges(
        project,
        current.map((group) => {
          if (group.localId !== localId) {
            return group;
          }

          const updated = { ...group, ...updates };

          return {
            ...updated,
            count: Number(updated.count),
          };
        }),
      ),
    );
  }

  function handlePortGroupCategoryChange(localId: string, categoryId: string) {
    updatePortGroup(localId, {
      categoryId,
      connectorTypeId: getDefaultConnectorForCategory(project.settings, categoryId)?.id ?? '',
      cablePrefix: getDefaultPrefixForCategory(project, categoryId),
    });
  }

  function handlePlannedCablesToggle(localId: string, checked: boolean) {
    setPortGroups((current) =>
      rebalancePlannedCableRanges(
        project,
        current.map((group) =>
          group.localId === localId
            ? {
                ...group,
                createPlannedCables: checked,
                firstCableNumber:
                  group.firstCableNumber ??
                  project.numberingLedgers.find((ledger) => ledger.prefix === group.cablePrefix)?.nextSuggested ??
                  1,
              }
            : group,
        ),
      ),
    );
  }

  function addPortGroup() {
    const prefix = getDefaultPrefixForCategory(project, device.categoryId);

    setPortGroups((current) =>
      rebalancePlannedCableRanges(project, [
        ...current,
        {
          localId: `group-${Date.now()}`,
          name: 'PORTS',
          direction: 'bidirectional',
          categoryId: device.categoryId,
          connectorTypeId: getDefaultConnectorForCategory(project.settings, device.categoryId)?.id ?? '',
          count: 1,
          portLabelPattern: '{DEVICE}-{000}',
          cablePrefix: prefix,
          firstCableNumber: null,
          createPlannedCables: true,
        },
      ]),
    );
  }

  function removePortGroup(localId: string) {
    setPortGroups((current) =>
      rebalancePlannedCableRanges(
        project,
        current.filter((group) => group.localId !== localId),
      ),
    );
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

    const generatedCode = normalizeDeviceToken(device.labelPrefix || device.name);
    const id = addDevice({
      device: {
        ...device,
        name: device.name.trim(),
        code: generatedCode,
        role: '',
        labelPrefix: effectiveLabelPrefix,
        mountType: 'virtual',
        rackId: null,
        rackSizeRu: null,
        rackBottomRu: null,
        notes: '',
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
      description="Create a virtual device with generated ports and optional planned cables."
      onClose={onClose}
    >
      <form className="editor-form add-device-form" onSubmit={handleSubmit}>
        <section className="modal-section">
          <h3>Basic</h3>
          <div className="form-grid two">
            <div className="form-field">
              <Label htmlFor="device-name">Name</Label>
              <Input
                autoFocus
                id="device-name"
                required
                value={device.name}
                onChange={(event) => setDevice({ ...device, name: event.target.value })}
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
                onValueChange={(value) => setDevice({ ...device, locationId: value === NONE_VALUE ? null : value })}
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
              <Label htmlFor="device-label-prefix">Label Prefix</Label>
              <Input
                id="device-label-prefix"
                value={device.labelPrefix}
                placeholder={device.name ? normalizeDeviceToken(device.name) : 'MTX'}
                onChange={(event) => setDevice({ ...device, labelPrefix: event.target.value.toUpperCase() })}
              />
            </div>
          </div>
        </section>

        <section className="modal-section">
          <div className="section-heading">
            <h3>I/O Interfaces</h3>
          </div>
          <div className="port-group-editor-list">
            {portGroups.map((group) => (
              <PortGroupEditor
                group={group}
                key={group.localId}
                project={project}
                onCategoryChange={handlePortGroupCategoryChange}
                onPlannedCablesToggle={handlePlannedCablesToggle}
                onRemove={removePortGroup}
                onUpdate={updatePortGroup}
              />
            ))}
          </div>
          <Button variant="outline" size="sm" type="button" onClick={addPortGroup}>
            Add Port Group
          </Button>
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

function PortGroupEditor({
  group,
  project,
  onCategoryChange,
  onPlannedCablesToggle,
  onRemove,
  onUpdate,
}: {
  group: DevicePortGroupForm;
  project: ProjectRoot;
  onCategoryChange: (localId: string, categoryId: string) => void;
  onPlannedCablesToggle: (localId: string, checked: boolean) => void;
  onRemove: (localId: string) => void;
  onUpdate: (localId: string, updates: Partial<DevicePortGroupForm>) => void;
}) {
  const connectorTypes = getConnectorsForCategory(project.settings, group.categoryId);

  return (
    <Card className="port-group-editor">
      <CardHeader className="port-group-editor-heading">
        <CardTitle>{group.name || 'Port group'}</CardTitle>
        <div className="interface-card-actions">
          <Badge>{formatPortGroupRange(group)}</Badge>
          <Button
            aria-label={`Remove ${group.name || 'interface'}`}
            size="icon"
            type="button"
            variant="ghost"
            onClick={() => onRemove(group.localId)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="port-group-editor-content">
        <div className="port-group-row port-group-row-primary">
          <div className="form-field">
            <Label htmlFor={`port-group-name-${group.localId}`}>Name</Label>
            <Input
              id={`port-group-name-${group.localId}`}
              value={group.name}
              onChange={(event) => onUpdate(group.localId, { name: event.target.value })}
            />
          </div>
          <div className="form-field">
            <Label htmlFor={`port-group-category-${group.localId}`}>Category</Label>
            <Select value={group.categoryId} onValueChange={(value) => onCategoryChange(group.localId, value)}>
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
            <Label htmlFor={`port-group-direction-${group.localId}`}>Direction</Label>
            <Select
              value={group.direction}
              onValueChange={(value) =>
                onUpdate(group.localId, {
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
            <Label htmlFor={`port-group-connector-${group.localId}`}>Connector</Label>
            <Select
              value={group.connectorTypeId}
              onValueChange={(value) => onUpdate(group.localId, { connectorTypeId: value })}
            >
              <SelectTrigger id={`port-group-connector-${group.localId}`}>
                <SelectValue placeholder="Select connector" />
              </SelectTrigger>
              <SelectContent>
                {connectorTypes.map((connectorType) => (
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
              onChange={(event) => onUpdate(group.localId, { count: Number(event.target.value) })}
            />
          </div>
        </div>
        <div className="port-group-row port-group-row-secondary">
          <div className="form-field">
            <Label>Mode</Label>
            <Button
              aria-pressed={group.createPlannedCables}
              className="interface-auto-toggle"
              type="button"
              variant={group.createPlannedCables ? 'default' : 'outline'}
              onClick={() => onPlannedCablesToggle(group.localId, !group.createPlannedCables)}
            >
              AUTO
            </Button>
          </div>
          <div className="form-field">
            <Label htmlFor={`port-group-prefix-${group.localId}`}>Cable Prefix</Label>
            <Select
              value={group.cablePrefix}
              onValueChange={(value) =>
                onUpdate(group.localId, {
                  cablePrefix: value,
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
            <Label htmlFor={`port-group-pattern-${group.localId}`}>Label Pattern</Label>
            <Input
              id={`port-group-pattern-${group.localId}`}
              value={group.portLabelPattern}
              onChange={(event) => onUpdate(group.localId, { portLabelPattern: event.target.value })}
            />
          </div>
          <div className="form-field">
            <Label htmlFor={`port-group-first-cable-${group.localId}`}>First Cable Number</Label>
            <Input
              id={`port-group-first-cable-${group.localId}`}
              min="1"
              readOnly={group.createPlannedCables}
              type="number"
              value={group.firstCableNumber ?? ''}
              onChange={(event) =>
                onUpdate(group.localId, {
                  firstCableNumber: event.target.value ? Number(event.target.value) : null,
                })
              }
            />
          </div>
          <div className="form-field">
            <Label htmlFor={`port-group-last-cable-${group.localId}`}>Last Cable Number</Label>
            <Input
              id={`port-group-last-cable-${group.localId}`}
              readOnly
              value={formatPortGroupLastCableNumber(group)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function createQuickPortGroups(project: ProjectRoot, categoryId: string): DevicePortGroupForm[] {
  const category = project.settings.categories.find((item) => item.id === categoryId);
  const categoryName = category?.name.toLowerCase() ?? '';
  const defaultPrefix = category?.defaultCablePrefix ?? project.settings.cablePrefixes[0]?.prefix ?? 'V';

  function makeGroup(input: {
    name: string;
    direction: DevicePortGroupDraft['direction'];
    connectorName: string;
    prefix: string;
    pattern: string;
    count?: number;
  }): DevicePortGroupForm {
    return {
      localId: `${input.name}-${Date.now()}-${Math.random()}`,
      name: input.name,
      direction: input.direction,
      categoryId,
      connectorTypeId: findConnectorTypeId(project, categoryId, input.connectorName),
      count: input.count ?? 4,
      portLabelPattern: input.pattern,
      cablePrefix: input.prefix,
      firstCableNumber: null,
      createPlannedCables: true,
    };
  }

  if (categoryName === 'video') {
    return rebalancePlannedCableRanges(project, [
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
    ]);
  }

  if (categoryName === 'audio') {
    return rebalancePlannedCableRanges(project, [
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
    ]);
  }

  if (categoryName === 'network') {
    return rebalancePlannedCableRanges(project, [
      makeGroup({
        name: 'NETWORK',
        direction: 'bidirectional',
        connectorName: 'RJ45',
        prefix: 'N',
        pattern: '{DEVICE}-NET-{000}',
      }),
    ]);
  }

  return rebalancePlannedCableRanges(project, [
    makeGroup({
      name: 'PORTS',
      direction: 'bidirectional',
      connectorName: project.settings.connectorTypes[0]?.name ?? 'Other',
      prefix: defaultPrefix,
      pattern: '{DEVICE}-{000}',
    }),
  ]);
}

function rebalancePlannedCableRanges(
  project: ProjectRoot,
  groups: DevicePortGroupForm[],
): DevicePortGroupForm[] {
  const nextByPrefix = new Map(project.numberingLedgers.map((ledger) => [ledger.prefix, ledger.nextSuggested]));

  return groups.map((group) => {
    const count = Number(group.count);

    if (!group.createPlannedCables) {
      return {
        ...group,
        count,
        firstCableNumber: group.firstCableNumber ?? nextByPrefix.get(group.cablePrefix) ?? 1,
      };
    }

    const nextCableNumber = nextByPrefix.get(group.cablePrefix) ?? 1;

    if (Number.isSafeInteger(count) && count > 0) {
      nextByPrefix.set(group.cablePrefix, nextCableNumber + count);
    }

    return {
      ...group,
      count,
      firstCableNumber: nextCableNumber,
    };
  });
}

function findConnectorTypeId(project: ProjectRoot, categoryId: string, name: string): string {
  return (
    getConnectorsForCategory(project.settings, categoryId).find(
      (connectorType) => connectorType.name.toLowerCase() === name.toLowerCase(),
    )?.id ??
    getDefaultConnectorForCategory(project.settings, categoryId)?.id ??
    ''
  );
}

function getDefaultPrefixForCategory(project: ProjectRoot, categoryId: string): string {
  return (
    project.settings.categories.find((category) => category.id === categoryId)?.defaultCablePrefix ??
    project.settings.cablePrefixes[0]?.prefix ??
    'V'
  );
}

function normalizeDeviceToken(value: string): string {
  const normalized = value
    .trim()
    .toUpperCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^A-Z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return normalized || 'DEVICE';
}

function formatPortGroupRange(group: DevicePortGroupForm): string {
  if (!group.firstCableNumber || !Number.isSafeInteger(group.count) || group.count <= 0) {
    return group.createPlannedCables ? 'Set count' : 'Set first cable number';
  }

  return `${formatCableNumber(group.cablePrefix, group.firstCableNumber)} -> ${formatCableNumber(
    group.cablePrefix,
    group.firstCableNumber + group.count - 1,
  )}`;
}

function formatPortGroupLastCableNumber(group: DevicePortGroupForm): string {
  if (!group.firstCableNumber || !Number.isSafeInteger(group.count) || group.count <= 0) {
    return '';
  }

  return formatCableNumber(group.cablePrefix, group.firstCableNumber + group.count - 1);
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

  if (!device.categoryId) {
    errors.push('Device category is required.');
  }

  if (!normalizeDeviceToken(device.labelPrefix || device.name)) {
    errors.push('A label prefix or device name is required for generated port labels.');
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

    if (!project.settings.connectorTypes.some((connector) => connector.id === group.connectorTypeId)) {
      errors.push(`${group.name || 'Port group'} uses an unknown connector.`);
    } else if (!isConnectorAssignedToCategory(project.settings, group.categoryId, group.connectorTypeId)) {
      errors.push(`${group.name || 'Port group'} connector must be assigned to the selected category.`);
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
