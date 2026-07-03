import type { DragEvent } from 'react';

export const DEVICE_DRAG_MIME = 'application/x-studiowire-device-id';
export const NAVIGATOR_DRAG_MIME = 'application/x-studiowire-navigator-item';

export type NavigatorDragPayload = { type: 'device'; id: string } | { type: 'rack'; id: string };

declare global {
  interface Window {
    __studioWireDraggingDeviceId?: string;
    __studioWireNavigatorDragPayload?: NavigatorDragPayload;
  }
}

export function writeDeviceDragData(event: DragEvent<HTMLElement>, deviceId: string) {
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData(DEVICE_DRAG_MIME, deviceId);
  writeNavigatorDragData(event, { type: 'device', id: deviceId });
  event.dataTransfer.setData('text/plain', deviceId);
  window.__studioWireDraggingDeviceId = deviceId;
}

export function writeNavigatorDragData(event: DragEvent<HTMLElement>, payload: NavigatorDragPayload) {
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData(NAVIGATOR_DRAG_MIME, JSON.stringify(payload));
  window.__studioWireNavigatorDragPayload = payload;
}

export function readDeviceDragData(event: DragEvent<HTMLElement>): string {
  return (
    event.dataTransfer.getData(DEVICE_DRAG_MIME) ||
    event.dataTransfer.getData('text/plain') ||
    window.__studioWireDraggingDeviceId ||
    ''
  );
}

export function readNavigatorDragData(event: DragEvent<HTMLElement>): NavigatorDragPayload | null {
  const rawPayload = event.dataTransfer.getData(NAVIGATOR_DRAG_MIME);

  if (rawPayload) {
    try {
      const parsed = JSON.parse(rawPayload) as NavigatorDragPayload;

      if ((parsed.type === 'device' || parsed.type === 'rack') && typeof parsed.id === 'string') {
        return parsed;
      }
    } catch {
      return null;
    }
  }

  return window.__studioWireNavigatorDragPayload ?? null;
}

export function clearDeviceDragData() {
  window.__studioWireDraggingDeviceId = undefined;
  window.__studioWireNavigatorDragPayload = undefined;
}
