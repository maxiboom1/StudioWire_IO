import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { buildDeleteDeviceConfirmation, buildRackUnassignConfirmation } from '../../domain/prompts';
import { normalizeSubLocationForLocation } from '../../domain/subLocations';
import type { Device, PortGroup, ProjectRoot } from '../../domain/types';
import { useProject } from '../../state/ProjectContext';
import type { EditDeviceInput } from '../../state/projectTypes';
import { useConfirmation } from '../common/ConfirmationDialog';
import { getPortGroupColor } from '../common/connectorVisuals';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { normalizeDeviceToken } from './addDeviceDraft';

export interface DeviceInspectorDirtyGuard {
  isDirty: boolean;
  save: () => boolean;
  discard: () => void;
}

interface DeviceInspectorForm {
  name: string;
  code: string;
  model: string;
  notes: string;
  locationId: string;
  rackSizeRu: string;
  ioGroups: DeviceInspectorPortGroupForm[];
}

interface DeviceInspectorPortGroupForm {
  id: string;
  name: string;
  portLabelPattern: string;
  colorOverride: string | null;
}

export function DeviceInspector({
  device,
  onDirtyGuardChange,
}: {
  device: Device;
  onDirtyGuardChange?: (guard: DeviceInspectorDirtyGuard | null) => void;
}) {
  if (device.kind === 'terminal_block') {
    return <TerminalBlockInspector device={device} />;
  }

  return <StandardDeviceInspector device={device} onDirtyGuardChange={onDirtyGuardChange} />;
}

