/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sampleProject } from '../../domain/sampleProject';
import type { ProjectRoot } from '../../domain/types';

const contextHarness = vi.hoisted(() => ({ current: null as any }));
vi.mock('../../state/ProjectContext', () => ({ useProject: () => contextHarness.current }));

import {
  ViewCanvasHistoryProvider,
  useViewCanvasCommands,
  useViewCanvasHistory,
} from './ViewCanvasHistoryContext';

afterEach(cleanup);

describe('ViewCanvasHistoryProvider', () => {
  it('records atomic edits, supports undo/redo, preserves source-only changes, and resets externally', async () => {
    const user = userEvent.setup();

    function Probe({ external }: { external: (canvas: boolean) => void }) {
      const commands = useViewCanvasCommands();
      const history = useViewCanvasHistory();
      return (
        <>
          <button
            type="button"
            onClick={() =>
              commands.replaceViewCanvas('view-signal-overview', {
                placements: [],
                lines: [],
                annotations: [],
              })
            }
          >
            Edit
          </button>
          <button type="button" disabled={!history.canUndo} onClick={history.undo}>
            Undo
          </button>
          <button type="button" disabled={!history.canRedo} onClick={history.redo}>
            Redo
          </button>
          <button type="button" onClick={() => external(false)}>
            Source edit
          </button>
          <button type="button" onClick={() => external(true)}>
            External canvas
          </button>
          <output>{history.notice}</output>
        </>
      );
    }

    function Harness() {
      const [project, setProject] = useState<ProjectRoot>(() => structuredClone(sampleProject));
      contextHarness.current = {
        project,
        replaceViewCanvas: (viewId: string, canvas: ProjectRoot['views'][number]) =>
          setProject((current) => ({
            ...current,
            views: current.views.map((view) => (view.id === viewId ? { ...view, ...canvas } : view)),
          })),
      };
      function external(canvas: boolean) {
        setProject((current) =>
          canvas
            ? {
                ...current,
                views: current.views.map((view) =>
                  view.id === 'view-signal-overview'
                    ? {
                        ...view,
                        annotations: [
                          ...view.annotations,
                          {
                            id: 'external',
                            kind: 'text',
                            xMm: 1,
                            yMm: 1,
                            widthMm: 10,
                            text: 'External',
                            size: 'small',
                          },
                        ],
                      }
                    : view,
                ),
              }
            : {
                ...current,
                devices: current.devices.map((device) => ({ ...device, name: `${device.name}!` })),
              },
        );
      }
      return (
        <ViewCanvasHistoryProvider activeViewId="view-signal-overview">
          <Probe external={external} />
        </ViewCanvasHistoryProvider>
      );
    }

    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Undo' }).hasAttribute('disabled')).toBe(false),
    );
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Redo' }).hasAttribute('disabled')).toBe(false),
    );
    expect(screen.getByText('View edit undone.')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Source edit' }));
    expect(screen.getByRole('button', { name: 'Redo' }).hasAttribute('disabled')).toBe(false);
    await user.click(screen.getByRole('button', { name: 'Redo' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Undo' }).hasAttribute('disabled')).toBe(false),
    );
    await user.click(screen.getByRole('button', { name: 'External canvas' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Undo' }).hasAttribute('disabled')).toBe(true),
    );
    expect(screen.getByText('View history reset after an external canvas change.')).toBeTruthy();
  });
});
