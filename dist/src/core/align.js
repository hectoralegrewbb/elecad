import { getComponentBounds } from './componentGeometry.js';

const boundsOf = (state, catalog, id) => getComponentBounds(state.components[id], catalog.resolve(state.components[id]));
const round = (value, grid) => Math.round(value / grid) * grid;

function shifted(state, shifts) {
  const components = { ...state.components };
  shifts.forEach(({ id, dx, dy }) => {
    components[id] = { ...components[id], x: components[id].x + dx, y: components[id].y + dy };
  });
  return { ...state, components };
}

// modes: left | centerX | right | top | centerY | bottom. Necesita ≥ 2 componentes.
export function alignComponents(state, catalog, ids, mode) {
  const valid = ids.filter((id) => state.components[id] && !state.components[id].locked);
  if (valid.length < 2) return state;
  const all = valid.map((id) => ({ id, b: boundsOf(state, catalog, id) }));
  const union = {
    left: Math.min(...all.map(({ b }) => b.left)),
    right: Math.max(...all.map(({ b }) => b.right)),
    top: Math.min(...all.map(({ b }) => b.top)),
    bottom: Math.max(...all.map(({ b }) => b.bottom)),
  };
  const grid = state.meta.gridSize;
  const targets = {
    left: ({ b }) => ({ dx: union.left - b.left, dy: 0 }),
    right: ({ b }) => ({ dx: union.right - b.right, dy: 0 }),
    centerX: ({ b }) => ({ dx: round((union.left + union.right) / 2, grid) - (b.left + b.right) / 2, dy: 0 }),
    top: ({ b }) => ({ dx: 0, dy: union.top - b.top }),
    bottom: ({ b }) => ({ dx: 0, dy: union.bottom - b.bottom }),
    centerY: ({ b }) => ({ dx: 0, dy: round((union.top + union.bottom) / 2, grid) - (b.top + b.bottom) / 2 }),
  };
  if (!targets[mode]) return state;
  return shifted(state, all.map((entry) => ({ id: entry.id, ...targets[mode](entry) })));
}

// axis: 'x' | 'y'. Reparte con separaciones iguales entre bordes, dejando fijos el primero y el último. Necesita ≥ 3.
export function distributeComponents(state, catalog, ids, axis) {
  const valid = ids.filter((id) => state.components[id] && !state.components[id].locked);
  if (valid.length < 3) return state;
  const low = axis === 'x' ? 'left' : 'top';
  const high = axis === 'x' ? 'right' : 'bottom';
  const items = valid.map((id) => ({ id, b: boundsOf(state, catalog, id) })).sort((p, q) => p.b[low] - q.b[low]);
  const span = items[items.length - 1].b[high] - items[0].b[low];
  const used = items.reduce((sum, { b }) => sum + (b[high] - b[low]), 0);
  const gap = (span - used) / (items.length - 1);
  const grid = state.meta.gridSize;
  let cursor = items[0].b[low];
  const shifts = items.map(({ id, b }, index) => {
    const target = index === items.length - 1 ? b[low] : round(cursor, grid);
    cursor = target + (b[high] - b[low]) + gap;
    return axis === 'x' ? { id, dx: target - b.left, dy: 0 } : { id, dx: 0, dy: target - b.top };
  });
  return shifted(state, shifts);
}
