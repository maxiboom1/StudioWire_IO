import type { Rack } from '../../domain/types';
import { useProject } from '../../state/ProjectContext';
import { CanvasViewport } from '../common/CanvasViewport';
import { RackElevationCanvas } from './RackElevationCanvas';
import { RackViewSelector } from './RackViewSelector';
import { buildRackCanvasModel } from './rackCanvasModel';
import { useRackViewController } from './useRackViewController';

export function RackWorkspace({ rack }: { rack: Rack }) {
  const { project, moveMountedDevice } = useProject();
  const rackView = useRackViewController({ project, selectedRack: rack, moveMountedDevice });

  return (
    <section className="workspace rack-workspace" aria-label="Rack canvas">
      {rackView.viewedRacks.length === 0 ? null : (
        <CanvasViewport
          ariaLabel="Rack canvas zoom and pan viewport"
          className="rack-canvas-viewport"
          toolbarContent={
            <RackViewSelector
              addableRacks={rackView.addableRacks}
              hasReachedRackLimit={rackView.hasReachedRackLimit}
              locations={project.locations}
              onAddRack={rackView.addRackToView}
            />
          }
        >
          <div className="rack-canvas-grid" aria-label="Viewed rack elevations">
            {rackView.viewedRacks.map((viewedRack) => {
              const rackDevices = project.devices.filter((device) => device.rackId === viewedRack.id);
              const canvasModel = buildRackCanvasModel(
                viewedRack,
                rackDevices,
                rackView.getRackDiagnostics(viewedRack.id),
              );

              return (
                <div className="rack-canvas-panel" key={viewedRack.id}>
                  <RackElevationCanvas
                    canRemove={rackView.viewedRacks.length > 1}
                    dropPreview={rackView.dropPreview?.rackId === viewedRack.id ? rackView.dropPreview : null}
                    draggingDeviceId={rackView.draggingDeviceId}
                    model={canvasModel}
                    rack={viewedRack}
                    onDeviceDragEnd={rackView.handleDeviceDragEnd}
                    onDeviceDragStart={rackView.handleDeviceDragStart}
                    onRackDragOver={(event) =>
                      rackView.handleRackDragOver(event, viewedRack, canvasModel.displayRus)
                    }
                    onRackDrop={(event) => rackView.handleRackDrop(event, viewedRack, canvasModel.displayRus)}
                    onRemove={() => rackView.removeRackFromView(viewedRack.id)}
                  />
                </div>
              );
            })}
          </div>
        </CanvasViewport>
      )}
    </section>
  );
}
