import type { ValidationIssue } from '../../domain/types';
import { useProject } from '../../state/ProjectContext';
import { Button } from '../ui/button';

export function ValidationPanel({ onSelectIssue }: { onSelectIssue: (issue: ValidationIssue) => void }) {
  const { project, statusMessage } = useProject();
  const issues = project.validationIssues;
  const groupedIssues = {
    error: issues.filter((issue) => issue.severity === 'error'),
    warning: issues.filter((issue) => issue.severity === 'warning'),
    info: issues.filter((issue) => issue.severity === 'info'),
  };
  const statusClassName = isErrorStatus(statusMessage)
    ? 'status-message status-message-error'
    : 'status-message';

  return (
    <footer className="validation-panel" aria-label="Bottom validation panel">
      <div className="validation-panel-main">
        <p className={statusClassName} aria-live={isErrorStatus(statusMessage) ? 'assertive' : 'polite'}>
          {statusMessage}
        </p>
      </div>
      <div className="validation-panel-right">
        <div className="validation-summary">
          <h2>Validation</h2>
          <p>{issues.length === 0 ? 'No validation issues.' : `${issues.length} validation issue(s).`}</p>
        </div>
        {issues.length > 0 ? (
          <div className="issue-list">
            {(['error', 'warning', 'info'] as const).map((severity) => (
              <section className="issue-group" key={severity}>
                <h3>
                  {severity}s <span>{groupedIssues[severity].length}</span>
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
            ))}
          </div>
        ) : null}
      </div>
    </footer>
  );
}

function isErrorStatus(statusMessage: string) {
  return /\b(blocked|failed|error|cannot|invalid)\b/i.test(statusMessage);
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
