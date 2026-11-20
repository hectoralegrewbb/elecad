import { createId } from '../core/ids.js';
import { defaultTitleBlock, titleBlockFields } from '../core/titleBlock.js';

export const papers = Object.freeze({ A4: [210, 297], A3: [297, 420] });
export const orientations = ['landscape', 'portrait'];
export const conductorSets = ['1F', '1F + N', '1F + N + PE', '2F', '2F + PE', '3F', '3F + PE', '3F + N', '3F + N + PE', 'CC', 'CC + PE', 'N', 'PE'];
export const symbols = Object.freeze({
  source: { name: 'Acometida', prefix: 'AC', ports: ['out'], path: 'M-4 -5H4L0 1ZM0 1V10' },
  breaker: { name: 'Interruptor automático', prefix: 'Q', ports: ['in', 'out'], symbolKind: 'breaker' },
  disconnector: { name: 'Seccionador', prefix: 'QS', ports: ['in', 'out'], symbolKind: 'disconnector' },
  fuse: { name: 'Fusible', prefix: 'F', ports: ['in', 'out'], symbolKind: 'fuse' },
  rcd: { name: 'Interruptor diferencial', prefix: 'ID', ports: ['in', 'out'], path: 'M0 -10V-5M0 -5L-3 2M0 3V10M-5 -6H5V6H-5ZM1 -3Q5 -2 2 1Q0 3 4 3' },
  transformer: { name: 'Transformador', prefix: 'T', ports: ['in', 'out'], path: 'M0 -10V-7M0 7V10M4 -3A4 4 0 1 1 -4 -3A4 4 0 1 1 4 -3M4 3A4 4 0 1 1 -4 3A4 4 0 1 1 4 3' },
  drive: { name: 'Variador', prefix: 'V', ports: ['in', 'out'], path: 'M0 -10V-5M0 5V10M-5 -5H5V5H-5ZM-5 5L5 -5M-4 -1Q-3 -3 -2 -1T0 -1M0 3Q1 1 2 3T4 3' },
  motor: { name: 'Motor', prefix: 'M', ports: ['in'], path: 'M0 -10V-5M5 0A5 5 0 1 1 -5 0A5 5 0 1 1 5 0', mark: 'M' },
  load: { name: 'Salida / carga', prefix: 'S', ports: ['in'], path: 'M0 -10V4M-3 1L0 4L3 1' },
  earth: { name: 'Tierra de protección', prefix: 'PE', ports: ['in'], path: 'M0 -10V0M-5 0H5M-3 2H3M-1 4H1' },
  bus: { name: 'Barra', prefix: 'B', ports: ['tap1', 'tap2', 'tap3', 'tap4', 'tap5'], path: 'M-25 0H25' },
  junction: { name: 'Punto de unión', prefix: 'X', ports: ['join'], path: '' },
});

const tapOffsets = [-20, -10, 0, 10, 20];
const idPattern = /^[a-z][a-z0-9_]{0,59}$/;
const positionLimit = 2000;
const validId = (value) => typeof value === 'string' && idPattern.test(value);
const validNumber = (value) => typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= positionLimit;
const validPoint = (point) => validNumber(point?.x) && validNumber(point?.y);
const string = (value, limit = 80) => typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, limit) : '';
const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
export const snap = (value) => Math.round(value / 5) * 5;

export function createUnifilar() {
  return {
    meta: { name: 'Plano unifilar', paper: 'A3', orientation: 'landscape', titleBlock: { ...defaultTitleBlock, enabled: true, title: 'Diagrama unifilar' } },
    elements: {},
    circuits: {},
  };
}

export function getSymbol(kind) {
  return Object.hasOwn(symbols, kind) ? symbols[kind] : null;
}

export function portsFor(element) {
  return getSymbol(element.kind).ports.map((id, index) => {
    const offset = id === 'in' ? { x: 0, y: -10 } : id === 'out' ? { x: 0, y: 10 }
      : { x: element.kind === 'bus' ? tapOffsets[index] : 0, y: 0 };
    const rotated = element.rotation === 90 ? { x: -offset.y, y: offset.x }
      : element.rotation === 180 ? { x: -offset.x, y: -offset.y }
      : element.rotation === 270 ? { x: offset.y, y: -offset.x } : offset;
    return { elementId: element.id, port: id, x: element.x + rotated.x, y: element.y + rotated.y };
  });
}

const endpoint = ({ elementId, port }) => ({ elementId, port });
export const sameEnd = (a, b) => a.elementId === b.elementId && a.port === b.port;

function validEnd(elements, end) {
  return validId(end?.elementId) && Object.hasOwn(elements, end.elementId) &&
    getSymbol(elements[end.elementId].kind).ports.includes(end.port);
}

export function addElement(state, kind, point, id = createId('sym')) {
  const symbol = getSymbol(kind);
  if (!symbol || !validPoint(point) || !validId(id) || Object.hasOwn(state.elements, id)) return state;
  if (Object.keys(state.elements).length >= 500) return state;
  const tags = new Set(Object.values(state.elements).map(({ tag }) => tag));
  let nextNumber = 1;
  while (tags.has(symbol.prefix + nextNumber)) nextNumber += 1;
  const element = { id, kind, x: snap(point.x), y: snap(point.y), rotation: 0,
    tag: kind === 'junction' ? '' : symbol.prefix + nextNumber, detail: '' };
  return { ...state, elements: { ...state.elements, [id]: element } };
}