function StandardDeviceInspector({
  device,
  onDirtyGuardChange,
}: {
  device: Device;
  onDirtyGuardChange?: (guard: DeviceInspectorDirtyGuard | null) => void;
}) {
  const { project, editDevice, deleteDevice, unassignDeviceFromRack } = useProject();
  const confirm = useConfirmation();
  const portGroups = useMemo(
    () => project.portGroups.filter((group) => group.deviceId === device.id),
    [device.id, project.portGroups],
  );
  const assignedRack = device.rackId
    ? project.racks.find((candidate) => candidate.id === device.rackId)
    : null;
  const placementLocation = assignedRack
    ? project.locations.find((candidate) => candidate.id === assignedRack.locationId)
    : project.locations.find((candidate) => candidate.id === device.locationId);
  const category = project.settings.categories.find((candidate) => candidate.id === device.categoryId);
  const topRu = device.rackBottomRu && device.rackSizeRu ? device.rackBottomRu + device.rackSizeRu - 1 : null;
  const portCount = project.ports.filter((port) => port.deviceId === device.id).length;
  const baseline = useMemo(
    () => createDeviceInspectorForm(device, portGroups),
    [device, portGroups],
  );
  const [form, setForm] = useState<DeviceInspectorForm>(baseline);
  const [openSections, setOpenSections] = useState({
    edit: true,
    details: false,
    io: false,
  });
  const isDirty = !areDeviceInspectorFormsEqual(form, baseline);
  const canEditLocation = device.mountType !== 'rack';
  const effectiveLocationId = canEditLocation
    ? form.locationId
    : (placementLocation?.id ?? device.locationId);
  const canSave = Boolean(form.name.trim());

  useEffect(() => {
    setForm(createDeviceInspectorForm(device, portGroups));
    setOpenSections({ edit: true, details: false, io: false });
  }, [device.id, portGroups]);

  const discardChanges = useCallback(() => {
    setForm(baseline);
  }, [baseline]);

  const saveChanges = useCallback(() => {
    if (!form.name.trim()) {
      return false;
    }

    editDevice(createInspectorEditInput(project, device, form, portGroups, effectiveLocationId));
    return true;
  }, [device, editDevice, effectiveLocationId, form, portGroups, project]);

  useEffect(() => {
    onDirtyGuardChange?.({ isDirty, save: saveChanges, discard: discardChanges });

    return () => onDirtyGuardChange?.(null);
  }, [discardChanges, isDirty, onDirtyGuardChange, saveChanges]);

  function updateForm(updates: Partial<DeviceInspectorForm>) {
    setForm((current) => ({ ...current, ...updates }));
  }

  function updateIoGroup(groupId: string, updates: Partial<DeviceInspectorPortGroupForm>) {
    setForm((current) => ({
      ...current,
      ioGroups: current.ioGroups.map((group) =>
        group.id === groupId ? { ...group, ...updates } : group,
      ),
    }));
  }

  function toggleSection(section: keyof typeof openSections) {
    setOpenSections((current) => ({ ...current, [section]: !current[section] }));
  }

  async function handleDelete() {
    const confirmed = await confirm(buildDeleteDeviceConfirmation(device));

    if (confirmed) {
      deleteDevice(device.id);
    }
  }

  async function handleUnassignFromRack() {
    const confirmed = await confirm(buildRackUnassignConfirmation(device, assignedRack));

    if (confirmed) {
      unassignDeviceFromRack(device.id);
    }
  }

  return (
    <aside className="inspector device-inspector" aria-label="Right inspector">
      <h2>Device Inspector</h2>
      <div className="device-inspector-sections">
        <InspectorSection
          isOpen={openSections.edit}
          title="Edit Device"
          onToggle={() => toggleSection('edit')}
        >
          <div className="editor-form inspector-form">
            <div className="form-field">
              <Label htmlFor="inspector-device-name">Device Name</Label>
              <Input
                id="inspector-device-name"
                value={form.name}
                onChange={(event) => updateForm({ name: event.target.value })}
              />
            </div>
            <div className="form-field">
              <Label htmlFor="inspector-device-code">Device sub-name</Label>
              <Input
                id="inspector-device-code"
                value={form.code}
                onChange={(event) => updateForm({ code: event.target.value })}
              />
            </div>
            <div className="form-field">
              <Label htmlFor="inspector-device-model">Device model</Label>
              <Input
                id="inspector-device-model"
                value={form.model}
                onChange={(event) => updateForm({ model: event.target.value })}
              />
            </div>
            {canEditLocation ? (
              <div className="form-field">
                <Label htmlFor="inspector-device-location">Location</Label>
                <Select value={form.locationId} onValueChange={(value) => updateForm({ locationId: value })}>
                  <SelectTrigger id="inspector-device-location">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {project.locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="form-field">
              <Label htmlFor="inspector-device-rack-size">Mount height (RU)</Label>
              <Input
                id="inspector-device-rack-size"
                min="1"
                type="number"
                value={form.rackSizeRu}
                onChange={(event) => updateForm({ rackSizeRu: event.target.value })}
              />
              <p className="form-help">Required before dragging this device onto a rack canvas.</p>
            </div>
            <div className="form-field">
              <Label htmlFor="inspector-device-notes">Notes</Label>
              <Textarea
                id="inspector-device-notes"
                value={form.notes}
                onChange={(event) => updateForm({ notes: event.target.value })}
              />
            </div>
          </div>
        </InspectorSection>

        <InspectorSection
          isOpen={openSections.details}
          title="Device Details"
          onToggle={() => toggleSection('details')}
        >
          <dl>
            <div>
              <dt>Category</dt>
              <dd>{category?.name ?? 'Unknown category'}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <Badge>{device.status}</Badge>
              </dd>
            </div>
            <div>
              <dt>Device sub-name</dt>
              <dd>{device.code || 'Not set'}</dd>
            </div>
            <div>
              <dt>Mount</dt>
              <dd>{device.mountType}</dd>
            </div>
            <div>
              <dt>Location</dt>
              <dd>{placementLocation?.name ?? 'Not assigned'}</dd>
            </div>
            <div>
              <dt>Rack</dt>
              <dd>{assignedRack?.name ?? 'Not assigned'}</dd>
            </div>
            <div>
              <dt>Rack position</dt>
              <dd>{device.rackBottomRu && topRu ? `RU ${device.rackBottomRu}-${topRu}` : 'Not placed'}</dd>
            </div>
            <div>
              <dt>Mount height</dt>
              <dd>{device.rackSizeRu ? `${device.rackSizeRu} RU` : 'Not set'}</dd>
            </div>
            <div>
              <dt>Port groups</dt>
              <dd>
                {portGroups.length} group(s), {portCount} port(s)
              </dd>
            </div>
          </dl>
          {device.mountType === 'rack' ? (
            <Button variant="outline" type="button" onClick={handleUnassignFromRack}>
              Unassign From Rack
            </Button>
          ) : null}
        </InspectorSection>

        <InspectorSection isOpen={openSections.io} title="I/O" onToggle={() => toggleSection('io')}>
          <div className="device-inspector-io-list">
            {form.ioGroups.map((group) => {
              const sourceGroup = portGroups.find((candidate) => candidate.id === group.id);
              const inheritedColor = sourceGroup ? getPortGroupColor(project, sourceGroup) : '#64748B';
              const colorValue = group.colorOverride ?? inheritedColor;

              return (
                <div className="device-inspector-io-group" key={group.id}>
                  <div className="form-field">
                    <Label htmlFor={`inspector-io-name-${group.id}`}>Name</Label>
                    <Input
                      id={`inspector-io-name-${group.id}`}
                      value={group.name}
                      onChange={(event) => updateIoGroup(group.id, { name: event.target.value })}
                    />
                  </div>
                  <div className="form-field">
                    <Label htmlFor={`inspector-io-pattern-${group.id}`}>Label pattern</Label>
                    <Input
                      id={`inspector-io-pattern-${group.id}`}
                      value={group.portLabelPattern}
                      onChange={(event) =>
                        updateIoGroup(group.id, { portLabelPattern: event.target.value })
                      }
                    />
                  </div>
                  <div className="device-inspector-color-row">
                    <div className="form-field">
                      <Label htmlFor={`inspector-io-color-${group.id}`}>Color</Label>
                      <input
                        id={`inspector-io-color-${group.id}`}
                        type="color"
                        value={colorValue}
                        onChange={(event) => updateIoGroup(group.id, { colorOverride: event.target.value })}
                      />
                    </div>
                    <Button
                      disabled={!group.colorOverride}
                      type="button"
                      variant="outline"
                      onClick={() => updateIoGroup(group.id, { colorOverride: null })}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </InspectorSection>
      </div>

      <div className="device-inspector-actions">
        <Button disabled={!canSave || !isDirty} type="button" onClick={saveChanges}>
          Save Device
        </Button>
        <Button variant="destructive" type="button" onClick={handleDelete}>
          Delete Device
        </Button>
      </div>
    </aside>
  );
}

function InspectorSection({
  children,
  isOpen,
  onToggle,
  title,
}: {
  children: ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  title: string;
}) {
  return (
    <Card className="inspector-card inspector-section-card">
      <button
        aria-expanded={isOpen}
        className="inspector-section-trigger"
        type="button"
        onClick={onToggle}
      >
        <span>{title}</span>
        <ChevronDown className={`h-4 w-4 inspector-section-chevron${isOpen ? ' open' : ''}`} />
      </button>
      {isOpen ? <CardContent>{children}</CardContent> : null}
    </Card>
  );
}

function createDeviceInspectorForm(device: Device, portGroups: PortGroup[]): DeviceInspectorForm {
  return {
    name: device.name,
    code: device.code ?? '',
    model: device.model ?? '',
    notes: device.notes,
    locationId: device.locationId,
    rackSizeRu: device.rackSizeRu ? String(device.rackSizeRu) : '',
    ioGroups: portGroups.map((group) => ({
      id: group.id,
      name: group.name,
      portLabelPattern: group.portLabelPattern,
      colorOverride: group.colorOverride,
    })),
  };
}

function areDeviceInspectorFormsEqual(left: DeviceInspectorForm, right: DeviceInspectorForm): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function createInspectorEditInput(
  project: ProjectRoot,
  device: Device,
  form: DeviceInspectorForm,
  portGroups: PortGroup[],
  effectiveLocationId: string,
): EditDeviceInput {
  const normalizedCode = normalizeDeviceToken(form.code || form.name);
  const locationId = device.mountType === 'rack' ? device.locationId : form.locationId;

  return {
    deviceId: device.id,
    deviceUpdates: {
      name: form.name.trim(),
      code: normalizedCode,
      manufacturer: device.manufacturer ?? '',
      model: form.model,
      categoryId: device.categoryId,
      locationId,
      subLocationId: normalizeSubLocationForLocation(project, device.subLocationId, effectiveLocationId),
      role: '',
      labelPrefix: normalizeDeviceToken(normalizedCode || form.name),
      notes: form.notes,
      rackSizeRu: form.rackSizeRu ? Number(form.rackSizeRu) : null,
    },
    existingPortGroups: portGroups.map((group) => {
      const edit = form.ioGroups.find((candidate) => candidate.id === group.id);

      return {
        id: group.id,
        name: edit?.name ?? group.name,
        portLabelPattern: edit?.portLabelPattern ?? group.portLabelPattern,
        colorOverride: edit?.colorOverride ?? null,
      };
    }),
    newPortGroups: [],
    portGroupOrder: portGroups.map((group) => ({ kind: 'existing', id: group.id })),
  };
}

function TerminalBlockInspector({ device }: { device: Device }) {
  const { project, updateDevice } = useProject();
  const [form, setForm] = useState({
    name: device.name,
    model: device.model ?? '',
    notes: device.notes,
  });
  const category = project.settings.categories.find((candidate) => candidate.id === device.categoryId);

  useEffect(() => {
    setForm({
      name: device.name,
      model: device.model ?? '',
      notes: device.notes,
    });
  }, [device]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateDevice(device.id, {
      name: form.name,
      model: form.model,
      notes: form.notes,
      locationId: device.locationId,
      rackSizeRu: device.rackSizeRu,
    });
  }

  return (
    <aside className="inspector" aria-label="Right inspector">
      <h2>Terminal Block Inspector</h2>
      <Card className="inspector-card">
        <CardContent>
          <form className="editor-form inspector-form" onSubmit={handleSubmit}>
            <div className="form-field">
              <Label htmlFor="inspector-tb-name">Name</Label>
              <Input
                id="inspector-tb-name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </div>
            <div className="form-field">
              <Label htmlFor="inspector-tb-model">Device model</Label>
              <Input
                id="inspector-tb-model"
                value={form.model}
                onChange={(event) => setForm({ ...form, model: event.target.value })}
              />
            </div>
            <div className="form-field">
              <Label htmlFor="inspector-tb-notes">Notes</Label>
              <Textarea
                id="inspector-tb-notes"
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
              />
            </div>
            <Button type="submit">Save TB</Button>
          </form>
        </CardContent>
      </Card>
      <Card className="inspector-card">
        <CardContent>
          <dl>
            <div>
              <dt>Category</dt>
              <dd>{category?.name ?? 'Unknown category'}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <Badge>{device.status}</Badge>
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </aside>
  );
}
