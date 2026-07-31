import { useMemo, useState, type FormEvent } from 'react';
import { normalizeTerminalBlockPrefix } from '../../domain/terminalBlockOperations';
import { useProject } from '../../state/ProjectContext';
import { ModalFrame } from '../common/ModalFrame';
import { StandardModalFooter } from '../common/StandardModalFooter';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { TerminalBlockFormFields } from './TerminalBlockFormFields';
import { createAddTerminalBlockForm, getTerminalBlockFormErrors } from './terminalBlockForm';

export function AddTerminalBlockModal({
  initialLocationId,
  onClose,
  onCreated,
}: {
  initialLocationId: string | null;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { project, addTerminalBlock } = useProject();
  const racks = useMemo(
    () =>
      initialLocationId
        ? project.racks.filter((rack) => rack.locationId === initialLocationId)
        : project.racks,
    [initialLocationId, project.racks],
  );
  const [form, setForm] = useState(() => createAddTerminalBlockForm(project, racks));
  const errors = getTerminalBlockFormErrors(project, form);
  const location = initialLocationId
    ? project.locations.find((candidate) => candidate.id === initialLocationId)
    : null;

  if (racks.length === 0) {
    return (
      <ModalFrame title="Add TB" description="A terminal block must be mounted in a rack." onClose={onClose}>
        <div className="standard-modal-form">
          <div className="standard-modal-content tb-no-rack-message">
            <p>
              {location
                ? `Create a rack in "${location.name}" before adding a terminal block.`
                : 'Create a rack before adding a terminal block.'}
            </p>
          </div>
          <StandardModalFooter>
            <Button type="button" onClick={onClose}>
              Close
            </Button>
          </StandardModalFooter>
        </div>
      </ModalFrame>
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (errors.length > 0) {
      return;
    }

    const rack = project.racks.find((candidate) => candidate.id === form.rackId)!;
    const id = addTerminalBlock({
      name: form.name.trim(),
      categoryId: form.categoryId,
      locationId: rack.locationId,
      subLocationId: null,
      labelPrefix: normalizeTerminalBlockPrefix(form.labelPrefix || form.name),
      rackId: rack.id,
      rackBottomRu: Number(form.rackBottomRu),
      connectorTypeId: form.connectorTypeId,
      count: Number(form.count),
      notes: form.notes.trim(),
    });
    onCreated(id);
  }

  return (
    <ModalFrame
      title="Add TB"
      description="Create a rack-mounted terminal block with matching rear and front ports."
      onClose={onClose}
    >
      <form className="editor-form standard-modal-form add-terminal-block-form" onSubmit={handleSubmit}>
        <div className="standard-modal-content">
          <TerminalBlockFormFields form={form} project={project} racks={racks} setForm={setForm} />
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
            Create TB
          </Button>
        </StandardModalFooter>
      </form>
    </ModalFrame>
  );
}
