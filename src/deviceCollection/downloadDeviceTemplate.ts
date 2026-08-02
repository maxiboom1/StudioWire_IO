import { serializeDeviceTemplate } from '../domain/deviceTemplates/templateExport';
import type { DeviceTemplate } from '../domain/deviceTemplates/types';

export function downloadDeviceTemplate(template: DeviceTemplate, fileName: string): void {
  const blob = new Blob([serializeDeviceTemplate(template)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
