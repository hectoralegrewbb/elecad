import { buildNetlist } from '../core/netlist.js';
import { getTitleBlockLayout } from '../core/sceneBounds.js';
import { computeWireLabels, getDisplay } from '../core/wireLabel.js';
import { getComponentBounds } from '../core/componentGeometry.js';
import { orderedComponents } from '../core/componentOrder.js';
import { resolveDimension } from '../core/dimensionGeometry.js';
import { drawComponent, drawSelectionOutline, drawShape } from './drawComponents.js';
import { drawWires } from './drawWires.js';
import {
  drawDimensions,
  drawGhost,
  drawGrid,
  drawGuides,
  drawMarquee,
  drawTerminalHighlight,
  drawWirePreview,
} from './drawOverlays.js';

export const hopRadius = 3;

// Al seleccionar un cable, resalta todos los cables de su mismo nodo eléctrico y atenúa el resto.
function highlightedNet(state, catalog, selection) {
  const selectedWires = selection.toArray().filter((id) => state.wires[id]);
  if (selectedWires.length === 0) return null;
  const { netIdByWire } = buildNetlist(state, catalog);
  const nets = new Set(selectedWires.map((id) => netIdByWire.get(id)).filter(Boolean));
  if (nets.size === 0) return new Set(selectedWires);
  const ids = new Set(selectedWires);
  netIdByWire.forEach((netId, wireId) => {
    if (nets.has(netId)) ids.add(wireId);
  });
  return ids;
}

// Dibuja la escena completa. Se usa tanto para la pantalla como para exportar PNG (interactive = false).
// scene = { state, selection: Set, overlay: { guides, marquee, ghost, wirePreview, hoverTerminal } }
// services = { catalog, routeService, hopCalculator, labelPlacer }
export function drawScene(ctx, { width, height, viewport, pixelRatio = 1, scene, theme, services, interactive = true }) {
  const { catalog, routeService, hopCalculator, labelPlacer } = services;
  const { state, selection, overlay } = scene;
  const scale = viewport.scale;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, width * pixelRatio, height * pixelRatio);
  ctx.setTransform(scale * pixelRatio, 0, 0, scale * pixelRatio, viewport.x * pixelRatio, viewport.y * pixelRatio);

  if (interactive) drawGrid(ctx, { viewport, width, height, gridSize: state.meta.gridSize, theme });

  const componentEntries = orderedComponents(state, catalog).map((component) => ({
    component,
    definition: catalog.resolve(component),
  }));
  const symbols = getDisplay(state.meta).viewMode === 'symbol';
  componentEntries.forEach(({ component, definition }) => drawComponent(ctx, component, definition, { theme, scale, symbols }));

  const wireItems = Object.values(state.wires).map((wire) => ({ wire, points: routeService.getPath(wire, state) }));
  const hops = hopCalculator.compute(wireItems.map(({ wire, points }) => ({ id: wire.id, points })));
  const labels = computeWireLabels({ state, catalog, routeService, placer: labelPlacer });
  drawWires(ctx, wireItems, {
    theme,
    scale,
    selection,
    hops,
    hopRadius,
    labels,
    handles: interactive,
    highlighted: interactive ? highlightedNet(state, catalog, selection) : null,
  });

  const titleBlock = getTitleBlockLayout(state, catalog, routeService);
  if (titleBlock) titleBlock.shapes.forEach((shape) => drawShape(ctx, shape, theme, 1 / scale));

  const resolvedDimensions = Object.values(state.dimensions)
    .map((dimension) => ({ dimension, resolved: resolveDimension(dimension, state, catalog) }))
    .filter((entry) => entry.resolved);
  drawDimensions(ctx, resolvedDimensions, { theme, scale, selection });

  if (!interactive) return;

  componentEntries.forEach(({ component, definition }) => {
    if (selection.has(component.id)) drawSelectionOutline(ctx, getComponentBounds(component, definition), theme, scale);
  });
  drawGuides(ctx, overlay.guides, { theme, scale });
  drawMarquee(ctx, overlay.marquee, { theme, scale });
  drawGhost(ctx, overlay.ghost, { catalog, theme, scale });
  drawWirePreview(ctx, overlay.wirePreview, { theme, scale });
  drawTerminalHighlight(ctx, overlay.hoverTerminal, { theme, scale });
}
