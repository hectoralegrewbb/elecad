import { simplifyPath } from './pathUtils.js';

const epsilon = 0.01;

// Mueve el tramo `index` de un trazado ortogonal a otra línea (value = nueva coordenada Y si el tramo es
// horizontal, X si es vertical). Devuelve los waypoints intermedios resultantes (sin los bornes) o null si
// el tramo no es ortogonal. Si el tramo toca un borne, se agrega un codo para que el cable siga saliendo del borne.
export function moveWireSegment(points, index, value) {
  const a = points[index];
  const b = points[index + 1];
  if (!a || !b) return null;
  const horizontal = Math.abs(a.y - b.y) < epsilon;
  const vertical = Math.abs(a.x - b.x) < epsilon;
  if (!horizontal && !vertical) return null;
  const shift = (point) => (horizontal ? { x: point.x, y: value } : { x: value, y: point.y });
  const sequence = points.map((point) => ({ x: point.x, y: point.y }));
  const last = points.length - 1;
  if (index + 1 === last) sequence.splice(last, 0, shift(b));
  else sequence[index + 1] = shift(b);
  if (index === 0) sequence.splice(1, 0, shift(a));
  else sequence[index] = shift(a);
  return simplifyPath(sequence).slice(1, -1);
}

export const segmentOrientation = (a, b) => (Math.abs(a.y - b.y) < epsilon ? 'horizontal' : Math.abs(a.x - b.x) < epsilon ? 'vertical' : null);
