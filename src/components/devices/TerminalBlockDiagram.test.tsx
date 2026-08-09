/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { sampleProject } from '../../domain/sampleProject';
import { projectReducer } from '../../state/projectReducer';
import { TerminalBlockDiagram } from './TerminalBlockDiagram';

afterEach(cleanup);

describe('TerminalBlockDiagram', () => {
  it('uses the same live rear/front geometry for source and read-only View variants', () => {
    const state = projectReducer(
      { project: structuredClone(sampleProject), statusMessage: '', importError: null },
      {
        type: 'ADD_TERMINAL_BLOCK',
        payload: {
          terminalBlock: {
            id: 'device-tb-shared-diagram',
            name: 'TB Shared',
            categoryId: 'category-video',
            locationId: 'location-machine-room',
            labelPrefix: 'TB-SH',
            rackId: 'rack-mcr-a',
            rackBottomRu: 1,
            connectorTypeId: 'connector-bnc',
            count: 2,
            notes: '',
          },
        },
      },
    );
    const device = state.project.devices.find((item) => item.id === 'device-tb-shared-diagram')!;
    const { container } = render(
      <>
        <TerminalBlockDiagram device={device} project={state.project} readOnly />
        <TerminalBlockDiagram device={device} project={state.project} readOnly variant="view" />
      </>,
    );
    expect(screen.getAllByText('TB Shared')).toHaveLength(2);
    expect(container.querySelectorAll('.terminal-block-panel')).toHaveLength(2);
    expect(container.querySelectorAll('.terminal-block-port')).toHaveLength(4);
    expect(container.querySelectorAll('.terminal-block-crosspoint.is-read-only')).toHaveLength(8);
    expect(screen.queryByRole('button', { name: /Connect/ })).toBeNull();
  });
});
