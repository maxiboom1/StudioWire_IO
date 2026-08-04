/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sampleProject } from '../../domain/sampleProject';
import type { ProjectView, ViewPlacement } from '../../domain/types';

const contextHarness = vi.hoisted(() => ({ current: null as any }));
vi.mock('../../state/ProjectContext', () => ({ useProject: () => contextHarness.current }));

import { ViewPlacementInspector } from './ViewPlacementInspector';

afterEach(cleanup);

describe('ViewPlacementInspector', () => {
  it('normalizes move-only display and position updates and removes only the placement', async () => {
    const user = userEvent.setup();
    const placement: ViewPlacement = {
      id: 'placement-router',
      sourceType: 'device',
      sourceId: 'device-router-1',
      xMm: 10,
      yMm: 10,
      scale: 1,
      labelOverride: null,
    };
    const view: ProjectView = {
      id: 'view-main',
      name: 'Main',
      description: '',
      pageSize: 'a3',
      orientation: 'portrait',
      placements: [placement],
      lines: [],
      annotations: [],
    };
    const updateViewPlacement = vi.fn();
    const removeViewPlacement = vi.fn();
    const onRemoved = vi.fn();
    contextHarness.current = {
      project: { ...structuredClone(sampleProject), views: [view] },
      updateViewPlacement,
      removeViewPlacement,
    };
    render(
      <ViewPlacementInspector placement={placement} view={view} onBack={vi.fn()} onRemoved={onRemoved} />,
    );

    const label = screen.getByLabelText('Display Label');
    await user.type(label, '  Core Router  ');
    expect(screen.queryByLabelText('Scale (%)')).toBeNull();
    expect(screen.getByText(/Placement size is fixed/)).toBeTruthy();
    await user.clear(screen.getByLabelText('X (mm)'));
    await user.type(screen.getByLabelText('X (mm)'), '12.4');
    await user.clear(screen.getByLabelText('Y (mm)'));
    await user.type(screen.getByLabelText('Y (mm)'), '20.1');
    await user.click(screen.getByRole('button', { name: 'Apply' }));

    expect(updateViewPlacement).toHaveBeenCalledWith('view-main', placement.id, {
      labelOverride: 'Core Router',
      xMm: 12.5,
      yMm: 20,
    });
    await user.click(screen.getByRole('button', { name: 'Live Source' }));
    expect(screen.getByText('Router 1')).toBeTruthy();
    expect(screen.getByText('Machine Room')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /Remove from View/ }));
    expect(removeViewPlacement).toHaveBeenCalledWith('view-main', placement.id);
    expect(onRemoved).toHaveBeenCalled();
  });
});
