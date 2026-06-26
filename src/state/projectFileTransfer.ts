import { importProjectJsonText, type ProjectImportResult } from '../domain/projectImport';
import type { ProjectRoot } from '../domain/types';
import { downloadProjectJson } from './projectExport';

export interface ProjectFileLike {
  text(): Promise<string>;
}

export interface ProjectFileTransferDependencies {
  readFileText: (file: ProjectFileLike) => Promise<string>;
  importJsonText: (text: string) => ProjectImportResult;
  downloadProject: (project: ProjectRoot) => void;
}

export const defaultProjectFileTransferDependencies: ProjectFileTransferDependencies = {
  readFileText: (file) => file.text(),
  importJsonText: importProjectJsonText,
  downloadProject: downloadProjectJson,
};

export async function importProjectFile(
  file: ProjectFileLike,
  dependencies: Pick<
    ProjectFileTransferDependencies,
    'readFileText' | 'importJsonText'
  > = defaultProjectFileTransferDependencies,
): Promise<ProjectImportResult> {
  let text: string;

  try {
    text = await dependencies.readFileText(file);
  } catch (error) {
    return {
      ok: false,
      error: `File read failed: ${error instanceof Error ? error.message : 'Unable to read file.'}`,
      errors: [
        {
          code: 'file-read-failed',
          path: '$',
          message: error instanceof Error ? error.message : 'Unable to read file.',
        },
      ],
    };
  }

  return dependencies.importJsonText(text);
}

export function exportProjectFile(
  project: ProjectRoot,
  dependencies: Pick<
    ProjectFileTransferDependencies,
    'downloadProject'
  > = defaultProjectFileTransferDependencies,
): void {
  dependencies.downloadProject(project);
}
