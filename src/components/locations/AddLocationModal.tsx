import { useState, type FormEvent } from 'react';
import { useProject } from '../../state/ProjectContext';
import { ModalFrame } from '../common/ModalFrame';
import { Button } from '../ui/button';
import { DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
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
      <form className="editor-form" onSubmit={handleSubmit}>
        <div className="form-field">
          <Label htmlFor="location-name">Name</Label>
          <Input
            autoFocus
            id="location-name"
            required
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </div>
        <div className="form-field">
          <Label htmlFor="location-type">Type</Label>
          <Input
            id="location-type"
            value={form.type}
            onChange={(event) => setForm({ ...form, type: event.target.value })}
          />
        </div>
        <div className="form-field">
          <Label htmlFor="location-description">Description</Label>
          <Textarea
            id="location-description"
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Add Location</Button>
        </DialogFooter>
      </form>
    </ModalFrame>
  );
}
