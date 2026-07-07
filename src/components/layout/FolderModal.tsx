import { useState, type FormEvent } from 'react';
import { FieldLabel } from '../common/FieldLabel';
import { ModalFrame } from '../common/ModalFrame';
import { StandardModalFooter } from '../common/StandardModalFooter';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

export function FolderModal({
  initialName = '',
  mode,
  onClose,
  onSubmit,
}: {
  initialName?: string;
  mode: 'add' | 'rename';
  onClose: () => void;
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const title = mode === 'add' ? 'Add Folder' : 'Rename Folder';

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError('Folder name is required.');
      return;
    }

    onSubmit(trimmedName);
  }

  return (
    <ModalFrame title={title} description="Organize items inside the selected location." onClose={onClose}>
      <form className="editor-form standard-modal-form folder-modal-form" onSubmit={handleSubmit}>
        <div className="standard-modal-content folder-modal-content">
          <div className="form-field">
            <FieldLabel htmlFor="folder-name">Folder name</FieldLabel>
            <Input
              autoFocus
              id="folder-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError(null);
              }}
            />
          </div>
          {error ? (
            <Alert className="border-red-200 bg-red-50 text-red-800">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </div>
        <StandardModalFooter>
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">{title}</Button>
        </StandardModalFooter>
      </form>
    </ModalFrame>
  );
}
