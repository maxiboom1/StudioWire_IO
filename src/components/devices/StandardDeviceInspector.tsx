import { useCallback, useEffect, useMemo, useState } from 'react';
import { DEFAULT_IO_PORT_LABEL_PATTERN } from '../../domain/portLabels';
import { buildDeleteDeviceConfirmation, buildRackUnassignConfirmation } from '../../domain/prompts';
import type { Device } from '../../domain/types';
import { useProject } from '../../state/ProjectContext';
import { useConfirmation } from '../common/ConfirmationDialog';
import { InspectorAccordion, InspectorShell, InspectorSubCollapsible } from '../common/InspectorShell';
import type { InspectorDirtyGuard } from '../common/inspectorDirtyGuard';
import { getPortGroupColor } from '../common/connectorVisuals';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import {
  createDeviceInspectorForm,
  createInspectorEditInput,
  getDeviceInspectorError,
} from './deviceInspectorForm';

export function StandardDeviceInspector({
  device,
  onDirtyGuardChange,
}: {
  device: Device;
  onDirtyGuardChange?: (guard: InspectorDirtyGuard | null) => void;
}) {
  const { project, editDevice, deleteDevice, unassignDeviceFromRack } = useProject();
  const confirm = useConfirmation();
  const portGroups = useMemo(
    () => project.portGroups.filter((group) => group.deviceId === device.id),
    [device.id, project.portGroups],
  );
  const baseline = useMemo(() => createDeviceInspectorForm(device, portGroups), [device, portGroups]);
  const [form, setForm] = useState(baseline);
  const [activeSection, setActiveSection] = useState<string | null>('edit');
  const [openIoGroups, setOpenIoGroups] = useState<Set<string>>(new Set());
  const assignedRack = device.rackId
    ? project.racks.find((candidate) => candidate.id === device.rackId)
    : null;
  const placementLocation = assignedRack
    ? project.locations.find((candidate) => candidate.id === assignedRack.locationId)
    : project.locations.find((candidate) => candidate.id === device.locationId);
  const canEditLocation = device.mountType !== 'rack';
  const effectiveLocationId = canEditLocation
    ? form.locationId
    : (placementLocation?.id ?? device.locationId);
  const category = project.settings.categories.find((candidate) => candidate.id === device.categoryId);
  const error = getDeviceInspectorError(project, device, form);
  const isDirty = JSON.stringify(form) !== JSON.stringify(baseline);

  useEffect(() => {
    setForm(baseline);
    setActiveSection('edit');
    setOpenIoGroups(new Set());
  }, [baseline, device.id]);

  const discard = useCallback(() => setForm(baseline), [baseline]);
  const save = useCallback(() => {
    if (getDeviceInspectorError(project, device, form)) {
      return false;
    }

    editDevice(createInspectorEditInput(project, device, form, portGroups, effectiveLocationId));
    return true;
  }, [device, editDevice, effectiveLocationId, form, portGroups, project]);

  useEffect(() => {
    onDirtyGuardChange?.({ isDirty, save, discard });
    return () => onDirtyGuardChange?.(null);
  }, [discard, isDirty, onDirtyGuardChange, save]);

  function updateIoGroup(id: string, updates: Partial<(typeof form.ioGroups)[number]>) {
    setForm((current) => ({
      ...current,
      ioGroups: current.ioGroups.map((group) => (group.id === id ? { ...group, ...updates } : group)),
    }));
  }

  function toggleIoGroup(id: string) {
    setOpenIoGroups((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleDelete() {
    if (await confirm(buildDeleteDeviceConfirmation(device))) {
      deleteDevice(device.id);
    }
  }

  async function handleUnassign() {
    if (await confirm(buildRackUnassignConfirmation(device, assignedRack))) {
      unassignDeviceFromRack(device.id);
    }
  }

  const editContent = (
    <div className="editor-form inspector-form">
      <Field label="Device Name" id="inspector-device-name">
        <Input
          id="inspector-device-name"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
        />
      </Field>
      <Field label="Device sub-name" id="inspector-device-code">
        <Input
          id="inspector-device-code"
          value={form.code}
          onChange={(event) => setForm({ ...form, code: event.target.value })}
        />
      </Field>
      <Field label="Device model" id="inspector-device-model">
        <Input
          id="inspector-device-model"
          value={form.model}
          onChange={(event) => setForm({ ...form, model: event.target.value })}
        />
      </Field>
      {canEditLocation ? (
        <Field label="Location" id="inspector-device-location">
          <Select value={form.locationId} onValueChange={(value) => setForm({ ...form, locationId: value })}>
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
        </Field>
      ) : null}
      <Field label="Mount height (RU)" id="inspector-device-rack-size">
        <Input
          id="inspector-device-rack-size"
          min="1"
          type="number"
          value={form.rackSizeRu}
          onChange={(event) => setForm({ ...form, rackSizeRu: event.target.value })}
        />
      </Field>
      <Field label="Notes" id="inspector-device-notes">
        <Textarea
          id="inspector-device-notes"
          value={form.notes}
          onChange={(event) => setForm({ ...form, notes: event.target.value })}
        />
      </Field>
      {error ? <p className="inspector-form-error">{error}</p> : null}
    </div>
  );
  const detailsContent = (
    <>
      <dl>
        <Detail label="Category" value={category?.name ?? 'Unknown category'} />
        <Detail label="Status" value={<Badge>{device.status}</Badge>} />
        <Detail label="Location" value={placementLocation?.name ?? 'Not assigned'} />
        <Detail label="Rack" value={assignedRack?.name ?? 'Not assigned'} />
        <Detail label="Mount" value={device.mountType} />
        <Detail
          label="Ports"
          value={`${portGroups.length} group(s), ${project.ports.filter((port) => port.deviceId === device.id).length} port(s)`}
        />
      </dl>
      {device.mountType === 'rack' ? (
        <Button variant="outline" type="button" onClick={() => void handleUnassign()}>
          Unassign From Rack
        </Button>
      ) : null}
    </>
  );
  const ioContent = (
    <div className="inspector-sub-list">
      {form.ioGroups.map((group) => {
        const sourceGroup = portGroups.find((candidate) => candidate.id === group.id);
        const inheritedColor = sourceGroup ? getPortGroupColor(project, sourceGroup) : '#64748B';

        return (
          <InspectorSubCollapsible
            isOpen={openIoGroups.has(group.id)}
            key={group.id}
            title={group.name || 'I/O Interface'}
            onToggle={() => toggleIoGroup(group.id)}
          >
            <Field label="I/O Name" id={`inspector-io-name-${group.id}`}>
              <Input
                id={`inspector-io-name-${group.id}`}
                value={group.name}
                onChange={(event) => updateIoGroup(group.id, { name: event.target.value })}
              />
            </Field>
            <Field label="Label pattern" id={`inspector-io-pattern-${group.id}`}>
              <Input
                id={`inspector-io-pattern-${group.id}`}
                placeholder={DEFAULT_IO_PORT_LABEL_PATTERN}
                value={group.portLabelPattern}
                onChange={(event) =>
                  updateIoGroup(group.id, {
                    portLabelPattern: event.target.value,
                  })
                }
              />
            </Field>
            <div className="device-inspector-color-row">
              <Field label="Color" id={`inspector-io-color-${group.id}`}>
                <input
                  id={`inspector-io-color-${group.id}`}
                  type="color"
                  value={group.colorOverride ?? inheritedColor}
                  onChange={(event) => updateIoGroup(group.id, { colorOverride: event.target.value })}
                />
              </Field>
              <Button
                disabled={!group.colorOverride}
                type="button"
                variant="outline"
                onClick={() => updateIoGroup(group.id, { colorOverride: null })}
              >
                Clear
              </Button>
            </div>
          </InspectorSubCollapsible>
        );
      })}
    </div>
  );

  return (
    <InspectorShell
      title="Device Inspector"
      actions={
        <>
          <Button disabled={!isDirty || Boolean(error)} type="button" onClick={save}>
            Save Device
          </Button>
          <Button variant="destructive" type="button" onClick={() => void handleDelete()}>
            Delete Device
          </Button>
        </>
      }
    >
      <InspectorAccordion
        activeSectionId={activeSection}
        onActiveSectionChange={setActiveSection}
        sections={[
          { id: 'edit', title: 'Edit Device', content: editContent },
          { id: 'details', title: 'Device Details', content: detailsContent },
          { id: 'io', title: 'I/O', content: ioContent },
        ]}
      />
    </InspectorShell>
  );
}

function Field({ children, id, label }: { children: React.ReactNode; id: string; label: string }) {
  return (
    <div className="form-field">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
