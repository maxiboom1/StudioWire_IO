import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildDeleteTerminalBlockConfirmation } from '../../domain/prompts';
import type { Device } from '../../domain/types';
import { getViewSourceImpact } from '../../domain/viewOperations';
import { useProject } from '../../state/ProjectContext';
import { useConfirmation } from '../common/ConfirmationDialog';
import { InspectorAccordion, InspectorShell } from '../common/InspectorShell';
import type { InspectorDirtyGuard } from '../common/inspectorDirtyGuard';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  createEditTerminalBlockForm,
  getTerminalBlockFormErrors,
  toTerminalBlockEditInput,
} from './terminalBlockForm';

export function TerminalBlockInspector({
  device,
  onDirtyGuardChange,
}: {
  device: Device;
  onDirtyGuardChange?: (guard: InspectorDirtyGuard | null) => void;
}) {
  const { project, editTerminalBlock, deleteTerminalBlock } = useProject();
  const confirm = useConfirmation();
  const baseline = useMemo(() => createEditTerminalBlockForm(project, device), [device, project]);
  const [form, setForm] = useState(baseline);
  const [activeSection, setActiveSection] = useState<string | null>('edit');
  const errors = getTerminalBlockFormErrors(project, form, device);
  const isDirty = JSON.stringify(form) !== JSON.stringify(baseline);
  const category = project.settings.categories.find((candidate) => candidate.id === device.categoryId);
  const rack = device.rackId ? project.racks.find((candidate) => candidate.id === device.rackId) : null;
  const location = project.locations.find((candidate) => candidate.id === device.locationId);
  const group = project.portGroups.find((candidate) => candidate.deviceId === device.id);
  const connector = project.settings.connectorTypes.find(
    (candidate) => candidate.id === group?.connectorTypeId,
  );

  useEffect(() => {
    setForm(baseline);
    setActiveSection('edit');
  }, [baseline, device.id]);

  const discard = useCallback(() => setForm(baseline), [baseline]);
  const save = useCallback(() => {
    if (getTerminalBlockFormErrors(project, form, device).length > 0) {
      return false;
    }

    editTerminalBlock(toTerminalBlockEditInput(device.id, form));
    return true;
  }, [device, editTerminalBlock, form, project]);

  useEffect(() => {
    onDirtyGuardChange?.({ isDirty, save, discard });
    return () => onDirtyGuardChange?.(null);
  }, [discard, isDirty, onDirtyGuardChange, save]);

  async function handleDelete() {
    if (
      await confirm(
        buildDeleteTerminalBlockConfirmation(device, getViewSourceImpact(project, 'device', device.id)),
      )
    ) {
      deleteTerminalBlock(device.id);
    }
  }

  return (
    <InspectorShell
      title="TB Inspector"
      actions={
        <>
          <Button disabled={!isDirty || errors.length > 0} type="button" onClick={save}>
            Save TB
          </Button>
          <Button variant="destructive" type="button" onClick={() => void handleDelete()}>
            Delete TB
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
            title: 'Edit TB',
            content: (
              <div className="editor-form inspector-form">
                <div className="form-field">
                  <Label htmlFor="inspector-tb-name">TB Name</Label>
                  <Input
                    id="inspector-tb-name"
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                  />
                </div>
                <div className="form-field">
                  <Label htmlFor="inspector-tb-label-prefix">Label prefix</Label>
                  <Input
                    id="inspector-tb-label-prefix"
                    value={form.labelPrefix}
                    onChange={(event) => setForm({ ...form, labelPrefix: event.target.value.toUpperCase() })}
                  />
                </div>
                <div className="form-field">
                  <Label htmlFor="inspector-tb-count">Connector count</Label>
                  <Input
                    id="inspector-tb-count"
                    min="1"
                    type="number"
                    value={form.count}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        count: event.target.value === '' ? '' : Number(event.target.value),
                      })
                    }
                  />
                </div>
                <div className="form-field">
                  <Label htmlFor="inspector-tb-notes">Notes</Label>
                  <Textarea
                    id="inspector-tb-notes"
                    value={form.notes}
                    onChange={(event) => setForm({ ...form, notes: event.target.value })}
                  />
                </div>
                {errors.length > 0 ? <p className="inspector-form-error">{errors[0]}</p> : null}
              </div>
            ),
          },
          {
            id: 'details',
            title: 'TB Details',
            content: (
              <dl>
                <Detail label="Category" value={category?.name ?? 'Unknown category'} />
                <Detail label="Connector" value={connector?.name ?? 'Unknown connector'} />
                <Detail label="Location" value={location?.name ?? 'Not assigned'} />
                <Detail label="Rack" value={rack?.name ?? 'Not assigned'} />
                <Detail label="Bottom RU" value={String(device.rackBottomRu ?? 'Not placed')} />
                <Detail label="Status" value={<Badge>{device.status}</Badge>} />
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
