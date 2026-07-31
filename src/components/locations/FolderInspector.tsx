import { useCallback, useEffect, useMemo, useState } from 'react';
import { findProjectItemNameConflict, formatProjectItemNameConflict } from '../../domain/projectItemNames';
import { buildDeleteFolderConfirmation } from '../../domain/prompts';
import type { SubLocation } from '../../domain/types';
import { useProject } from '../../state/ProjectContext';
import { useConfirmation } from '../common/ConfirmationDialog';
import { InspectorAccordion, InspectorShell } from '../common/InspectorShell';
import type { InspectorDirtyGuard } from '../common/inspectorDirtyGuard';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';

export function FolderInspector({
  folder,
  onDirtyGuardChange,
}: {
  folder: SubLocation;
  onDirtyGuardChange?: (guard: InspectorDirtyGuard | null) => void;
}) {
  const { project, updateSubLocation, deleteSubLocation } = useProject();
  const confirm = useConfirmation();
  const baseline = useMemo(
    () => ({ name: folder.name, description: folder.description }),
    [folder.description, folder.name],
  );
  const [form, setForm] = useState(baseline);
  const [activeSection, setActiveSection] = useState<string | null>('edit');
  const itemCount =
    project.racks.filter((rack) => rack.subLocationId === folder.id).length +
    project.devices.filter((device) => device.subLocationId === folder.id).length;
  const conflict = findProjectItemNameConflict(project, form.name, {
    id: folder.id,
    type: 'folder',
  });
  const error = !form.name.trim()
    ? 'Folder name is required.'
    : conflict
      ? formatProjectItemNameConflict(conflict)
      : null;
  const isDirty = JSON.stringify(form) !== JSON.stringify(baseline);

  useEffect(() => {
    setForm(baseline);
    setActiveSection('edit');
  }, [baseline, folder.id]);

  const discard = useCallback(() => setForm(baseline), [baseline]);
  const save = useCallback(() => {
    if (!form.name.trim() || conflict) {
      return false;
    }

    updateSubLocation(folder.id, {
      name: form.name.trim(),
      description: form.description.trim(),
    });
    return true;
  }, [conflict, folder.id, form, updateSubLocation]);

  useEffect(() => {
    onDirtyGuardChange?.({ isDirty, save, discard });
    return () => onDirtyGuardChange?.(null);
  }, [discard, isDirty, onDirtyGuardChange, save]);

  async function handleDelete() {
    if (itemCount === 0 && (await confirm(buildDeleteFolderConfirmation(folder)))) {
      deleteSubLocation(folder.id);
    }
  }

  return (
    <InspectorShell
      title="Folder Inspector"
      actions={
        <>
          <Button disabled={!isDirty || Boolean(error)} type="button" onClick={save}>
            Save Folder
          </Button>
          <Button
            disabled={itemCount > 0}
            variant="destructive"
            type="button"
            onClick={() => void handleDelete()}
          >
            Delete Folder
          </Button>
        </>
      }
    >
      <InspectorAccordion
        activeSectionId={activeSection}
        onActiveSectionChange={setActiveSection}
        sections={[
          {
            id: 'edit',
            title: 'Edit Folder',
            content: (
              <div className="editor-form inspector-form">
                <div className="form-field">
                  <Label htmlFor="inspector-folder-name">Name</Label>
                  <Input
                    id="inspector-folder-name"
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                  />
                </div>
                <div className="form-field">
                  <Label htmlFor="inspector-folder-description">Description</Label>
                  <Textarea
                    id="inspector-folder-description"
                    value={form.description}
                    onChange={(event) => setForm({ ...form, description: event.target.value })}
                  />
                </div>
                {error ? <p className="inspector-form-error">{error}</p> : null}
              </div>
            ),
          },
          {
            id: 'details',
            title: 'Folder Details',
            content: (
              <dl>
                <div>
                  <dt>Items</dt>
                  <dd>{itemCount}</dd>
                </div>
                <div>
                  <dt>Deletion</dt>
                  <dd>
                    {itemCount === 0
                      ? 'Folder is empty.'
                      : 'Move all racks, devices, and TBs out before deleting.'}
                  </dd>
                </div>
              </dl>
            ),
          },
        ]}
      />
    </InspectorShell>
  );
}
