import { useState, type FormEvent } from 'react';
import { useProject } from '../../state/ProjectContext';
import { ModalFrame } from '../common/ModalFrame';

export function AddLocationModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { addLocation } = useProject();
  const [form, setForm] = useState({ name: '', type: '', description: '' });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim()) {
      return;
    }

    const id = addLocation({
      name: form.name.trim(),
      type: form.type.trim(),
      description: form.description.trim(),
    });
    onCreated(id);
  }

  return (
    <ModalFrame title="Add Location" onClose={onClose}>
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
        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit">Add Location</button>
        </div>
      </form>
    </ModalFrame>
  );
}
