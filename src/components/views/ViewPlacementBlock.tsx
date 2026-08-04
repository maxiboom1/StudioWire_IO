import type { CSSProperties, PointerEvent } from 'react';
import { AlertTriangle, Grip } from 'lucide-react';
import type { ProjectRoot, ProjectView, ViewPlacement } from '../../domain/types';
import { getPlacementNaturalSize } from '../../domain/viewGeometry';
import { isPlacementOutsidePage } from '../../domain/viewPlacement';
import type { ViewEditorController } from './useViewEditorController';
import { VIEW_PIXELS_PER_MM } from './viewViewport';
import { ViewDeviceBlockBody } from './ViewDeviceBlockBody';
import { ViewRackBlockBody } from './ViewRackBlockBody';

export function ViewPlacementBlock({
  controller,
  placement,
  project,
  view,
  selected,
}: {
  controller: ViewEditorController;
  placement: ViewPlacement;
  project: ProjectRoot;
  view: ProjectView;
  selected: boolean;
}) {
  const preview = controller.preview?.placementId === placement.id ? controller.preview : placement;
  const natural = getPlacementNaturalSize(project, placement);
  const source =
    placement.sourceType === 'device'
      ? project.devices.find((device) => device.id === placement.sourceId)
      : project.racks.find((rack) => rack.id === placement.sourceId);
  const sourceName = source?.name ?? (placement.sourceType === 'device' ? 'Missing device' : 'Missing rack');
  const label = placement.labelOverride ?? sourceName;
  const outsidePage = isPlacementOutsidePage(project, view, {
    ...placement,
    xMm: preview.xMm,
    yMm: preview.yMm,
    scale: preview.scale,
  });
  const style = {
    left: preview.xMm * VIEW_PIXELS_PER_MM,
    top: preview.yMm * VIEW_PIXELS_PER_MM,
    width: natural.widthMm * VIEW_PIXELS_PER_MM,
    height: natural.heightMm * VIEW_PIXELS_PER_MM,
    transform: `scale(${preview.scale})`,
  } as CSSProperties;

  function begin(event: PointerEvent<HTMLElement>, mode: 'move' | 'resize') {
    controller.beginGesture(event, placement, mode);
  }

  return (
    <article
      aria-label={`${label} placement${selected ? ', selected' : ''}`}
      aria-pressed={selected}
      className={[
        'view-placement',
        `is-${placement.sourceType}`,
        selected ? 'is-selected' : '',
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
        controller.selectPlacement(placement.id);
      }}
      onKeyDown={(event) => controller.handlePlacementKeyDown(event, placement)}
    >
      <header className="view-placement-header" onPointerDown={(event) => begin(event, 'move')}>
        <span className="view-placement-grip" aria-hidden="true">
          <Grip />
        </span>
        <span>
          <strong>{label}</strong>
          {placement.sourceType === 'device' && source && 'code' in source && source.code ? (
            <small>{source.code}</small>
          ) : placement.sourceType === 'rack' && source && 'heightRu' in source ? (
            <small>
              {source.heightRu} RU ·{' '}
              {source.numberingDirection === 'top_to_bottom' ? 'top down' : 'bottom up'}
            </small>
          ) : null}
        </span>
        {outsidePage ? <AlertTriangle aria-label="Placement is outside the View page" /> : null}
      </header>
      {!source ? (
        <div className="view-missing-source">
          <AlertTriangle aria-hidden="true" />
          <strong>{sourceName}</strong>
          <span>{placement.sourceId}</span>
        </div>
      ) : placement.sourceType === 'device' && 'kind' in source ? (
        <ViewDeviceBlockBody project={project} device={source} />
      ) : placement.sourceType === 'rack' && 'heightRu' in source ? (
        <ViewRackBlockBody project={project} rack={source} />
      ) : null}
      {selected ? (
        <button
          aria-label={`Resize ${label} placement`}
          className="view-placement-resize"
          type="button"
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => begin(event, 'resize')}
        />
      ) : null}
    </article>
  );
}
