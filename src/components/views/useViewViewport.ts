import { useCallback, useEffect, useRef, useState } from 'react';
import type { ViewPageDimensions } from './viewViewport';
import { clampViewZoom, getFitPageZoom, getFitWidthZoom, VIEW_MAX_ZOOM, VIEW_MIN_ZOOM } from './viewViewport';

type FitMode = 'page' | 'width' | null;

export function useViewViewport(viewId: string, page: ViewPageDimensions) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [fitMode, setFitMode] = useState<FitMode>(null);

  const calculateFit = useCallback(
    (mode: Exclude<FitMode, null>) => {
      const viewport = viewportRef.current;
      if (!viewport) {
        return;
      }

      const size = { width: viewport.clientWidth, height: viewport.clientHeight };
      setZoom(mode === 'page' ? getFitPageZoom(size, page) : getFitWidthZoom(size, page));
    },
    [page],
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(() => {
      if (fitMode) {
        calculateFit(fitMode);
      }
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [calculateFit, fitMode]);

  useEffect(() => {
    setZoom(1);
    setFitMode(null);
    resetScroll(viewportRef.current);
  }, [viewId]);

  useEffect(() => {
    if (fitMode) {
      calculateFit(fitMode);
    }
  }, [calculateFit, fitMode, page.heightMm, page.widthMm]);

  function changeZoom(nextZoom: number) {
    setFitMode(null);
    setZoom(clampViewZoom(nextZoom));
  }

  function fit(mode: Exclude<FitMode, null>) {
    setFitMode(mode);
    calculateFit(mode);
  }

  function reset() {
    setFitMode(null);
    setZoom(1);
    resetScroll(viewportRef.current);
  }

  return {
    viewportRef,
    zoom,
    fitMode,
    canZoomIn: zoom < VIEW_MAX_ZOOM,
    canZoomOut: zoom > VIEW_MIN_ZOOM,
    zoomIn: () => changeZoom(zoom + 0.1),
    zoomOut: () => changeZoom(zoom - 0.1),
    fitPage: () => fit('page'),
    fitWidth: () => fit('width'),
    reset,
  };
}

function resetScroll(viewport: HTMLDivElement | null) {
  if (!viewport) {
    return;
  }

  viewport.scrollLeft = 0;
  viewport.scrollTop = 0;
}
