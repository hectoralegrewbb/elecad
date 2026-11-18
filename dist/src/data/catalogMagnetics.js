import { terminalRow } from './catalogHelpers.js';

// Bobinas, reactores, toroides y transformadores de corriente: para armar circuitos de filtro de armónicos
// (filtros pasivos LC, reactores de línea, chokes de modo común) y la medición de corriente de los APF.
// ATENCIÓN: medidas orientativas (múltiplos de 10 mm) y bornes simplificados: verificar con el fabricante.

const category = 'Bobinas y toroides';

const bySize = (table, key) => table[key] ?? Object.values(table)[0];
const heightByCurrent = { '5': 70, '10': 80, '25': 90, '50': 110, '100': 130, '200': 160 };
const currentOptions = Object.keys(heightByCurrent);

// Cuatro vueltas dibujadas como círculos apilados, entre el borne superior (y = 0) y el inferior (y = height).
const coilTurns = (x, height) => {
  const turns = 4;
  const radius = 5;
  const top = height / 2 - turns * radius;
  return [
    { t: 'line', x1: x, y1: 0, x2: x, y2: top },
    ...Array.from({ length: turns }, (_, index) => ({ t: 'circle', x, y: top + radius + index * radius * 2, r: radius })),
    { t: 'line', x1: x, y1: top + turns * radius * 2, x2: x, y2: height },
  ];
};

// Equipo con N polos en columna (borne superior ↔ inferior de cada polo).
const poleBuild = ({ poles, height, topIds, bottomIds, label, linked = false, bottomPhases = null }) => {
  const width = 40 + (poles - 1) * 20;
  const xs = terminalRow(topIds, width, 0, 'top', 20).map((terminal) => terminal.x);
  const terminals = [
    ...terminalRow(topIds, width, 0, 'top', 20),
    ...terminalRow(bottomIds, width, height, 'bottom', 20).map((terminal, index) => (bottomPhases ? { ...terminal, phase: bottomPhases[index] } : terminal)),
  ];
  const shapes = [
    ...xs.flatMap((x) => coilTurns(x, height)),
    ...(linked && xs.length > 1 ? [{ t: 'line', x1: xs[0] - 6, y1: height / 2, x2: xs[xs.length - 1] + 6, y2: height / 2, dash: [3, 2], muted: true }] : []),
    { t: 'text', x: width / 2, y: height - 8, text: label, size: 6, align: 'center', muted: true },
  ];
  return { width, height, terminals, shapes };
};

const inductor1ph = {
  id: 'magnetic.inductor.1ph',
  category,
  brand: 'Genérico',
  name: 'Bobina / reactor monofásico (configurable)',
  labelPrefix: 'L',
  keywords: ['bobina', 'inductor', 'inductancia', 'reactor', 'choke', 'filtro', 'armonicos', 'lc', 'monofasico'],
  parameters: [
    { key: 'corriente', label: 'Corriente (A)', short: 'A', type: 'select', options: currentOptions, default: '10' },
    { key: 'inductancia', label: 'Inductancia (mH)', short: 'mH', type: 'select', options: ['0.1', '0.5', '1', '2', '5', '10', '20'], default: '2' },
  ],
  build: ({ corriente, inductancia }) =>
    poleBuild({ poles: 1, height: bySize(heightByCurrent, corriente), topIds: ['in'], bottomIds: ['out'], label: `${inductancia} mH` }),
};

const lineReactor3ph = {
  id: 'magnetic.reactor.3ph',
  category,
  brand: 'Genérico',
  name: 'Reactor trifásico de línea / carga (configurable)',
  labelPrefix: 'L',
  keywords: ['reactor', 'bobina', 'choke', 'linea', 'carga', 'dv/dt', 'armonicos', 'filtro', 'trifasico', 'detuned', 'sintonizado'],
  parameters: [
    { key: 'corriente', label: 'Corriente (A)', short: 'A', type: 'select', options: currentOptions, default: '25' },
    { key: 'caida', label: 'Caída de tensión', short: 'uk', type: 'select', options: ['2%', '3%', '4%', '5%', '7%'], default: '4%' },
  ],
  build: ({ corriente, caida }) =>
    poleBuild({
      poles: 3,
      height: bySize(heightByCurrent, corriente),
      topIds: ['l1', 'l2', 'l3'],
      bottomIds: ['l1o', 'l2o', 'l3o'],
      bottomPhases: ['L1', 'L2', 'L3'],
      label: `uk ${caida}`,
      linked: true,
    }),
};

