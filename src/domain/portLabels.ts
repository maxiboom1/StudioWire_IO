export function formatPortLabel(pattern: string, deviceLabelPrefix: string, index: number): string {
  return pattern
    .split('{DEVICE}')
    .join(deviceLabelPrefix)
    .split('{00}')
    .join(String(index).padStart(2, '0'))
    .split('{000}')
    .join(String(index).padStart(3, '0'));
}
