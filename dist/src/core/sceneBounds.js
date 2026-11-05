import { componentLabelLayout } from './textLayout.js';
import { getComponentBounds } from './componentGeometry.js';
import { inflateRect, unionRects } from './geometry.js';
import { pathBounds } from './pathUtils.js';
import { resolveDimension } from './dimensionGeometry.js';
import { getTitleBlock, layoutTitleBlock } from './titleBlock.js';

// Rectángulo del contenido del plano (componentes, cables y cotas), sin el rótulo. null si está vacío.
export function getContentBounds(state, catalog, routeService) {
  const rects = [];
  Object.values(state.components).forEach((component) => {
    rects.push(getComponentBounds(component, catalog.resolve(component)));
    if (component.label) rects.push(componentLabelLayout(component, catalog.resolve(component)).bounds);
  });
  Object.values(state.wires).forEach((wire) => {
    const bounds = pathBounds(routeService.getPath(wire, state));
    if (bounds) rects.push(bounds);
  });
  Object.values(state.dimensions).forEach((dimension) => {
    const resolved = resolveDimension(dimension, state, catalog);
    if (!resolved) return;
    const points = resolved.segments.flatMap((segment) => [
      { x: segment.x1, y: segment.y1 },
      { x: segment.x2, y: segment.y2 },
    ]);
    const bounds = pathBounds(points);
    if (bounds) rects.push(inflateRect(bounds, 12));
  });
  return unionRects(rects);
}

// Rótulo del plano ya ubicado bajo el contenido ({ rect, shapes }) o null si está desactivado.
export function getTitleBlockLayout(state, catalog, routeService) {
  return layoutTitleBlock(getTitleBlock(state.meta), getContentBounds(state, catalog, routeService));
}

// Todo el documento: contenido + rótulo (si está activado). Es lo que se exporta y lo que encuadra "Ajustar vista".
export function getSceneBounds(state, catalog, routeService) {
  const content = getContentBounds(state, catalog, routeService);
  const block = layoutTitleBlock(getTitleBlock(state.meta), content);
  return block ? unionRects([content, block.rect]) : content;
}
