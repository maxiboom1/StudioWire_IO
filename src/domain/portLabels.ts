export function formatPortLabel(
  pattern: string,
  deviceLabelPrefix: string,
  index: number,
  interfaceName = deviceLabelPrefix,
): string {
  return pattern
    .split('{DEVICE}')
    .join(deviceLabelPrefix)
    .split('{NAME}')
    .join(interfaceName)
    .split('{00}')
    .join(String(index).padStart(2, '0'))
    .split('{000}')
    .join(String(index).padStart(3, '0'));
}
