import { useMemo, useRef, useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import type { ProjectRoot, ProjectView, ViewSourceType } from '../../domain/types';
import { buildViewSourceGroups } from '../../domain/viewPlacement';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

export function ViewObjectPicker({
  project,
  view,
  onAdd,
}: {
  project: ProjectRoot;
  view: ProjectView;
  onAdd: (sourceType: ViewSourceType, sourceId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const groups = useMemo(() => buildViewSourceGroups(project, view, query), [project, query, view]);
  const resultCount = groups.reduce((total, group) => total + group.items.length, 0);

  function close() {
    setOpen(false);
    setQuery('');
  }

  return (
    <div className="view-object-picker">
      <Button
        aria-expanded={open}
        aria-haspopup="dialog"
        type="button"
        onClick={() => {
          setOpen((current) => !current);
          window.setTimeout(() => inputRef.current?.focus(), 0);
        }}
      >
        <Plus aria-hidden="true" className="h-4 w-4" />
        Add object
      </Button>
      {open ? (
        <div
          aria-label="Add object to View"
          className="view-object-picker-panel"
          role="dialog"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              close();
            }
          }}
        >
          <div className="view-object-picker-heading">
            <div>
              <strong>Add existing object</strong>
              <span>Live reference · no source data is copied</span>
            </div>
            <Button
              aria-label="Close object picker"
              size="icon"
              type="button"
              variant="ghost"
              onClick={close}
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </Button>
          </div>
          <label className="view-object-search">
            <Search aria-hidden="true" className="h-4 w-4" />
            <span className="sr-only">Search devices and racks</span>
            <Input
              ref={inputRef}
              placeholder="Search name, sub-name, model, location…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <p className="sr-only" aria-live="polite">
            {resultCount} result{resultCount === 1 ? '' : 's'}
          </p>
          <div className="view-object-results">
            {groups.length === 0 ? <p className="panel-empty">No matching devices or racks.</p> : null}
            {groups.map((group) => (
              <section key={group.key} aria-label={`${group.locationName} ${group.folderName}`.trim()}>
                <h3>
                  {group.locationName}
                  {group.folderName ? <span> / {group.folderName}</span> : null}
                </h3>
                {group.items.map((item) => (
                  <button
                    className="view-object-result"
                    disabled={item.alreadyPlaced}
                    key={`${item.sourceType}:${item.sourceId}`}
                    type="button"
                    onClick={() => {
                      onAdd(item.sourceType, item.sourceId);
                      close();
                    }}
                  >
                    <span>
                      <strong>{item.name}</strong>
                      <small>{item.secondary}</small>
                    </span>
                    <em>
                      {item.alreadyPlaced
                        ? 'Already in View'
                        : item.sourceType === 'rack'
                          ? 'Rack'
                          : 'Device'}
                    </em>
                  </button>
                ))}
              </section>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
