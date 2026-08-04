import type { ProjectCommands } from '../state/projectContextTypes';

type ViewCommandName =
  | 'addView'
  | 'updateView'
  | 'deleteView'
  | 'addViewPlacement'
  | 'updateViewPlacement'
  | 'removeViewPlacement'
  | 'addViewLine'
  | 'updateViewLine'
  | 'removeViewLine'
  | 'addViewAnnotation'
  | 'updateViewAnnotation'
  | 'removeViewAnnotation'
  | 'replaceViewCanvas';

export const noopViewCommands: Pick<ProjectCommands, ViewCommandName> = {
  addView: () => 'view-test',
  updateView: () => undefined,
  deleteView: () => undefined,
  addViewPlacement: () => 'view-placement-test',
  updateViewPlacement: () => undefined,
  removeViewPlacement: () => undefined,
  addViewLine: () => 'view-line-test',
  updateViewLine: () => undefined,
  removeViewLine: () => undefined,
  addViewAnnotation: () => 'view-annotation-test',
  updateViewAnnotation: () => undefined,
  removeViewAnnotation: () => undefined,
  replaceViewCanvas: () => undefined,
};
