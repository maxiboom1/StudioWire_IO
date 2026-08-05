import { Trash2 } from 'lucide-react';
import type { ProjectView } from '../../domain/types';
import { removeViewMovableElements, type ViewMovableSelection } from '../../domain/viewSelection';
import { InspectorShell } from '../common/InspectorShell';
import { Button } from '../ui/button';
import { useViewCanvasCommands } from './ViewCanvasHistoryContext';

export function ViewSelectionInspector({
  selection,
  view,
  onRemoved,
}: {
  selection: ViewMovableSelection;
  view: ProjectView;
  onRemoved: () => void;
}) {
  const { replaceViewCanvas } = useViewCanvasCommands();
  const counts = selection.items.reduce(
    (current, item) => ({ ...current, [item.kind]: current[item.kind] + 1 }),
    { placement: 0, text: 0, group: 0 },
  );

  function remove() {
    const next = removeViewMovableElements(view, selection.items);
    replaceViewCanvas(view.id, {
      placements: next.placements,
      lines: next.lines,
      annotations: next.annotations,
    });
    onRemoved();
  }

  return (
    <InspectorShell
      title="Selection Inspector"
      actions={
        <Button title="Remove selected canvas items" variant="destructive" type="button" onClick={remove}>
          <Trash2 aria-hidden="true" className="h-4 w-4" />
          Remove Selected
        </Button>
      }
    >
      <div className="view-selection-inspector">
        <strong>{selection.items.length} items selected</strong>
        <dl>
          <CountRow label="Placements" value={counts.placement} />
          <CountRow label="Text" value={counts.text} />
          <CountRow label="Areas" value={counts.group} />
        </dl>
        <p className="view-inspector-note">
          Temporary canvas selection only. This does not create a persistent group.
        </p>
      </div>
    </InspectorShell>
  );
}

function CountRow({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
