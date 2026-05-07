import { useEffect, useState, type FormEvent } from 'react';
import type { Location } from '../../domain/types';
import { useProject } from '../../state/ProjectContext';

export function LocationInspector({ location }: { location: Location }) {
  const { project, updateLocation, deleteLocation } = useProject();
  const rackCount = project.racks.filter((rack) => rack.locationId === location.id).length;
  const deviceCount = project.devices.filter((device) => device.locationId === location.id).length;
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

  function handleDelete() {
    const confirmed = window.confirm(
      `Delete location "${location.name}"?\n\nLocations with racks or devices will be blocked.`,
    );

    if (confirmed) {
      deleteLocation(location.id);
    }
  }

  return (
    <aside className="inspector" aria-label="Right inspector">
      <h2>Location Inspector</h2>
      <form className="editor-form inspector-form" onSubmit={handleSubmit}>
        <label>
          <span>Name</span>
          <input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </label>
        <label>
          <span>Type</span>
          <input
            value={form.type}
            onChange={(event) => setForm({ ...form, type: event.target.value })}
          />
        </label>
        <label>
          <span>Description</span>
          <textarea
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
        </label>
        <button type="submit">Save Location</button>
      </form>
      <section className="inspector-section danger-zone">
        <h3>Danger Zone</h3>
        <p>
          This location references {rackCount} rack(s) and {deviceCount} device(s). Deletion is allowed
          only when both counts are zero.
        </p>
        <button className="danger-button" type="button" onClick={handleDelete}>
          Delete Location
        </button>
      </section>
    </aside>
  );
}
