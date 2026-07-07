import { useEffect, useState, type FormEvent } from 'react';
import { buildDeleteLocationConfirmation } from '../../domain/prompts';
import type { Location } from '../../domain/types';
import { useProject } from '../../state/ProjectContext';
import { useConfirmation } from '../common/ConfirmationDialog';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';

export function LocationInspector({ location }: { location: Location }) {
  const { project, updateLocation, deleteLocation } = useProject();
  const confirm = useConfirmation();
  const rackCount = project.racks.filter((rack) => rack.locationId === location.id).length;
  const deviceCount = project.devices.filter((device) => device.locationId === location.id).length;
  const subLocationCount = project.subLocations.filter(
    (subLocation) => subLocation.locationId === location.id,
  ).length;
  const [form, setForm] = useState({
    name: location.name,
    type: location.type,
    description: location.description,
  });

  useEffect(() => {
    setForm({
      name: location.name,
      type: location.type,
      description: location.description,
    });
  }, [location.description, location.name, location.type]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateLocation(location.id, form);
  }

  async function handleDelete() {
    const confirmed = await confirm(buildDeleteLocationConfirmation(location));

    if (confirmed) {
      deleteLocation(location.id);
    }
  }

  return (
    <aside className="inspector" aria-label="Right inspector">
      <h2>Location Inspector</h2>
      <Card className="inspector-card">
        <CardHeader>
          <CardTitle>Edit Location</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="editor-form inspector-form" onSubmit={handleSubmit}>
            <div className="form-field">
              <Label htmlFor="inspector-location-name">Name</Label>
              <Input
                id="inspector-location-name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </div>
            <div className="form-field">
              <Label htmlFor="inspector-location-type">Type</Label>
              <Input
                id="inspector-location-type"
                value={form.type}
                onChange={(event) => setForm({ ...form, type: event.target.value })}
              />
            </div>
            <div className="form-field">
              <Label htmlFor="inspector-location-description">Description</Label>
              <Textarea
                id="inspector-location-description"
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </div>
            <Button type="submit">Save Location</Button>
          </form>
        </CardContent>
      </Card>
      <Card className="inspector-card danger-zone">
        <CardHeader>
          <CardTitle>Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            This location references {subLocationCount} folder(s), {rackCount} rack(s), and {deviceCount}{' '}
            device(s). Deletion is allowed only when all counts are zero.
          </p>
          <Button variant="destructive" type="button" onClick={handleDelete}>
            Delete Location
          </Button>
        </CardContent>
      </Card>
    </aside>
  );
}
