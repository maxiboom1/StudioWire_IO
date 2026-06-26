export type AddDeviceLocalIdFactory = () => string;

export function createRuntimeAddDeviceLocalIdFactory(): AddDeviceLocalIdFactory {
  const seed = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let nextIndex = 0;

  return () => {
    nextIndex += 1;

    return `group-${seed}-${nextIndex}`;
  };
}

export function createSequentialAddDeviceLocalIdFactory(prefix = 'group-test'): AddDeviceLocalIdFactory {
  let nextIndex = 0;

  return () => {
    nextIndex += 1;

    return `${prefix}-${nextIndex}`;
  };
}
