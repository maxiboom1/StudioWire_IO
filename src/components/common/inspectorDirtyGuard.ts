export interface InspectorDirtyGuard {
  isDirty: boolean;
  save: () => boolean | Promise<boolean>;
  discard: () => void;
}
