import { useState, type FormEvent } from 'react';
import { DEFAULT_RACK_DEFAULTS } from '../../domain/defaults';
import type { Rack } from '../../domain/types';
import { useProject } from '../../state/ProjectContext';
import { ModalFrame } from '../common/ModalFrame';
import { Button } from '../ui/button';
import { DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

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
    heightRu: String(DEFAULT_RACK_DEFAULTS.heightRu),
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
    <ModalFrame title="Add Rack" description="Create a rack inside the selected location." onClose={onClose}>
      <form className="editor-form" onSubmit={handleSubmit}>
        <div className="form-field">
          <Label htmlFor="rack-name">Name</Label>
          <Input
            autoFocus
            id="rack-name"
            required
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </div>
        <div className="form-field">
          <Label htmlFor="rack-height">Height RU</Label>
          <Input
            id="rack-height"
            min="1"
            required
            type="number"
            value={form.heightRu}
            onChange={(event) => setForm({ ...form, heightRu: event.target.value })}
          />
        </div>
        <div className="form-field">
          <Label htmlFor="rack-numbering-direction">Numbering direction</Label>
          <Select
            value={form.numberingDirection}
            onValueChange={(value) =>
              setForm({
                ...form,
                numberingDirection: value as Rack['numberingDirection'],
              })
            }
          >
            <SelectTrigger id="rack-numbering-direction">
              <SelectValue placeholder="Select direction" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bottom_to_top">Bottom to top</SelectItem>
              <SelectItem value="top_to_bottom">Top to bottom</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Add Rack</Button>
        </DialogFooter>
      </form>
    </ModalFrame>
  );
}
