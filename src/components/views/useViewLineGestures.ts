import type { ProjectRoot, ProjectView } from '../../domain/types';
import type { ViewDeviceScale } from '../../domain/viewLayoutGrid';
import type { ProjectContextValue } from '../../state/projectContextTypes';
import type { ViewCanvasSelection } from './viewEditorTypes';
import { useViewLineAuxiliaryGestures } from './useViewLineAuxiliaryGestures';
import { useViewLineRouteGestures } from './useViewLineRouteGestures';

interface ViewLineGestureOptions {
  project: ProjectRoot;
  view: ProjectView;
  zoom: number;
  layoutScale: ViewDeviceScale;
  selectCanvas: (selection: ViewCanvasSelection | null) => void;
  updateViewLine: ProjectContextValue['updateViewLine'];
  setNotice: (notice: string) => void;
}

export function useViewLineGestures(options: ViewLineGestureOptions) {
  const { project, view, zoom, layoutScale, selectCanvas, updateViewLine, setNotice } = options;
  const route = useViewLineRouteGestures({
    project,
    view,
    zoom,
    layoutScale,
    selectCanvas,
    updateViewLine,
    setNotice,
  });
  const auxiliary = useViewLineAuxiliaryGestures({
    project,
    view,
    zoom,
    selectCanvas,
    updateViewLine,
  });

  return {
    linePreview: route.linePreview ?? auxiliary.linePreview,
    flexPathPreview: route.flexPathPreview,
    endpointReconnect: auxiliary.endpointReconnect,
    beginWaypointGesture: route.beginWaypointGesture,
    beginSegmentGesture: route.beginSegmentGesture,
    beginLabelGesture: auxiliary.beginLabelGesture,
    beginEndpointReconnect: auxiliary.beginEndpointReconnect,
    updatePointer: (event: Parameters<typeof route.updatePointer>[0]) =>
      auxiliary.updatePointer(event) || route.updatePointer(event),
    finishPointer: (event: Parameters<typeof route.finishPointer>[0]) =>
      auxiliary.finishPointer(event) || route.finishPointer(event),
    cancel: () => {
      const auxiliaryActive = auxiliary.cancel();
      const routeActive = route.cancel();
      return auxiliaryActive || routeActive;
    },
    cleanupCapture: () => {
      auxiliary.cleanupCapture();
      route.cleanupCapture();
    },
  };
}
