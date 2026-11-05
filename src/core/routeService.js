import { getComponentBounds, getTerminalPose } from './componentGeometry.js';
import { inflateRect, rectsIntersect, sideVectors } from './geometry.js';
import { orthogonalize } from './pathUtils.js';

const formatNumber = (value) => Math.round(value * 100) / 100;
const poseKey = (pose) => `${formatNumber(pose.x)},${formatNumber(pose.y)},${pose.side ?? '-'}`;
const rectKey = (rect) => `${rect.left},${rect.top},${rect.right},${rect.bottom}`;

// Hash numérico barato para resumir listas largas en la clave de caché.
function hashStrings(parts) {
  let hash = 5381;
  parts.forEach((part) => {
    for (let index = 0; index < part.length; index += 1) hash = ((hash * 33) ^ part.charCodeAt(index)) >>> 0;
    hash = ((hash * 33) ^ 59) >>> 0;
  });
  return hash;
}

const segmentsOf = (path) => {
  const segments = [];
  for (let index = 0; index < path.length - 1; index += 1) {
    segments.push({ x1: path[index].x, y1: path[index].y, x2: path[index + 1].x, y2: path[index + 1].y });
  }
  return segments;
};

const segmentBounds = (segment) => ({
  left: Math.min(segment.x1, segment.x2),
  right: Math.max(segment.x1, segment.x2),
  top: Math.min(segment.y1, segment.y2),
  bottom: Math.max(segment.y1, segment.y2),
});

// Resuelve el camino de cada cable: waypoints manuales si existen, A* si no.
// Los cables se rutean EN CONJUNTO: primero los manuales (quedan fijos) y luego los automáticos
// en orden de creación; cada uno evita recorrer en paralelo las líneas ya ocupadas.
// La caché por clave devuelve la MISMA referencia de array mientras nada relevante cambie
// (el renderer la usa para saltear el recálculo de puentes).
export class RouteService {
  constructor(catalog, router, { cacheLimit = 2000 } = {}) {
    this.catalog = catalog;
    this.router = router;
    this.cache = new Map();
    this.cacheLimit = cacheLimit;
    this.lastState = null;
    this.lastPaths = new Map();
  }

  resolveEndpoint(state, endpoint) {
    if (endpoint.componentId === undefined) return { x: endpoint.x, y: endpoint.y, side: null };
    const component = state.components[endpoint.componentId];
    if (!component) return null;
    return getTerminalPose(component, this.catalog.resolve(component), endpoint.terminalId);
  }

  getPath(wire, state) {
    return this.computeAll(state).get(wire.id) ?? [];
  }

  // Map<wireId, points[]>, memoizado por identidad del estado.
  computeAll(state) {
    if (state === this.lastState) return this.lastPaths;
    const paths = new Map();
    const wires = Object.values(state.wires);
    const gridSize = state.meta.gridSize;
    const occupied = [];
    const reserved = this.collectReservedCells(state, gridSize);

    const resolved = wires.map((wire) => ({
      wire,
      start: this.resolveEndpoint(state, wire.from),
      end: this.resolveEndpoint(state, wire.to),
      manual: Boolean(wire.waypoints && wire.waypoints.length > 0),
    }));

    const place = (entry, path) => {
      paths.set(entry.wire.id, path);
      occupied.push(...segmentsOf(path));
    };

    resolved.filter((entry) => entry.manual && entry.start && entry.end).forEach((entry) => {
      place(entry, this.manualPath(entry));
    });
    resolved.filter((entry) => !entry.manual).forEach((entry) => {
      if (!entry.start || !entry.end) {
        paths.set(entry.wire.id, []);
        return;
      }
      place(entry, this.autoPath(state, entry, gridSize, occupied, reserved));
    });
    resolved.filter((entry) => !entry.start || !entry.end).forEach((entry) => paths.set(entry.wire.id, []));

    this.lastState = state;
    this.lastPaths = paths;
    return paths;
  }

  manualPath({ wire, start, end }) {
    const key = ['m', poseKey(start), poseKey(end), wire.waypoints.map((point) => `${point.x},${point.y}`).join(';')].join('|');
    return this.remember(key, () => orthogonalize([{ x: start.x, y: start.y }, ...wire.waypoints, { x: end.x, y: end.y }]));
  }

