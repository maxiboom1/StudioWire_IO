import { useState, type FormEvent } from 'react';
import type { Rack } from '../../domain/types';
import { useProject } from '../../state/ProjectContext';
import { ModalFrame } from '../common/ModalFrame';

export function AddRackModal({
  locationId,
  onClose,
  onCreated,
}: {
  locationId: string;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { addRack } = useProject();
  const [form, setForm] = useState({
    name: '',
    heightRu: '42',
    numberingDirection: 'bottom_to_top' as Rack['numberingDirection'],
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim()) {
      return;
    }

    const id = addRack({
      locationId,
      name: form.name.trim(),
      heightRu: Number(form.heightRu),
      numberingDirection: form.numberingDirection,
    });
    onCreated(id);
  }

  return (
    <ModalFrame title="Add Rack" onClose={onClose}>
      <form className="editor-form" onSubmit={handleSubmit}>
        <label>
          <span>Name</span>
          <input
            autoFocus
            required
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </label>
        <label>
          <span>Height RU</span>
          <input
            min="1"
            required
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
        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit">Add Rack</button>
        </div>
      </form>
    </ModalFrame>
  );
}
