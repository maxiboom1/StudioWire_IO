import { getInspectorRows, resolveSelection, type SelectionState } from '../common/selection';
import { useProject } from '../../state/ProjectContext';
import { DeviceInspector } from '../devices/DeviceInspector';
import { LocationInspector } from '../locations/LocationInspector';
import { RackInspector } from '../racks/RackInspector';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

export function Inspector({ selection }: { selection: SelectionState }) {
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
    return <LocationInspector location={selected.value} />;
  }

  if (selected.type === 'rack') {
    return <RackInspector rack={selected.value} />;
  }

  if (selected.type === 'device') {
    return <DeviceInspector device={selected.value} />;
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
