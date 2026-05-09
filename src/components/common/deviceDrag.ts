import type { DragEvent } from 'react';

export const DEVICE_DRAG_MIME = 'application/x-studiowire-device-id';

declare global {
  interface Window {
    __studioWireDraggingDeviceId?: string;
  }
}

export function writeDeviceDragData(event: DragEvent<HTMLElement>, deviceId: string) {
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData(DEVICE_DRAG_MIME, deviceId);
  event.dataTransfer.setData('text/plain', deviceId);
  window.__studioWireDraggingDeviceId = deviceId;
}

export function readDeviceDragData(event: DragEvent<HTMLElement>): string {
  return (
    event.dataTransfer.getData(DEVICE_DRAG_MIME) ||
    event.dataTransfer.getData('text/plain') ||
    window.__studioWireDraggingDeviceId ||
    ''
  );
}

export function clearDeviceDragData() {
  window.__studioWireDraggingDeviceId = undefined;
}
