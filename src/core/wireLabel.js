import { getComponentBounds } from './componentGeometry.js';
import { formatSection } from './wireStandards.js';

export const defaultDisplay = { wireNumber: true, wirePhase: true, wireGauge: true, viewMode: 'shape' };
export const getDisplay = (meta) => ({ ...defaultDisplay, ...(meta?.display ?? {}) });

export const labelFontSize = 6.5;
export const labelSize = (text) => ({ w: text.length * labelFontSize * 0.57 + 4, h: 8 });

// Texto del rótulo de un cable según lo que se quiera mostrar: nº · función · sección.
export function wireLabelText(wire, display = defaultDisplay) {
  const parts = [];
  if (display.wireNumber && wire.label) parts.push(wire.label);
  if (display.wirePhase && wire.phase) parts.push(wire.phase);
  if (display.wireGauge && wire.gauge) parts.push(formatSection(wire.gauge));
  return parts.join(' · ');
}

const overlap = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

const segmentsOf = (wireId, points) =>
  points.slice(1).map((point, index) => {
    const a = points[index];
    return { wireId, a, b: point, horizontal: Math.abs(a.y - point.y) < 0.01, length: Math.abs(a.x - point.x) + Math.abs(a.y - point.y) };
  });

const hitsSegment = (rect, segment) => {
  const lowX = Math.min(segment.a.x, segment.b.x);
  const highX = Math.max(segment.a.x, segment.b.x);
  const lowY = Math.min(segment.a.y, segment.b.y);
  const highY = Math.max(segment.a.y, segment.b.y);
  return segment.horizontal
    ? segment.a.y > rect.top && segment.a.y < rect.bottom && highX > rect.left && lowX < rect.right
    : segment.a.x > rect.left && segment.a.x < rect.right && highY > rect.top && lowY < rect.bottom;
};

const rectAt = (x, y, size) => ({ left: x - size.w / 2, right: x + size.w / 2, top: y - size.h / 2, bottom: y + size.h / 2 });

// Ubica el rótulo de cada cable en el tramo más despejado: evita cruzarse con otros cables, con otros
// rótulos y con los componentes. wire.labelOffset {dx, dy} (mm) mueve el rótulo a mano desde esa posición.
// Memoiza por identidad de trazados, así no recalcula en cada frame.
export class WireLabelPlacer {
  constructor() {
    this.signature = '';
    this.result = new Map();
    this.pathIds = new WeakMap();
    this.nextPathId = 1;
  }

  identityOf(points) {
    if (!this.pathIds.has(points)) this.pathIds.set(points, this.nextPathId++);
    return this.pathIds.get(points);
  }

  // items: [{ wire, points }]. obstacles: rects de componentes. Devuelve Map<wireId, {x, y, w, h, text, rect}>.
  compute(items, obstacles, display) {
    const entries = items
      .filter(({ points }) => points.length >= 2)
      .map(({ wire, points }) => ({ wire, points, text: wireLabelText(wire, display) }))
      .filter((entry) => entry.text);
    const signature =
      entries.map(({ wire, points, text }) => `${wire.id}:${this.identityOf(points)}:${text}:${wire.labelOffset?.dx ?? 0},${wire.labelOffset?.dy ?? 0}`).join('|') +
      `#${items.length}#` +
      obstacles.map((rect) => `${rect.left},${rect.top},${rect.right},${rect.bottom}`).join(';');
    if (signature === this.signature) return this.result;

    const allSegments = items.flatMap(({ wire, points }) => segmentsOf(wire.id, points));
    const placed = [];
    const result = new Map();
    entries.forEach((entry) => {
      const label = this.place(entry, allSegments, obstacles, placed);
      placed.push(label.rect);
      result.set(entry.wire.id, label);
    });
    this.signature = signature;
    this.result = result;
    return result;
  }

  place({ wire, points, text }, allSegments, obstacles, placed) {
    const size = labelSize(text);
    const own = segmentsOf(wire.id, points).sort((p, q) => q.length - p.length);
    const others = allSegments.filter((segment) => segment.wireId !== wire.id);
    let best = null;
    own.slice(0, 6).forEach((segment, rank) => {
      [0.5, 0.3, 0.7].forEach((t, tRank) => {
        const cx = segment.a.x + (segment.b.x - segment.a.x) * t;
        const cy = segment.a.y + (segment.b.y - segment.a.y) * t;
        const spots = segment.horizontal
          ? [[cx, cy - size.h / 2 - 1.5], [cx, cy + size.h / 2 + 1.5]]
          : [[cx + size.w / 2 + 3, cy], [cx - size.w / 2 - 3, cy]];
        if (segment.horizontal ? segment.length < size.w + 2 : segment.length < size.h + 2) return;
        spots.forEach(([x, y], side) => {
          const rect = rectAt(x, y, size);
          let score = rank * 1.5 + tRank * 0.4 + side * 0.2;
          placed.forEach((other) => { if (overlap(rect, other)) score += 100; });
          others.forEach((segmentOther) => { if (hitsSegment(rect, segmentOther)) score += 20; });
          own.forEach((segmentOwn) => { if (segmentOwn !== segment && hitsSegment(rect, segmentOwn)) score += 10; });
          obstacles.forEach((obstacle) => { if (overlap(rect, obstacle)) score += 30; });
          if (!best || score < best.score) best = { x, y, score };
        });
      });
    });
    if (!best) {
      const segment = own[0];
      best = { x: (segment.a.x + segment.b.x) / 2, y: (segment.a.y + segment.b.y) / 2 - size.h / 2 - 1.5 };
    }
    const x = best.x + (wire.labelOffset?.dx ?? 0);
    const y = best.y + (wire.labelOffset?.dy ?? 0);
    return { x, y, ...size, text, rect: rectAt(x, y, size) };
  }
}

export function computeWireLabels({ state, catalog, routeService, placer }) {
  const items = Object.values(state.wires).map((wire) => ({ wire, points: routeService.getPath(wire, state) }));
  const obstacles = Object.values(state.components)
    .filter((component) => catalog.resolve(component).blocksRouting)
    .map((component) => getComponentBounds(component, catalog.resolve(component)));
  return placer.compute(items, obstacles, getDisplay(state.meta));
}

export function hitTestWireLabel(point, labels, padding = 1) {
  let hit = null;
  labels.forEach((label, wireId) => {
    const { rect } = label;
    if (point.x >= rect.left - padding && point.x <= rect.right + padding && point.y >= rect.top - padding && point.y <= rect.bottom + padding) hit = wireId;
  });
  return hit;
}
