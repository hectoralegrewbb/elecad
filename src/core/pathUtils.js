const epsilon = 1e-6;

export function removeDuplicatePoints(points) {
  return points.filter(
    (point, index) =>
      index === 0 ||
      Math.abs(point.x - points[index - 1].x) > epsilon ||
      Math.abs(point.y - points[index - 1].y) > epsilon,
  );
}

export function removeCollinearPoints(points) {
  if (points.length < 3) return points;
  return points.filter((point, index) => {
    if (index === 0 || index === points.length - 1) return true;
    const previous = points[index - 1];
    const next = points[index + 1];
    const sameColumn = Math.abs(previous.x - point.x) < epsilon && Math.abs(next.x - point.x) < epsilon;
    const sameRow = Math.abs(previous.y - point.y) < epsilon && Math.abs(next.y - point.y) < epsilon;
    return !(sameColumn || sameRow);
  });
}

export const simplifyPath = (points) => removeCollinearPoints(removeDuplicatePoints(points));

// Inserta esquinas (horizontal primero) donde un tramo no sea ortogonal.
export function orthogonalize(points) {
  const result = [points[0]];
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const aligned = Math.abs(previous.x - current.x) < epsilon || Math.abs(previous.y - current.y) < epsilon;
    if (!aligned) result.push({ x: current.x, y: previous.y });
    result.push(current);
  }
  return simplifyPath(result);
}

export function pathBounds(points) {
  if (points.length === 0) return null;
  return {
    left: Math.min(...points.map((point) => point.x)),
    top: Math.min(...points.map((point) => point.y)),
    right: Math.max(...points.map((point) => point.x)),
    bottom: Math.max(...points.map((point) => point.y)),
  };
}