  autoPath(state, { start, end, wire }, gridSize, occupied, reserved) {
    const obstacles = this.collectObstacles(state, start, end, gridSize);
    const area = this.routingRegion(start, end, obstacles, gridSize);
    const nearSegments = occupied.filter((segment) => rectsIntersect(segmentBounds(segment), area));
    const nearReserved = this.relevantReserved(reserved, area, start, end, gridSize, wire);
    const key = [
      'a',
      poseKey(start),
      poseKey(end),
      gridSize,
      obstacles.map(rectKey).join(';'),
      hashStrings(nearSegments.map((segment) => `${segment.x1},${segment.y1},${segment.x2},${segment.y2}`)),
      hashStrings(nearReserved.map((cell) => `${cell.x},${cell.y}`)),
    ].join('|');
    return this.remember(key, () =>
      this.router.route({ start, end, obstacles, gridSize, occupiedSegments: nearSegments, reservedCells: nearReserved }),
    );
  }

  remember(key, build) {
    const cached = this.cache.get(key);
    if (cached) return cached;
    const path = build();
    if (this.cache.size >= this.cacheLimit) this.cache.clear();
    this.cache.set(key, path);
    return path;
  }

  // Región real de búsqueda del router: extremos + obstáculos cercanos (para rodearlos) + margen.
  routingRegion(start, end, obstacles, gridSize) {
    const region = { left: Math.min(start.x, end.x), top: Math.min(start.y, end.y), right: Math.max(start.x, end.x), bottom: Math.max(start.y, end.y) };
    obstacles.forEach((rect) => {
      region.left = Math.min(region.left, rect.left);
      region.top = Math.min(region.top, rect.top);
      region.right = Math.max(region.right, rect.right);
      region.bottom = Math.max(region.bottom, rect.bottom);
    });
    return inflateRect(region, this.router.margin * gridSize);
  }

  searchArea(start, end, gridSize) {
    return inflateRect(
      {
        left: Math.min(start.x, end.x),
        top: Math.min(start.y, end.y),
        right: Math.max(start.x, end.x),
        bottom: Math.max(start.y, end.y),
      },
      this.router.margin * gridSize,
    );
  }

  // Celdas de salida de TODOS los bornes: un cable ajeno no puede pasar frente a un borne ajeno.
  collectReservedCells(state, gridSize) {
    const cells = [];
    Object.values(state.components).forEach((component) => {
      const definition = this.catalog.resolve(component);
      if (!definition.blocksRouting) return;
      definition.terminals.forEach((terminal) => {
        const pose = getTerminalPose(component, definition, terminal.id);
        if (!pose) return;
        const vector = sideVectors[pose.side] ?? { x: 0, y: 0 };
        cells.push({
          x: Math.round((pose.x + vector.x * gridSize) / gridSize),
          y: Math.round((pose.y + vector.y * gridSize) / gridSize),
          px: pose.x,
          py: pose.y,
        });
      });
    });
    return cells;
  }

  // Descarta las celdas fuera del área y las de los propios extremos del cable.
  relevantReserved(reserved, area, start, end, gridSize) {
    const own = new Set([start, end].map((pose) => `${pose.x},${pose.y}`));
    return reserved.filter(
      (cell) =>
        cell.px >= area.left && cell.px <= area.right && cell.py >= area.top && cell.py <= area.bottom && !own.has(`${cell.px},${cell.py}`),
    );
  }

  // Solo los obstáculos dentro del área de búsqueda entran en la clave de caché:
  // mover un componente lejano no invalida este cable.
  collectObstacles(state, start, end, gridSize) {
    const area = this.searchArea(start, end, gridSize);
    const obstacles = [];
    Object.values(state.components).forEach((component) => {
      const definition = this.catalog.resolve(component);
      if (!definition.blocksRouting) return;
      const bounds = getComponentBounds(component, definition);
      if (rectsIntersect(bounds, area)) obstacles.push(bounds);
    });
    return obstacles;
  }
}
