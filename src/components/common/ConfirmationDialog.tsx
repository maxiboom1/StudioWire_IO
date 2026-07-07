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
export type ConfirmationChoiceTone = ConfirmationTone | 'secondary';

export interface ConfirmationChoice {
  id: string;
  label: string;
  tone?: ConfirmationChoiceTone;
}

export interface ConfirmationChoiceRequest {
  title: string;
  message: string;
  choices: ConfirmationChoice[];
}

export type ConfirmChoiceFn = (request: ConfirmationChoiceRequest) => Promise<string>;

interface ConfirmationContextValue {
  confirm: ConfirmFn;
  choose: ConfirmChoiceFn;
}

const ConfirmationContext = createContext<ConfirmationContextValue | null>(null);

export function ConfirmationProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<ConfirmationChoiceRequest | null>(null);
  const resolverRef = useRef<((choiceId: string) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((nextRequest) => {
    const confirmId = 'confirm';
    const cancelId = 'cancel';

    resolverRef.current?.(cancelId);
    setRequest({
      title: nextRequest.title,
      message: nextRequest.message,
      choices: [
        { id: cancelId, label: nextRequest.cancelLabel ?? 'Cancel', tone: 'secondary' },
        {
          id: confirmId,
          label: nextRequest.confirmLabel ?? 'Confirm',
          tone: nextRequest.tone ?? 'default',
        },
      ],
    });

    return new Promise<boolean>((resolve) => {
      resolverRef.current = (choiceId) => resolve(choiceId === confirmId);
    });
  }, []);

  const choose = useCallback<ConfirmChoiceFn>((nextRequest) => {
    const fallbackId = nextRequest.choices[0]?.id ?? '';

    resolverRef.current?.(fallbackId);
    setRequest(nextRequest);

    return new Promise<string>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  function resolve(choiceId: string) {
    resolverRef.current?.(choiceId);
    resolverRef.current = null;
    setRequest(null);
  }

  const fallbackChoice = request?.choices[0]?.id ?? '';

  return (
    <ConfirmationContext.Provider value={{ confirm, choose }}>
      {children}
      <Dialog open={Boolean(request)} onOpenChange={(open) => !open && resolve(fallbackChoice)}>
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
            {request?.choices.map((choice) => (
              <Button
                key={choice.id}
                variant={
                  choice.tone === 'danger'
                    ? 'destructive'
                    : choice.tone === 'secondary'
                      ? 'outline'
                      : 'default'
                }
                type="button"
                onClick={() => resolve(choice.id)}
              >
                {choice.label}
              </Button>
            ))}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmationContext.Provider>
  );
}

export function useConfirmation(): ConfirmFn {
  const context = useContext(ConfirmationContext);

  if (!context) {
    throw new Error('useConfirmation must be used within ConfirmationProvider');
  }

  return context.confirm;
}

export function useConfirmationChoice(): ConfirmChoiceFn {
  const context = useContext(ConfirmationContext);

  if (!context) {
    throw new Error('useConfirmationChoice must be used within ConfirmationProvider');
  }

  return context.choose;
}
