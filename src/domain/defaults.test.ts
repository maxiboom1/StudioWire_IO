import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createDefaultSettings } from './defaults';

describe('project settings defaults', () => {
  it('matches the maintained operator settings baseline', () => {
    const settings = createDefaultSettings();

    expect(
      settings.categories.map(({ id, name, defaultCablePrefix }) => [id, name, defaultCablePrefix]),
    ).toEqual([
      ['category-video', 'VIDEO', 'V'],
      ['category-audio', 'Audio', 'A'],
      ['category-network', 'Network', 'N'],
      ['category-reference', 'Reference', 'R'],
      ['category-rf', 'RF', 'RF'],
      ['category-control', 'Control', 'C'],
      ['category-av', 'AV', 'AV'],
    ]);
    expect(settings.connectorTypes.at(-1)).toEqual({
      id: 'connector-dvi',
      name: 'DVI',
      iconKey: 'generic',
    });
    expect(settings.categoryConnectorAssignments).toHaveLength(20);
    expect(
      settings.categoryConnectorAssignments
        .filter((assignment) => assignment.categoryId === 'category-video')
        .map((assignment) => assignment.connectorTypeId),
    ).toEqual(['connector-bnc', 'connector-micro-bnc', 'connector-sdi-din']);
    expect(
      settings.categoryConnectorAssignments
        .filter((assignment) => assignment.categoryId === 'category-audio')
        .map((assignment) => assignment.connectorTypeId),
    ).toContain('connector-sfp');
    expect(
      settings.categoryConnectorAssignments.find((assignment) => assignment.categoryId === 'category-av'),
    ).toEqual({
      id: 'assignment-av-dvi',
      categoryId: 'category-av',
      connectorTypeId: 'connector-dvi',
    });
    expect(
      settings.connectorCompatibilityGroupMembers.filter(
        (member) => member.groupId === 'group-video-sdi-coax',
      ),
    ).toEqual([]);
    expect(
      settings.connectorCompatibilityGroupMembers
        .filter((member) => member.groupId === 'group-audio-analog')
        .map((member) => member.connectorTypeId),
    ).toEqual(['connector-xlr', 'connector-pl', 'connector-rca']);
    expect(settings.cablePrefixes.at(-1)).toEqual({ id: 'prefix-av', prefix: 'AV', name: 'AV' });
    expect(settings.rackDefaults).toEqual({ heightRu: 48, numberingDirection: 'bottom_to_top' });
    expect(settings.labelRules).toEqual({
      cableNumberFormat: 'PREFIX-0001',
      cableNumberPadding: 4,
    });
  });

  it('keeps the current sample settings synchronized with new-project defaults', () => {
    const sample = JSON.parse(readFileSync('docs/samples/sample-project.studiowire.json', 'utf8')) as {
      settings: unknown;
    };

    expect(sample.settings).toEqual(createDefaultSettings());
  });
});
