import { describe, expect, it } from 'vitest';
import { sampleProject } from '../domain/sampleProject';
import { importProjectFile, exportProjectFile } from './projectFileTransfer';

describe('project file transfer orchestration', () => {
  it('imports file text through the injected strict importer', async () => {
    const result = await importProjectFile(
      { text: async () => 'project-json' },
      {
        readFileText: (file) => file.text(),
        importJsonText: (text) => ({
          ok: true,
          project: structuredClone(sampleProject),
          validationIssues: [{ id: text } as any],
          removedViewLineCount: 0,
        }),
      },
    );

    expect(result).toMatchObject({ ok: true, validationIssues: [{ id: 'project-json' }] });
  });

  it('returns a controlled failure when file reading fails', async () => {
    const result = await importProjectFile(
      { text: async () => '' },
      {
        readFileText: async () => {
          throw new Error('blocked');
        },
        importJsonText: () => {
          throw new Error('should not import');
        },
      },
    );

    expect(result).toMatchObject({
      ok: false,
      error: 'File read failed: blocked',
      errors: [{ code: 'file-read-failed', path: '$', message: 'blocked' }],
    });
  });

  it('exports the supplied current project through the injected downloader', () => {
    const exported: string[] = [];

    exportProjectFile(structuredClone(sampleProject), {
      downloadProject: (project) => exported.push(project.project.name),
    });

    expect(exported).toEqual(['Demo Studio']);
  });
});
