import type { DeviceTemplateExportResult } from '../../domain/deviceTemplates/types';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

export function DeviceTemplateExportDialog({
  result,
  onClose,
}: {
  result: DeviceTemplateExportResult | null;
  onClose: () => void;
}) {
  const succeeded = Boolean(result?.template && result.collectionPath);

  return (
    <Dialog open={Boolean(result)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="device-template-export-dialog">
        <DialogHeader>
          <DialogTitle>
            {succeeded ? 'Device template exported' : 'Device template cannot be exported'}
          </DialogTitle>
          <DialogDescription>
            {succeeded
              ? 'The template was downloaded. Add it to the bundled collection path below, then restart or rebuild StudioWire IO.'
              : 'Resolve every issue below before exporting this device.'}
          </DialogDescription>
        </DialogHeader>
        {succeeded ? (
          <code className="device-template-export-path">{result?.collectionPath}</code>
        ) : (
          <ul className="device-template-export-issues">
            {result?.issues.map((issue, index) => (
              <li key={`${issue.code}-${index}`}>{issue.message}</li>
            ))}
          </ul>
        )}
        <DialogFooter>
          <Button type="button" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
