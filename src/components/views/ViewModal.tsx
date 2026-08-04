import { useState, type FormEvent } from 'react';
import type { ProjectView, ViewOrientation, ViewPageSize } from '../../domain/types';
import { useProject } from '../../state/ProjectContext';
import { FieldLabel } from '../common/FieldLabel';
import { ModalFrame } from '../common/ModalFrame';
import { StandardModalFooter } from '../common/StandardModalFooter';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { createViewFormValues, getNextViewName, getViewNameError } from './viewUiModel';

export function ViewModal({
  mode,
  view,
  onClose,
  onSubmitted,
}: {
  mode: 'add' | 'rename';
  view?: ProjectView;
  onClose: () => void;
  onSubmitted: (id: string) => void;
}) {
  const { project, addView, updateView } = useProject();
  const [form, setForm] = useState(() => {
    const initial = createViewFormValues(view);
    return mode === 'add' ? { ...initial, name: getNextViewName(project.views) } : initial;
  });
  const nameError = getViewNameError(project, form.name, mode === 'rename' ? view?.id : undefined);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (nameError) {
      return;
    }

    if (mode === 'rename') {
      if (!view) {
        return;
      }

      updateView(view.id, { name: form.name.trim() });
      onSubmitted(view.id);
      return;
    }

    const id = addView({
      name: form.name.trim(),
      description: '',
      pageSize: form.pageSize,
      orientation: form.orientation,
    });
    onSubmitted(id);
  }

  return (
    <ModalFrame
      title={mode === 'add' ? 'Add View' : 'Rename View'}
      description={
        mode === 'add'
          ? 'Create a project-level drawing canvas for existing devices and racks.'
          : 'Change this View name without changing its page or canvas content.'
      }
      onClose={onClose}
    >
      <form className="editor-form standard-modal-form view-modal-form" onSubmit={handleSubmit}>
        <div className="standard-modal-content view-modal-content">
          <div className="form-field">
            <FieldLabel htmlFor="view-name">View Name</FieldLabel>
            <Input
              autoFocus
              id="view-name"
              required
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </div>
          {mode === 'add' ? (
            <div className="view-modal-page-fields">
              <div className="form-field">
                <FieldLabel htmlFor="view-page-size">Page Size</FieldLabel>
                <Select
                  value={form.pageSize}
                  onValueChange={(pageSize: ViewPageSize) => setForm({ ...form, pageSize })}
                >
                  <SelectTrigger id="view-page-size">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="a3">A3</SelectItem>
                    <SelectItem value="a4">A4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="form-field">
                <FieldLabel htmlFor="view-orientation">Orientation</FieldLabel>
                <Select
                  value={form.orientation}
                  onValueChange={(orientation: ViewOrientation) => setForm({ ...form, orientation })}
                >
                  <SelectTrigger id="view-orientation">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="portrait">Portrait</SelectItem>
                    <SelectItem value="landscape">Landscape</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}
          {nameError ? <p className="inspector-form-error">{nameError}</p> : null}
        </div>
        <StandardModalFooter>
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={Boolean(nameError)} type="submit">
            {mode === 'add' ? 'Add View' : 'Rename View'}
          </Button>
        </StandardModalFooter>
      </form>
    </ModalFrame>
  );
}
