export interface InspectorDirtyGuard {
  isDirty: boolean;
  save: () => boolean;
  discard: () => void;
}
