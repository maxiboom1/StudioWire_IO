import type { ViewPlacement } from '../../domain/types';
import type { ViewLineEndpointRole } from '../../domain/viewLineReconnection';
import type { ViewMovableElementRef, ViewMovableSelection } from '../../domain/viewSelection';

export interface ViewDropPreview {
  placement: ViewPlacement;
  duplicatePlacementId: string | null;
}

export type ViewEditorTool = 'select' | 'line' | 'text' | 'group' | 'portRange';

export type ViewCanvasSelection =
  | { kind: 'movable'; value: ViewMovableSelection }
  | { kind: 'line'; id: string; bendIndex?: number }
  | { kind: 'portRange'; id: string };

export type { ViewMovableElementRef, ViewMovableSelection };
export type { ViewLineEndpointRole };
