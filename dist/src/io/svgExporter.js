import { componentLabelLayout, textAngle } from '../core/textLayout.js';
import { getComponentBounds } from '../core/componentGeometry.js';
import { orderedComponents } from '../core/componentOrder.js';
import { resolveDimension } from '../core/dimensionGeometry.js';
import { getSceneBounds, getTitleBlockLayout } from '../core/sceneBounds.js';
import { computeWireLabels, getDisplay, labelFontSize, WireLabelPlacer } from '../core/wireLabel.js';
import { toPathOps } from '../core/wireGeometry.js';
import { hopRadius } from '../render/sceneDrawer.js';
import { printTheme } from '../render/theme.js';
import { symbolShapesFor } from '../data/symbolLibrary.js';

const escapeXml = (text) =>
  String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const round = (value) => Math.round(value * 100) / 100;

function shapeToSvg(shape, theme) {
  const stroke = shape.muted ? theme.mutedText : theme.componentStroke;
  const dash = shape.dash ? ` stroke-dasharray="${shape.dash.join(' ')}"` : '';
  const style = `fill="none" stroke="${stroke}" stroke-width="${0.4 * (shape.weight ?? 1)}"${dash}`;
  switch (shape.t) {
    case 'rect':
      return `<rect x="${shape.x}" y="${shape.y}" width="${shape.w}" height="${shape.h}" ${style}/>`;
    case 'line':
      return `<line x1="${shape.x1}" y1="${shape.y1}" x2="${shape.x2}" y2="${shape.y2}" ${style}/>`;
    case 'circle':
      return `<circle cx="${shape.x}" cy="${shape.y}" r="${shape.r}" ${style}/>`;
    case 'text': {
      const anchor = { left: 'start', right: 'end' }[shape.align] ?? 'middle';
      return `<text x="${shape.x}" y="${shape.y}" font-size="${shape.size ?? 8}" text-anchor="${anchor}" dominant-baseline="middle" fill="${shape.muted ? theme.mutedText : theme.text}">${escapeXml(shape.text)}</text>`;
    }
    default:
      return '';
  }
}

function componentToSvg(component, definition, theme, symbols = false) {
  const bounds = getComponentBounds(component, definition);
  const faint = symbols && definition.blocksRouting && symbolShapesFor(definition);
  const body = `<rect width="${definition.width}" height="${definition.height}" fill="${definition.blocksRouting ? theme.componentFill : 'none'}" stroke="${faint ? theme.mutedText : theme.componentStroke}" stroke-width="0.5"${faint ? ' stroke-dasharray="2 2"' : ''}/>`;
  const symbolShapes = symbols && definition.blocksRouting ? symbolShapesFor(definition) : null;
  const inset = !symbolShapes && definition.blocksRouting && definition.width >= 30 && definition.height >= 40
    ? `<rect x="3" y="3" width="${definition.width - 6}" height="${definition.height - 6}" fill="none" stroke="${theme.mutedText}" stroke-width="0.35" opacity="0.24"/>` : '';
  const shapes = (symbolShapes ?? definition.shapes).map((shape) => shape.t === 'text' && component.bodyTextOrientation
    ? `<g transform="translate(${shape.x} ${shape.y}) rotate(${textAngle(component.bodyTextOrientation) - component.rotation})">${shapeToSvg({ ...shape, x: 0, y: 0 }, theme)}</g>`
    : shapeToSvg(shape, theme)).join('');
  const terminals = definition.terminals
    .map((terminal) => `<circle cx="${terminal.x}" cy="${terminal.y}" r="1.7" fill="${theme.componentFill}" stroke="${theme.terminal}" stroke-width="0.45"/>`)
    .join('');
  const layout = componentLabelLayout(component, definition);
  const label = component.label
    ? `<text transform="translate(${round(layout.x)} ${round(layout.y)}) rotate(${layout.angle})" font-size="${layout.size}" fill="${theme.text}">${escapeXml(component.label)}</text>` : '';
  const terminalLabels = definition.terminals.map(t => {
    const x = t.x + (t.side === 'left' ? 6 : t.side === 'right' ? -6 : 0);
    const y = t.y + (t.side === 'top' ? 6 : t.side === 'bottom' ? -6 : 0);
    return `<text transform="translate(${x} ${y}) rotate(${textAngle(component.terminalOrientation) - component.rotation})" text-anchor="middle" dominant-baseline="middle" font-size="4" fill="${theme.mutedText}">${escapeXml(t.id)}</text>`;
  }).join('');
  return (
    `<g transform="translate(${component.x} ${component.y}) rotate(${component.rotation}) translate(${-definition.width / 2} ${-definition.height / 2})">${body}${inset}${shapes}${terminals}${terminalLabels}</g>` +
    label
  );
}

