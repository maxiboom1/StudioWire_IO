import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Folder, Package } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { buildDeviceTemplateCatalog } from '../../domain/deviceTemplates/catalog';
import { checkDeviceTemplateCompatibility } from '../../domain/deviceTemplates/compatibility';
import type {
  DeviceTemplateCatalogEntry,
  DeviceTemplateCompatibility,
  DeviceTemplateRepository,
} from '../../domain/deviceTemplates/types';
import type { ProjectRoot } from '../../domain/types';
import { Button } from '../ui/button';
import { buildDeviceCollectionTree } from './deviceCollectionTree';

export function DeviceCollectionBrowser({
  project,
  repository,
  onLoadTemplate,
}: {
  project: ProjectRoot;
  repository: DeviceTemplateRepository;
  onLoadTemplate: (entry: DeviceTemplateCatalogEntry, compatibility: DeviceTemplateCompatibility) => void;
}) {
  const [entries, setEntries] = useState<DeviceTemplateCatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [openKeys, setOpenKeys] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);

    void repository
      .list()
      .then((sources) => {
        if (!active) return;
        const catalog = buildDeviceTemplateCatalog(sources);
        setEntries(catalog);
        setSelectedPath((current) => current ?? catalog[0]?.sourcePath ?? null);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : 'Device collection could not be loaded.');
      })
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [repository]);

  const tree = useMemo(() => buildDeviceCollectionTree(entries), [entries]);
  const selected = entries.find((entry) => entry.sourcePath === selectedPath) ?? null;
  const compatibility = useMemo(
    () => (selected?.template ? checkDeviceTemplateCompatibility(project, selected.template) : null),
    [project, selected],
  );
  const allIssues = [...(selected?.issues ?? []), ...(compatibility?.issues ?? [])];
  const canLoad = Boolean(selected?.template && selected.issues.length === 0 && compatibility?.compatible);

  function toggle(key: string) {
    setOpenKeys((current) => {
      const next = new Set(current);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  if (loading) {
    return <p className="device-collection-empty">Loading device collection...</p>;
  }

  if (loadError) {
    return <p className="device-collection-error">{loadError}</p>;
  }

  if (entries.length === 0) {
    return <p className="device-collection-empty">No bundled device templates are available.</p>;
  }

  return (
    <div className="device-collection-browser">
      <nav aria-label="Bundled device collection" className="device-collection-tree">
        {tree.map((manufacturer) => {
          const manufacturerKey = `manufacturer:${manufacturer.name}`;
          const manufacturerOpen = openKeys.has(manufacturerKey);

          return (
            <div key={manufacturerKey}>
              <TreeFolderRow
                label={manufacturer.name}
                open={manufacturerOpen}
                onToggle={() => toggle(manufacturerKey)}
              />
              {manufacturerOpen
                ? manufacturer.categories.map((category) => {
                    const categoryKey = `${manufacturerKey}:category:${category.name}`;
                    const categoryOpen = openKeys.has(categoryKey);

                    return (
                      <div className="device-collection-tree-level" key={categoryKey}>
                        <TreeFolderRow
                          label={category.name}
                          open={categoryOpen}
                          onToggle={() => toggle(categoryKey)}
                        />
                        {categoryOpen
                          ? category.models.map((entry) => (
                              <button
                                className="device-collection-model-row"
                                data-selected={selectedPath === entry.sourcePath}
                                key={entry.sourcePath}
                                type="button"
                                onClick={() => setSelectedPath(entry.sourcePath)}
                              >
                                <Package aria-hidden="true" className="h-3.5 w-3.5" />
                                <span>
                                  {entry.template?.device.model ??
                                    entry.pathParts?.model ??
                                    'Invalid template'}
                                </span>
                                {entry.issues.length > 0 ? (
                                  <AlertTriangle
                                    aria-label="Invalid template"
                                    className="ml-auto h-3.5 w-3.5 text-red-600"
                                  />
                                ) : null}
                              </button>
                            ))
                          : null}
                      </div>
                    );
                  })
                : null}
            </div>
          );
        })}
      </nav>

      <section className="device-collection-preview" aria-live="polite">
        {selected?.template ? (
          <>
            <div className="device-collection-preview-header">
              <div>
                <h3>{selected.template.device.model}</h3>
                <p>
                  {selected.template.device.manufacturer} / {selected.template.device.categoryName}
                </p>
              </div>
              <CompatibilityStatus compatible={canLoad} />
            </div>
            <dl className="device-collection-device-summary">
              <div>
                <dt>Device Name</dt>
                <dd>{selected.template.device.name}</dd>
              </div>
              <div>
                <dt>Device sub-name</dt>
                <dd>{selected.template.device.subName || '-'}</dd>
              </div>
              <div>
                <dt>Mount height</dt>
                <dd>
                  {selected.template.device.rackSizeRu ? `${selected.template.device.rackSizeRu} RU` : 'None'}
                </dd>
              </div>
              <div>
                <dt>I/O interfaces</dt>
                <dd>{selected.template.ioInterfaces.length}</dd>
              </div>
            </dl>
            <div className="device-collection-io-list">
              {selected.template.ioInterfaces.map((ioInterface, index) => (
                <div className="device-collection-io-row" key={`${ioInterface.name}-${index}`}>
                  <span className="device-collection-color" style={{ backgroundColor: ioInterface.color }} />
                  <strong>{ioInterface.name}</strong>
                  <span>{ioInterface.direction}</span>
                  <span>{ioInterface.connectorName}</span>
                  <span>{ioInterface.count} ports</span>
                </div>
              ))}
            </div>
            {allIssues.length > 0 ? (
              <div className="device-collection-issues">
                <strong>Compatibility issues</strong>
                <ul>
                  {allIssues.map((issue, index) => (
                    <li key={`${issue.code}-${index}`}>{issue.message}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="device-collection-load-row">
              <Button
                disabled={!canLoad || !compatibility}
                type="button"
                onClick={() => compatibility && onLoadTemplate(selected, compatibility)}
              >
                Load Template
              </Button>
            </div>
          </>
        ) : (
          <div className="device-collection-issues">
            <strong>Invalid template</strong>
            <ul>
              {allIssues.map((issue, index) => (
                <li key={`${issue.code}-${index}`}>{issue.message}</li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

function TreeFolderRow({ label, open, onToggle }: { label: string; open: boolean; onToggle: () => void }) {
  return (
    <button className="device-collection-folder-row" type="button" onClick={onToggle}>
      {open ? <ChevronDown aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
      <Folder aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}

function CompatibilityStatus({ compatible }: { compatible: boolean }) {
  return compatible ? (
    <span className="device-collection-status compatible">
      <CheckCircle2 aria-hidden="true" />
      Compatible
    </span>
  ) : (
    <span className="device-collection-status incompatible">
      <AlertTriangle aria-hidden="true" />
      Incompatible
    </span>
  );
}
