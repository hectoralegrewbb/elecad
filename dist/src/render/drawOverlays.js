import { getComponentBounds } from '../core/componentGeometry.js';
import { drawShape } from './drawComponents.js';

export function drawGrid(ctx, { viewport, width, height, gridSize, theme }) {
  const topLeft = viewport.screenToWorld(0, 0);
  const bottomRight = viewport.screenToWorld(width, height);
  const pixel = 1 / viewport.scale;
  // Espaciado visual adaptativo; el snapping conserva la grilla del documento.
  let step = Math.max(1, Number(gridSize) || 5);
  while (step * viewport.scale < 16) step *= 2;
  ctx.save();
  ctx.fillStyle = theme.gridMajor;
  for (let x = Math.floor(topLeft.x / step) * step; x <= bottomRight.x; x += step) {
    for (let y = Math.floor(topLeft.y / step) * step; y <= bottomRight.y; y += step) {
      ctx.fillRect(x - pixel * .6, y - pixel * .6, pixel * 1.2, pixel * 1.2);
    }
  }
  ctx.restore();
}

export function drawDimensions(ctx, resolvedDimensions, { theme, scale, selection }) {
  const pixel = 1 / scale;
  ctx.save();
  resolvedDimensions.forEach(({ dimension, resolved }) => {
    ctx.strokeStyle = selection.has(dimension.id) ? theme.selection : theme.dimension;
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = pixel * 1.1;
    ctx.beginPath();
    resolved.segments.forEach((segment) => {
      ctx.moveTo(segment.x1, segment.y1);
      ctx.lineTo(segment.x2, segment.y2);
    });
    ctx.stroke();
    ctx.font = `8px ${theme.font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.save();
    ctx.translate(resolved.textPosition.x, resolved.textPosition.y);
    if (!resolved.horizontal) ctx.rotate(-Math.PI / 2);
    ctx.fillText(resolved.text, 0, 0);
    ctx.restore();
  });
  ctx.restore();
}

export function drawGuides(ctx, guides, { theme, scale }) {
  if (guides.length === 0) return;
  ctx.save();
  ctx.strokeStyle = theme.guide;
  ctx.lineWidth = 1 / scale;
  ctx.beginPath();
  guides.forEach((guide) => {
    if (guide.orientation === 'vertical') {
      ctx.moveTo(guide.position, guide.from - 10);
      ctx.lineTo(guide.position, guide.to + 10);
    } else {
      ctx.moveTo(guide.from - 10, guide.position);
      ctx.lineTo(guide.to + 10, guide.position);
    }
  });
  ctx.stroke();
  ctx.restore();
}

export function drawMarquee(ctx, marquee, { theme, scale }) {
  if (!marquee) return;
  ctx.save();
  ctx.fillStyle = theme.selection;
  ctx.globalAlpha = 0.12;
  ctx.fillRect(marquee.left, marquee.top, marquee.right - marquee.left, marquee.bottom - marquee.top);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = theme.selection;
  ctx.lineWidth = 1 / scale;
  ctx.strokeRect(marquee.left, marquee.top, marquee.right - marquee.left, marquee.bottom - marquee.top);
  ctx.restore();
}

export function drawGhost(ctx, ghost, { catalog, theme, scale }) {
  if (!ghost) return;
  const definition = catalog.resolve(ghost);
  ctx.save();
  ctx.globalAlpha = theme.ghostAlpha;
  ctx.translate(ghost.x, ghost.y);
  ctx.rotate((ghost.rotation * Math.PI) / 180);
  ctx.translate(-definition.width / 2, -definition.height / 2);
  ctx.fillStyle = theme.componentFill;
  ctx.fillRect(0, 0, definition.width, definition.height);
  ctx.strokeStyle = theme.selection;
  ctx.lineWidth = 1.4 / scale;
  ctx.strokeRect(0, 0, definition.width, definition.height);
  definition.shapes.forEach((shape) => drawShape(ctx, shape, theme, 1 / scale));
  ctx.restore();
}

export function drawWirePreview(ctx, preview, { theme, scale }) {
  if (!preview || preview.points.length < 2) return;
  ctx.save();
  ctx.strokeStyle = theme.terminalHover;
  ctx.lineWidth = 1.8 / scale;
  ctx.setLineDash([6 / scale, 4 / scale]);
  ctx.beginPath();
  preview.points.forEach((point, index) => (index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y)));
  ctx.stroke();
  ctx.restore();
}

export function drawTerminalHighlight(ctx, terminal, { theme, scale }) {
  if (!terminal) return;
  ctx.save();
  ctx.strokeStyle = theme.terminalHover;
  ctx.lineWidth = 2 / scale;
  ctx.beginPath();
  ctx.arc(terminal.x, terminal.y, 7 / scale, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function drawHoverBounds(ctx, component, definition, { theme, scale }) {
  const bounds = getComponentBounds(component, definition);
  ctx.save();
  ctx.strokeStyle = theme.selection;
  ctx.globalAlpha = 0.4;
  ctx.lineWidth = 1 / scale;
  ctx.strokeRect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top);
  ctx.restore();
}
