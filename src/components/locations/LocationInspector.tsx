import { useCallback, useEffect, useMemo, useState } from 'react';
import { findLocationNameConflict } from '../../domain/projectItemNames';
import { buildDeleteLocationConfirmation } from '../../domain/prompts';
import type { Location } from '../../domain/types';
import { useProject } from '../../state/ProjectContext';
import { useConfirmation } from '../common/ConfirmationDialog';
import { InspectorAccordion, InspectorShell } from '../common/InspectorShell';
import type { InspectorDirtyGuard } from '../common/inspectorDirtyGuard';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';

export function LocationInspector({
  location,
  onDirtyGuardChange,
}: {
  location: Location;
  onDirtyGuardChange?: (guard: InspectorDirtyGuard | null) => void;
}) {
  const { project, updateLocation, deleteLocation } = useProject();
  const confirm = useConfirmation();
  const baseline = useMemo(
    () => ({ name: location.name, description: location.description }),
    [location.description, location.name],
  );
  const [form, setForm] = useState(baseline);
  const [activeSection, setActiveSection] = useState<string | null>('edit');
  const rackCount = project.racks.filter((rack) => rack.locationId === location.id).length;
  const deviceCount = project.devices.filter((device) => device.locationId === location.id).length;
  const folderCount = project.subLocations.filter((folder) => folder.locationId === location.id).length;
  const referenceCount = rackCount + deviceCount + folderCount;
  const nameConflict = findLocationNameConflict(project, form.name, location.id);
  const error = !form.name.trim()
    ? 'Location name is required.'
    : nameConflict
      ? `Location name "${nameConflict.name}" is already used.`
      : null;
  const isDirty = JSON.stringify(form) !== JSON.stringify(baseline);

  useEffect(() => {
    setForm(baseline);
    setActiveSection('edit');
  }, [baseline, location.id]);

  const discard = useCallback(() => setForm(baseline), [baseline]);
  const save = useCallback(() => {
    if (!form.name.trim() || nameConflict) {
      return false;
    }

    updateLocation(location.id, {
      name: form.name.trim(),
      description: form.description.trim(),
    });
    return true;
  }, [form, location.id, nameConflict, updateLocation]);

  useEffect(() => {
    onDirtyGuardChange?.({ isDirty, save, discard });
    return () => onDirtyGuardChange?.(null);
  }, [discard, isDirty, onDirtyGuardChange, save]);

  async function handleDelete() {
    if (referenceCount === 0 && (await confirm(buildDeleteLocationConfirmation(location)))) {
      deleteLocation(location.id);
    }
  }

  return (
    <InspectorShell
      title="Location Inspector"
      actions={
        <>
          <Button disabled={!isDirty || Boolean(error)} type="button" onClick={save}>
            Save Location
          </Button>
          <Button
            disabled={referenceCount > 0}
            variant="destructive"
            type="button"
            onClick={() => void handleDelete()}
          >
            Delete Location
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
            title: 'Edit Location',
            content: (
              <div className="editor-form inspector-form">
                <div className="form-field">
                  <Label htmlFor="inspector-location-name">Name</Label>
                  <Input
                    id="inspector-location-name"
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                  />
                </div>
                <div className="form-field">
                  <Label htmlFor="inspector-location-description">Description</Label>
                  <Textarea
                    id="inspector-location-description"
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
            title: 'Location Details',
            content: (
              <dl>
                <Detail label="Folders" value={folderCount} />
                <Detail label="Racks" value={rackCount} />
                <Detail label="Devices and TBs" value={deviceCount} />
                <Detail
                  label="Deletion"
                  value={
                    referenceCount === 0
                      ? 'Location is empty.'
                      : 'Remove all folders, racks, devices, and TBs before deleting.'
                  }
                />
              </dl>
            ),
          },
        ]}
      />
    </InspectorShell>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
