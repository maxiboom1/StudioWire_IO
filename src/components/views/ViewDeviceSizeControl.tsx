import {
  VIEW_DEVICE_SCALE_OPTIONS,
  type ViewDeviceScale,
  type ViewDeviceScaleState,
} from '../../domain/viewLayoutGrid';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

export function ViewDeviceSizeControl({
  state,
  onChange,
}: {
  state: ViewDeviceScaleState;
  onChange: (scale: ViewDeviceScale) => void;
}) {
  const value = state.kind === 'mixed' ? 'mixed' : String(state.scale);

  return (
    <div className="view-device-size-control">
      <span aria-hidden="true">Device size</span>
      <Select
        disabled={state.kind === 'empty'}
        value={value}
        onValueChange={(nextValue) => onChange(Number(nextValue) as ViewDeviceScale)}
      >
        <SelectTrigger
          aria-label="Device size for all devices in this View"
          className="view-device-size-trigger"
          title={state.kind === 'empty' ? 'Add a device to set the View device size' : undefined}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {state.kind === 'mixed' ? (
            <SelectItem disabled value="mixed">
              Mixed
            </SelectItem>
          ) : null}
          {VIEW_DEVICE_SCALE_OPTIONS.map((scale) => (
            <SelectItem key={scale} value={String(scale)}>
              {Math.round(scale * 100)}%
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
