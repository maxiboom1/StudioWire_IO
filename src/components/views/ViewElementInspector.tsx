import { ExternalLink, RotateCcw, Trash2 } from 'lucide-react';
import {
  VIEW_LINE_COLOR_VALUES,
  VIEW_LINE_LABEL_ORIENTATION_VALUES,
  VIEW_LINE_WIDTH_VALUES,
} from '../../domain/types';
import type { ProjectView, ViewAnnotation, ViewSourceType } from '../../domain/types';
import { getViewPortRangeAttachedLineCount } from '../../domain/viewOperations';
import { VIEW_LINE_COLOR_MAP, VIEW_LINE_WIDTH_MAP } from '../../domain/viewLineStyles';
import { useProject } from '../../state/ProjectContext';
import { useConfirmation } from '../common/ConfirmationDialog';
import { InspectorShell } from '../common/InspectorShell';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import type { ViewCanvasSelection } from './viewEditorTypes';
import { useViewCanvasCommands } from './ViewCanvasHistoryContext';

export function ViewElementInspector({
  selection,
  view,
  onOpenSource,
  onRemoved,
}: {
  selection: ViewCanvasSelection;
  view: ProjectView;
  onOpenSource: (type: ViewSourceType, id: string) => void;
  onRemoved: () => void;
}) {
  const { project } = useProject();
  const { updateViewLine, removeViewLine, updateViewAnnotation, removeViewAnnotation } =
    useViewCanvasCommands();
  const confirm = useConfirmation();
  if (selection.kind === 'line') {
    const line = view.lines.find((candidate) => candidate.id === selection.id);
    if (!line) return null;
    return (
      <InspectorShell
        title="Line Inspector"
        actions={
          <Button
            title="Remove View line"
            variant="destructive"
            onClick={() => {
              removeViewLine(view.id, line.id);
              onRemoved();
            }}
          >
            <Trash2 className="h-4 w-4" />
            Remove
          </Button>
        }
      >
        <div className="editor-form inspector-form">
          <Field id="view-element-label" label="Line Label">
            <Input
              id="view-element-label"
              defaultValue={line.label}
              placeholder="Add label"
              onBlur={(event) => updateViewLine(view.id, line.id, { label: event.target.value.trim() })}
            />
          </Field>
          <Field id="view-line-color" label="Color">
            <div className="view-line-color-options" id="view-line-color">
              {VIEW_LINE_COLOR_VALUES.map((color) => (
                <button
                  aria-label={`${color} line color`}
                  aria-pressed={line.color === color}
                  className={line.color === color ? 'is-selected' : ''}
                  key={color}
                  title={titleCase(color)}
                  type="button"
                  style={{ '--line-swatch-color': VIEW_LINE_COLOR_MAP[color] } as React.CSSProperties}
                  onClick={() => updateViewLine(view.id, line.id, { color })}
                />
              ))}
            </div>
          </Field>
          <Field id="view-line-width" label="Width">
            <div className="view-line-width-options" id="view-line-width">
              {VIEW_LINE_WIDTH_VALUES.map((width) => (
                <button
                  aria-pressed={line.width === width}
                  className={line.width === width ? 'is-selected' : ''}
                  key={width}
                  title={`${titleCase(width)} line width`}
                  type="button"
                  onClick={() => updateViewLine(view.id, line.id, { width })}
                >
                  <span style={{ height: VIEW_LINE_WIDTH_MAP[width] }} />
                  {titleCase(width)}
                </button>
              ))}
            </div>
          </Field>
          <Field id="view-line-direction" label="Label Direction">
            <div className="view-line-direction-options" id="view-line-direction">
              {VIEW_LINE_LABEL_ORIENTATION_VALUES.map((labelOrientation) => (
                <button
                  aria-pressed={line.labelOrientation === labelOrientation}
                  className={line.labelOrientation === labelOrientation ? 'is-selected' : ''}
                  key={labelOrientation}
                  title={`${titleCase(labelOrientation)} line label direction`}
                  type="button"
                  onClick={() => updateViewLine(view.id, line.id, { labelOrientation })}
                >
                  {titleCase(labelOrientation)}
                </button>
              ))}
            </div>
          </Field>
          <Button
            title="Reset line route"
            disabled={!line.waypoints.length}
            variant="outline"
            onClick={() => updateViewLine(view.id, line.id, { waypoints: [] })}
          >
            <RotateCcw className="h-4 w-4" />
            Reset Route
          </Button>
          <p className="view-inspector-note">
            This line is a View-only drawing mark. It does not create engineering connectivity.
          </p>
        </div>
      </InspectorShell>
    );
  }
  const annotationId =
    selection.kind === 'portRange'
      ? selection.id
      : selection.kind === 'movable' &&
          selection.value.items.length === 1 &&
          selection.value.primary.kind !== 'placement'
        ? selection.value.primary.id
        : null;
  if (!annotationId) return null;
  const annotation = view.annotations.find((candidate) => candidate.id === annotationId);
  if (!annotation) return null;
  return (
    <InspectorShell
      title={
        annotation.kind === 'port_range'
          ? 'I/O Range Inspector'
          : annotation.kind === 'text'
            ? 'Text Inspector'
            : 'Area Inspector'
      }
      actions={
        <Button
          title={`Remove ${annotation.kind === 'port_range' ? 'I/O Range' : annotation.kind === 'text' ? 'text' : 'Area'}`}
          variant="destructive"
          onClick={async () => {
            if (annotation.kind === 'port_range') {
              const attached = getViewPortRangeAttachedLineCount(view, annotation.id);
              if (
                attached > 0 &&
                !(await confirm({
                  title: 'Remove I/O Range?',
                  message: `This I/O Range has ${attached} attached View line(s). Removing it will also remove those lines.`,
                  confirmLabel: 'Remove',
                  tone: 'danger',
                }))
              ) {
                return;
              }
            }
            removeViewAnnotation(view.id, annotation.id);
            onRemoved();
          }}
        >
          <Trash2 className="h-4 w-4" />
          Remove
        </Button>
      }
    >
      <AnnotationFields
        key={annotation.id}
        annotation={annotation}
        view={view}
        onOpenSource={onOpenSource}
        onUpdate={(next) => updateViewAnnotation(view.id, annotation.id, next)}
      />
    </InspectorShell>
  );
}

