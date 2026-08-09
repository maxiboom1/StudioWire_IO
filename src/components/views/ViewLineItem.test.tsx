/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sampleProject } from '../../domain/sampleProject';
import type { ProjectView, ViewLine } from '../../domain/types';
import type { ViewEditorController } from './useViewEditorController';
import { ViewLineItem } from './ViewLineItem';

afterEach(cleanup);

function line(overrides: Partial<ViewLine> = {}): ViewLine {
  return {
    id: 'line',
    from: { kind: 'port', placementId: 'router', portId: 'port-group-router-outputs-port-0001' },
    to: {
      kind: 'port',
      placementId: 'multiviewer',
      portId: 'port-group-multiviewer-inputs-port-0001',
    },
    label: '12x SDI',
    waypoints: [],
    color: 'blue',
    width: 'wide',
    labelOrientation: 'vertical',
    labelPosition: 0.25,
    ...overrides,
  };
}

function view(currentLine: ViewLine): ProjectView {
  return {
    id: 'view',
    name: 'View',
    description: '',
    pageSize: 'a3',
    orientation: 'landscape',
    placements: [
      {
        id: 'router',
        sourceType: 'device',
        sourceId: 'device-router-1',
        xMm: 20,
        yMm: 20,
        scale: 1,
        labelOverride: null,
      },
      {
        id: 'multiviewer',
        sourceType: 'device',
        sourceId: 'device-multiviewer-1',
        xMm: 180,
        yMm: 80,
        scale: 1,
        labelOverride: null,
      },
    ],
    lines: [currentLine],
    annotations: [],
  };
}

function controller(selection: 'line' | null = 'line') {
  return {
    project: structuredClone(sampleProject),
    zoom: 1,
    linePreview: null,
    canvasSelection: selection ? { kind: 'line', id: 'line' } : null,
    selectCanvas: vi.fn(),
    addWaypoint: vi.fn(),
    beginInsertedWaypointGesture: vi.fn(),
    beginWaypointGesture: vi.fn(),
    beginLineLabelGesture: vi.fn(),
  } as unknown as ViewEditorController;
}

describe('ViewLineItem', () => {
  it('keeps configured stroke color/width, black label class, and restrained selection halo', () => {
    const currentLine = line();
    const editor = controller();
    const { container } = render(
      <svg>
        <ViewLineItem controller={editor} line={currentLine} view={view(currentLine)} warningIndex={0} />
      </svg>,
    );
    const group = container.querySelector('g.is-selected') as SVGGElement;
    expect(group.style.getPropertyValue('--view-line-color')).toBe('#3465EB');
    expect(group.style.getPropertyValue('--view-line-width')).toBe('5px');
    expect(container.querySelector('.view-line-selection-halo')).toBeTruthy();
    expect(container.querySelector('.view-line-label.is-vertical')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Change line label/ })).toBeNull();
  });

  it('renders unresolved lines as selectable removable warnings', () => {
    const currentLine = line({
      from: { kind: 'port', placementId: 'router', portId: 'missing-port' },
    });
    const editor = controller(null);
    render(
      <svg>
        <ViewLineItem controller={editor} line={currentLine} view={view(currentLine)} warningIndex={2} />
      </svg>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Missing line endpoint')).toBeTruthy();
    expect(editor.selectCanvas).toHaveBeenCalledWith({ kind: 'line', id: 'line' });
  });

  it('starts one bend insertion gesture on Ctrl-pointer down at the page point', () => {
    const currentLine = line();
    const editor = controller();
    const { container } = render(
      <div className="view-page">
        <svg>
          <ViewLineItem controller={editor} line={currentLine} view={view(currentLine)} warningIndex={0} />
        </svg>
      </div>,
    );
    const page = container.querySelector('.view-page') as HTMLElement;
    vi.spyOn(page, 'getBoundingClientRect').mockReturnValue({
      left: 30,
      top: 20,
      right: 630,
      bottom: 420,
      width: 600,
      height: 400,
      x: 30,
      y: 20,
      toJSON: () => ({}),
    });
    const group = container.querySelector('g.is-selected') as SVGGElement;
    const pointerDown = new MouseEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      clientX: 60,
      clientY: 50,
      ctrlKey: true,
    });
    Object.defineProperty(pointerDown, 'pointerId', { value: 7 });
    fireEvent(group, pointerDown);
    expect(editor.beginInsertedWaypointGesture).toHaveBeenCalledWith(expect.anything(), currentLine, {
      xMm: 10,
      yMm: 10,
    });
  });
});
