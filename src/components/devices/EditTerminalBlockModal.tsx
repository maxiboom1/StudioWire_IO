import { useState, type FormEvent } from 'react';
import type { Device } from '../../domain/types';
import { useProject } from '../../state/ProjectContext';
import { ModalFrame } from '../common/ModalFrame';
import { StandardModalFooter } from '../common/StandardModalFooter';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { TerminalBlockFormFields } from './TerminalBlockFormFields';
import {
  createEditTerminalBlockForm,
  getTerminalBlockFormErrors,
  toTerminalBlockEditInput,
} from './terminalBlockForm';

export function EditTerminalBlockModal({
  device,
  onClose,
  onSaved,
}: {
  device: Device;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const { project, editTerminalBlock } = useProject();
  const [form, setForm] = useState(() => createEditTerminalBlockForm(project, device));
  const errors = getTerminalBlockFormErrors(project, form, device);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (errors.length > 0) {
      return;
    }

    editTerminalBlock(toTerminalBlockEditInput(device.id, form));
    onSaved(device.id);
  }

  return (
    <ModalFrame
      title="Edit TB"
      description="Edit terminal block identity, ports, and rack placement."
      onClose={onClose}
    >
      <form className="editor-form standard-modal-form edit-terminal-block-form" onSubmit={handleSubmit}>
        <div className="standard-modal-content">
          <TerminalBlockFormFields form={form} project={project} racks={project.racks} setForm={setForm} />
          <div className="form-messages">
            {errors.map((error) => (
              <Alert className="border-red-200 bg-red-50 text-red-800" key={error}>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ))}
          </div>
        </div>
        <StandardModalFooter>
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={errors.length > 0} type="submit">
            Save TB
          </Button>
        </StandardModalFooter>
      </form>
    </ModalFrame>
  );
}
