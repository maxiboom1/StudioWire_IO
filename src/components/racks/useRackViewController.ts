import { useCallback, useEffect, useMemo, useState, type DragEvent } from 'react';
import { buildCrossLocationRackAssignmentConfirmation, type ConfirmationCopy } from '../../domain/prompts';
import { analyzeRackPlacements } from '../../domain/rackDiagnostics';
import { validateRackPlacement } from '../../domain/rackPlacement';
import type { Device, ProjectRoot, Rack } from '../../domain/types';
import type { MoveMountedDeviceInput } from '../../state/projectContextTypes';
import { clearDeviceDragData, readDeviceDragData, writeDeviceDragData } from '../common/deviceDrag';
import {
  ADD_RACK_PLACEHOLDER,
  MAX_VIEWED_RACKS,
  getAddableRacks,
  getDiagnosticsForRack,
  getViewedRacks,
} from './rackCanvasModel';
import { buildRackDropPreview, getTargetBottomRuFromPointer, type RackDropPreview } from './rackDropTarget';

export interface RackViewController {
  addableRacks: Rack[];
  draggingDeviceId: string | null;
  dropPreview: RackDropPreview | null;
  hasReachedRackLimit: boolean;
  viewedRackIds: string[];
  viewedRacks: Rack[];
  addRackToView: (rackId: string) => void;
  getRackDiagnostics: (rackId: string) => ReturnType<typeof getDiagnosticsForRack>;
  handleDeviceDragEnd: () => void;
  handleDeviceDragStart: (event: DragEvent<HTMLDivElement>, device: Device) => void;
  handleRackDragOver: (event: DragEvent<HTMLDivElement>, targetRack: Rack, displayRus: number[]) => void;
  handleRackDrop: (event: DragEvent<HTMLDivElement>, targetRack: Rack, displayRus: number[]) => Promise<void>;
  removeRackFromView: (rackId: string) => void;
}

export function useRackViewController({
  confirmRackMove,
  project,
  selectedRack,
  moveMountedDevice,
}: {
  confirmRackMove: (request: ConfirmationCopy) => Promise<boolean>;
  project: ProjectRoot;
  selectedRack: Rack;
  moveMountedDevice: (input: MoveMountedDeviceInput) => void;
}): RackViewController {
  const [viewedRackIds, setViewedRackIds] = useState<string[]>([selectedRack.id]);
  const [draggingDeviceId, setDraggingDeviceId] = useState<string | null>(null);
  const [dropPreview, setDropPreview] = useState<RackDropPreview | null>(null);
  const placementDiagnostics = useMemo(() => analyzeRackPlacements(project), [project]);
  const viewedRacks = useMemo(
    () => getViewedRacks(viewedRackIds, project.racks),
    [project.racks, viewedRackIds],
  );
  const addableRacks = useMemo(
    () => getAddableRacks(project.racks, viewedRackIds),
    [project.racks, viewedRackIds],
  );
  const hasReachedRackLimit = viewedRacks.length >= MAX_VIEWED_RACKS;

  const clearDragState = useCallback(() => {
    setDraggingDeviceId(null);
    setDropPreview(null);
    clearDeviceDragData();
  }, []);

  useEffect(() => {
    setViewedRackIds([selectedRack.id]);
    clearDragState();
  }, [clearDragState, selectedRack.id]);

  useEffect(() => {
    setViewedRackIds((current) => {
      const knownRackIds = new Set(project.racks.map((rack) => rack.id));
      const next = current.filter((rackId) => knownRackIds.has(rackId));

      return next.length > 0 ? next : [selectedRack.id];
    });
    clearDragState();
  }, [clearDragState, project, selectedRack.id]);

  useEffect(() => clearDragState, [clearDragState]);

  function addRackToView(rackId: string) {
    if (rackId === ADD_RACK_PLACEHOLDER) {
      return;
    }

    setViewedRackIds((current) => {
      if (current.includes(rackId) || current.length >= MAX_VIEWED_RACKS) {
        return current;
      }

      return [...current, rackId];
    });
  }

  function removeRackFromView(rackId: string) {
    setViewedRackIds((current) => (current.length <= 1 ? current : current.filter((id) => id !== rackId)));
  }

  function handleDeviceDragStart(event: DragEvent<HTMLDivElement>, device: Device) {
    if (!device.rackSizeRu || device.rackSizeRu <= 0) {
      event.preventDefault();
      return;
    }

    writeDeviceDragData(event, device.id);
    setDraggingDeviceId(device.id);
  }

  function handleDeviceDragEnd() {
    clearDragState();
  }

  function handleRackDragOver(event: DragEvent<HTMLDivElement>, targetRack: Rack, displayRus: number[]) {
    const deviceId = draggingDeviceId || readDeviceDragData(event);

    if (!deviceId) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const bottomRu = getTargetBottomRuFromPointer(rect, event.clientY, displayRus);

    if (bottomRu === null) {
      return;
    }

    event.preventDefault();
    const preview = buildRackDropPreview(project, targetRack, deviceId, bottomRu);

    setDropPreview(preview);
    event.dataTransfer.dropEffect = preview.ok ? 'move' : 'none';
  }

  async function handleRackDrop(event: DragEvent<HTMLDivElement>, targetRack: Rack, displayRus: number[]) {
    event.preventDefault();
    const deviceId = draggingDeviceId || readDeviceDragData(event);
    const rect = event.currentTarget.getBoundingClientRect();
    const bottomRu = getTargetBottomRuFromPointer(rect, event.clientY, displayRus);

    if (!deviceId || bottomRu === null) {
      clearDragState();
      return;
    }

    const result = validateRackPlacement(project, {
      deviceId,
      targetRackId: targetRack.id,
      targetBottomRu: bottomRu,
    });

    if (result.ok) {
      const prompt = buildCrossLocationRackAssignmentConfirmation(project, result.device, result.targetRack);

      if (prompt && !(await confirmRackMove(prompt))) {
        clearDragState();
        return;
      }

      moveMountedDevice({
        deviceId,
        targetRackId: targetRack.id,
        targetBottomRu: result.targetBottomRu,
      });
    }

    clearDragState();
  }

  return {
    addableRacks,
    draggingDeviceId,
    dropPreview,
    hasReachedRackLimit,
    viewedRackIds,
    viewedRacks,
    addRackToView,
    getRackDiagnostics: (rackId: string) => getDiagnosticsForRack(placementDiagnostics, rackId),
    handleDeviceDragEnd,
    handleDeviceDragStart,
    handleRackDragOver,
    handleRackDrop,
    removeRackFromView,
  };
}
