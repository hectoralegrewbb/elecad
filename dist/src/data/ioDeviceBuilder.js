// Generador de equipos con E/S y comunicación: PLC, módulos de señales, HMI, switches.
// Distribución (escala esquemática, paso de bornes 10 mm, todo sobre la grilla de 5 mm):
//   arriba   → alimentación, DI (+ comunes), AI, RTD, TC
//   abajo    → DQ (+ alimentación de salidas), AQ
//   izquierda → comunicación (Ethernet, PROFIBUS, RS485, RS232, CAN)
// Direccionamiento tipo Siemens: entradas i0.0…, salidas q0.0…

const pitch = 10;
const minWidth = 80;
const minHeight = 100;

export const ioParameters = [
  { key: 'power', label: 'Alimentación', short: 'PWR', type: 'select', options: ['24vdc', '230vac', 'ninguna'], default: '24vdc' },
  { key: 'di', label: 'Entradas digitales (DI)', short: 'DI', type: 'number', min: 0, max: 64, default: 8 },
  { key: 'dq', label: 'Salidas digitales (DQ)', short: 'DQ', type: 'number', min: 0, max: 64, default: 8 },
  { key: 'ai', label: 'Entradas analógicas (AI)', short: 'AI', type: 'number', min: 0, max: 16, default: 0 },
  { key: 'aq', label: 'Salidas analógicas (AQ)', short: 'AQ', type: 'number', min: 0, max: 16, default: 0 },
  { key: 'rtd', label: 'Entradas RTD (Pt100…)', short: 'RTD', type: 'number', min: 0, max: 16, default: 0 },
  { key: 'rtdWires', label: 'Hilos por RTD', short: 'hilos', type: 'select', options: ['2', '3', '4'], default: '3' },
  { key: 'tc', label: 'Entradas termocupla (TC)', short: 'TC', type: 'number', min: 0, max: 16, default: 0 },
  { key: 'ethernet', label: 'Puertos Ethernet (PROFINET / Modbus TCP)', short: 'ETH', type: 'number', min: 0, max: 8, default: 1 },
  { key: 'profibus', label: 'Puertos PROFIBUS DP', short: 'PB', type: 'number', min: 0, max: 2, default: 0 },
  { key: 'rs485', label: 'Puertos RS485 (Modbus RTU)', short: 'RS485', type: 'number', min: 0, max: 4, default: 0 },
  { key: 'rs232', label: 'Puertos RS232', short: 'RS232', type: 'number', min: 0, max: 4, default: 0 },
  { key: 'can', label: 'Puertos CAN / CANopen', short: 'CAN', type: 'number', min: 0, max: 2, default: 0 },
];

// Parámetros con otros valores por defecto (para PLC configurable, módulo configurable, etc.).
export const ioParametersWith = (defaults) =>
  ioParameters.map((parameter) => (parameter.key in defaults ? { ...parameter, default: defaults[parameter.key] } : parameter));

const zeroParams = Object.fromEntries(ioParameters.map((parameter) => [parameter.key, parameter.type === 'select' ? parameter.default : 0]));

