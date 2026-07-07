import type { ReactNode } from 'react';
import { DialogFooter } from '../ui/dialog';

export function StudioWireFooterMark() {
  return (
    <span aria-label="StudioWire IO" className="studiowire-footer-mark">
      <span className="studiowire-footer-name">StudioWire</span>
      <span className="studiowire-footer-io">IO</span>
    </span>
  );
}

export function StandardModalFooter({ children }: { children: ReactNode }) {
  return (
    <DialogFooter className="standard-modal-footer">
      <StudioWireFooterMark />
      <div className="standard-modal-footer-actions">{children}</div>
    </DialogFooter>
  );
}
