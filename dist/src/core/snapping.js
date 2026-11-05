import { shiftRect, snapToGrid } from './geometry.js';

const xValues = (rect) => [rect.left, (rect.left + rect.right) / 2, rect.right];
const yValues = (rect) => [rect.top, (rect.top + rect.bottom) / 2, rect.bottom];

function findAxisSnap(movingValues, otherRects, valuesOf, threshold) {
  let best = null;
  movingValues.forEach((movingValue) => {
    otherRects.forEach((other) => {
      valuesOf(other).forEach((otherValue) => {
        const delta = otherValue - movingValue;
        if (Math.abs(delta) <= threshold && (best === null || Math.abs(delta) < Math.abs(best.delta))) {
          best = { delta, position: otherValue };
        }
      });
    });
  });
  return best;
}

// Alineación inteligente (bordes / centros) contra otros componentes; si no hay guía, grilla.
// Devuelve el desplazamiento corregido y las guías magenta a dibujar.
export function computeMoveSnap({ movingRect, dx, dy, otherRects, threshold, gridSize, enabled = true }) {
  if (!enabled) return { dx, dy, guides: [] };

  const shifted = shiftRect(movingRect, dx, dy);
  const snapX = findAxisSnap(xValues(shifted), otherRects, xValues, threshold);
  const snapY = findAxisSnap(yValues(shifted), otherRects, yValues, threshold);

  const snappedDx = snapX ? dx + snapX.delta : snapToGrid(movingRect.left + dx, gridSize) - movingRect.left;
  const snappedDy = snapY ? dy + snapY.delta : snapToGrid(movingRect.top + dy, gridSize) - movingRect.top;

  const finalRect = shiftRect(movingRect, snappedDx, snappedDy);
  const guides = [];
  if (snapX) {
    const spans = otherRects.filter((other) => xValues(other).some((value) => Math.abs(value - snapX.position) < 1e-6));
    guides.push({
      orientation: 'vertical',
      position: snapX.position,
      from: Math.min(finalRect.top, ...spans.map((rect) => rect.top)),
      to: Math.max(finalRect.bottom, ...spans.map((rect) => rect.bottom)),
    });
  }
  if (snapY) {
    const spans = otherRects.filter((other) => yValues(other).some((value) => Math.abs(value - snapY.position) < 1e-6));
    guides.push({
      orientation: 'horizontal',
      position: snapY.position,
      from: Math.min(finalRect.left, ...spans.map((rect) => rect.left)),
      to: Math.max(finalRect.right, ...spans.map((rect) => rect.right)),
    });
  }
  return { dx: snappedDx, dy: snappedDy, guides };
}
