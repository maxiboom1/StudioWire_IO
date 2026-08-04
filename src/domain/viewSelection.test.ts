import { describe, expect, it } from 'vitest';
import { sampleProject } from './sampleProject';
import { DEFAULT_VIEW_LINE_STYLE } from './viewLineStyles';
import type { ProjectView } from './types';
import {
  addToViewMovableSelection,
  createViewMovableSelection,
  findViewMovableElementsInMarquee,
  getViewPointerTranslation,
  normalizeViewMovableSelection,
  removeViewMovableElements,
  toggleViewMovableSelection,
  translateViewMovableElements,
} from './viewSelection';

function fixture(): ProjectView {
  return {
    id: 'view-selection',
    name: 'Selection View',
    description: '',
    pageSize: 'a3',
    orientation: 'landscape',
    placements: [
      {
        id: 'placement-router',
        sourceType: 'device',
        sourceId: 'device-router-1',
        xMm: 10,
        yMm: 10,
        scale: 1,
        labelOverride: null,
      },
      {
        id: 'placement-multiviewer',
        sourceType: 'device',
        sourceId: 'device-multiviewer-1',
        xMm: 150,
        yMm: 30,
        scale: 1,
        labelOverride: null,
      },
    ],
    lines: [
      {
        id: 'line-attached',
        from: {
          kind: 'port',
          placementId: 'placement-router',
          portId: 'port-group-router-outputs-port-0001',
        },
        to: {
          kind: 'port',
          placementId: 'placement-multiviewer',
          portId: 'port-group-multiviewer-inputs-port-0001',
        },
        label: 'Group line',
        waypoints: [],
        ...DEFAULT_VIEW_LINE_STYLE,
      },
    ],
    annotations: [
      {
        id: 'text-heading',
        kind: 'text',
        xMm: 115,
        yMm: 20,
        widthMm: 20,
        text: 'VIDEO',
        size: 'medium',
      },
      {
        id: 'area-main',
        kind: 'group',
        xMm: 5,
        yMm: 5,
        widthMm: 260,
        heightMm: 120,
        label: 'Main Area',
      },
      {
        id: 'range-router',
        kind: 'port_range',
        placementId: 'placement-router',
        side: 'right',
        startPortId: 'port-group-router-outputs-port-0001',
        endPortId: 'port-group-router-outputs-port-0001',
        label: 'TO MV',
      },
    ],
  };
}

describe('View transient selection', () => {
  it('normalizes ordered unique items and keeps a stable primary while toggling and adding', () => {
    const view = fixture();
    const router = { kind: 'placement' as const, id: 'placement-router' };
    const text = { kind: 'text' as const, id: 'text-heading' };
    const selection = createViewMovableSelection([router, router, text], text)!;

    expect(selection).toEqual({ primary: text, items: [router, text] });
    expect(toggleViewMovableSelection(selection, text)).toEqual({ primary: router, items: [router] });
    expect(addToViewMovableSelection(selection, [{ kind: 'group', id: 'area-main' }])?.primary).toEqual(
      text,
    );
    expect(
      normalizeViewMovableSelection(view, {
        primary: { kind: 'text', id: 'stale' },
        items: [text, { kind: 'text', id: 'stale' }],
      }),
    ).toEqual({ primary: text, items: [text] });
  });

  it('uses full containment for marquee selection so a surrounding Area is not selected', () => {
    const view = fixture();
    expect(
      findViewMovableElementsInMarquee(sampleProject, view, {
        xMm: 110,
        yMm: 15,
        widthMm: 30,
        heightMm: 20,
      }),
    ).toEqual([{ kind: 'text', id: 'text-heading' }]);
  });

  it('applies one snapped or free shared delta and preserves every relative offset', () => {
    const view = fixture();
    const items = [
      { kind: 'placement' as const, id: 'placement-router' },
      { kind: 'text' as const, id: 'text-heading' },
    ];
    const selection = createViewMovableSelection(items, items[0])!;
    const snapped = getViewPointerTranslation(
      sampleProject,
      view,
      selection,
      { xMm: 16, yMm: 16 },
      { widthMm: 420, heightMm: 297 },
      1,
      true,
    );
    const free = getViewPointerTranslation(
      sampleProject,
      view,
      selection,
      { xMm: 16, yMm: 16 },
      { widthMm: 420, heightMm: 297 },
      1,
      false,
    );
    const moved = translateViewMovableElements(view, items, snapped);

    expect(snapped).toEqual({ xMm: 4.893617, yMm: 4.893617 });
    expect(free).toEqual({ xMm: 6, yMm: 6 });
    expect(moved.placements[0]).toMatchObject({ xMm: 14.893617, yMm: 14.893617 });
    expect(moved.annotations[0]).toMatchObject({ xMm: 119.893617, yMm: 24.893617 });
    expect(moved.annotations[1]).toBe(view.annotations[1]);
    expect(moved.lines).toBe(view.lines);
  });

  it('clamps a selection that begins inside but permits repair movement for outside content', () => {
    const inside = fixture();
    const selection = createViewMovableSelection([
      { kind: 'placement', id: 'placement-multiviewer' },
    ])!;
    const clamped = getViewPointerTranslation(
      sampleProject,
      inside,
      selection,
      { xMm: 410, yMm: 30 },
      { widthMm: 420, heightMm: 297 },
      1,
      false,
    );
    expect(clamped.xMm).toBeLessThan(260);

    const outside = {
      ...inside,
      placements: inside.placements.map((placement) =>
        placement.id === 'placement-multiviewer' ? { ...placement, xMm: 410 } : placement,
      ),
    };
    expect(
      getViewPointerTranslation(
        sampleProject,
        outside,
        selection,
        { xMm: 450, yMm: 30 },
        { widthMm: 420, heightMm: 297 },
        1,
        false,
      ),
    ).toEqual({ xMm: 40, yMm: 0 });
  });

  it('removes selected placements and free annotations atomically with attached View cleanup only', () => {
    const view = fixture();
    const engineeringBefore = engineeringSnapshot(sampleProject);
    const removed = removeViewMovableElements(view, [
      { kind: 'placement', id: 'placement-router' },
      { kind: 'text', id: 'text-heading' },
    ]);

    expect(removed.placements.map((item) => item.id)).toEqual(['placement-multiviewer']);
    expect(removed.lines).toEqual([]);
    expect(removed.annotations.map((item) => item.id)).toEqual(['area-main']);
    expect(engineeringSnapshot(sampleProject)).toEqual(engineeringBefore);
  });
});

function engineeringSnapshot(project: typeof sampleProject) {
  return structuredClone({
    settings: project.settings,
    locations: project.locations,
    subLocations: project.subLocations,
    racks: project.racks,
    devices: project.devices,
    portGroups: project.portGroups,
    ports: project.ports,
    cables: project.cables,
    numberingLedgers: project.numberingLedgers,
  });
}
