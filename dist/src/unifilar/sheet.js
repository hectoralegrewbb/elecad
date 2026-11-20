import { layoutTitleBlock, titleBlockSize } from '../core/titleBlock.js';
import { symbolShapesFor } from '../data/symbolLibrary.js';
import { getSymbol, papers, portsFor, sameEnd } from './model.js';

const margin = 10;
const escapeXml = (value) => String(value).replace(/[<>&"']/g, (char) => ({
  '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;',
})[char]);

export function sheetGeometry(meta) {
  const [short, long] = papers[meta.paper];
  const [width, height] = meta.orientation === 'portrait' ? [short, long] : [long, short];
  const right = width - margin;
  const bottom = height - margin;
  const titleTop = bottom - titleBlockSize.height;
  const title = layoutTitleBlock(meta.titleBlock, { left: right - titleBlockSize.width, right, bottom: titleTop - 20 }, { minValueSize: 2.5 });
  return { width, height, frame: { left: margin, top: margin, right, bottom },
    area: { left: margin + 5, top: margin + 5, right: right - 5, bottom: title.rect.top - 5 }, title };
}

function port(elements, end) {
  return portsFor(elements[end.elementId]).find((candidate) => candidate.port === end.port);
}

export function orthogonalPoints(start, finish, bends = []) {
  const points = [start];
  const waypoints = bends.length || start.x === finish.x || start.y === finish.y ? bends
    : [{ x: start.x, y: Math.round((start.y + finish.y) / 10) * 5 },
      { x: finish.x, y: Math.round((start.y + finish.y) / 10) * 5 }];
  for (const point of [...waypoints, finish]) {
    const previous = points.at(-1);
    if (previous.x !== point.x && previous.y !== point.y) points.push({ x: point.x, y: previous.y });
    if (previous.x !== point.x || previous.y !== point.y) points.push(point);
  }
  return points;
}

export function circuitPoints(state, circuit) {
  return orthogonalPoints(port(state.elements, circuit.from), port(state.elements, circuit.to), circuit.bends);
}

export function isInside(point, { left, right, top, bottom }, inset = 0) {
  return point.x >= left + inset && point.x <= right - inset && point.y >= top + inset && point.y <= bottom - inset;
}

function elementBounds(element) {
  const { x, y, kind, rotation, tag, detail } = element;
  const horizontal = rotation % 180 === 0;
  const radiusX = kind === 'bus' ? (horizontal ? 25 : 1) : horizontal ? 6 : 10;
  const radiusY = kind === 'bus' ? (horizontal ? 1 : 25) : horizontal ? 10 : 6;
  const labelX = x + (kind === 'bus' && horizontal ? 28 : 12);
  const labelWidth = Math.max(tag.length, detail.length) * 2;
  return [{ x: x - radiusX, y: y - radiusY },
    { x: Math.max(x + radiusX, labelWidth ? labelX + labelWidth : x), y: y + Math.max(radiusY, detail ? 4 : 0) }];
}

function circuitLabel(circuit, points) {
  const value = [circuit.label, circuit.conductors, circuit.section === null ? '' : `${String(circuit.section).replace('.', ',')} mm²`].filter(Boolean).join(' · ');
  const segments = points.slice(1).map((point, index) => {
    const previous = points[index];
    return { point, previous, length: Math.abs(point.x - previous.x) + Math.abs(point.y - previous.y) };
  });
  const segment = segments.reduce((longest, candidate) => !longest || candidate.length > longest.length ? candidate : longest, null);
  if (!value || !segment) return null;
  const { point, previous } = segment;
  const vertical = point.x === previous.x;
  return { text: value, x: (point.x + previous.x) / 2 + (vertical ? 1.8 : 0), y: (point.y + previous.y) / 2 - 1.6, align: vertical ? 'left' : 'center' };
}

function hasOverlappingSegments(routes) {
  const lanes = new Map();
  for (const [circuit, points] of routes) {
    for (let i = 1; i < points.length; i += 1) {
      const a = points[i - 1];
      const b = points[i];
      const horizontal = a.y === b.y;
      const key = horizontal ? `h${a.y}` : `v${a.x}`;
      if (!lanes.has(key)) lanes.set(key, []);
      const start = horizontal ? a.x : a.y;
      const end = horizontal ? b.x : b.y;
      lanes.get(key).push({ min: Math.min(start, end), max: Math.max(start, end), id: circuit.id });
    }
  }
  for (const segments of lanes.values()) {
    segments.sort((a, b) => a.min - b.min);
    let farthest = { max: -Infinity };
    for (const segment of segments) {
      if (segment.min < farthest.max && segment.id !== farthest.id) return true;
      if (segment.max > farthest.max) farthest = segment;
    }
  }
  return false;
}

