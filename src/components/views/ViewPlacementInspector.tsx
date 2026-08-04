import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Trash2 } from 'lucide-react';
import type { ProjectView, ViewPlacement, ViewSourceType } from '../../domain/types';
import { getPlacementNaturalSize } from '../../domain/viewGeometry';
import { clampViewLayoutPosition, getViewLayoutScale } from '../../domain/viewLayoutGrid';
import { getPlacementPage } from '../../domain/viewPlacement';
import { useProject } from '../../state/ProjectContext';
import { InspectorShell } from '../common/InspectorShell';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface PlacementForm {
  label: string;
  xMm: string;
  yMm: string;
}

export function ViewPlacementInspector({
  placement,
  view,
  onOpenSource,
  onRemoved,
}: {
  placement: ViewPlacement;
  view: ProjectView;
  onOpenSource: (sourceType: ViewSourceType, sourceId: string) => void;
  onRemoved: () => void;
}) {
  const { project, updateViewPlacement, removeViewPlacement } = useProject();
  const baseline = useMemo(() => createForm(placement), [placement]);
  const [form, setForm] = useState(baseline);
  const source =
    placement.sourceType === 'device'
      ? project.devices.find((device) => device.id === placement.sourceId)
      : project.racks.find((rack) => rack.id === placement.sourceId);
  const dirty = JSON.stringify(form) !== JSON.stringify(baseline);

  useEffect(() => {
    setForm(baseline);
  }, [baseline]);

  function apply() {
    const position = {
      xMm: parseNumber(form.xMm, placement.xMm),
      yMm: parseNumber(form.yMm, placement.yMm),
    };
    const natural = getPlacementNaturalSize(project, placement);
    const clamped = clampViewLayoutPosition(
      position,
      {
        widthMm: natural.widthMm * placement.scale,
        heightMm: natural.heightMm * placement.scale,
      },
      getPlacementPage(project, view),
      getViewLayoutScale(view),
    );

    updateViewPlacement(view.id, placement.id, {
      labelOverride: form.label.trim() || null,
      ...clamped,
    });
  }

  function remove() {
    removeViewPlacement(view.id, placement.id);
    onRemoved();
  }

  return (
    <InspectorShell
      title="Placement Inspector"
      actions={
        <>
          <Button disabled={!dirty} type="button" onClick={apply}>
            Apply
          </Button>
          <Button variant="destructive" type="button" onClick={remove}>
            <Trash2 aria-hidden="true" className="h-4 w-4" />
            Remove
          </Button>
        </>
      }
    >
      <div className="editor-form inspector-form">
        <Field label="Display Label" id="view-placement-label">
          <Input
            id="view-placement-label"
            placeholder={source?.name ?? 'Missing source'}
            value={form.label}
            onChange={(event) => setForm({ ...form, label: event.target.value })}
          />
        </Field>
        <p className="view-inspector-note">
          This label applies only to this View. It does not rename the source object.
        </p>
        <Button
          disabled={!source}
          type="button"
          variant="outline"
          onClick={() => onOpenSource(placement.sourceType, placement.sourceId)}
        >
          <ExternalLink aria-hidden="true" className="h-4 w-4" />
          {placement.sourceType === 'device' ? 'Open Device' : 'Open Rack'}
        </Button>
        <div className="form-grid-two">
          <Field label="X (mm)" id="view-placement-x">
            <Input
              id="view-placement-x"
              inputMode="decimal"
              type="number"
              value={form.xMm}
              onChange={(event) => setForm({ ...form, xMm: event.target.value })}
            />
          </Field>
          <Field label="Y (mm)" id="view-placement-y">
            <Input
              id="view-placement-y"
              inputMode="decimal"
              type="number"
              value={form.yMm}
              onChange={(event) => setForm({ ...form, yMm: event.target.value })}
            />
          </Field>
        </div>
        <p className="view-inspector-note">
          Object size is controlled for the whole View. Coordinates snap to its invisible alignment grid.
        </p>
      </div>
      <p className="view-placement-remove-note">
        Removing this placement does not delete or change the source object.
      </p>
    </InspectorShell>
  );
}

function createForm(placement: ViewPlacement): PlacementForm {
  return {
    label: placement.labelOverride ?? '',
    xMm: String(placement.xMm),
    yMm: String(placement.yMm),
  };
}

function parseNumber(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function Field({ children, id, label }: { children: React.ReactNode; id: string; label: string }) {
  return (
    <div className="form-field">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
