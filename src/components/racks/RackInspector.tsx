import { useCallback, useEffect, useMemo, useState } from 'react';
import { Minus } from 'lucide-react';
import { findProjectItemNameConflict, formatProjectItemNameConflict } from '../../domain/projectItemNames';
import { buildDeleteRackConfirmation, buildRackUnassignConfirmation } from '../../domain/prompts';
import { analyzeRackPlacements } from '../../domain/rackDiagnostics';
import type { Rack } from '../../domain/types';
import { useProject } from '../../state/ProjectContext';
import { useConfirmation } from '../common/ConfirmationDialog';
import { InspectorAccordion, InspectorShell } from '../common/InspectorShell';
import type { InspectorDirtyGuard } from '../common/inspectorDirtyGuard';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

export function RackInspector({
  rack,
  onDirtyGuardChange,
}: {
  rack: Rack;
  onDirtyGuardChange?: (guard: InspectorDirtyGuard | null) => void;
}) {
  const { project, updateRack, deleteRack, unassignDeviceFromRack } = useProject();
  const confirm = useConfirmation();
  const devices = project.devices.filter((device) => device.rackId === rack.id);
  const diagnostics = analyzeRackPlacements(project).filter((diagnostic) => diagnostic.rackId === rack.id);
  const baseline = useMemo(
    () => ({
      name: rack.name,
      heightRu: String(rack.heightRu),
      numberingDirection: rack.numberingDirection,
    }),
    [rack.heightRu, rack.name, rack.numberingDirection],
  );
  const [form, setForm] = useState(baseline);
  const [activeSection, setActiveSection] = useState<string | null>('edit');
  const conflict = findProjectItemNameConflict(project, form.name, {
    id: rack.id,
    type: 'rack',
  });
  const height = Number(form.heightRu);
  const error = !form.name.trim()
    ? 'Rack name is required.'
    : conflict
      ? formatProjectItemNameConflict(conflict)
      : !Number.isSafeInteger(height) || height <= 0
        ? 'Rack height must be a positive integer.'
        : null;
  const isDirty = JSON.stringify(form) !== JSON.stringify(baseline);

  useEffect(() => {
    setForm(baseline);
    setActiveSection('edit');
  }, [baseline, rack.id]);

  const discard = useCallback(() => setForm(baseline), [baseline]);
  const save = useCallback(() => {
    if (error) {
      return false;
    }

    updateRack(rack.id, {
      name: form.name.trim(),
      heightRu: Number(form.heightRu),
      numberingDirection: form.numberingDirection,
    });
    return true;
  }, [error, form, rack.id, updateRack]);

  useEffect(() => {
    onDirtyGuardChange?.({ isDirty, save, discard });
    return () => onDirtyGuardChange?.(null);
  }, [discard, isDirty, onDirtyGuardChange, save]);

  async function handleDelete() {
    if (devices.length === 0 && (await confirm(buildDeleteRackConfirmation(rack)))) {
      deleteRack(rack.id);
    }
  }

  async function handleUnassign(deviceId: string) {
    const device = devices.find((candidate) => candidate.id === deviceId);

    if (device && (await confirm(buildRackUnassignConfirmation(device, rack)))) {
      unassignDeviceFromRack(device.id);
    }
  }

  return (
    <InspectorShell
      title="Rack Inspector"
      actions={
        <>
          <Button disabled={!isDirty || Boolean(error)} type="button" onClick={save}>
            Save Rack
          </Button>
          <Button
            disabled={devices.length > 0}
            variant="destructive"
            type="button"
            onClick={() => void handleDelete()}
          >
            Delete Rack
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
            title: 'Edit Rack',
            content: (
              <div className="editor-form inspector-form">
                <div className="form-field">
                  <Label htmlFor="inspector-rack-name">Name</Label>
                  <Input
                    id="inspector-rack-name"
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                  />
                </div>
                <div className="form-field">
                  <Label htmlFor="inspector-rack-height">Height RU</Label>
                  <Input
                    id="inspector-rack-height"
                    min="1"
                    type="number"
                    value={form.heightRu}
                    onChange={(event) => setForm({ ...form, heightRu: event.target.value })}
                  />
                </div>
                <div className="form-field">
                  <Label htmlFor="inspector-rack-direction">Numbering direction</Label>
                  <Select
                    value={form.numberingDirection}
                    onValueChange={(value) =>
                      setForm({
                        ...form,
                        numberingDirection: value as Rack['numberingDirection'],
                      })
                    }
                  >
                    <SelectTrigger id="inspector-rack-direction">
                      <SelectValue placeholder="Select direction" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bottom_to_top">Bottom to top</SelectItem>
                      <SelectItem value="top_to_bottom">Top to bottom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {error ? <p className="inspector-form-error">{error}</p> : null}
              </div>
            ),
          },
          {
            id: 'assigned',
            title: 'Assigned Items',
            content:
              devices.length === 0 ? (
                <p className="panel-empty">No items assigned to this rack.</p>
              ) : (
                <ul className="assigned-device-list">
                  {devices.map((device) => (
                    <li className="assigned-device-row" key={device.id}>
                      <span className="assigned-device-name">{device.name}</span>
                      {device.kind === 'device' ? (
                        <Button
                          aria-label={`Unassign ${device.name} from rack`}
                          className="assigned-device-unassign"
                          size="icon"
                          variant="outline"
                          type="button"
                          onClick={() => void handleUnassign(device.id)}
                        >
                          <Minus aria-hidden="true" className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ),
          },
          {
            id: 'issues',
            title: 'Placement Issues',
            content:
              diagnostics.length === 0 ? (
                <p className="panel-empty">No placement issues.</p>
              ) : (
                <ul className="compact-list warning-list">
                  {diagnostics.map((diagnostic) => (
                    <li key={`${diagnostic.code}-${diagnostic.deviceId}-${diagnostic.relatedDeviceId ?? ''}`}>
                      {diagnostic.message}
                    </li>
                  ))}
                </ul>
              ),
          },
        ]}
      />
    </InspectorShell>
  );
}
