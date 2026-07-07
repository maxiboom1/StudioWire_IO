import { useState, type FormEvent } from 'react';
import { useProject } from '../../state/ProjectContext';
import { FieldLabel } from '../common/FieldLabel';
import { ModalFrame } from '../common/ModalFrame';
import { StandardModalFooter } from '../common/StandardModalFooter';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';

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
    <ModalFrame
      title="Add Location"
      description="Create a project location for racks and devices."
      onClose={onClose}
    >
      <form className="editor-form standard-modal-form add-location-form" onSubmit={handleSubmit}>
        <div className="standard-modal-content add-location-modal-content">
          <div className="form-grid two">
            <div className="form-field">
              <FieldLabel htmlFor="location-name">Name</FieldLabel>
              <Input
                autoFocus
                id="location-name"
                required
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </div>
            <div className="form-field">
              <FieldLabel htmlFor="location-type">Type</FieldLabel>
              <Input
                id="location-type"
                value={form.type}
                onChange={(event) => setForm({ ...form, type: event.target.value })}
              />
            </div>
          </div>
          <div className="form-field">
            <FieldLabel htmlFor="location-description">Description</FieldLabel>
            <Textarea
              id="location-description"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </div>
        </div>
        <StandardModalFooter>
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Add Location</Button>
        </StandardModalFooter>
      </form>
    </ModalFrame>
  );
}
