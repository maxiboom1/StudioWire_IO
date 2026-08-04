import type { ViewPlacement } from '../../domain/types';

export interface ViewPlacementPreview {
  placementId: string;
  xMm: number;
  yMm: number;
  scale: number;
}

export interface ViewDropPreview {
  placement: ViewPlacement;
  duplicatePlacementId: string | null;
}
