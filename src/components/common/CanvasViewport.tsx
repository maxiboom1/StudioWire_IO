import { Minus, Plus, RotateCcw } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../ui/button';

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.1;

interface CanvasViewportProps {
  ariaLabel: string;
  children: ReactNode;
  className?: string;
  toolbarContent?: ReactNode;
}

interface ContentSize {
  width: number;
  height: number;
}

export function CanvasViewport({ ariaLabel, children, className = '', toolbarContent }: CanvasViewportProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(1);
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

  const zoomPercent = Math.round(zoom * 100);
  const scaledWidth = contentSize.width > 0 ? contentSize.width * zoom : undefined;
  const scaledHeight = contentSize.height > 0 ? contentSize.height * zoom : undefined;

  return (
    <section className={`canvas-viewport-shell ${className}`} aria-label={ariaLabel}>
      <div
        className="canvas-viewport"
        ref={viewportRef}
        tabIndex={0}
      >
        <div className="canvas-viewport-toolbar" aria-label="Canvas controls">
          {toolbarContent ? <div className="canvas-toolbar-extra">{toolbarContent}</div> : null}
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
            <Button size="icon" type="button" variant="outline" aria-label="Reset zoom" onClick={resetZoom}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div
          className="canvas-viewport-surface"
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
