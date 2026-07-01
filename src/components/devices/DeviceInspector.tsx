import { useEffect, useState, type FormEvent } from 'react';
import type { Device } from '../../domain/types';
import { useProject } from '../../state/ProjectContext';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';

export function DeviceInspector({ device }: { device: Device }) {
  const { project, updateDevice, deleteDevice } = useProject();
  const isTerminalBlock = device.kind === 'terminal_block';
  const category = project.settings.categories.find((candidate) => candidate.id === device.categoryId);
  const assignedRack = device.rackId
    ? project.racks.find((candidate) => candidate.id === device.rackId)
    : null;
  const placementLocation = assignedRack
    ? project.locations.find((candidate) => candidate.id === assignedRack.locationId)
    : project.locations.find((candidate) => candidate.id === device.locationId);
  const canEditLocation = device.mountType !== 'rack';
  const topRu = device.rackBottomRu && device.rackSizeRu ? device.rackBottomRu + device.rackSizeRu - 1 : null;
  const portGroups = project.portGroups.filter((group) => group.deviceId === device.id);
  const portCount = project.ports.filter((port) => port.deviceId === device.id).length;
  const [form, setForm] = useState({
    name: device.name,
    manufacturer: device.manufacturer ?? '',
    model: device.model ?? '',
    role: device.role ?? '',
    notes: device.notes,
    locationId: device.locationId,
    rackSizeRu: device.rackSizeRu ? String(device.rackSizeRu) : '',
  });

  useEffect(() => {
    setForm({
      name: device.name,
      manufacturer: device.manufacturer ?? '',
      model: device.model ?? '',
      role: device.role ?? '',
      notes: device.notes,
      locationId: device.locationId,
      rackSizeRu: device.rackSizeRu ? String(device.rackSizeRu) : '',
    });
  }, [device]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateDevice(device.id, {
      name: form.name,
      manufacturer: form.manufacturer,
      model: form.model,
      role: form.role,
      notes: form.notes,
      locationId: canEditLocation ? form.locationId : device.locationId,
      rackSizeRu: form.rackSizeRu ? Number(form.rackSizeRu) : null,
    });
  }

  function handleDelete() {
    const confirmed = window.confirm(
      `Delete device "${device.name}"?\n\nThis removes the device, ports, port groups, and device-owned cable numbers. Any active connections involving this device are disconnected.`,
    );

    if (confirmed) {
      deleteDevice(device.id);
    }
  }

  return (
    <aside className="inspector" aria-label="Right inspector">
      <h2>{isTerminalBlock ? 'Terminal Block Inspector' : 'Device Inspector'}</h2>
      <Card className="inspector-card">
        <CardHeader>
          <CardTitle>{isTerminalBlock ? 'Edit TB' : 'Edit Device'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="editor-form inspector-form" onSubmit={handleSubmit}>
            <div className="form-field">
              <Label htmlFor="inspector-device-name">Name</Label>
              <Input
                id="inspector-device-name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </div>
            {!isTerminalBlock ? (
              <>
                <div className="form-field">
                  <Label htmlFor="inspector-device-manufacturer">Manufacturer</Label>
                  <Input
                    id="inspector-device-manufacturer"
                    value={form.manufacturer}
                    onChange={(event) => setForm({ ...form, manufacturer: event.target.value })}
                  />
                </div>
                <div className="form-field">
                  <Label htmlFor="inspector-device-model">Model</Label>
                  <Input
                    id="inspector-device-model"
                    value={form.model}
                    onChange={(event) => setForm({ ...form, model: event.target.value })}
                  />
                </div>
                <div className="form-field">
                  <Label htmlFor="inspector-device-role">Role</Label>
                  <Input
                    id="inspector-device-role"
                    value={form.role}
                    onChange={(event) => setForm({ ...form, role: event.target.value })}
                  />
                </div>
              </>
            ) : null}
            {canEditLocation ? (
              <div className="form-field">
                <Label htmlFor="inspector-device-location">Location</Label>
                <Select
                  value={form.locationId}
                  onValueChange={(value) => setForm({ ...form, locationId: value })}
                >
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
            {!isTerminalBlock ? (
              <div className="form-field">
                <Label htmlFor="inspector-device-rack-size">Mount height (RU)</Label>
                <Input
                  id="inspector-device-rack-size"
                  min="1"
                  type="number"
                  value={form.rackSizeRu}
                  onChange={(event) => setForm({ ...form, rackSizeRu: event.target.value })}
                />
                <p className="form-help">Required before dragging this device onto a rack canvas.</p>
              </div>
            ) : null}
            <div className="form-field">
              <Label htmlFor="inspector-device-notes">Notes</Label>
              <Textarea
                id="inspector-device-notes"
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
              />
            </div>
            <Button type="submit">{isTerminalBlock ? 'Save TB' : 'Save Device'}</Button>
          </form>
        </CardContent>
      </Card>
      <Card className="inspector-card">
        <CardHeader>
          <CardTitle>{isTerminalBlock ? 'TB Details' : 'Device Details'}</CardTitle>
        </CardHeader>
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
            <div>
              <dt>Label prefix</dt>
              <dd>{device.labelPrefix || 'Not set'}</dd>
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
            {!isTerminalBlock ? (
              <div>
                <dt>Mount height</dt>
                <dd>{device.rackSizeRu ? `${device.rackSizeRu} RU` : 'Not set'}</dd>
              </div>
            ) : null}
            <div>
              <dt>Port groups</dt>
              <dd>
                {portGroups.length} group(s), {portCount} port(s)
              </dd>
            </div>
          </dl>
          <p>
            {isTerminalBlock
              ? 'Terminal blocks are fixed 1RU rackmount objects. Rack and RU changes are made on the Rack Canvas.'
              : device.mountType === 'rack'
                ? 'Rack assignment and RU position are changed on the Rack Canvas.'
                : 'Set a mount height, then drag this device from the navigator onto a rack canvas when it is ready to be mounted.'}
          </p>
          <p>
            {isTerminalBlock
              ? 'Rear and front port groups are locked in this release.'
              : 'Port group cable allocation fields are locked in this release.'}
          </p>
        </CardContent>
      </Card>
      {!isTerminalBlock ? (
        <Card className="inspector-card danger-zone">
          <CardHeader>
            <CardTitle>Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Delete this device and release its device-owned cable numbers for reuse.</p>
            <Button variant="destructive" type="button" onClick={handleDelete}>
              Delete Device
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </aside>
  );
}
