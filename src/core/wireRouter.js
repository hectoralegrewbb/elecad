import { MinHeap } from './minHeap.js';
import { sideVectors } from './geometry.js';
import { orthogonalize, simplifyPath } from './pathUtils.js';

const directions = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];
const sideToDirection = { top: 0, right: 1, bottom: 2, left: 3 };

// A* ortogonal sobre una grilla virtual, con penalidad por curvas.
// Estado de búsqueda = (celda, dirección) para poder penalizar cada giro.
export class WireRouter {
  constructor({ bendPenalty = 6, margin = 10, nodeLimit = 250000, clearanceRatio = 0.4 } = {}) {
    this.bendPenalty = bendPenalty;
    this.margin = margin;
    this.nodeLimit = nodeLimit;
    this.clearanceRatio = clearanceRatio;
    this.overlapPenalty = 200;
    this.nearPenalty = 4; // costo de correr pegado (a 1 celda) a otro cable: separa los carriles
  }

  blockCells(box, blocked, cells) {
    cells.forEach((cell) => {
      if (cell.x < box.minX || cell.y < box.minY || cell.x >= box.minX + box.width || cell.y >= box.minY + box.height) return;
      blocked[this.cellIndex(box, cell)] = 1;
    });
  }

  // Bits por celda: 1 = arista horizontal (hacia la derecha) usada, 2 = arista vertical (hacia abajo) usada,
  // 4 / 8 = hay una arista horizontal / vertical usada en la celda vecina (carril pegado).
  buildEdgeGrid(box, segments, gridSize) {
    const used = new Uint8Array(box.width * box.height);
    const inside = (x, y) => x >= box.minX && y >= box.minY && x < box.minX + box.width && y < box.minY + box.height;
    const mark = (x, y, bits) => {
      if (inside(x, y)) used[(y - box.minY) * box.width + (x - box.minX)] |= bits;
    };
    segments.forEach((segment) => {
      const x1 = Math.round(segment.x1 / gridSize);
      const y1 = Math.round(segment.y1 / gridSize);
      const x2 = Math.round(segment.x2 / gridSize);
      const y2 = Math.round(segment.y2 / gridSize);
      if (y1 === y2) {
        for (let x = Math.min(x1, x2); x < Math.max(x1, x2); x += 1) {
          mark(x, y1, 1);
          mark(x, y1 - 1, 4);
          mark(x, y1 + 1, 4);
        }
      } else if (x1 === x2) {
        for (let y = Math.min(y1, y2); y < Math.max(y1, y2); y += 1) {
          mark(x1, y, 2);
          mark(x1 - 1, y, 8);
          mark(x1 + 1, y, 8);
        }
      }
    });
    return used;
  }

  // Costo de recorrer la arista entre una celda y su vecina: prohibida/penalizada si está usada,
  // levemente penalizada si va pegada a otro cable.
  edgePenalty(box, used, cellIdx, direction, penalty) {
    let index = cellIdx;
    let bit = 1;
    if (direction === 0) { index = cellIdx - box.width; bit = 2; }
    else if (direction === 2) bit = 2;
    else if (direction === 3) index = cellIdx - 1;
    const flags = used[index];
    if (flags & bit) return penalty;
    return flags & (bit === 1 ? 4 : 8) ? this.nearPenalty : 0;
  }

  // start / end: { x, y, side } (side null = punto libre). obstacles: rects en mm.
  // occupiedSegments: tramos [{x1,y1,x2,y2}] (mm) de otros cables: no se pueden recorrer en paralelo
  // sobre la misma línea (los cruces perpendiculares sí). reservedCells: celdas {x,y} (índices de grilla)
  // de salida de otros bornes, que ningún cable ajeno puede usar.
  route({ start, end, obstacles, gridSize, occupiedSegments = [], reservedCells = [] }) {
    const startCell = this.exitCell(start, gridSize);
    const endCell = this.exitCell(end, gridSize);
    const box = this.buildBox(startCell, endCell, obstacles, gridSize);
    const blocked = this.buildBlockedGrid(box, obstacles, gridSize);
    this.blockCells(box, blocked, reservedCells);
    blocked[this.cellIndex(box, startCell)] = 0;
    blocked[this.cellIndex(box, endCell)] = 0;
    const used = this.buildEdgeGrid(box, occupiedSegments, gridSize);
    // 1º intento: prohibido solapar. 2º: solapar es posible pero muy caro (último recurso).
    const cells =
      this.search(box, blocked, startCell, endCell, start.side, used, Infinity) ??
      this.search(box, blocked, startCell, endCell, start.side, used, this.overlapPenalty);
    if (!cells) return this.fallbackRoute(start, end);
    return this.buildPoints(start, end, cells, box, gridSize);
  }

  exitCell(pose, gridSize) {
    const vector = pose.side ? sideVectors[pose.side] : { x: 0, y: 0 };
    return {
      x: Math.round((pose.x + vector.x * gridSize) / gridSize),
      y: Math.round((pose.y + vector.y * gridSize) / gridSize),
    };
  }

