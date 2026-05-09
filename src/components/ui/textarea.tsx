import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    data-ui="textarea"
    className={cn(
      'flex min-h-24 w-full rounded-md border border-studio-border bg-white px-3 py-2 text-sm text-studio-text shadow-sm placeholder:text-studio-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

export { Textarea };
