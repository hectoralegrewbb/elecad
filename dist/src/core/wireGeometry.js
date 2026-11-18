const hopEpsilon = 0.01;

const isHorizontal = (a, b) => Math.abs(a.y - b.y) < hopEpsilon && Math.abs(a.x - b.x) >= hopEpsilon;
const isVertical = (a, b) => Math.abs(a.x - b.x) < hopEpsilon && Math.abs(a.y - b.y) >= hopEpsilon;

function boundsOf(points) {
  return {
    left: Math.min(...points.map((point) => point.x)),
    right: Math.max(...points.map((point) => point.x)),
    top: Math.min(...points.map((point) => point.y)),
    bottom: Math.max(...points.map((point) => point.y)),
  };
}

// Puentes: en cada cruce, el tramo HORIZONTAL salta (arco) sobre el vertical, sin importar
// el orden de los cables (así el cruce nunca se confunde con una unión).
// Es una pasada de render sobre los cruces, no parte del pathfinding.
export class HopCalculator {
  constructor({ radius = 3 } = {}) {
    this.radius = radius;
    this.signature = '';
    this.result = new Map();
    this.pathIds = new WeakMap();
    this.nextPathId = 1;
  }

  // items: [{ id, points }] en orden de dibujo. Devuelve Map<wireId, Map<segmentIndex, number[]>>.
  compute(items) {
    const signature = items.map((item) => `${item.id}:${this.identityOf(item.points)}`).join('|');
    if (signature === this.signature) return this.result;

    const result = new Map();
    const bounds = items.map((item) => (item.points.length > 0 ? boundsOf(item.points) : null));
    for (let later = 1; later < items.length; later += 1) {
      for (let earlier = 0; earlier < later; earlier += 1) {
        if (!bounds[later] || !bounds[earlier] || !this.boundsOverlap(bounds[later], bounds[earlier])) continue;
        this.collectHops(items[later], items[earlier], result);
        this.collectHops(items[earlier], items[later], result);
      }
    }
    this.signature = signature;
    this.result = result;
    return result;
  }

  identityOf(points) {
    if (!this.pathIds.has(points)) {
      this.pathIds.set(points, this.nextPathId);
      this.nextPathId += 1;
    }
    return this.pathIds.get(points);
  }

  boundsOverlap(a, b) {
    return a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top;
  }

  collectHops(upper, lower, result) {
    const radius = this.radius;
    for (let i = 0; i < upper.points.length - 1; i += 1) {
      const a = upper.points[i];
      const b = upper.points[i + 1];
      if (!isHorizontal(a, b)) continue;
      const minX = Math.min(a.x, b.x);
      const maxX = Math.max(a.x, b.x);
      for (let j = 0; j < lower.points.length - 1; j += 1) {
        const c = lower.points[j];
        const d = lower.points[j + 1];
        if (!isVertical(c, d)) continue;
        const crossingX = c.x;
        const crossingY = a.y;
        const withinHorizontal = crossingX > minX + radius + hopEpsilon && crossingX < maxX - radius - hopEpsilon;
        const withinVertical = crossingY > Math.min(c.y, d.y) + hopEpsilon && crossingY < Math.max(c.y, d.y) - hopEpsilon;
        if (!withinHorizontal || !withinVertical) continue;
        if (!result.has(upper.id)) result.set(upper.id, new Map());
        const bySegment = result.get(upper.id);
        if (!bySegment.has(i)) bySegment.set(i, []);
        const list = bySegment.get(i);
        if (!list.some((existing) => Math.abs(existing - crossingX) < radius * 2)) list.push(crossingX);
      }
    }
  }
}

// Convierte una polilínea (+ puentes) en operaciones de trazo neutrales al backend (canvas / SVG).
// ops: { op:'M'|'L', x, y } | { op:'H', cx, cy, r, dir }   (H = arco de salto, dir = sentido en x)
//      | { op:'Q', cx, cy, x, y }                          (Q = esquina redondeada: curva cuadrática con control en el vértice)
// cornerRadius > 0 redondea los codos; un codo se deja a 90° si alguno de sus tramos es más corto que 2 radios
// o si un puente cae pegado al vértice.
export function toPathOps(points, hopsBySegment, radius, cornerRadius = 0) {
  if (points.length === 0) return [];
  const ops = [{ op: 'M', x: points[0].x, y: points[0].y }];
  const length = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  const unit = (a, b) => ({ x: Math.sign(b.x - a.x), y: Math.sign(b.y - a.y) });
  const hopNearEnd = (index, vertex) => {
    const a = points[index];
    const b = points[index + 1];
    return (hopsBySegment?.get(index) ?? []).some((crossingX) => Math.abs(crossingX - vertex.x) < radius * 2 + cornerRadius) && isHorizontal(a, b);
  };
  const roundable = (index) => {
    // index = vértice interior (1..n-2) entre los tramos index-1 e index
    if (cornerRadius <= 0 || index <= 0 || index >= points.length - 1) return false;
    const before = points[index - 1];
    const vertex = points[index];
    const after = points[index + 1];
    const turns = (isHorizontal(before, vertex) && isVertical(vertex, after)) || (isVertical(before, vertex) && isHorizontal(vertex, after));
    if (!turns) return false;
    if (length(before, vertex) < cornerRadius * 2 || length(vertex, after) < cornerRadius * 2) return false;
    return !hopNearEnd(index - 1, vertex) && !hopNearEnd(index, vertex);
  };
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    const hops = hopsBySegment?.get(i);
    if (hops && isHorizontal(a, b)) {
      const direction = b.x > a.x ? 1 : -1;
      [...hops].sort((p, q) => direction * (p - q)).forEach((crossingX) => {
        ops.push({ op: 'L', x: crossingX - direction * radius, y: a.y });
        ops.push({ op: 'H', cx: crossingX, cy: a.y, r: radius, dir: direction });
      });
    }
    if (roundable(i + 1)) {
      const incoming = unit(a, b);
      const outgoing = unit(b, points[i + 2]);
      ops.push({ op: 'L', x: b.x - incoming.x * cornerRadius, y: b.y - incoming.y * cornerRadius });
      ops.push({ op: 'Q', cx: b.x, cy: b.y, x: b.x + outgoing.x * cornerRadius, y: b.y + outgoing.y * cornerRadius });
    } else {
      ops.push({ op: 'L', x: b.x, y: b.y });
    }
  }
  return ops;
}
