import { getInspectorRows, resolveSelection, type SelectionState } from '../common/selection';
import { useProject } from '../../state/ProjectContext';
import { DeviceInspector } from '../devices/DeviceInspector';
import type { InspectorDirtyGuard } from '../common/inspectorDirtyGuard';
import { FolderInspector } from '../locations/FolderInspector';
import { LocationInspector } from '../locations/LocationInspector';
import { RackInspector } from '../racks/RackInspector';
import { ViewInspector } from '../views/ViewInspector';
import { ViewPlacementInspector } from '../views/ViewPlacementInspector';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import type { ViewCanvasSelection } from '../views/viewEditorTypes';
import { ViewElementInspector } from '../views/ViewElementInspector';
import { ViewSelectionInspector } from '../views/ViewSelectionInspector';

export function Inspector({
  onInspectorDirtyGuardChange,
  viewCanvasSelection,
  onViewCanvasSelectionChange,
  onOpenObject,
  selection,
}: {
  onInspectorDirtyGuardChange?: (guard: InspectorDirtyGuard | null) => void;
  selection: SelectionState;
  viewCanvasSelection: ViewCanvasSelection | null;
  onViewCanvasSelectionChange: (selection: ViewCanvasSelection | null) => void;
  onOpenObject: (type: 'device' | 'rack', id: string) => void;
}) {
  const { project } = useProject();
  const selected = resolveSelection(project, selection);

  if (!selected) {
    return (
      <aside className="inspector" aria-label="Right inspector">
        <Card className="inspector-card">
          <CardHeader>
            <CardTitle>Inspector</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="panel-empty">No object selected.</p>
          </CardContent>
        </Card>
      </aside>
    );
  }

  if (selected.type === 'location') {
    return <LocationInspector location={selected.value} onDirtyGuardChange={onInspectorDirtyGuardChange} />;
  }

  if (selected.type === 'folder') {
    return <FolderInspector folder={selected.value} onDirtyGuardChange={onInspectorDirtyGuardChange} />;
  }

  if (selected.type === 'rack') {
    return <RackInspector rack={selected.value} onDirtyGuardChange={onInspectorDirtyGuardChange} />;
  }

  if (selected.type === 'device') {
    return <DeviceInspector device={selected.value} onDirtyGuardChange={onInspectorDirtyGuardChange} />;
  }

  if (selected.type === 'view') {
    const movable = viewCanvasSelection?.kind === 'movable' ? viewCanvasSelection.value : null;
    if (movable && movable.items.length > 1) {
      return (
        <ViewSelectionInspector
          selection={movable}
          view={selected.value}
          onRemoved={() => onViewCanvasSelectionChange(null)}
        />
      );
    }
    const placement =
      movable?.primary.kind === 'placement'
        ? selected.value.placements.find((candidate) => candidate.id === movable.primary.id)
        : null;
    if (placement) {
      return (
        <ViewPlacementInspector
          placement={placement}
          view={selected.value}
          onOpenSource={onOpenObject}
          onRemoved={() => onViewCanvasSelectionChange(null)}
        />
      );
    }
    if (viewCanvasSelection) {
      return (
        <ViewElementInspector
          selection={viewCanvasSelection}
          view={selected.value}
          onOpenSource={onOpenObject}
          onRemoved={() => onViewCanvasSelectionChange(null)}
        />
      );
    }
    return <ViewInspector view={selected.value} onDirtyGuardChange={onInspectorDirtyGuardChange} />;
  }

  return (
    <aside className="inspector" aria-label="Right inspector">
      <Card className="inspector-card">
        <CardHeader>
          <CardTitle>Inspector</CardTitle>
        </CardHeader>
        <CardContent>
          <dl>
            {getInspectorRows(project, selected).map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </aside>
  );
}
