import { useEffect, useState, type FormEvent } from 'react';
import type { Rack } from '../../domain/types';
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

export function RackInspector({ rack }: { rack: Rack }) {
  const { project, updateRack, deleteRack } = useProject();
  const devices = project.devices.filter((device) => device.rackId === rack.id);
  const [form, setForm] = useState({
    name: rack.name,
    heightRu: String(rack.heightRu),
    numberingDirection: rack.numberingDirection,
  });

  useEffect(() => {
    setForm({
      name: rack.name,
      heightRu: String(rack.heightRu),
      numberingDirection: rack.numberingDirection,
    });
  }, [rack.heightRu, rack.name, rack.numberingDirection]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateRack(rack.id, {
      name: form.name,
      heightRu: Number(form.heightRu),
      numberingDirection: form.numberingDirection,
    });
  }

  function handleDelete() {
    const confirmed = window.confirm(
      `Delete rack "${rack.name}"?\n\nRacks with assigned devices will be blocked.`,
    );

    if (confirmed) {
      deleteRack(rack.id);
    }
  }

  return (
    <aside className="inspector" aria-label="Right inspector">
      <h2>Rack Inspector</h2>
      <Card className="inspector-card">
        <CardHeader>
          <CardTitle>Edit Rack</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="editor-form inspector-form" onSubmit={handleSubmit}>
            <div className="form-field">
              <Label htmlFor="inspector-rack-name">Name</Label>
              <Input
                id="inspector-rack-name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </div>
            <div className="form-field">
              <Label htmlFor="inspector-rack-height">Height RU</Label>
              <Input
                id="inspector-rack-height"
                min="1"
                type="number"
                value={form.heightRu}
                onChange={(event) => setForm({ ...form, heightRu: event.target.value })}
              />
            </div>
            <div className="form-field">
              <Label htmlFor="inspector-rack-direction">Numbering direction</Label>
              <Select
                value={form.numberingDirection}
                onValueChange={(value) =>
                  setForm({
                    ...form,
                    numberingDirection: value as Rack['numberingDirection'],
                  })
                }
              >
                <SelectTrigger id="inspector-rack-direction">
                  <SelectValue placeholder="Select direction" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bottom_to_top">Bottom to top</SelectItem>
                  <SelectItem value="top_to_bottom">Top to bottom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit">Save Rack</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="inspector-card">
        <CardHeader>
          <CardTitle>Assigned Devices</CardTitle>
        </CardHeader>
        <CardContent>
        {devices.length === 0 ? (
          <p>No devices assigned to this rack.</p>
        ) : (
          <ul className="compact-list">
            {devices.map((device) => (
              <li key={device.id}>{device.name}</li>
            ))}
          </ul>
        )}
        </CardContent>
      </Card>
      <Card className="inspector-card danger-zone">
        <CardHeader>
          <CardTitle>Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
        <p>Deleting a rack is allowed only when no devices are assigned to it.</p>
        <Button className="danger-button" variant="outline" type="button" onClick={handleDelete}>
          Delete Rack
        </Button>
        </CardContent>
      </Card>
    </aside>
  );
}
