/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ProjectView } from '../../domain/types';

const contextHarness = vi.hoisted(() => ({ current: null as any }));

vi.mock('../../state/ProjectContext', () => ({
  useProject: () => contextHarness.current,
}));
import { ViewSelectionInspector } from './ViewSelectionInspector';

afterEach(cleanup);

describe('ViewSelectionInspector', () => {
  it('reports type counts and removes the whole temporary selection in one canvas action', async () => {
    const user = userEvent.setup();
    const replaceViewCanvas = vi.fn();
    const onRemoved = vi.fn();
    const view: ProjectView = {
      id: 'view-main',
      name: 'Main',
      description: '',
      pageSize: 'a3',
      orientation: 'portrait',
      placements: [
        {
          id: 'placement-device',
          sourceType: 'device',
          sourceId: 'device-router-1',
          xMm: 10,
          yMm: 10,
          scale: 1,
          labelOverride: null,
        },
      ],
      lines: [],
      annotations: [
        {
          id: 'text-main',
          kind: 'text',
          xMm: 20,
          yMm: 20,
          widthMm: 30,
          text: 'Heading',
          size: 'medium',
        },
        {
          id: 'area-main',
          kind: 'group',
          xMm: 5,
          yMm: 5,
          widthMm: 100,
          heightMm: 80,
          label: 'Area',
        },
      ],
    };
    contextHarness.current = { replaceViewCanvas };

    render(
      <ViewSelectionInspector
        selection={{
          primary: { kind: 'placement', id: 'placement-device' },
          items: [
            { kind: 'placement', id: 'placement-device' },
            { kind: 'text', id: 'text-main' },
            { kind: 'group', id: 'area-main' },
          ],
        }}
        view={view}
        onRemoved={onRemoved}
      />,
    );

    expect(screen.getByText('3 items selected')).toBeTruthy();
    expect(
      screen.getByText('Temporary canvas selection only. This does not create a persistent group.'),
    ).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Remove Selected' }));

    expect(replaceViewCanvas).toHaveBeenCalledTimes(1);
    expect(replaceViewCanvas).toHaveBeenCalledWith('view-main', {
      placements: [],
      lines: [],
      annotations: [],
    });
    expect(onRemoved).toHaveBeenCalledTimes(1);
  });
});