  // La caja de búsqueda envuelve extremos Y obstáculos cercanos (+ margen), para poder rodearlos por afuera.
  buildBox(a, b, obstacles = [], gridSize = 1) {
    let lowX = Math.min(a.x, b.x);
    let lowY = Math.min(a.y, b.y);
    let highX = Math.max(a.x, b.x);
    let highY = Math.max(a.y, b.y);
    obstacles.forEach((rect) => {
      lowX = Math.min(lowX, Math.floor(rect.left / gridSize));
      lowY = Math.min(lowY, Math.floor(rect.top / gridSize));
      highX = Math.max(highX, Math.ceil(rect.right / gridSize));
      highY = Math.max(highY, Math.ceil(rect.bottom / gridSize));
    });
    const minX = lowX - this.margin;
    const minY = lowY - this.margin;
    const maxX = highX + this.margin;
    const maxY = highY + this.margin;
    return { minX, minY, width: maxX - minX + 1, height: maxY - minY + 1 };
  }

  cellIndex(box, cell) {
    return (cell.y - box.minY) * box.width + (cell.x - box.minX);
  }

  buildBlockedGrid(box, obstacles, gridSize) {
    const blocked = new Uint8Array(box.width * box.height);
    const clearance = this.clearanceRatio * gridSize;
    obstacles.forEach((rect) => {
      const fromX = Math.max(box.minX, Math.floor((rect.left - clearance) / gridSize));
      const toX = Math.min(box.minX + box.width - 1, Math.ceil((rect.right + clearance) / gridSize));
      const fromY = Math.max(box.minY, Math.floor((rect.top - clearance) / gridSize));
      const toY = Math.min(box.minY + box.height - 1, Math.ceil((rect.bottom + clearance) / gridSize));
      for (let cy = fromY; cy <= toY; cy += 1) {
        for (let cx = fromX; cx <= toX; cx += 1) {
          const worldX = cx * gridSize;
          const worldY = cy * gridSize;
          const inside =
            worldX > rect.left - clearance &&
            worldX < rect.right + clearance &&
            worldY > rect.top - clearance &&
            worldY < rect.bottom + clearance;
          if (inside) blocked[(cy - box.minY) * box.width + (cx - box.minX)] = 1;
        }
      }
    });
    return blocked;
  }

  search(box, blocked, startCell, endCell, startSide, used, overlapPenalty) {
    const { width, height } = box;
    const stateCount = width * height * 4;
    const cost = new Float32Array(stateCount).fill(Infinity);
    const cameFrom = new Int32Array(stateCount).fill(-1);
    const closed = new Uint8Array(stateCount);
    const heap = new MinHeap();
    const heuristic = (cx, cy) => Math.abs(cx - endCell.x) + Math.abs(cy - endCell.y);

    const startIndex = this.cellIndex(box, startCell);
    const endIndex = this.cellIndex(box, endCell);
    const initialDirections = startSide ? [sideToDirection[startSide]] : [0, 1, 2, 3];
    initialDirections.forEach((direction) => {
      const state = startIndex * 4 + direction;
      cost[state] = 0;
      heap.push(heuristic(startCell.x, startCell.y), state);
    });

    let expanded = 0;
    while (heap.size > 0) {
      const state = heap.pop();
      if (closed[state]) continue;
      closed[state] = 1;
      const cellIdx = state >> 2;
      const direction = state & 3;
      if (cellIdx === endIndex) return this.reconstruct(box, cameFrom, state);
      expanded += 1;
      if (expanded > this.nodeLimit) return null;

      const cx = box.minX + (cellIdx % width);
      const cy = box.minY + Math.floor(cellIdx / width);
      for (let next = 0; next < 4; next += 1) {
        if (next === ((direction + 2) & 3)) continue;
        const nx = cx + directions[next].x;
        const ny = cy + directions[next].y;
        if (nx < box.minX || ny < box.minY || nx >= box.minX + width || ny >= box.minY + height) continue;
        const nextIdx = (ny - box.minY) * width + (nx - box.minX);
        if (blocked[nextIdx]) continue;
        const overlap = this.edgePenalty(box, used, cellIdx, next, overlapPenalty);
        if (overlap === Infinity) continue;
        const nextState = nextIdx * 4 + next;
        const nextCost = cost[state] + 1 + overlap + (next === direction ? 0 : this.bendPenalty);
        if (nextCost < cost[nextState]) {
          cost[nextState] = nextCost;
          cameFrom[nextState] = state;
          heap.push(nextCost + heuristic(nx, ny), nextState);
        }
      }
    }
    return null;
  }

  reconstruct(box, cameFrom, goalState) {
    const cells = [];
    let state = goalState;
    while (state !== -1) {
      const index = state >> 2;
      cells.push({ x: box.minX + (index % box.width), y: box.minY + Math.floor(index / box.width) });
      state = cameFrom[state];
    }
    return cells.reverse();
  }

  buildPoints(start, end, cells, box, gridSize) {
    const cellPoints = cells.map((cell) => ({ x: cell.x * gridSize, y: cell.y * gridSize }));
    const first = cellPoints[0];
    const last = cellPoints[cellPoints.length - 1];
    return simplifyPath([
      { x: start.x, y: start.y },
      ...this.legCorner(start, first),
      ...cellPoints,
      ...this.legCorner(end, last),
      { x: end.x, y: end.y },
    ]);
  }

  // Si el borne no está sobre la grilla, une borne y celda con un codo que respete el lado de salida.
  legCorner(pose, cellPoint) {
    if (pose.x === cellPoint.x || pose.y === cellPoint.y) return [];
    return pose.side === 'top' || pose.side === 'bottom'
      ? [{ x: pose.x, y: cellPoint.y }]
      : [{ x: cellPoint.x, y: pose.y }];
  }

  fallbackRoute(start, end) {
    return orthogonalize([
      { x: start.x, y: start.y },
      { x: end.x, y: end.y },
    ]);
  }
}
