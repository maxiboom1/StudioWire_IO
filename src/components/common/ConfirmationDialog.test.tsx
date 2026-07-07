/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfirmationProvider, useConfirmation } from './ConfirmationDialog';

afterEach(() => {
  cleanup();
});

describe('ConfirmationProvider', () => {
  it('resolves true or false from the app confirmation dialog actions', async () => {
    const onResult = vi.fn();

    function Harness() {
      const confirm = useConfirmation();

      return (
        <button
          type="button"
          onClick={async () => {
            onResult(
              await confirm({
                title: 'Delete item?',
                message: 'This cannot be undone.',
                confirmLabel: 'Delete',
                tone: 'danger',
              }),
            );
          }}
        >
          Open confirm
        </button>
      );
    }

    render(
      <ConfirmationProvider>
        <Harness />
      </ConfirmationProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Open confirm' }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onResult).toHaveBeenCalledWith(false);

    await userEvent.click(screen.getByRole('button', { name: 'Open confirm' }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onResult).toHaveBeenLastCalledWith(true);
  });
});
