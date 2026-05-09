import { Minus, Move, Plus, RotateCcw } from 'lucide-react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../ui/button';

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.1;

interface CanvasViewportProps {
  ariaLabel: string;
  children: ReactNode;
  className?: string;
}

interface ContentSize {
  width: number;
  height: number;
}

interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
  scrollLeft: number;
  scrollTop: number;
}

export function CanvasViewport({ ariaLabel, children, className = '' }: CanvasViewportProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panMode, setPanMode] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [contentSize, setContentSize] = useState<ContentSize>({ width: 0, height: 0 });

  useEffect(() => {
    const content = contentRef.current;

    if (!content) {
      return;
    }

    const updateSize = () => {
      setContentSize({
        width: content.offsetWidth,
        height: content.offsetHeight,
      });
    };

    updateSize();

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(content);

    return () => resizeObserver.disconnect();
  }, [children]);

  function changeZoom(nextZoom: number) {
    setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(nextZoom.toFixed(2)))));
  }

  function zoomBy(delta: number) {
    changeZoom(zoom + delta);
  }

  function resetZoom() {
    changeZoom(1);

    if (viewportRef.current) {
      viewportRef.current.scrollTo({ left: 0, top: 0 });
    }
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const target = event.target instanceof HTMLElement ? event.target : null;

    if (
      !panMode ||
      event.button !== 0 ||
      !viewportRef.current ||
      target?.closest('[data-canvas-draggable="true"]')
    ) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: viewportRef.current.scrollLeft,
      scrollTop: viewportRef.current.scrollTop,
    };
    setIsPanning(true);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const dragState = dragStateRef.current;
    const viewport = viewportRef.current;

    if (!dragState || !viewport) {
      return;
    }

    viewport.scrollLeft = dragState.scrollLeft - (event.clientX - dragState.startX);
    viewport.scrollTop = dragState.scrollTop - (event.clientY - dragState.startY);
  }

  function endPan(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragStateRef.current?.pointerId === event.pointerId) {
      dragStateRef.current = null;
      setIsPanning(false);
    }
  }

  const zoomPercent = Math.round(zoom * 100);
  const scaledWidth = contentSize.width > 0 ? contentSize.width * zoom : undefined;
  const scaledHeight = contentSize.height > 0 ? contentSize.height * zoom : undefined;

  return (
    <section className={`canvas-viewport-shell ${className}`} aria-label={ariaLabel}>
      <div className="canvas-viewport-toolbar" aria-label="Canvas zoom controls">
        <div className="canvas-zoom-controls">
          <Button
            aria-label="Zoom out"
            disabled={zoom <= MIN_ZOOM}
            size="icon"
            type="button"
            variant="outline"
            onClick={() => zoomBy(-ZOOM_STEP)}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="canvas-zoom-value" aria-live="polite">
            {zoomPercent}%
          </span>
          <Button
            aria-label="Zoom in"
            disabled={zoom >= MAX_ZOOM}
            size="icon"
            type="button"
            variant="outline"
            onClick={() => zoomBy(ZOOM_STEP)}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button size="sm" type="button" variant="outline" onClick={resetZoom}>
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>
        <Button
          aria-pressed={panMode}
          size="sm"
          type="button"
          variant={panMode ? 'default' : 'outline'}
          onClick={() => setPanMode((current) => !current)}
        >
          <Move className="h-4 w-4" />
          Pan
        </Button>
      </div>
      <div
        className={panMode ? 'canvas-viewport is-pan-mode' : 'canvas-viewport'}
        ref={viewportRef}
        tabIndex={0}
        onPointerCancel={endPan}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endPan}
      >
        <div
          className={isPanning ? 'canvas-viewport-surface is-panning' : 'canvas-viewport-surface'}
          style={{ width: scaledWidth, height: scaledHeight }}
        >
          <div
            className="canvas-viewport-content"
            ref={contentRef}
            style={{ transform: `scale(${zoom})` }}
          >
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
