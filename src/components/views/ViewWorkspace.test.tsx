/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import type { ProjectView } from '../../domain/types';
import { ViewWorkspace } from './ViewWorkspace';

function view(id: string, name: string): ProjectView {
  return {
    id,
    name,
    description: '',
    pageSize: 'a3',
    orientation: 'portrait',
    placements: [],
    lines: [],
    annotations: [],
  };
}

afterEach(cleanup);

describe('ViewWorkspace', () => {
  it('renders the exact empty state on an ISO page and resets transient zoom for another View', async () => {
    const user = userEvent.setup();
    const first = view('view-a', 'Signal Overview');
    const { rerender } = render(<ViewWorkspace view={first} />);

    expect(screen.getByText('Add a device or rack to start this View.')).toBeTruthy();
    expect(screen.getByLabelText('Signal Overview A3 portrait page')).toBeTruthy();
    expect(screen.getByLabelText('Current zoom').textContent).toBe('100%');

    await user.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(screen.getByLabelText('Current zoom').textContent).toBe('110%');

    rerender(<ViewWorkspace view={view('view-b', 'Rack Overview')} />);
    await waitFor(() => expect(screen.getByLabelText('Current zoom').textContent).toBe('100%'));
  });
});
