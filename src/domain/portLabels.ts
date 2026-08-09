export const IO_NAME_LABEL_TOKEN = '{I/O NAME}' as const;
export const LEGACY_IO_NAME_LABEL_TOKEN = '{NAME}' as const;
export const DEFAULT_IO_PORT_LABEL_PATTERN = `${IO_NAME_LABEL_TOKEN}-{000}` as const;

export function formatPortLabel(
  pattern: string,
  deviceLabelPrefix: string,
  index: number,
  interfaceName = '',
): string {
  return pattern
    .split('{DEVICE}')
    .join(deviceLabelPrefix)
    .split(IO_NAME_LABEL_TOKEN)
    .join(interfaceName)
    .split(LEGACY_IO_NAME_LABEL_TOKEN)
    .join(interfaceName)
    .split('{0}')
    .join(String(index))
    .split('{00}')
    .join(String(index).padStart(2, '0'))
    .split('{000}')
    .join(String(index).padStart(3, '0'));
}
