import type { ProjectView, ViewGroupAnnotation, ViewTextAnnotation } from '../../domain/types';
import {
  getAnnotationBounds,
  getViewPageDimensions,
  isBoundsOutsidePage,
} from '../../domain/viewGeometry';
import { getViewLineEndpointPoint } from '../../domain/viewLineEndpoints';
import type { ViewEditorController } from './useViewEditorController';
import { ViewLineItem } from './ViewLineItem';
import { VIEW_PIXELS_PER_MM } from './viewViewport';

export function ViewDrawingLayer({
  view,
  controller,
}: {
  view: ProjectView;
  controller: ViewEditorController;
}) {
  const groups = view.annotations.filter((item): item is ViewGroupAnnotation => item.kind === 'group');
  const texts = view.annotations.filter((item): item is ViewTextAnnotation => item.kind === 'text');
  const page = getViewPageDimensions(view.pageSize, view.orientation);
  return (
    <>
      <div className="view-group-layer">
        {groups.map((group) => (
          <GroupItem key={group.id} group={group} controller={controller} page={page} />
        ))}
        {controller.groupDraft?.start && controller.groupDraft.current ? (
          <div
            className="view-group-annotation is-draft"
            style={boxStyle(normalizeDraft(controller.groupDraft.start, controller.groupDraft.current))}
          />
        ) : null}
      </div>
      <svg className="view-line-layer" aria-label="View drawing lines">
        {controller.lineDraft && controller.linePointer ? (
          <LineDraft view={view} controller={controller} />
        ) : null}
        {view.lines.map((line, index) => (
          <ViewLineItem
            controller={controller}
            key={line.id}
            line={line}
            view={view}
            warningIndex={index}
          />
        ))}
      </svg>
      <div className="view-text-layer">
        {texts.map((item) => (
          <TextItem key={item.id} item={item} controller={controller} page={page} />
        ))}
      </div>
    </>
  );
}

function GroupItem({
  group,
  controller,
  page,
}: {
  group: ViewGroupAnnotation;
  controller: ViewEditorController;
  page: { widthMm: number; heightMm: number };
}) {
  const rendered =
    controller.annotationPreview?.id === group.id && controller.annotationPreview.kind === 'group'
      ? controller.annotationPreview
      : group;
  const bounds = getAnnotationBounds(rendered);
  const ref = { kind: 'group' as const, id: group.id };
  const selected = controller.isMovableSelected(ref);
  const primary = controller.isMovablePrimary(ref);
  return (
    <button
      type="button"
      className={`view-group-annotation${selected ? ' is-selected' : ''}${primary ? ' is-primary' : ''}${bounds && isBoundsOutsidePage(bounds, page) ? ' is-outside-page' : ''}`}
      style={boxStyle(rendered)}
      onPointerDown={(event) => controller.beginMovableGesture(event, ref)}
      onClick={(event) => {
        event.stopPropagation();
        controller.selectMovable(ref, event.ctrlKey || event.metaKey);
      }}
      onDoubleClick={focusInspector}
    >
      <span>{group.label}</span>
      {selected && primary && controller.movableSelection?.items.length === 1 ? (
        <span
          aria-label="Resize Area"
          className="view-annotation-resize"
          onPointerDown={(event) => controller.beginAnnotationResize(event, group)}
        />
      ) : null}
    </button>
  );
}

function TextItem({
  item,
  controller,
  page,
}: {
  item: ViewTextAnnotation;
  controller: ViewEditorController;
  page: { widthMm: number; heightMm: number };
}) {
  const rendered =
    controller.annotationPreview?.id === item.id && controller.annotationPreview.kind === 'text'
      ? controller.annotationPreview
      : item;
  const bounds = getAnnotationBounds(rendered);
  const ref = { kind: 'text' as const, id: item.id };
  const selected = controller.isMovableSelected(ref);
  const primary = controller.isMovablePrimary(ref);
  return (
    <button
      type="button"
      className={`view-text-annotation is-${item.size}${selected ? ' is-selected' : ''}${primary ? ' is-primary' : ''}${bounds && isBoundsOutsidePage(bounds, page) ? ' is-outside-page' : ''}`}
      style={{
        left: rendered.xMm * VIEW_PIXELS_PER_MM,
        top: rendered.yMm * VIEW_PIXELS_PER_MM,
        width: rendered.widthMm * VIEW_PIXELS_PER_MM,
      }}
      onPointerDown={(event) => controller.beginMovableGesture(event, ref)}
      onClick={(event) => {
        event.stopPropagation();
        controller.selectMovable(ref, event.ctrlKey || event.metaKey);
      }}
      onDoubleClick={focusInspector}
    >
      {item.text}
      {selected && primary && controller.movableSelection?.items.length === 1 ? (
        <span
          aria-label="Resize text width"
          className="view-annotation-resize"
          onPointerDown={(event) => controller.beginAnnotationResize(event, item)}
        />
      ) : null}
    </button>
  );
}

function LineDraft({ view, controller }: { view: ProjectView; controller: ViewEditorController }) {
  const start = getViewLineEndpointPoint(controller.project, view, controller.lineDraft!);
  const end = controller.linePointer;
  if (!start || !end) return null;
  return (
    <polyline
      className="view-line-stroke is-draft"
      points={toSvgPoints([start, { xMm: end.xMm, yMm: start.yMm }, end])}
    />
  );
}

function focusInspector() {
  document.getElementById('view-element-label')?.focus();
}
function boxStyle(box: { xMm: number; yMm: number; widthMm: number; heightMm: number }) {
  return {
    left: box.xMm * VIEW_PIXELS_PER_MM,
    top: box.yMm * VIEW_PIXELS_PER_MM,
    width: box.widthMm * VIEW_PIXELS_PER_MM,
    height: box.heightMm * VIEW_PIXELS_PER_MM,
  };
}
function toSvgPoints(points: { xMm: number; yMm: number }[]) {
  return points
    .map((point) => `${point.xMm * VIEW_PIXELS_PER_MM},${point.yMm * VIEW_PIXELS_PER_MM}`)
    .join(' ');
}
function normalizeDraft(start: { xMm: number; yMm: number }, end: { xMm: number; yMm: number }) {
  return {
    xMm: Math.min(start.xMm, end.xMm),
    yMm: Math.min(start.yMm, end.yMm),
    widthMm: Math.abs(start.xMm - end.xMm),
    heightMm: Math.abs(start.yMm - end.yMm),
  };
}
