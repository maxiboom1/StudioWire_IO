import { afterEach, describe, expect, it, vi } from 'vitest';
import { sampleProject } from '../domain/sampleProject';
import { downloadProjectJson, serializeProjectJson } from './projectExport';

const originalDocument = globalThis.document;
const originalCreateObjectUrl = URL.createObjectURL;
const originalRevokeObjectUrl = URL.revokeObjectURL;

afterEach(() => {
  vi.restoreAllMocks();

  Object.defineProperty(globalThis, 'document', {
    value: originalDocument,
    configurable: true,
  });
  Object.defineProperty(URL, 'createObjectURL', {
    value: originalCreateObjectUrl,
    configurable: true,
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    value: originalRevokeObjectUrl,
    configurable: true,
  });
});

describe('projectExport', () => {
  it('serializes project JSON with stable indentation', () => {
    const serialized = serializeProjectJson(sampleProject);

    expect(serialized).toBe(JSON.stringify(sampleProject, null, 2));
    expect(JSON.parse(serialized)).toMatchObject({
      schemaVersion: sampleProject.schemaVersion,
      project: {
        id: sampleProject.project.id,
      },
    });
  });

  it('downloads a project JSON blob through a temporary anchor', () => {
    const anchor = {
      href: '',
      download: '',
      click: vi.fn(),
      remove: vi.fn(),
    };
    const append = vi.fn();

    Object.defineProperty(globalThis, 'document', {
      value: {
        createElement: vi.fn(() => anchor),
        body: { append },
      },
      configurable: true,
    });
    Object.defineProperty(URL, 'createObjectURL', {
      value: vi.fn(() => 'blob:project-json'),
      configurable: true,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: vi.fn(),
      configurable: true,
    });

    downloadProjectJson(sampleProject);

    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(anchor.href).toBe('blob:project-json');
    expect(anchor.download).toBe('project.studiowire.json');
    expect(append).toHaveBeenCalledWith(anchor);
    expect(anchor.click).toHaveBeenCalledOnce();
    expect(anchor.remove).toHaveBeenCalledOnce();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:project-json');
  });
});
