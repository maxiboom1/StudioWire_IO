import { useEffect, useState, type FormEvent } from 'react';
import type { Rack } from '../../domain/types';
import { useProject } from '../../state/ProjectContext';

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
      <form className="editor-form inspector-form" onSubmit={handleSubmit}>
        <label>
          <span>Name</span>
          <input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </label>
        <label>
          <span>Height RU</span>
          <input
            min="1"
            type="number"
            value={form.heightRu}
            onChange={(event) => setForm({ ...form, heightRu: event.target.value })}
          />
        </label>
        <label>
          <span>Numbering direction</span>
          <select
            value={form.numberingDirection}
            onChange={(event) =>
              setForm({
                ...form,
                numberingDirection: event.target.value as Rack['numberingDirection'],
              })
            }
          >
            <option value="bottom_to_top">Bottom to top</option>
            <option value="top_to_bottom">Top to bottom</option>
          </select>
        </label>
        <button type="submit">Save Rack</button>
      </form>

      <section className="inspector-section">
        <h3>Assigned Devices</h3>
        {devices.length === 0 ? (
          <p>No devices assigned to this rack.</p>
        ) : (
          <ul className="compact-list">
            {devices.map((device) => (
              <li key={device.id}>{device.name}</li>
            ))}
          </ul>
        )}
      </section>
      <section className="inspector-section danger-zone">
        <h3>Danger Zone</h3>
        <p>Deleting a rack is allowed only when no devices are assigned to it.</p>
        <button className="danger-button" type="button" onClick={handleDelete}>
          Delete Rack
        </button>
      </section>
    </aside>
  );
}
