import { useEffect, useState, type FormEvent } from 'react';
import type { Device } from '../../domain/types';
import { useProject } from '../../state/ProjectContext';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Textarea } from '../ui/textarea';

const NONE_VALUE = '__none__';

export function DeviceInspector({ device }: { device: Device }) {
  const { project, updateDevice, retireDevice } = useProject();
  const availableRacks = project.racks.filter((rack) => rack.locationId === device.locationId);
  const [form, setForm] = useState({
    name: device.name,
    code: device.code,
    manufacturer: device.manufacturer,
    model: device.model,
    role: device.role,
    notes: device.notes,
    locationId: device.locationId ?? '',
    rackId: device.rackId ?? '',
    rackSizeRu: device.rackSizeRu ? String(device.rackSizeRu) : '',
    rackBottomRu: device.rackBottomRu ? String(device.rackBottomRu) : '',
  });

  useEffect(() => {
    setForm({
      name: device.name,
      code: device.code,
      manufacturer: device.manufacturer,
      model: device.model,
      role: device.role,
      notes: device.notes,
      locationId: device.locationId ?? '',
      rackId: device.rackId ?? '',
      rackSizeRu: device.rackSizeRu ? String(device.rackSizeRu) : '',
      rackBottomRu: device.rackBottomRu ? String(device.rackBottomRu) : '',
    });
  }, [device]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateDevice(device.id, {
      name: form.name,
      code: form.code,
      manufacturer: form.manufacturer,
      model: form.model,
      role: form.role,
      notes: form.notes,
      locationId: form.locationId || null,
      rackId: form.rackId || null,
      rackSizeRu: form.rackSizeRu ? Number(form.rackSizeRu) : null,
      rackBottomRu: form.rackBottomRu ? Number(form.rackBottomRu) : null,
    });
  }

  function handleRetire() {
    const confirmed = window.confirm(
      `Retire device "${device.name}"?\n\nThe device remains in the project. Its planned cables and cable ranges are marked retired, and cable numbers stay unavailable.`,
    );

    if (confirmed) {
      retireDevice(device.id);
    }
  }

  return (
    <aside className="inspector" aria-label="Right inspector">
      <h2>Device Inspector</h2>
      <Card className="inspector-card">
        <CardHeader>
          <CardTitle>Edit Device</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="editor-form inspector-form" onSubmit={handleSubmit}>
            <div className="form-field">
              <Label htmlFor="inspector-device-name">Name</Label>
              <Input id="inspector-device-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </div>
            <div className="form-field">
              <Label htmlFor="inspector-device-code">Code</Label>
              <Input id="inspector-device-code" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} />
            </div>
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
              <Input id="inspector-device-model" value={form.model} onChange={(event) => setForm({ ...form, model: event.target.value })} />
            </div>
            <div className="form-field">
              <Label htmlFor="inspector-device-role">Role</Label>
              <Input id="inspector-device-role" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} />
            </div>
            <div className="form-field">
              <Label htmlFor="inspector-device-location">Location</Label>
              <Select
                value={form.locationId || NONE_VALUE}
                onValueChange={(value) =>
                  setForm({ ...form, locationId: value === NONE_VALUE ? '' : value, rackId: '' })
                }
              >
                <SelectTrigger id="inspector-device-location">
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
              <Label htmlFor="inspector-device-rack">Rack assignment</Label>
              <Select
                value={form.rackId || NONE_VALUE}
                onValueChange={(value) => setForm({ ...form, rackId: value === NONE_VALUE ? '' : value })}
              >
                <SelectTrigger id="inspector-device-rack">
                  <SelectValue placeholder="Select rack" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>No rack</SelectItem>
                  {availableRacks.map((rack) => (
                    <SelectItem key={rack.id} value={rack.id}>
                      {rack.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="form-field">
              <Label htmlFor="inspector-device-rack-size">Rack size RU</Label>
              <Input
                id="inspector-device-rack-size"
                min="1"
                type="number"
                value={form.rackSizeRu}
                onChange={(event) => setForm({ ...form, rackSizeRu: event.target.value })}
              />
            </div>
            <div className="form-field">
              <Label htmlFor="inspector-device-rack-bottom">Rack bottom RU</Label>
              <Input
                id="inspector-device-rack-bottom"
                min="1"
                type="number"
                value={form.rackBottomRu}
                onChange={(event) => setForm({ ...form, rackBottomRu: event.target.value })}
              />
            </div>
            <div className="form-field">
              <Label htmlFor="inspector-device-notes">Notes</Label>
              <Textarea id="inspector-device-notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
            </div>
            <Button type="submit">Save Device</Button>
          </form>
        </CardContent>
      </Card>
      <Card className="inspector-card">
        <CardHeader>
          <CardTitle>Cable Ranges</CardTitle>
        </CardHeader>
        <CardContent>
        <p>Port group cable allocation fields are locked in v0.1.</p>
        </CardContent>
      </Card>
      <Card className="inspector-card danger-zone">
        <CardHeader>
          <CardTitle>Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
        <p>Device deletion retires allocations in v0.1 so cable numbers are never freed for reuse.</p>
        <Button className="danger-button" variant="outline" type="button" onClick={handleRetire}>
          Retire Device
        </Button>
        </CardContent>
      </Card>
    </aside>
  );
}
