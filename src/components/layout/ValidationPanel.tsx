import type { ValidationIssue } from '../../domain/types';
import { useProject } from '../../state/ProjectContext';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

export function ValidationPanel({ onSelectIssue }: { onSelectIssue: (issue: ValidationIssue) => void }) {
  const { project } = useProject();
  const issues = project.validationIssues;
  const groupedIssues = {
    error: issues.filter((issue) => issue.severity === 'error'),
    warning: issues.filter((issue) => issue.severity === 'warning'),
    info: issues.filter((issue) => issue.severity === 'info'),
  };

  return (
    <footer className="validation-panel" aria-label="Bottom validation panel">
      <div>
        <h2>Validation</h2>
        <p>{issues.length === 0 ? 'No validation issues.' : `${issues.length} validation issue(s).`}</p>
      </div>
      <div className="issue-list">
        {issues.length === 0 ? (
          <Badge className="bg-emerald-50 text-emerald-700">No validation issues.</Badge>
        ) : (
          (['error', 'warning', 'info'] as const).map((severity) => (
            <section className="issue-group" key={severity}>
              <h3>
                {severity}s{' '}
                <Badge className={getSeverityBadgeClass(severity)}>
                  {groupedIssues[severity].length}
                </Badge>
              </h3>
              <div>
                {groupedIssues[severity].map((issue) => (
                  <Button
                    className={getIssueButtonClass(issue.severity)}
                    key={issue.id}
                    size="sm"
                    variant="outline"
                    onClick={() => onSelectIssue(issue)}
                    type="button"
                  >
                    {issue.code}
                  </Button>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </footer>
  );
}

function getSeverityBadgeClass(severity: ValidationIssue['severity']) {
  if (severity === 'error') {
    return 'bg-red-50 text-red-700';
  }

  if (severity === 'warning') {
    return 'bg-amber-50 text-amber-800';
  }

  return 'bg-blue-50 text-blue-700';
}

function getIssueButtonClass(severity: ValidationIssue['severity']) {
  if (severity === 'error') {
    return 'h-7 border-red-200 bg-red-50 px-2 text-xs text-red-700 hover:bg-red-100';
  }

  if (severity === 'warning') {
    return 'h-7 border-amber-200 bg-amber-50 px-2 text-xs text-amber-800 hover:bg-amber-100';
  }

  return 'h-7 border-blue-200 bg-blue-50 px-2 text-xs text-blue-700 hover:bg-blue-100';
}