function AnnotationFields({
  annotation,
  view,
  onOpenSource,
  onUpdate,
}: {
  annotation: ViewAnnotation;
  view: ProjectView;
  onOpenSource: (type: ViewSourceType, id: string) => void;
  onUpdate: (annotation: ViewAnnotation) => void;
}) {
  const { project } = useProject();
  if (annotation.kind === 'port_range') {
    const placement = view.placements.find((candidate) => candidate.id === annotation.placementId);
    const start = project.ports.find((port) => port.id === annotation.startPortId)?.label ?? 'Missing I/O';
    const end = project.ports.find((port) => port.id === annotation.endPortId)?.label ?? 'Missing I/O';
    return (
      <div className="editor-form inspector-form">
        <Field id="view-element-label" label="Label">
          <Input
            id="view-element-label"
            defaultValue={annotation.label}
            placeholder="Add label"
            onBlur={(event) => onUpdate({ ...annotation, label: event.target.value.trim() })}
          />
        </Field>
        <ReadOnly label="Side" value={annotation.side === 'left' ? 'Left' : 'Right'} />
        <ReadOnly label="Start I/O" value={start} />
        <ReadOnly label="End I/O" value={end} />
        <Button
          title="Open source Device"
          disabled={!placement}
          variant="outline"
          onClick={() => placement && onOpenSource('device', placement.sourceId)}
        >
          <ExternalLink className="h-4 w-4" />
          Open Device
        </Button>
        <p className="view-inspector-note">Presentation only; this range does not connect ports or cables.</p>
      </div>
    );
  }
  if (annotation.kind === 'text') {
    return (
      <div className="editor-form inspector-form">
        <Field id="view-element-label" label="Text">
          <Input
            id="view-element-label"
            defaultValue={annotation.text}
            onBlur={(event) => {
              const value = event.target.value.trim();
              if (value) onUpdate({ ...annotation, text: value });
            }}
          />
        </Field>
        <Field id="view-text-size" label="Size">
          <select
            id="view-text-size"
            aria-label="Text size"
            title="Text size"
            value={annotation.size}
            onChange={(event) =>
              onUpdate({ ...annotation, size: event.target.value as typeof annotation.size })
            }
          >
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </Field>
        <NumberField
          id="view-text-width"
          label="Width (mm)"
          value={annotation.widthMm}
          min={10}
          onCommit={(value) => onUpdate({ ...annotation, widthMm: Math.max(10, value) })}
        />
      </div>
    );
  }
  return (
    <div className="editor-form inspector-form">
      <Field id="view-element-label" label="Area Label">
        <Input
          id="view-element-label"
          defaultValue={annotation.label}
          onBlur={(event) => {
            const value = event.target.value.trim();
            if (value) onUpdate({ ...annotation, label: value });
          }}
        />
      </Field>
      <div className="form-grid-two">
        <NumberField
          id="view-group-x"
          label="X (mm)"
          value={annotation.xMm}
          onCommit={(xMm) => onUpdate({ ...annotation, xMm })}
        />
        <NumberField
          id="view-group-y"
          label="Y (mm)"
          value={annotation.yMm}
          onCommit={(yMm) => onUpdate({ ...annotation, yMm })}
        />
        <NumberField
          id="view-group-width"
          label="Width (mm)"
          value={annotation.widthMm}
          min={20}
          onCommit={(widthMm) => onUpdate({ ...annotation, widthMm: Math.max(20, widthMm) })}
        />
        <NumberField
          id="view-group-height"
          label="Height (mm)"
          value={annotation.heightMm}
          min={15}
          onCommit={(heightMm) => onUpdate({ ...annotation, heightMm: Math.max(15, heightMm) })}
        />
      </div>
      <p className="view-inspector-note">
        Visual background only. Multi-select items to move them together temporarily.
      </p>
    </div>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="form-field">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div className="view-inspector-readonly">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function titleCase(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
function NumberField({
  id,
  label,
  value,
  min,
  onCommit,
}: {
  id: string;
  label: string;
  value: number;
  min?: number;
  onCommit: (value: number) => void;
}) {
  return (
    <Field id={id} label={label}>
      <Input
        id={id}
        type="number"
        min={min}
        defaultValue={value}
        onBlur={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next)) onCommit(next);
        }}
      />
    </Field>
  );
}
