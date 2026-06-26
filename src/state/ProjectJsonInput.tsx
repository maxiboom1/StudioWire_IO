import type { ProjectJsonInputProps } from './projectContextTypes';
import { useProject } from './ProjectContext';

export const PROJECT_JSON_INPUT_ACCEPT = '.json,.studiowire,application/json';

export interface ProjectJsonInputChangeEvent {
  target: {
    files: ArrayLike<File> | null;
    value: string;
  };
}

export async function handleProjectJsonInputChange(
  event: ProjectJsonInputChangeEvent,
  importProjectJson: (file: File) => Promise<boolean>,
  onImportComplete?: () => void,
): Promise<void> {
  const file = event.target.files?.[0];

  if (!file) {
    return;
  }

  const imported = await importProjectJson(file);

  if (imported) {
    onImportComplete?.();
  }

  event.target.value = '';
}

export function ProjectJsonInput({ className, id, inputRef, onImportComplete }: ProjectJsonInputProps) {
  const { importProjectJson } = useProject();

  return (
    <input
      aria-label="Import Project JSON"
      aria-hidden="true"
      className={className}
      id={id}
      ref={inputRef}
      tabIndex={-1}
      type="file"
      accept={PROJECT_JSON_INPUT_ACCEPT}
      onChange={(event) => {
        void handleProjectJsonInputChange(event, importProjectJson, onImportComplete);
      }}
    />
  );
}
