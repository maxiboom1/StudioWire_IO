import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildDeleteViewConfirmation, buildViewFormatChangeConfirmation } from '../../domain/prompts';
import type { ProjectView, ViewOrientation, ViewPageSize } from '../../domain/types';
import { useProject } from '../../state/ProjectContext';
import { useConfirmation } from '../common/ConfirmationDialog';
import { InspectorAccordion, InspectorShell } from '../common/InspectorShell';
import type { InspectorDirtyGuard } from '../common/inspectorDirtyGuard';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { createViewFormValues, getViewNameError, isViewPopulated } from './viewUiModel';

export function ViewInspector({
  view,
  onDirtyGuardChange,
}: {
  view: ProjectView;
  onDirtyGuardChange?: (guard: InspectorDirtyGuard | null) => void;
}) {
  const { project, updateView, deleteView } = useProject();
  const confirm = useConfirmation();
  const baseline = useMemo(() => createViewFormValues(view), [view]);
  const [form, setForm] = useState(baseline);
  const [activeSection, setActiveSection] = useState<string | null>('edit');
  const error = getViewNameError(project, form.name, view.id);
  const isDirty = JSON.stringify(form) !== JSON.stringify(baseline);
  const formatChanged = form.pageSize !== baseline.pageSize || form.orientation !== baseline.orientation;

  useEffect(() => {
    setForm(baseline);
    setActiveSection('edit');
  }, [baseline, view.id]);

  const discard = useCallback(() => setForm(baseline), [baseline]);
  const save = useCallback(async () => {
    if (getViewNameError(project, form.name, view.id)) {
      return false;
    }

    if (formatChanged && isViewPopulated(view) && !(await confirm(buildViewFormatChangeConfirmation(view)))) {
      return false;
    }

    updateView(view.id, {
      name: form.name.trim(),
      description: form.description.trim(),
      pageSize: form.pageSize,
      orientation: form.orientation,
    });
    return true;
  }, [confirm, form, formatChanged, project, updateView, view]);

  useEffect(() => {
    onDirtyGuardChange?.({ isDirty, save, discard });
    return () => onDirtyGuardChange?.(null);
  }, [discard, isDirty, onDirtyGuardChange, save]);

  async function handleDelete() {
    if (await confirm(buildDeleteViewConfirmation(view))) {
      deleteView(view.id);
    }
  }

  return (
    <InspectorShell
      title="View Inspector"
      actions={
        <>
          <Button disabled={!isDirty || Boolean(error)} type="button" onClick={() => void save()}>
            Save View
          </Button>
          <Button variant="destructive" type="button" onClick={() => void handleDelete()}>
            Delete View
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
            title: 'View Metadata',
            content: (
              <div className="editor-form inspector-form">
                <div className="form-field">
                  <Label htmlFor="inspector-view-id">ID</Label>
                  <Input id="inspector-view-id" readOnly value={view.id} />
                </div>
                <div className="form-field">
                  <Label htmlFor="inspector-view-name">View Name</Label>
                  <Input
                    id="inspector-view-name"
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                  />
                </div>
                <div className="form-field">
                  <Label htmlFor="inspector-view-description">Description</Label>
                  <Textarea
                    id="inspector-view-description"
                    value={form.description}
                    onChange={(event) => setForm({ ...form, description: event.target.value })}
                  />
                </div>
                {error ? <p className="inspector-form-error">{error}</p> : null}
              </div>
            ),
          },
          {
            id: 'page',
            title: 'Page Format',
            content: (
              <div className="editor-form inspector-form">
                <div className="form-field">
                  <Label htmlFor="inspector-view-page-size">Page Size</Label>
                  <Select
                    value={form.pageSize}
                    onValueChange={(pageSize: ViewPageSize) => setForm({ ...form, pageSize })}
                  >
                    <SelectTrigger id="inspector-view-page-size">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="a3">A3</SelectItem>
                      <SelectItem value="a4">A4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="form-field">
                  <Label htmlFor="inspector-view-orientation">Orientation</Label>
                  <Select
                    value={form.orientation}
                    onValueChange={(orientation: ViewOrientation) => setForm({ ...form, orientation })}
                  >
                    <SelectTrigger id="inspector-view-orientation">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="portrait">Portrait</SelectItem>
                      <SelectItem value="landscape">Landscape</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="view-inspector-note">
                  Format changes retain all canvas coordinates. Content can remain outside a smaller page
                  boundary until it is moved.
                </p>
              </div>
            ),
          },
          {
            id: 'counts',
            title: 'View Content',
            content: (
              <dl>
                <Detail label="Placements" value={view.placements.length} />
                <Detail label="Lines" value={view.lines.length} />
                <Detail label="Annotations" value={view.annotations.length} />
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
