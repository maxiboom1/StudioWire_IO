import type { ValidationIssue } from '../../domain/types';
import { useProject } from '../../state/ProjectContext';

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
          <span className="issue-empty">No validation issues.</span>
        ) : (
          (['error', 'warning', 'info'] as const).map((severity) => (
            <section className="issue-group" key={severity}>
              <h3>
                {severity}s <span>{groupedIssues[severity].length}</span>
              </h3>
              <div>
                {groupedIssues[severity].map((issue) => (
                  <button
                    className={`issue-pill ${issue.severity}`}
                    key={issue.id}
                    onClick={() => onSelectIssue(issue)}
                    type="button"
                  >
                    {issue.code}
                  </button>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </footer>
  );
}
