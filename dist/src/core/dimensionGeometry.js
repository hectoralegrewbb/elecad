import { getAnchorValue, getComponentBounds } from './componentGeometry.js';

const horizontalAnchors = new Set(['left', 'right', 'centerX']);
const tickSize = 3;

export const formatDimensionValue = (value) => `${Math.round(value * 10) / 10} mm`;

// La cota es DERIVADA de los componentes que referencia: si se mueven, la cota los sigue.
// dimension = { id, a: { componentId, anchor }, b: { componentId, anchor }, offset }
export function resolveDimension(dimension, state, catalog) {
  const componentA = state.components[dimension.a.componentId];
  const componentB = state.components[dimension.b.componentId];
  if (!componentA || !componentB) return null;

  const definitionA = catalog.resolve(componentA);
  const definitionB = catalog.resolve(componentB);
  const boundsA = getComponentBounds(componentA, definitionA);
  const boundsB = getComponentBounds(componentB, definitionB);
  const valueA = getAnchorValue(componentA, definitionA, dimension.a.anchor);
  const valueB = getAnchorValue(componentB, definitionB, dimension.b.anchor);
  const low = Math.min(valueA, valueB);
  const high = Math.max(valueA, valueB);
  const offset = dimension.offset ?? 30;
  const horizontal = horizontalAnchors.has(dimension.a.anchor);
  const segments = [];
  let textPosition;

  if (horizontal) {
    const lineY = Math.min(boundsA.top, boundsB.top) - offset;
    segments.push({ x1: low, y1: lineY, x2: high, y2: lineY });
    segments.push({ x1: valueA, y1: boundsA.top - 2, x2: valueA, y2: lineY - 4 });
    segments.push({ x1: valueB, y1: boundsB.top - 2, x2: valueB, y2: lineY - 4 });
    [low, high].forEach((x) => segments.push({ x1: x - tickSize, y1: lineY + tickSize, x2: x + tickSize, y2: lineY - tickSize }));
    textPosition = { x: (low + high) / 2, y: lineY - 5 };
  } else {
    const lineX = Math.min(boundsA.left, boundsB.left) - offset;
    segments.push({ x1: lineX, y1: low, x2: lineX, y2: high });
    segments.push({ x1: boundsA.left - 2, y1: valueA, x2: lineX - 4, y2: valueA });
    segments.push({ x1: boundsB.left - 2, y1: valueB, x2: lineX - 4, y2: valueB });
    [low, high].forEach((y) => segments.push({ x1: lineX - tickSize, y1: y + tickSize, x2: lineX + tickSize, y2: y - tickSize }));
    textPosition = { x: lineX - 5, y: (low + high) / 2 };
  }

  return { horizontal, value: high - low, text: formatDimensionValue(high - low), segments, textPosition };
}
