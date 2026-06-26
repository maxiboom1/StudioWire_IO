import { describe, expect, it } from 'vitest';
import { isForbiddenPackageRelativePath, validateArchiveEntryName } from './source-package-lib.mjs';

describe('source package path safety', () => {
  it('rejects traversal, absolute, drive-qualified, duplicate, generated, and forbidden entries', () => {
    const seen = new Set();
    const rootName = 'StudioWire_IO-0.2.8.6';

    expect(validateArchiveEntryName(`${rootName}/package.json`, rootName, seen)).toMatchObject({ ok: true });
    expect(validateArchiveEntryName(`${rootName}/../escape.txt`, rootName, seen)).toMatchObject({
      ok: false,
    });
    expect(validateArchiveEntryName('/absolute.txt', rootName, seen)).toMatchObject({ ok: false });
    expect(validateArchiveEntryName('C:/absolute.txt', rootName, seen)).toMatchObject({ ok: false });
    expect(validateArchiveEntryName(`${rootName}/dist/index.js`, rootName, seen)).toMatchObject({
      ok: false,
    });
    expect(validateArchiveEntryName(`${rootName}/CHANGELOG.md`, rootName, seen)).toMatchObject({ ok: false });
    expect(validateArchiveEntryName(`${rootName}/package.json`, rootName, seen)).toMatchObject({ ok: false });
  });

  it('keeps maintained samples and image assets eligible while blocking generated extensions', () => {
    expect(isForbiddenPackageRelativePath('docs/samples/sample-project.studiowire.json')).toBe(false);
    expect(isForbiddenPackageRelativePath('src/assets/studiowire-logo.png')).toBe(false);
    expect(isForbiddenPackageRelativePath('nested/report.trace.zip')).toBe(true);
    expect(isForbiddenPackageRelativePath('nested/build/output.txt')).toBe(true);
  });
});
