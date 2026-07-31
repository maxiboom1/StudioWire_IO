import { useState, type FormEvent } from 'react';
import { DEFAULT_RACK_DEFAULTS } from '../../domain/defaults';
import { findProjectItemNameConflict, formatProjectItemNameConflict } from '../../domain/projectItemNames';
import type { Rack } from '../../domain/types';
import { useProject } from '../../state/ProjectContext';
import { FieldLabel } from '../common/FieldLabel';
import { ModalFrame } from '../common/ModalFrame';
import { RACK_RU_OPTIONS } from '../common/rackRuOptions';
import { StandardModalFooter } from '../common/StandardModalFooter';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
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
  const { project, addRack } = useProject();
  const [form, setForm] = useState({
    name: '',
    heightRu: String(DEFAULT_RACK_DEFAULTS.heightRu),
    numberingDirection: 'bottom_to_top' as Rack['numberingDirection'],
  });
  const nameConflict = findProjectItemNameConflict(project, form.name);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim() || nameConflict) {
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
      <form className="editor-form standard-modal-form add-rack-form" onSubmit={handleSubmit}>
        <div className="standard-modal-content add-rack-modal-content">
          <div className="form-grid two">
            <div className="form-field">
              <FieldLabel htmlFor="rack-name">Name</FieldLabel>
              <Input
                autoFocus
                id="rack-name"
                required
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </div>
            <div className="form-field">
              <FieldLabel htmlFor="rack-height">Height RU</FieldLabel>
              <Select value={form.heightRu} onValueChange={(value) => setForm({ ...form, heightRu: value })}>
                <SelectTrigger id="rack-height">
                  <SelectValue placeholder="Select height" />
                </SelectTrigger>
                <SelectContent>
                  {RACK_RU_OPTIONS.map((height) => (
                    <SelectItem key={height} value={String(height)}>
                      {height} RU
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="form-field">
              <FieldLabel htmlFor="rack-numbering-direction">Numbering direction</FieldLabel>
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
          </div>
          {nameConflict ? (
            <p className="inspector-form-error">{formatProjectItemNameConflict(nameConflict)}</p>
          ) : null}
        </div>
        <StandardModalFooter>
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!form.name.trim() || Boolean(nameConflict)} type="submit">
            Add Rack
          </Button>
        </StandardModalFooter>
      </form>
    </ModalFrame>
  );
}
