export const sideOrder = ['top', 'right', 'bottom', 'left'];

export const sideVectors = {
  top: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  bottom: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
};

export function normalizeRotation(rotation) {
  return (((Math.round(rotation / 90) * 90) % 360) + 360) % 360;
}

export function rotateVector(x, y, rotation) {
  switch (normalizeRotation(rotation)) {
    case 90:
      return { x: -y, y: x };
    case 180:
      return { x: -x, y: -y };
    case 270:
      return { x: y, y: -x };
    default:
      return { x, y };
  }
}

export function rotateSide(side, rotation) {
  const steps = normalizeRotation(rotation) / 90;
  return sideOrder[(sideOrder.indexOf(side) + steps) % 4];
}

export const snapToGrid = (value, gridSize) => Math.round(value / gridSize) * gridSize;

export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export function rectsIntersect(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

export function pointInRect(point, rect, margin = 0) {
  return (
    point.x >= rect.left - margin &&
    point.x <= rect.right + margin &&
    point.y >= rect.top - margin &&
    point.y <= rect.bottom + margin
  );
}

export function unionRects(rects) {
  if (rects.length === 0) return null;
  return rects.reduce((acc, rect) => ({
    left: Math.min(acc.left, rect.left),
    top: Math.min(acc.top, rect.top),
    right: Math.max(acc.right, rect.right),
    bottom: Math.max(acc.bottom, rect.bottom),
  }));
}

export const inflateRect = (rect, amount) => ({
  left: rect.left - amount,
  top: rect.top - amount,
  right: rect.right + amount,
  bottom: rect.bottom + amount,
});

export const shiftRect = (rect, dx, dy) => ({
  left: rect.left + dx,
  top: rect.top + dy,
  right: rect.right + dx,
  bottom: rect.bottom + dy,
});

export const rectFromPoints = (a, b) => ({
  left: Math.min(a.x, b.x),
  top: Math.min(a.y, b.y),
  right: Math.max(a.x, b.x),
  bottom: Math.max(a.y, b.y),
});

export function distanceToSegment(point, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return distance(point, a);
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared));
  return distance(point, { x: a.x + t * dx, y: a.y + t * dy });
}
