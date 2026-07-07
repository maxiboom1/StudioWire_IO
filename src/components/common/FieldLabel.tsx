import { Label } from '../ui/label';

export function FieldLabel({
  children,
  helper,
  htmlFor,
}: {
  children: string;
  helper?: string;
  htmlFor?: string;
}) {
  return (
    <Label className="field-label-with-helper" htmlFor={htmlFor}>
      <span className="field-label-main">{children}</span>
      {helper ? <span className="field-label-helper">({helper})</span> : null}
    </Label>
  );
}
