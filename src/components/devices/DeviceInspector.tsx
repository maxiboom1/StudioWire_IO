import { useEffect, useState, type FormEvent } from 'react';
import type { Device } from '../../domain/types';
import { useProject } from '../../state/ProjectContext';

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
      <form className="editor-form inspector-form" onSubmit={handleSubmit}>
        <label>
          <span>Name</span>
          <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        </label>
        <label>
          <span>Code</span>
          <input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} />
        </label>
        <label>
          <span>Manufacturer</span>
          <input
            value={form.manufacturer}
            onChange={(event) => setForm({ ...form, manufacturer: event.target.value })}
          />
        </label>
        <label>
          <span>Model</span>
          <input value={form.model} onChange={(event) => setForm({ ...form, model: event.target.value })} />
        </label>
        <label>
          <span>Role</span>
          <input value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} />
        </label>
        <label>
          <span>Location</span>
          <select
            value={form.locationId}
            onChange={(event) => setForm({ ...form, locationId: event.target.value, rackId: '' })}
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
          <span>Rack assignment</span>
          <select value={form.rackId} onChange={(event) => setForm({ ...form, rackId: event.target.value })}>
            <option value="">No rack</option>
            {availableRacks.map((rack) => (
              <option key={rack.id} value={rack.id}>
                {rack.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Rack size RU</span>
          <input
            min="1"
            type="number"
            value={form.rackSizeRu}
            onChange={(event) => setForm({ ...form, rackSizeRu: event.target.value })}
          />
        </label>
        <label>
          <span>Rack bottom RU</span>
          <input
            min="1"
            type="number"
            value={form.rackBottomRu}
            onChange={(event) => setForm({ ...form, rackBottomRu: event.target.value })}
          />
        </label>
        <label>
          <span>Notes</span>
          <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
        </label>
        <button type="submit">Save Device</button>
      </form>
      <section className="inspector-section">
        <h3>Cable Ranges</h3>
        <p>Port group cable allocation fields are locked in v0.1.</p>
      </section>
      <section className="inspector-section danger-zone">
        <h3>Danger Zone</h3>
        <p>Device deletion retires allocations in v0.1 so cable numbers are never freed for reuse.</p>
        <button className="danger-button" type="button" onClick={handleRetire}>
          Retire Device
        </button>
      </section>
    </aside>
  );
}