function opsToPathData(ops) {
  return ops
    .map((op) => {
      if (op.op === 'M' || op.op === 'L') return `${op.op}${round(op.x)} ${round(op.y)}`;
      return `A${op.r} ${op.r} 0 0 ${op.dir > 0 ? 1 : 0} ${round(op.cx + op.dir * op.r)} ${round(op.cy)}`;
    })
    .join(' ');
}

// SVG 100% vectorial a escala 1:1 (unidades en mm) generado desde el modelo, independiente del renderer de pantalla.
export function exportSvg({ state, catalog, routeService, hopCalculator, labelPlacer = new WireLabelPlacer(), theme = printTheme, padding = 20 }) {
  const bounds = getSceneBounds(state, catalog, routeService);
  if (!bounds) throw new Error('El documento está vacío.');

  const components = orderedComponents(state, catalog)
    .map((component) => componentToSvg(component, catalog.resolve(component), theme, getDisplay(state.meta).viewMode === 'symbol'))
    .join('');

  const wireItems = Object.values(state.wires).map((wire) => ({ wire, points: routeService.getPath(wire, state) }));
  const hops = hopCalculator.compute(wireItems.map(({ wire, points }) => ({ id: wire.id, points })));
  const wires = wireItems
    .filter(({ points }) => points.length >= 2)
    .map(({ wire, points }) => {
      const color = theme.wireColors[wire.color] ?? theme.wireColors.negro;
      const d = opsToPathData(toPathOps(points, hops.get(wire.id), hopRadius));
      const width = round(0.55 + 0.1 * Math.sqrt(Number(wire.gauge) || 1.5) * 1.6);
      return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round"/>`;
    })
    .join('');

  const wireLabels = [...computeWireLabels({ state, catalog, routeService, placer: labelPlacer }).entries()]
    .map(([wireId, label]) => {
      const color = theme.wireColors[state.wires[wireId].color] ?? theme.wireColors.negro;
      return `<text x="${round(label.x)}" y="${round(label.y)}" font-size="${labelFontSize}" text-anchor="middle" dominant-baseline="middle" fill="${color}" stroke="${theme.background}" stroke-width="2" paint-order="stroke" stroke-linejoin="round">${escapeXml(label.text)}</text>`;
    })
    .join('');

  const titleBlock = getTitleBlockLayout(state, catalog, routeService);
  const titleBlockSvg = titleBlock ? titleBlock.shapes.map((shape) => shapeToSvg(shape, theme)).join('') : '';

  const dimensions = Object.values(state.dimensions)
    .map((dimension) => resolveDimension(dimension, state, catalog))
    .filter(Boolean)
    .map((resolved) => {
      const lines = resolved.segments
        .map((s) => `<line x1="${round(s.x1)}" y1="${round(s.y1)}" x2="${round(s.x2)}" y2="${round(s.y2)}" stroke="${theme.dimension}" stroke-width="0.4"/>`)
        .join('');
      const rotation = resolved.horizontal ? '' : ' rotate(-90)';
      return `${lines}<text transform="translate(${round(resolved.textPosition.x)} ${round(resolved.textPosition.y)})${rotation}" font-size="8" text-anchor="middle" dominant-baseline="middle" fill="${theme.dimension}">${escapeXml(resolved.text)}</text>`;
    })
    .join('');

  const left = round(bounds.left - padding);
  const top = round(bounds.top - padding);
  const width = round(bounds.right - bounds.left + padding * 2);
  const height = round(bounds.bottom - bounds.top + padding * 2);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${left} ${top} ${width} ${height}" width="${width}mm" height="${height}mm" font-family="Inter, Arial, sans-serif">` +
    `<rect x="${left}" y="${top}" width="${width}" height="${height}" fill="${theme.background}"/>` +
    `${components}${wires}${wireLabels}${dimensions}${titleBlockSvg}</svg>`
  );
}
