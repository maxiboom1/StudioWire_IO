import type { ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

export function WorkspaceHeader({
  eyebrow,
  title,
  badge,
}: {
  eyebrow: string;
  title: string;
  badge: string;
}) {
  return (
    <div className="workspace-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      <Badge className="bg-white text-studio-text shadow-sm">{badge}</Badge>
    </div>
  );
}

export function SummaryGrid({ items }: { items: Array<[string, string]> }) {
  return (
    <div className="summary-grid">
      {items.map(([label, value]) => (
        <Card className="summary-card" key={label}>
          <CardContent className="p-4">
            <span>{label}</span>
            <strong>{value}</strong>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function MetricGrid({ items }: { items: Array<[string, number]> }) {
  return (
    <div className="metric-grid" aria-label="Project object counts">
      {items.map(([label, value]) => (
        <Card className="metric" key={label}>
          <CardContent className="p-4">
            <span>{label}</span>
            <strong>{value}</strong>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function WorkspaceCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="workspace-section">
      <CardHeader className="section-heading">
        <div>
          <CardTitle>{title}</CardTitle>
          {description ? <p>{description}</p> : null}
        </div>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Alert className="empty-state workspace-section border-dashed bg-white/80">
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
