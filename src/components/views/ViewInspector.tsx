import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildDeleteViewConfirmation, buildViewFormatChangeConfirmation } from '../../domain/prompts';
import type { ProjectView, ViewOrientation, ViewPageSize } from '../../domain/types';
import { useProject } from '../../state/ProjectContext';
import { useConfirmation } from '../common/ConfirmationDialog';
import { InspectorShell } from '../common/InspectorShell';
import type { InspectorDirtyGuard } from '../common/inspectorDirtyGuard';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { createViewFormValues, getViewNameError, isViewPopulated } from './viewUiModel';
import { predictViewFormatOverflow } from '../../domain/viewFormatPrediction';

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
  const error = getViewNameError(project, form.name, view.id);
  const isDirty = JSON.stringify(form) !== JSON.stringify(baseline);
  const formatChanged = form.pageSize !== baseline.pageSize || form.orientation !== baseline.orientation;

  useEffect(() => {
    setForm(baseline);
  }, [baseline, view.id]);

  const discard = useCallback(() => setForm(baseline), [baseline]);
  const save = useCallback(async () => {
    if (getViewNameError(project, form.name, view.id)) {
      return false;
    }

    if (formatChanged && isViewPopulated(view)) {
      const overflow = predictViewFormatOverflow(project, view, form.pageSize, form.orientation);
      if (
        overflow.totalCount > 0 &&
        !(await confirm(
          buildViewFormatChangeConfirmation(
            view,
            { pageSize: form.pageSize, orientation: form.orientation },
            overflow,
          ),
        ))
      ) {
        return false;
      }
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
          <Button
            disabled={!isDirty || Boolean(error)}
            title="Save View properties"
            type="button"
            onClick={() => void save()}
          >
            Save View
          </Button>
          <Button title="Delete View" variant="destructive" type="button" onClick={() => void handleDelete()}>
            Delete View
          </Button>
        </>
      }
    >
      <div className="editor-form inspector-form">
        <div className="form-field">
          <Label htmlFor="inspector-view-name">View Name</Label>
          <Input
            id="inspector-view-name"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </div>
        <div className="form-field">
          <Label htmlFor="inspector-view-page-size">Page Size</Label>
          <Select
            value={form.pageSize}
            onValueChange={(pageSize: ViewPageSize) => setForm({ ...form, pageSize })}
          >
            <SelectTrigger id="inspector-view-page-size" title="View page size">
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
            <SelectTrigger id="inspector-view-orientation" title="View page orientation">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="portrait">Portrait</SelectItem>
              <SelectItem value="landscape">Landscape</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="form-field">
          <Label htmlFor="inspector-view-description">Notes</Label>
          <Textarea
            id="inspector-view-description"
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
        </div>
        {error ? <p className="inspector-form-error">{error}</p> : null}
      </div>
    </InspectorShell>
  );
}
