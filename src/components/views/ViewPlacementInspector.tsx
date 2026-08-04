import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Trash2 } from 'lucide-react';
import type { ProjectView, ViewPlacement } from '../../domain/types';
import { getPlacementNaturalSize } from '../../domain/viewGeometry';
import { clampPlacementPosition, getPlacementPage, snapViewPosition } from '../../domain/viewPlacement';
import { useProject } from '../../state/ProjectContext';
import { InspectorAccordion, InspectorShell } from '../common/InspectorShell';
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
  onBack,
  onRemoved,
}: {
  placement: ViewPlacement;
  view: ProjectView;
  onBack: () => void;
  onRemoved: () => void;
}) {
  const { project, updateViewPlacement, removeViewPlacement } = useProject();
  const baseline = useMemo(() => createForm(placement), [placement]);
  const [form, setForm] = useState(baseline);
  const [activeSection, setActiveSection] = useState<string | null>('display');
  const source =
    placement.sourceType === 'device'
      ? project.devices.find((device) => device.id === placement.sourceId)
      : project.racks.find((rack) => rack.id === placement.sourceId);
  const location = project.locations.find((candidate) => candidate.id === source?.locationId);
  const folder = project.subLocations.find((candidate) => candidate.id === source?.subLocationId);
  const rack =
    placement.sourceType === 'device' && source && 'rackId' in source && source.rackId
      ? project.racks.find((candidate) => candidate.id === source.rackId)
      : placement.sourceType === 'rack'
        ? source
        : null;
  const dirty = JSON.stringify(form) !== JSON.stringify(baseline);

  useEffect(() => {
    setForm(baseline);
  }, [baseline]);

  function apply() {
    const position = snapViewPosition({
      xMm: parseNumber(form.xMm, placement.xMm),
      yMm: parseNumber(form.yMm, placement.yMm),
    });
    const natural = getPlacementNaturalSize(project, placement);
    const clamped = clampPlacementPosition(
      position,
      {
        widthMm: natural.widthMm * placement.scale,
        heightMm: natural.heightMm * placement.scale,
      },
      getPlacementPage(project, view),
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
            Remove from View
          </Button>
        </>
      }
    >
      <Button className="view-placement-back" type="button" variant="ghost" onClick={onBack}>
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        Back to View properties
      </Button>
      <InspectorAccordion
        activeSectionId={activeSection}
        onActiveSectionChange={setActiveSection}
        sections={[
          {
            id: 'display',
            title: 'Display & Position',
            content: (
              <div className="editor-form inspector-form">
                <Field label="Display Label" id="view-placement-label">
                  <Input
                    id="view-placement-label"
                    placeholder={source?.name ?? 'Missing source'}
                    value={form.label}
                    onChange={(event) => setForm({ ...form, label: event.target.value })}
                  />
                </Field>
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
                  Placement size is fixed. Coordinates snap to the 2.5 mm View grid.
                </p>
              </div>
            ),
          },
          {
            id: 'source',
            title: 'Live Source',
            content: (
              <dl>
                <Detail label="Type" value={sourceTypeLabel(placement, source)} />
                <Detail label="Name" value={source?.name ?? 'Missing source'} />
                <Detail label="Location" value={location?.name ?? '—'} />
                <Detail label="Folder" value={folder?.name ?? '—'} />
                <Detail label="Rack" value={rack?.name ?? '—'} />
              </dl>
            ),
          },
        ]}
      />
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

function sourceTypeLabel(placement: ViewPlacement, source: unknown): string {
  if (placement.sourceType === 'rack') return 'Rack';
  return typeof source === 'object' && source !== null && 'kind' in source && source.kind === 'terminal_block'
    ? 'Terminal block'
    : 'Device';
}

function Field({ children, id, label }: { children: React.ReactNode; id: string; label: string }) {
  return (
    <div className="form-field">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
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
