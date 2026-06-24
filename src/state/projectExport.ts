import type { ProjectRoot } from '../domain/types';

export function serializeProjectJson(project: ProjectRoot): string {
  return JSON.stringify(project, null, 2);
}

export function downloadProjectJson(project: ProjectRoot): void {
  const blob = new Blob([serializeProjectJson(project)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = 'project.studiowire.json';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
