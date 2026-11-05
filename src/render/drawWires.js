import { toPathOps } from '../core/wireGeometry.js';
import { labelFontSize } from '../core/wireLabel.js';

export function tracePathOps(ctx, ops) {
  ctx.beginPath();
  ops.forEach((op) => {
    if (op.op === 'M') ctx.moveTo(op.x, op.y);
    else if (op.op === 'L') ctx.lineTo(op.x, op.y);
    else if (op.dir > 0) ctx.arc(op.cx, op.cy, op.r, Math.PI, Math.PI * 2, false);
    else ctx.arc(op.cx, op.cy, op.r, 0, -Math.PI, true);
  });
}

const hasFreeEndpoint = (wire) => wire.from.componentId === undefined || wire.to.componentId === undefined;

// Grosor (px de pantalla) según calibre: el cable de potencia se ve más grueso que el de control.
const wireWidthPixels = (wire) => Math.min(3.4, 1 + 0.55 * Math.sqrt(Number(wire.gauge) || 1.5));

// Rótulo con halo del color de fondo (se lee aunque pase otro cable por detrás). La posición viene del
// WireLabelPlacer (core/wireLabel.js): tramo más despejado + desplazamiento manual del usuario.
function drawWireLabel(ctx, label, { theme, scale, color }) {
  if (!label || scale < 0.55) return;
  ctx.font = `${labelFontSize}px ${theme.font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3;
  ctx.strokeStyle = theme.background;
  ctx.strokeText(label.text, label.x, label.y);
  ctx.fillStyle = color;
  ctx.fillText(label.text, label.x, label.y);
}

// Manijas de arrastre en el punto medio de cada tramo del cable seleccionado.
function drawSegmentHandles(ctx, points, { theme, pixel }) {
  ctx.fillStyle = theme.selection;
  const half = pixel * 3;
  for (let index = 0; index < points.length - 1; index += 1) {
    const a = points[index];
    const b = points[index + 1];
    if (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) < pixel * 22) continue;
    ctx.fillRect((a.x + b.x) / 2 - half, (a.y + b.y) / 2 - half, half * 2, half * 2);
  }
}

// items: [{ wire, points }]. Los cables huérfanos (endpoint libre) se dibujan punteados en color de advertencia.
// highlighted: Set de ids de cables del mismo nodo que el seleccionado (el resto se atenúa); null = sin resaltado.
export function drawWires(ctx, items, { theme, scale, selection, hops, hopRadius, highlighted = null, labels = new Map(), handles = false }) {
  const pixel = 1 / scale;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  items.forEach(({ wire, points }) => {
    if (points.length < 2) return;
    const orphan = hasFreeEndpoint(wire);
    const selected = selection.has(wire.id);
    const dimmed = highlighted !== null && !highlighted.has(wire.id);
    const color = orphan ? theme.warning : (theme.wireColors[wire.color] ?? theme.wireColors.negro);
    const ops = toPathOps(points, hops.get(wire.id), hopRadius);
    ctx.globalAlpha = dimmed ? 0.22 : 1;

    if (selected || (highlighted !== null && !dimmed)) {
      tracePathOps(ctx, ops);
      ctx.strokeStyle = theme.selection;
      ctx.globalAlpha = selected ? 0.4 : 0.2;
      ctx.lineWidth = pixel * 7;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    tracePathOps(ctx, ops);
    ctx.strokeStyle = color;
    ctx.lineWidth = pixel * wireWidthPixels(wire);
    ctx.setLineDash(orphan ? [pixel * 6, pixel * 4] : []);
    ctx.globalAlpha = dimmed ? 0.22 : 1;
    ctx.stroke();
    ctx.setLineDash([]);

    // Verde-amarillo (tierra): franja amarilla discontinua encima del verde, como el cable real.
    if (wire.color === 'verde-amarillo' && !orphan) {
      tracePathOps(ctx, ops);
      ctx.strokeStyle = theme.wireColors.amarillo;
      ctx.lineWidth = pixel * Math.max(1, wireWidthPixels(wire) - 1);
      ctx.setLineDash([pixel * 5, pixel * 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (orphan) {
      [wire.from, wire.to].filter((endpoint) => endpoint.componentId === undefined).forEach((endpoint) => {
        ctx.beginPath();
        ctx.arc(endpoint.x, endpoint.y, pixel * 4, 0, Math.PI * 2);
        ctx.strokeStyle = theme.warning;
        ctx.lineWidth = pixel * 1.5;
        ctx.stroke();
      });
    }

    if (!dimmed) drawWireLabel(ctx, labels.get(wire.id), { theme, scale, color: selected ? theme.text : color });
    if (handles && selected) drawSegmentHandles(ctx, points, { theme, pixel });
    ctx.globalAlpha = 1;
  });
  ctx.restore();
}
