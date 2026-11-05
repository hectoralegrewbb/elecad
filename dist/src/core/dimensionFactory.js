import { createId } from './ids.js';
import { getComponentBounds } from './componentGeometry.js';
import { isComponentId } from './documentState.js';

const makeDimension = (a, b) => ({ id: createId('dim'), a, b, offset: 30 });

// kind: 'width' | 'height' (1 componente) | 'gapX' | 'gapY' (2 componentes).
export function buildDimension(state, catalog, selectedIds, kind) {
  const components = selectedIds.filter(isComponentId).map((id) => state.components[id]).filter(Boolean);

  if (kind === 'width' || kind === 'height') {
    if (components.length !== 1) return null;
    const [component] = components;
    const anchors = kind === 'width' ? ['left', 'right'] : ['top', 'bottom'];
    return makeDimension(
      { componentId: component.id, anchor: anchors[0] },
      { componentId: component.id, anchor: anchors[1] },
    );
  }

  if (components.length !== 2) return null;
  const horizontal = kind === 'gapX';
  const centerOf = (component) => {
    const bounds = getComponentBounds(component, catalog.resolve(component));
    return horizontal ? (bounds.left + bounds.right) / 2 : (bounds.top + bounds.bottom) / 2;
  };
  const [first, second] = [...components].sort((p, q) => centerOf(p) - centerOf(q));
  return makeDimension(
    { componentId: first.id, anchor: horizontal ? 'right' : 'bottom' },
    { componentId: second.id, anchor: horizontal ? 'left' : 'top' },
  );
}
