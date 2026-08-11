/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sampleProject } from '../../domain/sampleProject';
import type { ProjectView } from '../../domain/types';
import { ConfirmationProvider } from '../common/ConfirmationDialog';
import { ViewElementInspector } from './ViewElementInspector';

const harness = vi.hoisted(() => ({ current: null as any }));
vi.mock('../../state/ProjectContext', () => ({ useProject: () => harness.current }));

afterEach(() => {
  cleanup();
  harness.current = null;
});

function view(): ProjectView {
  return {
    id: 'view',
    name: 'View',
    description: '',
    pageSize: 'a3',
    orientation: 'portrait',
    placements: [
      {
        id: 'router',
        sourceType: 'device',
        sourceId: 'device-router-1',
        xMm: 10,
        yMm: 10,
        scale: 1,
        labelOverride: null,
      },
      {
        id: 'multiviewer',
        sourceType: 'device',
        sourceId: 'device-multiviewer-1',
        xMm: 160,
        yMm: 10,
        scale: 1,
        labelOverride: null,
      },
    ],
    lines: [
      {
        id: 'line',
        from: { kind: 'port', placementId: 'router', portId: 'port-group-router-outputs-port-0001' },
        to: {
          kind: 'port',
          placementId: 'multiviewer',
          portId: 'port-group-multiviewer-inputs-port-0001',
        },
        label: '12x SDI',
        waypoints: [{ xMm: 120, yMm: 20, flexPathId: null }],
        color: 'black',
        width: 'thin',
        labelOrientation: 'horizontal',
        labelPosition: 0.5,
      },
    ],
    annotations: [],
  };
}

describe('ViewElementInspector line controls', () => {
  it('edits the fixed line style and direction controls and protects label input Delete', async () => {
    const user = userEvent.setup();
    const updateViewLine = vi.fn();
    harness.current = {
      project: structuredClone(sampleProject),
      updateViewLine,
      removeViewLine: vi.fn(),
      updateViewAnnotation: vi.fn(),
      removeViewAnnotation: vi.fn(),
    };
    const currentView = view();
    render(
      <ConfirmationProvider>
        <ViewElementInspector
          selection={{ kind: 'line', id: 'line' }}
          view={currentView}
          onOpenSource={vi.fn()}
          onRemoved={vi.fn()}
        />
      </ConfirmationProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'blue line color' }));
    await user.click(screen.getByRole('button', { name: 'Wide' }));
    await user.click(screen.getByRole('button', { name: 'Vertical' }));
    expect(updateViewLine).toHaveBeenCalledWith('view', 'line', { color: 'blue' });
    expect(updateViewLine).toHaveBeenCalledWith('view', 'line', { width: 'wide' });
    expect(updateViewLine).toHaveBeenCalledWith('view', 'line', { labelOrientation: 'vertical' });
    const label = screen.getByLabelText('Line Label');
    fireEvent.keyDown(label, { key: 'Delete' });
    expect(harness.current.removeViewLine).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Reset Route' }));
    expect(updateViewLine).toHaveBeenCalledWith('view', 'line', { waypoints: [] });
  });

  it('confirms and reports attached lines before removing an I/O Range', async () => {
    const user = userEvent.setup();
    const removeViewAnnotation = vi.fn();
    harness.current = {
      project: structuredClone(sampleProject),
      updateViewLine: vi.fn(),
      removeViewLine: vi.fn(),
      updateViewAnnotation: vi.fn(),
      removeViewAnnotation,
    };
    const currentView = view();
    currentView.annotations = [
      {
        id: 'range',
        kind: 'port_range',
        placementId: 'router',
        side: 'right',
        startPortId: 'port-group-router-outputs-port-0001',
        endPortId: 'port-group-router-outputs-port-0002',
        label: 'ROUTER',
      },
    ];
    currentView.lines[0].from = {
      kind: 'port_range',
      placementId: 'router',
      annotationId: 'range',
    };
    render(
      <ConfirmationProvider>
        <ViewElementInspector
          selection={{ kind: 'portRange', id: 'range' }}
          view={currentView}
          onOpenSource={vi.fn()}
          onRemoved={vi.fn()}
        />
      </ConfirmationProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    expect(removeViewAnnotation).not.toHaveBeenCalled();
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/1 attached View line/)).toBeTruthy();
    await user.click(within(dialog).getByRole('button', { name: 'Remove' }));
    expect(removeViewAnnotation).toHaveBeenCalledWith('view', 'range');
  });
});