export function updateElement(state, id, patch) {
  if (!Object.hasOwn(state.elements, id)) return state;
  const current = state.elements[id];
  const next = { ...current };
  for (const axis of ['x', 'y']) if (validNumber(patch[axis])) next[axis] = snap(patch[axis]);
  if ([0, 90, 180, 270].includes(patch.rotation)) next.rotation = patch.rotation;
  if (typeof patch.tag === 'string') next.tag = string(patch.tag, 18);
  if (typeof patch.detail === 'string') next.detail = string(patch.detail, 28);
  if (Object.keys(next).every((key) => next[key] === current[key])) return state;
  return { ...state, elements: { ...state.elements, [id]: next } };
}

function circuitFields(raw) {
  const section = typeof raw.section === 'string' ? Number(raw.section.replace(',', '.')) : raw.section;
  return {
    label: string(raw.label, 18),
    conductors: conductorSets.includes(raw.conductors) ? raw.conductors : '',
    section: Number.isFinite(section) && section > 0 && section <= 2000 ? section : null,
  };
}

export function addCircuit(state, from, to, bends = [], fields = {}, id = createId('ckt')) {
  if (!validId(id) || Object.hasOwn(state.circuits, id) || !validEnd(state.elements, from) ||
      !validEnd(state.elements, to) || from.elementId === to.elementId ||
      !Array.isArray(bends) || bends.length > 30 || !bends.every(validPoint)) return state;
  const circuits = Object.values(state.circuits);
  if (circuits.length >= 1000) return state;
  const duplicated = circuits.some((circuit) =>
    (sameEnd(circuit.from, from) && sameEnd(circuit.to, to)) ||
    (sameEnd(circuit.from, to) && sameEnd(circuit.to, from)));
  if (duplicated) return state;
  const circuit = { id, from: endpoint(from), to: endpoint(to),
    bends: bends.map(({ x, y }) => ({ x: snap(x), y: snap(y) })), ...circuitFields(fields) };
  return { ...state, circuits: { ...state.circuits, [id]: circuit } };
}

export function updateCircuit(state, id, patch) {
  if (!Object.hasOwn(state.circuits, id)) return state;
  const current = state.circuits[id];
  const next = { ...current, ...circuitFields({ ...current, ...patch }) };
  if (Array.isArray(patch.bends) && patch.bends.length <= 30 && patch.bends.every(validPoint)) {
    next.bends = patch.bends.map(({ x, y }) => ({ x: snap(x), y: snap(y) }));
  }
  if (Object.keys(next).every((key) => next[key] === current[key])) return state;
  return { ...state, circuits: { ...state.circuits, [id]: next } };
}

export function removeSelection(state, { type, id }) {
  if (type === 'circuit' && Object.hasOwn(state.circuits, id)) {
    const circuits = { ...state.circuits };
    delete circuits[id];
    return { ...state, circuits };
  }
  if (type !== 'element' || !Object.hasOwn(state.elements, id)) return state;
  const elements = { ...state.elements };
  delete elements[id];
  const circuits = Object.fromEntries(Object.entries(state.circuits).filter(([, circuit]) =>
    circuit.from.elementId !== id && circuit.to.elementId !== id));
  return { ...state, elements, circuits };
}

export function updateSheet(state, patch) {
  const { meta } = state;
  const name = string(patch.name) || meta.name;
  const paper = Object.hasOwn(papers, patch.paper) ? patch.paper : meta.paper;
  const orientation = orientations.includes(patch.orientation) ? patch.orientation : meta.orientation;
  const titleBlock = { ...meta.titleBlock };
  for (const { key } of titleBlockFields) {
    if (typeof patch.titleBlock?.[key] === 'string') titleBlock[key] = string(patch.titleBlock[key]);
  }
  titleBlock.scale = 'S/E';
  if (name === meta.name && paper === meta.paper && orientation === meta.orientation &&
      Object.keys(titleBlock).every((key) => titleBlock[key] === meta.titleBlock[key])) return state;
  return { ...state, meta: { name, paper, orientation, titleBlock } };
}

export function validateUnifilar(raw) {
  if (!record(raw?.meta) || !record(raw.elements) || !record(raw.circuits)) {
    throw new Error('El archivo unifilar tiene una estructura inválida.');
  }
  const state = updateSheet(createUnifilar(), raw.meta);
  const entries = Object.entries(raw.elements);
  const circuits = Object.entries(raw.circuits);
  if (entries.length > 500 || circuits.length > 1000) throw new Error('El unifilar supera el límite de 500 símbolos o 1000 circuitos.');
  for (const [id, element] of entries) {
    if (!validId(id) || element?.id !== id || !getSymbol(element.kind) || !validPoint(element) ||
        ![0, 90, 180, 270].includes(element.rotation)) throw new Error('El archivo contiene un símbolo inválido.');
    state.elements[id] = { id, kind: element.kind, x: snap(element.x), y: snap(element.y), rotation: element.rotation,
      tag: string(element.tag, 18), detail: string(element.detail, 28) };
  }
  let next = state;
  for (const [id, circuit] of circuits) {
    if (circuit?.id !== id || !Array.isArray(circuit.bends)) throw new Error('El archivo contiene un circuito inválido.');
    const updated = addCircuit(next, circuit.from, circuit.to, circuit.bends, circuit, id);
    if (updated === next) throw new Error('El archivo contiene un circuito inválido o desconectado.');
    next = updated;
  }
  return next;
}
