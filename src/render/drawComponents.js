import { componentLabelLayout, textAngle } from '../core/textLayout.js';
import { symbolShapesFor } from '../data/symbolLibrary.js';
import { getComponentBounds } from '../core/componentGeometry.js';

export function drawShape(ctx, shape, theme, pixel) {
  ctx.save();
  ctx.lineWidth = pixel * 1.2 * (shape.weight ?? 1);
  ctx.strokeStyle = shape.muted ? theme.mutedText : theme.componentStroke;
  ctx.setLineDash(shape.dash ? shape.dash.map((value) => value) : []);
  switch (shape.t) {
    case 'rect':
      ctx.strokeRect(shape.x, shape.y, shape.w, shape.h);
      break;
    case 'line':
      ctx.beginPath();
      ctx.moveTo(shape.x1, shape.y1);
      ctx.lineTo(shape.x2, shape.y2);
      ctx.stroke();
      break;
    case 'circle':
      ctx.beginPath();
      ctx.arc(shape.x, shape.y, shape.r, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'text':
      if ((shape.size ?? 8) / pixel >= 4) {
        ctx.fillStyle = shape.muted ? theme.mutedText : theme.text;
        ctx.font = `${shape.size ?? 8}px ${theme.font}`;
        ctx.textAlign = shape.align ?? 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(shape.text, shape.x, shape.y);
      }
      break;
    default:
      break;
  }
  ctx.restore();
}

export function drawComponent(ctx, component, definition, { theme, scale, symbols = false }) {
  const pixel = 1 / scale;
  ctx.save();
  ctx.translate(component.x, component.y);
  ctx.rotate((component.rotation * Math.PI) / 180);
  ctx.translate(-definition.width / 2, -definition.height / 2);

  ctx.fillStyle = definition.blocksRouting ? theme.componentFill : theme.containerFill;
  ctx.fillRect(0, 0, definition.width, definition.height);
  const symbolShapes = symbols && definition.blocksRouting ? symbolShapesFor(definition) : null;
  ctx.lineWidth = pixel * 1.4;
  ctx.strokeStyle = symbolShapes ? theme.mutedText : theme.componentStroke;
  // En la vista símbolo el contorno físico queda tenue y punteado: el protagonista es el símbolo eléctrico.
  ctx.setLineDash(symbolShapes ? [pixel * 4, pixel * 4] : []);
  ctx.strokeRect(0, 0, definition.width, definition.height);
  ctx.setLineDash([]);

  // Un borde interior sutil da cuerpo a la vista física; no modifica dimensiones ni bornes.
  if (!symbolShapes && definition.blocksRouting && definition.width >= 30 && definition.height >= 40) {
    ctx.save();
    ctx.strokeStyle = theme.mutedText;
    ctx.globalAlpha *= 0.24;
    ctx.lineWidth = pixel;
    ctx.strokeRect(3, 3, definition.width - 6, definition.height - 6);
    ctx.restore();
  }

  (symbolShapes ?? definition.shapes).forEach((shape) => {
    if (shape.t !== 'text' || !component.bodyTextOrientation) return drawShape(ctx, shape, theme, pixel);
    ctx.save(); ctx.translate(shape.x, shape.y);
    ctx.rotate((textAngle(component.bodyTextOrientation) - component.rotation) * Math.PI / 180);
    drawShape(ctx, { ...shape, x: 0, y: 0 }, theme, pixel); ctx.restore();
  });

  definition.terminals.forEach((terminal) => {
    ctx.beginPath();
    ctx.fillStyle = theme.componentFill;
    ctx.strokeStyle = theme.terminal;
    ctx.lineWidth = 1.3 * pixel;
    ctx.arc(terminal.x, terminal.y, Math.max(2, 3 * pixel), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (scale >= 1.2) {
      ctx.fillStyle = theme.mutedText;
      ctx.font = `${Math.max(4, 7 * pixel)}px ${theme.font}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const inset = 6;
      const offsetX = terminal.side === 'left' ? inset : terminal.side === 'right' ? -inset : 0;
      const offsetY = terminal.side === 'top' ? inset : terminal.side === 'bottom' ? -inset : 0;
      ctx.save();
      ctx.translate(terminal.x + offsetX, terminal.y + offsetY);
      ctx.rotate((textAngle(component.terminalOrientation) - component.rotation) * Math.PI / 180);
      ctx.fillText(terminal.id, 0, 0); ctx.restore();
    }
  });
  ctx.restore();

  const label = componentLabelLayout(component, definition);
  if (component.label && 9 * scale >= 4) {
    ctx.save(); ctx.translate(label.x, label.y); ctx.rotate(label.angle * Math.PI / 180);
    ctx.font = `${label.size}px ${theme.font}`; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
    ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = theme.background;
    ctx.strokeText(component.label, 0, 0); ctx.fillStyle = theme.label ?? theme.text;
    ctx.fillText(component.label, 0, 0); ctx.restore();
  }

}

export function drawSelectionOutline(ctx, bounds, theme, scale) {
  ctx.save();
  ctx.strokeStyle = theme.selection;
  ctx.lineWidth = 1.5 / scale;
  ctx.setLineDash([]);
  ctx.strokeRect(bounds.left - 3, bounds.top - 3, bounds.right - bounds.left + 6, bounds.bottom - bounds.top + 6);
  ctx.restore();
}
