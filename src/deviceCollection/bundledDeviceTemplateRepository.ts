import type { DeviceTemplateRepository, DeviceTemplateSourceEntry } from '../domain/deviceTemplates/types';

const bundledModules = import.meta.glob('/collections/devices/**/*.studiowire-device.json', {
  eager: true,
  import: 'default',
}) as Record<string, unknown>;

export const bundledDeviceTemplateRepository: DeviceTemplateRepository = {
  async list(): Promise<DeviceTemplateSourceEntry[]> {
    return Object.entries(bundledModules).map(([path, value]) => ({
      path: path.replace(/^\//, ''),
      value,
    }));
  },
};
