import type { ReactNode } from 'react';

export function ModalFrame({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-heading">
          <h2>{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close modal">
            Close
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