export function sheetWarnings(state) {
  const { area, title } = sheetGeometry(state.meta);
  const elements = Object.values(state.elements);
  const circuits = Object.values(state.circuits).map((circuit) => [circuit, circuitPoints(state, circuit)]);
  const outside = elements.some((element) => elementBounds(element).some((point) => !isInside(point, area))) ||
    circuits.some(([circuit, points]) => {
      const label = circuitLabel(circuit, points);
      const labelWidth = (label?.text.length ?? 0) * 1.7;
      const labelOutside = label && (!isInside(label, area) || !isInside({
        x: label.x + (label.align === 'center' ? labelWidth / 2 : labelWidth), y: label.y - 3,
      }, area) || (label.align === 'center' && label.x - labelWidth / 2 < area.left));
      return labelOutside || points.some((point) => !isInside(point, area));
    });
  const tags = elements.map((element) => element.tag.toUpperCase()).filter(Boolean);
  return [
    ...(title.truncated ? ['Hay campos del cajetín que exceden su celda. Acortá el texto para imprimirlo completo.'] : []),
    ...(outside ? ['Hay elementos o rótulos fuera del área útil. Movelos o cambiá el tamaño de hoja.'] : []),
    ...(tags.length !== new Set(tags).size ? ['Hay identificaciones de equipo repetidas.'] : []),
    ...(circuits.some(([, points]) => points.length < 2) ? ['Hay circuitos con extremos superpuestos.'] : []),
    ...(hasOverlappingSegments(circuits) ? ['Hay circuitos que comparten un tramo gráfico. Agregá quiebres para distinguirlos.'] : []),
  ];
}

const pathData = (points) => points.map(({ x, y }, index) => `${index ? ' L' : 'M'}${x} ${y}`).join('');
const rect = ({ left, top, right, bottom }, attrs = '') =>
  `<rect x="${left}" y="${top}" width="${right - left}" height="${bottom - top}" ${attrs}/>`;

function shapeMarkup(shape) {
  switch (shape.t) {
    case 'line': return `<line x1="${shape.x1}" y1="${shape.y1}" x2="${shape.x2}" y2="${shape.y2}"${shape.dash ? ` stroke-dasharray="${shape.dash.join(' ')}"` : ''}/>`;
    case 'rect': return `<rect x="${shape.x}" y="${shape.y}" width="${shape.w}" height="${shape.h}"/>`;
    case 'circle': return `<circle cx="${shape.x}" cy="${shape.y}" r="${shape.r}"/>`;
    case 'text': return `<text x="${shape.x}" y="${shape.y}" font-size="${shape.size}" text-anchor="${shape.align === 'center' ? 'middle' : 'start'}" fill="#111827" stroke="none">${escapeXml(shape.text)}</text>`;
    default: return '';
  }
}

const baseTerminals = [{ id: 'in', side: 'top', x: 30 }, { id: 'out', side: 'bottom', x: 30 }];
const baseShapes = Object.fromEntries(['breaker', 'disconnector', 'fuse'].map((kind) => {
  const symbolKind = getSymbol(kind).symbolKind;
  const shapes = symbolShapesFor({ id: kind, symbolKind, width: 60, height: 60, terminals: baseTerminals });
  return [kind, shapes.map(shapeMarkup).join('')];
}));

const junctionDot = (x, y) => `<circle cx="${x}" cy="${y}" r="0.9" fill="currentColor" stroke="none"/>`;