export function buildIoDevice(rawParams, title) {
  const params = { ...zeroParams, power: 'ninguna', ...rawParams };
  const count = (key) => Math.max(0, Math.floor(Number(params[key]) || 0));

  const edges = { top: [], bottom: [], left: [] };
  const captions = { top: [], bottom: [] };
  const add = (edge, id) => edges[edge].push(id);
  const spacer = (edge) => {
    const slots = edges[edge];
    if (slots.length > 0 && slots[slots.length - 1] !== null) slots.push(null);
  };
  const caption = (edge, text) => captions[edge].push({ slot: edges[edge].length, text });

  if (params.power === '24vdc') ['l+', 'm'].forEach((id) => add('top', id));
  if (params.power === '400vac') ['l1', 'l2', 'l3', 'pe'].forEach((id) => add('top', id));
  if (params.power === '230vac') ['l', 'n', 'pe'].forEach((id) => add('top', id));

  const di = count('di');
  if (di > 0) {
    spacer('top');
    caption('top', 'DI');
    for (let group = 0; group * 8 < di; group += 1) {
      for (let bit = 0; bit < Math.min(8, di - group * 8); bit += 1) add('top', `i${group}.${bit}`);
      add('top', `${group + 1}m`);
    }
  }
  const ai = count('ai');
  if (ai > 0) {
    spacer('top');
    caption('top', 'AI');
    for (let channel = 0; channel < ai; channel += 1) ['+', '-'].forEach((sign) => add('top', `ai${channel}${sign}`));
  }
  const rtd = count('rtd');
  if (rtd > 0) {
    spacer('top');
    caption('top', 'RTD');
    for (let channel = 0; channel < rtd; channel += 1) {
      for (let wire = 0; wire < Number(params.rtdWires); wire += 1) add('top', `rtd${channel}.${'abcd'[wire]}`);
    }
  }
  const tc = count('tc');
  if (tc > 0) {
    spacer('top');
    caption('top', 'TC');
    for (let channel = 0; channel < tc; channel += 1) ['+', '-'].forEach((sign) => add('top', `tc${channel}${sign}`));
  }

  const dq = count('dq');
  if (dq > 0) {
    caption('bottom', 'DQ');
    for (let group = 0; group * 8 < dq; group += 1) {
      add('bottom', `${group + 1}l+`);
      for (let bit = 0; bit < Math.min(8, dq - group * 8); bit += 1) add('bottom', `q${group}.${bit}`);
    }
  }
  const aq = count('aq');
  if (aq > 0) {
    spacer('bottom');
    caption('bottom', 'AQ');
    for (let channel = 0; channel < aq; channel += 1) ['+', '-'].forEach((sign) => add('bottom', `aq${channel}${sign}`));
  }

  const serialPorts = [
    ['ethernet', (k) => [`eth${k}`]],
    ['profibus', (k) => [`pb${k}.a`, `pb${k}.b`, `pb${k}.sh`]],
    ['rs485', (k) => [`rs485.${k}.a`, `rs485.${k}.b`, `rs485.${k}.sh`]],
    ['rs232', (k) => [`rs232.${k}.tx`, `rs232.${k}.rx`, `rs232.${k}.gnd`]],
    ['can', (k) => [`can${k}.h`, `can${k}.l`, `can${k}.gnd`]],
  ];
  serialPorts.forEach(([key, idsFor]) => {
    if (count(key) === 0) return;
    spacer('left');
    for (let port = 0; port < count(key); port += 1) idsFor(port).forEach((id) => add('left', id));
  });

  const topSlots = edges.top.length;
  const bottomSlots = edges.bottom.length;
  const width = Math.max(minWidth, (Math.max(topSlots, bottomSlots) + 1) * pitch);
  const height = Math.max(minHeight, Math.ceil((20 + edges.left.length * pitch + 10) / 10) * 10);

  const terminals = [];
  edges.top.forEach((id, slot) => id !== null && terminals.push({ id, x: pitch * (slot + 1), y: 0, side: 'top' }));
  edges.bottom.forEach((id, slot) => id !== null && terminals.push({ id, x: pitch * (slot + 1), y: height, side: 'bottom' }));
  edges.left.forEach((id, slot) => id !== null && terminals.push({ id, x: 0, y: 20 + pitch * slot, side: 'left' }));

  const shapes = [{ t: 'text', x: width / 2, y: height / 2, text: title, size: 10, align: 'center' }];
  captions.top.forEach(({ slot, text }) => shapes.push({ t: 'text', x: pitch * (slot + 1), y: 16, text, size: 5, align: 'left', muted: true }));
  captions.bottom.forEach(({ slot, text }) => shapes.push({ t: 'text', x: pitch * (slot + 1), y: height - 16, text, size: 5, align: 'left', muted: true }));

  return { width, height, terminals, shapes };
}

// Definición lista para el catálogo: preset fijo (no editable) o configurable por instancia.
export const fixedIoDevice = ({ params, title, ...definition }) => ({ ...definition, ...buildIoDevice(params, title ?? definition.name) });

export const configurableIoDevice = ({ defaults = {}, title, ...definition }) => ({
  ...definition,
  parameters: ioParametersWith(defaults),
  build: (values) => buildIoDevice(values, title ?? definition.name),
});
