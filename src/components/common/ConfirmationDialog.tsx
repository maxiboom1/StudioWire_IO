import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

export type ConfirmationTone = 'default' | 'danger';

export interface ConfirmationRequest {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmationTone;
}

export type ConfirmFn = (request: ConfirmationRequest) => Promise<boolean>;

const ConfirmationContext = createContext<ConfirmFn | null>(null);

export function ConfirmationProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<ConfirmationRequest | null>(null);
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((nextRequest) => {
    resolverRef.current?.(false);
    setRequest(nextRequest);

    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  function resolve(confirmed: boolean) {
    resolverRef.current?.(confirmed);
    resolverRef.current = null;
    setRequest(null);
  }

  return (
    <ConfirmationContext.Provider value={confirm}>
      {children}
      <Dialog open={Boolean(request)} onOpenChange={(open) => !open && resolve(false)}>
        <DialogContent className="confirmation-dialog">
          <DialogHeader>
            <DialogTitle>{request?.title ?? 'Confirm action'}</DialogTitle>
            {request ? (
              <DialogDescription className="confirmation-dialog-message">
                {request.message}
              </DialogDescription>
            ) : null}
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => resolve(false)}>
              {request?.cancelLabel ?? 'Cancel'}
            </Button>
            <Button
              variant={request?.tone === 'danger' ? 'destructive' : 'default'}
              type="button"
              onClick={() => resolve(true)}
            >
              {request?.confirmLabel ?? 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmationContext.Provider>
  );
}

export function useConfirmation(): ConfirmFn {
  const confirm = useContext(ConfirmationContext);

  if (!confirm) {
    throw new Error('useConfirmation must be used within ConfirmationProvider');
  }

  return confirm;
}
