import type { CSSProperties, PointerEvent } from 'react';
import { AlertTriangle, Grip } from 'lucide-react';
import type { ProjectRoot, ProjectView, ViewPlacement } from '../../domain/types';
import { DEVICE_DIAGRAM_SOURCE_WIDTH_PX, getPlacementNaturalSize } from '../../domain/viewGeometry';
import { isPlacementOutsidePage } from '../../domain/viewPlacement';
import type { ViewEditorController } from './useViewEditorController';
import { VIEW_PIXELS_PER_MM } from './viewViewport';
import { ViewDeviceBlockBody } from './ViewDeviceBlockBody';
import { ViewRackBlockBody } from './ViewRackBlockBody';
import { ViewPortRangeOverlay } from './ViewPortRangeOverlay';

export function ViewPlacementBlock({
  controller,
  placement,
  project,
  view,
  selected,
  primary = false,
}: {
  controller: ViewEditorController;
  placement: ViewPlacement;
  project: ProjectRoot;
  view: ProjectView;
  selected: boolean;
  primary?: boolean;
}) {
  const natural = getPlacementNaturalSize(project, placement);
  const source =
    placement.sourceType === 'device'
      ? project.devices.find((device) => device.id === placement.sourceId)
      : project.racks.find((rack) => rack.id === placement.sourceId);
  const sourceName = source?.name ?? (placement.sourceType === 'device' ? 'Missing device' : 'Missing rack');
  const label = placement.labelOverride ?? sourceName;
  const isTechnicalDevice =
    placement.sourceType === 'device' && source && 'kind' in source && source.kind === 'device';
  const outsidePage = isPlacementOutsidePage(project, view, {
    ...placement,
    xMm: placement.xMm,
    yMm: placement.yMm,
    scale: placement.scale,
  });
  const style = {
    left: placement.xMm * VIEW_PIXELS_PER_MM,
    top: placement.yMm * VIEW_PIXELS_PER_MM,
    width: natural.widthMm * VIEW_PIXELS_PER_MM,
    height: natural.heightMm * VIEW_PIXELS_PER_MM,
    transform: `scale(${placement.scale})`,
    '--view-device-diagram-scale': (natural.widthMm * VIEW_PIXELS_PER_MM) / DEVICE_DIAGRAM_SOURCE_WIDTH_PX,
  } as CSSProperties;

  function begin(event: PointerEvent<HTMLElement>) {
    controller.beginMovableGesture(event, { kind: 'placement', id: placement.id });
  }

  return (
    <article
      aria-label={`${label} placement${selected ? ', selected' : ''}`}
      aria-pressed={selected}
      className={[
        'view-placement',
        `is-${placement.sourceType}`,
        isTechnicalDevice ? 'is-device-diagram' : '',
        selected ? 'is-selected' : '',
        primary ? 'is-primary' : '',
        outsidePage ? 'is-outside-page' : '',
        !source ? 'is-missing-source' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-view-placement-id={placement.id}
      role="button"
      style={style}
      tabIndex={0}
      onClick={(event) => {
        event.stopPropagation();
        controller.selectMovable(
          { kind: 'placement', id: placement.id },
          event.ctrlKey || event.metaKey,
        );
      }}
    >
      {!isTechnicalDevice ? (
        <PlacementHeader
          label={label}
          outsidePage={outsidePage}
          source={source}
          sourceType={placement.sourceType}
          onPointerDown={begin}
        />
      ) : outsidePage ? (
        <span className="view-placement-warning" aria-label="Placement is outside the View page">
          <AlertTriangle />
        </span>
      ) : null}
      {!source ? (
        <div className="view-missing-source">
          <AlertTriangle aria-hidden="true" />
          <strong>{sourceName}</strong>
          <span>{placement.sourceId}</span>
        </div>
      ) : placement.sourceType === 'device' && 'kind' in source ? (
        <ViewDeviceBlockBody
          project={project}
          device={source}
          displayName={label}
          onHeaderPointerDown={isTechnicalDevice ? begin : undefined}
        />
      ) : placement.sourceType === 'rack' && 'heightRu' in source ? (
        <ViewRackBlockBody project={project} rack={source} />
      ) : null}
      {isTechnicalDevice ? (
        <ViewPortRangeOverlay controller={controller} placement={placement} view={view} />
      ) : null}
      {controller.tool === 'line' && source ? (
        <LineAnchors controller={controller} placementId={placement.id} />
      ) : null}
    </article>
  );
}

function LineAnchors({ controller, placementId }: { controller: ViewEditorController; placementId: string }) {
  return (
    <div className="view-line-anchors">
      {(['top', 'right', 'bottom', 'left'] as const).flatMap((side) =>
        [0.25, 0.5, 0.75].map((offset) => (
          <button
            aria-label={`Line anchor ${side} ${offset}`}
            className={`view-line-anchor is-${side}`}
            key={`${side}-${offset}`}
            style={
              side === 'top' || side === 'bottom' ? { left: `${offset * 100}%` } : { top: `${offset * 100}%` }
            }
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              controller.handleLineAnchor({ placementId, side, offset });
            }}
          />
        )),
      )}
    </div>
  );
}

function PlacementHeader({
  label,
  outsidePage,
  source,
  sourceType,
  onPointerDown,
}: {
  label: string;
  outsidePage: boolean;
  source: ProjectRoot['devices'][number] | ProjectRoot['racks'][number] | undefined;
  sourceType: ViewPlacement['sourceType'];
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
}) {
  return (
    <header className="view-placement-header" onPointerDown={onPointerDown}>
      <span className="view-placement-grip" aria-hidden="true">
        <Grip />
      </span>
      <span>
        <strong>{label}</strong>
        {sourceType === 'device' && source && 'code' in source && source.code ? (
          <small>{source.code}</small>
        ) : sourceType === 'rack' && source && 'heightRu' in source ? (
          <small>
            {source.heightRu} RU · {source.numberingDirection === 'top_to_bottom' ? 'top down' : 'bottom up'}
          </small>
        ) : null}
      </span>
      {outsidePage ? <AlertTriangle aria-label="Placement is outside the View page" /> : null}
    </header>
  );
}