// Bobina toroidal: núcleo en anillo con bobinado (se dibuja el anillo y el devanado).
const toroidInductor = {
  id: 'magnetic.toroid.inductor',
  category,
  brand: 'Genérico',
  name: 'Bobina toroidal (inductor, configurable)',
  labelPrefix: 'LT',
  keywords: ['toroide', 'toroidal', 'bobina', 'inductor', 'nucleo', 'anillo', 'ferrite', 'polvo de hierro', 'filtro', 'armonicos'],
  parameters: [
    { key: 'inductancia', label: 'Inductancia (mH)', short: 'mH', type: 'select', options: ['0.1', '0.5', '1', '2', '5', '10', '20'], default: '1' },
    { key: 'corriente', label: 'Corriente (A)', short: 'A', type: 'select', options: currentOptions, default: '10' },
  ],
  build: ({ inductancia }) => {
    const width = 60;
    const height = 80;
    const cy = height / 2;
    return {
      width,
      height,
      terminals: [
        { id: 'in', x: 30, y: 0, side: 'top' },
        { id: 'out', x: 30, y: height, side: 'bottom' },
      ],
      shapes: [
        { t: 'circle', x: 30, y: cy, r: 22 },
        { t: 'circle', x: 30, y: cy, r: 11 },
        { t: 'line', x1: 30, y1: 0, x2: 30, y2: cy - 22 },
        { t: 'line', x1: 30, y1: cy + 22, x2: 30, y2: height },
        { t: 'text', x: 30, y: cy, text: `${inductancia} mH`, size: 6, align: 'center' },
      ],
    };
  },
};

// Choke toroidal de modo común: los N conductores pasan por el mismo núcleo.
const commonModeChoke = {
  id: 'magnetic.choke.commonmode',
  category,
  brand: 'Genérico',
  name: 'Choke toroidal de modo común (2 a 4 conductores)',
  labelPrefix: 'LC',
  keywords: ['toroide', 'toroidal', 'choke', 'modo comun', 'emi', 'rfi', 'ferrite', 'nucleo', 'filtro', 'armonicos'],
  parameters: [
    { key: 'conductores', label: 'Conductores', short: 'cond.', type: 'number', min: 2, max: 4, default: 3 },
    { key: 'corriente', label: 'Corriente (A)', short: 'A', type: 'select', options: currentOptions, default: '25' },
  ],
  build: ({ conductores, corriente }) => {
    const ids = Array.from({ length: conductores }, (_, index) => `${index + 1}`);
    const outIds = ids.map((id) => `${id}'`);
    return poleBuild({ poles: conductores, height: bySize(heightByCurrent, corriente), topIds: ids, bottomIds: outIds, label: 'MODO COMÚN', linked: true });
  },
};

// TI toroidal: el primario (p1 → p2) atraviesa la ventana; el secundario sale por la derecha (s1 / s2).
const toroidalCt = {
  id: 'magnetic.ct.toroid',
  category,
  brand: 'Genérico',
  name: 'Transformador de corriente (TI) toroidal',
  labelPrefix: 'TI',
  keywords: ['ti', 'ct', 'transformador de corriente', 'toroide', 'toroidal', 'medicion', 'apf', 'filtro activo', 'amperometrico', 'split core'],
  parameters: [{ key: 'relacion', label: 'Relación (A)', short: 'A', type: 'select', options: ['100/5', '250/5', '500/5', '1000/5', '2000/5', '100/1', '1000/1'], default: '500/5' }],
  build: ({ relacion }) => {
    const width = 60;
    const height = 80;
    const cy = height / 2;
    return {
      width,
      height,
      terminals: [
        { id: 'p1', x: 25, y: 0, side: 'top' },
        { id: 'p2', x: 25, y: height, side: 'bottom' },
        { id: 's1', x: width, y: cy - 10, side: 'right' },
        { id: 's2', x: width, y: cy + 10, side: 'right' },
      ],
      shapes: [
        { t: 'line', x1: 25, y1: 0, x2: 25, y2: height },
        { t: 'circle', x: 25, y: cy, r: 18 },
        { t: 'line', x1: 43, y1: cy - 10, x2: width, y2: cy - 10 },
        { t: 'line', x1: 43, y1: cy + 10, x2: width, y2: cy + 10 },
        { t: 'text', x: 25, y: height - 10, text: relacion, size: 6, align: 'center', muted: true },
      ],
    };
  },
};

export const magneticDefinitions = [inductor1ph, lineReactor3ph, toroidInductor, commonModeChoke, toroidalCt];