function symbolMarkup(element, active, interactive) {
  const { id, kind, x, y, rotation, tag, detail } = element;
  const definition = getSymbol(kind);
  const stroke = active ? '#0768c3' : '#111827';
  const body = baseShapes[kind] ? `<g transform="scale(.3333333333) translate(-30 -30)" stroke-width="1.3">${baseShapes[kind]}</g>`
    : kind === 'junction' ? junctionDot(0, 0) : `<path d="${definition.path}" stroke-width="${kind === 'bus' ? 1.05 : 0.45}"/>`;
  const labelX = x + (kind === 'bus' && rotation % 180 === 0 ? 28 : 12);
  const busGap = kind === 'bus' ? `<path d="${definition.path}" stroke="white" stroke-width="2.2"/>` : '';
  const bodyHit = interactive ? `<rect x="${kind === 'bus' ? -26 : -8}" y="${kind === 'bus' ? -4 : -10}" width="${kind === 'bus' ? 52 : 16}" height="${kind === 'bus' ? 8 : 20}" fill="transparent" stroke="none"/>` : '';
  const textLine = (value, offset, size, extra = '') => value
    ? `<text x="${labelX}" y="${y + offset}" font-size="${size}" fill="${stroke}" stroke="none" ${extra}>${escapeXml(value)}</text>` : '';
  return `<g ${interactive ? `data-element="${id}" class="uf-target"` : ''} style="color:${stroke}" stroke="${stroke}"><g transform="translate(${x} ${y}) rotate(${rotation})">${bodyHit}${busGap}${body}</g>` +
    (definition.mark ? `<text x="${x}" y="${y + 1.4}" text-anchor="middle" font-size="4" fill="${stroke}" stroke="none">${definition.mark}</text>` : '') +
    textLine(tag, -0.7, 3.4, 'font-weight="600"') + textLine(detail, 3.1, 2.8) + '</g>';
}

export function sheetMarkup(state, options = {}) {
  const { interactive = false, selection = null, connecting = false, from = null, preview = [], grid = false } = options;
  const { width, height, frame, area, title } = sheetGeometry(state.meta);
  const elements = Object.values(state.elements);
  const usedPorts = new Map();
  const wires = Object.values(state.circuits).map((circuit) => {
    for (const end of [circuit.from, circuit.to]) {
      const key = `${end.elementId}:${end.port}`;
      usedPorts.set(key, (usedPorts.get(key) ?? 0) + 1);
    }
    const points = circuitPoints(state, circuit);
    const d = pathData(points);
    const stroke = selection?.id === circuit.id ? '#0768c3' : '#111827';
    const label = circuitLabel(circuit, points);
    const labelMarkup = label ? `<text x="${label.x}" y="${label.y}" font-size="2.8" text-anchor="${label.align === 'center' ? 'middle' : 'start'}" fill="${stroke}" stroke="#fff" stroke-width="0.7" paint-order="stroke">${escapeXml(label.text)}</text>` : '';
    const hit = interactive ? `<path d="${d}" stroke="transparent" stroke-width="4"/>` : '';
    return { path: `<g ${interactive ? `data-circuit="${circuit.id}" class="uf-target"` : ''}><path d="${d}" stroke="white" stroke-width="1.7"/><path d="${d}" stroke="${stroke}" stroke-width="0.42"/>${hit}</g>`, label: labelMarkup };
  });
  const dots = elements.flatMap((element) => portsFor(element).filter((end) =>
    element.kind !== 'junction' && (usedPorts.get(`${end.elementId}:${end.port}`) ?? 0) >= (element.kind === 'bus' ? 1 : 2))
    .map(({ x, y }) => junctionDot(x, y))).join('');
  const handles = connecting ? elements.flatMap(portsFor).map((end) => {
    const { x, y, port, elementId } = end;
    return `<g class="uf-target" data-port="${port}" data-port-element="${elementId}"><circle cx="${x}" cy="${y}" r="4" fill="transparent" stroke="none"/><circle cx="${x}" cy="${y}" r="1.35" fill="${from && sameEnd(end, from) ? '#0768c3' : 'white'}" stroke="#0768c3" stroke-width="0.45"/></g>`;
  }).join('') : '';
  const gridMarkup = grid ? '<defs><pattern id="uf-grid" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="0.25" cy="0.25" r=".25" fill="#c4cdd9"/></pattern></defs>' + rect(area, 'fill="url(#uf-grid)" stroke="none"') : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${height}mm" viewBox="0 0 ${width} ${height}" aria-label="Lámina unifilar" font-family="Arial, sans-serif" fill="none" stroke="#111827" stroke-width="0.35" stroke-linejoin="round" style="color:#111827">` +
    `<rect width="${width}" height="${height}" fill="white" stroke="none"/>${gridMarkup}${rect(frame)}` +
    wires.map(({ path }) => path).join('') + elements.map((element) => symbolMarkup(element, selection?.id === element.id, interactive)).join('') +
    dots + wires.map(({ label }) => label).join('') + title.shapes.map(shapeMarkup).join('') +
    (preview.length > 1 ? `<path d="${pathData(preview)}" stroke="#0768c3" stroke-width="0.55" stroke-dasharray="2 1" pointer-events="none"/>` : '') + handles + '</svg>';
}
