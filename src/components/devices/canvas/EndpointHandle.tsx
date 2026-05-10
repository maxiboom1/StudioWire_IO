import { cn } from '../../../lib/utils';

export function EndpointHandle({
  side,
  warning = false,
}: {
  side: 'left' | 'right';
  warning?: boolean;
}) {
  return (
    <span
      className={cn(
        'device-endpoint-handle',
        side === 'left' ? 'device-endpoint-handle-left' : 'device-endpoint-handle-right',
        warning ? 'device-endpoint-handle-warning' : null,
      )}
      aria-hidden="true"
    />
  );
}
