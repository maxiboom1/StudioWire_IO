export interface ViewPointerCapture {
  target: Element;
  pointerId: number;
}

export interface ViewPointerCaptureRef {
  current: ViewPointerCapture | null;
}

export function captureViewPointer(target: Element, pointerId: number, ref: ViewPointerCaptureRef) {
  if ('setPointerCapture' in target && typeof target.setPointerCapture === 'function') {
    target.setPointerCapture(pointerId);
  }
  ref.current = { target, pointerId };
}

export function releaseViewPointer(target: Element, pointerId: number, ref?: ViewPointerCaptureRef) {
  if (
    'hasPointerCapture' in target &&
    'releasePointerCapture' in target &&
    typeof target.hasPointerCapture === 'function' &&
    typeof target.releasePointerCapture === 'function' &&
    target.hasPointerCapture(pointerId)
  ) {
    target.releasePointerCapture(pointerId);
  }
  if (ref) ref.current = null;
}

export function cleanupViewPointerCapture(ref: ViewPointerCaptureRef) {
  const current = ref.current;
  if (current) releaseViewPointer(current.target, current.pointerId, ref);
}
