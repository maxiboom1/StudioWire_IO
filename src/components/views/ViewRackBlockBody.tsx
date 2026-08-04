import { analyzeRackPlacements } from '../../domain/rackDiagnostics';
import type { ProjectRoot, Rack } from '../../domain/types';
import { buildRackCanvasModel, getDiagnosticsForRack } from '../racks/rackCanvasModel';
import { RackElevationGrid } from '../racks/RackElevationGrid';

export function ViewRackBlockBody({ project, rack }: { project: ProjectRoot; rack: Rack }) {
  const diagnostics = analyzeRackPlacements(project);
  const model = buildRackCanvasModel(
    rack,
    project.devices.filter((device) => device.rackId === rack.id),
    getDiagnosticsForRack(diagnostics, rack.id),
  );

  return (
    <div className="view-rack-elevation">
      <RackElevationGrid rack={rack} model={model} readOnly />
    </div>
  );
}
