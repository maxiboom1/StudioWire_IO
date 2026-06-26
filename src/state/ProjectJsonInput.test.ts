import { describe, expect, it } from 'vitest';
import { PROJECT_JSON_INPUT_ACCEPT, handleProjectJsonInputChange } from './ProjectJsonInput';

function createEvent(file: File | undefined) {
  return {
    target: {
      files: file ? [file] : [],
      value: 'C:\\fakepath\\project.studiowire.json',
    },
  };
}

describe('ProjectJsonInput behavior', () => {
  it('preserves accepted file types', () => {
    expect(PROJECT_JSON_INPUT_ACCEPT).toBe('.json,.studiowire,application/json');
  });

  it('calls completion and resets the input after a successful import', async () => {
    const event = createEvent({} as File);
    let completed = 0;

    await handleProjectJsonInputChange(
      event,
      async () => true,
      () => completed++,
    );

    expect(completed).toBe(1);
    expect(event.target.value).toBe('');
  });

  it('resets the input without completion after a controlled import failure', async () => {
    const event = createEvent({} as File);
    let completed = 0;

    await handleProjectJsonInputChange(
      event,
      async () => false,
      () => completed++,
    );

    expect(completed).toBe(0);
    expect(event.target.value).toBe('');
  });

  it('does nothing when no file is selected', async () => {
    const event = createEvent(undefined);

    await handleProjectJsonInputChange(event, async () => {
      throw new Error('should not import');
    });

    expect(event.target.value).toBe('C:\\fakepath\\project.studiowire.json');
  });
});
