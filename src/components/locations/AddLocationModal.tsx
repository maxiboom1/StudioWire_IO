import { useState, type FormEvent } from 'react';
import { useProject } from '../../state/ProjectContext';
import { findLocationNameConflict } from '../../domain/projectItemNames';
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
  const { project, addLocation } = useProject();
  const [form, setForm] = useState({ name: '', description: '' });
  const nameConflict = findLocationNameConflict(project, form.name);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim() || nameConflict) {
      return;
    }

    const id = addLocation({
      name: form.name.trim(),
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
            <FieldLabel htmlFor="location-description">Description</FieldLabel>
            <Textarea
              id="location-description"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </div>
          {nameConflict ? (
            <p className="inspector-form-error">Location name "{nameConflict.name}" is already used.</p>
          ) : null}
        </div>
        <StandardModalFooter>
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!form.name.trim() || Boolean(nameConflict)} type="submit">
            Add Location
          </Button>
        </StandardModalFooter>
      </form>
    </ModalFrame>
  );
}
