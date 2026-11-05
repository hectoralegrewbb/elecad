import { contactorCoil, rowDevice, terminalRow } from './catalogHelpers.js';

const category = 'Protección y maniobra';
const powerCategory = 'Alimentación';

// Termomagnética configurable: polos, curva y corriente nominal.
const mcbPoles = {
  '1P': { poles: 1, neutral: false },
  '1P+N': { poles: 1, neutral: true },
  '2P': { poles: 2, neutral: false },
  '3P': { poles: 3, neutral: false },
  '3P+N': { poles: 3, neutral: true },
};

const mcb = {
  id: 'generic.mcb',
  category,
  brand: 'Genérico',
  name: 'Termomagnética (configurable)',
  labelPrefix: 'Q',
  keywords: ['termomagnetica', 'disyuntor', 'mcb', 'llave termica', 'automatico', 'protector'],
  parameters: [
    { key: 'poles', label: 'Polos', short: 'polos', type: 'select', options: Object.keys(mcbPoles), default: '3P' },
    { key: 'curve', label: 'Curva', short: 'curva', type: 'select', options: ['B', 'C', 'D', 'K', 'Z'], default: 'C' },
    { key: 'rating', label: 'Corriente (A)', short: 'A', type: 'select', options: ['1', '2', '4', '6', '10', '16', '20', '25', '32', '40', '50', '63'], default: '16' },
  ],
  build: ({ poles, curve, rating }) => {
    const { poles: count, neutral } = mcbPoles[poles];
    const top = Array.from({ length: count }, (_, index) => `${index * 2 + 1}`);
    const bottom = Array.from({ length: count }, (_, index) => `${index * 2 + 2}`);
    if (neutral) {
      top.push('n1');
      bottom.push('n2');
    }
    const width = Math.max(20, top.length * 20);
    const height = 90;
    return {
      width,
      height,
      terminals: [...terminalRow(top, width, 0, 'top', 20), ...terminalRow(bottom, width, height, 'bottom', 20)],
      shapes: [
        { t: 'text', x: width / 2, y: height / 2 - 6, text: 'Q', size: 10, align: 'center' },
        { t: 'text', x: width / 2, y: height / 2 + 8, text: `${curve}${rating}`, size: 8, align: 'center' },
      ],
    };
  },
};

const transformer1ph = {
  id: 'generic.transformer.1ph',
  category: powerCategory,
  brand: 'Genérico',
  name: 'Transformador monofásico (configurable)',
  labelPrefix: 'T',
  keywords: ['transformador', 'trafo', 'monofasico', 'aislacion', 'reductor'],
  parameters: [
    { key: 'ratio', label: 'Relación (V)', short: 'V', type: 'select', options: ['400/230', '230/24', '230/110', '230/12', '380/24', '230/230'], default: '400/230' },
    { key: 'power', label: 'Potencia (kVA)', short: 'kVA', type: 'select', options: ['0.1', '0.25', '0.5', '1', '2.5', '5'], default: '1' },
  ],
  build: ({ ratio, power }) => {
    const width = { '0.1': 60, '0.25': 80, '0.5': 80, '1': 100, '2.5': 120, '5': 140 }[power];
    const height = { '0.1': 80, '0.25': 90, '0.5': 100, '1': 110, '2.5': 130, '5': 150 }[power];
    return {
      width,
      height,
      terminals: [...terminalRow(['h1', 'h2'], width, 0, 'top', 20), ...terminalRow(['x1', 'x2'], width, height, 'bottom', 20)],
      shapes: [
        { t: 'text', x: width / 2, y: height / 2 - 6, text: 'T', size: 14, align: 'center' },
        { t: 'text', x: width / 2, y: height / 2 + 10, text: `${ratio} V · ${power} kVA`, size: 6, align: 'center', muted: true },
      ],
    };
  },
};

const transformer3ph = {
  id: 'generic.transformer.3ph',
  category: powerCategory,
  brand: 'Genérico',
  name: 'Transformador trifásico (configurable)',
  labelPrefix: 'T',
  keywords: ['transformador', 'trafo', 'trifasico', 'aislacion', 'reductor'],
  parameters: [
    { key: 'ratio', label: 'Relación (V)', short: 'V', type: 'select', options: ['400/230', '400/400', '400/24', '380/220', '400/690'], default: '400/230' },
    { key: 'power', label: 'Potencia (kVA)', short: 'kVA', type: 'select', options: ['1', '2.5', '5', '10', '25'], default: '5' },
  ],
  build: ({ ratio, power }) => {
    const width = { '1': 100, '2.5': 120, '5': 140, '10': 160, '25': 200 }[power];
    const height = { '1': 110, '2.5': 130, '5': 150, '10': 170, '25': 200 }[power];
    return {
      width,
      height,
      terminals: [
        ...terminalRow(['h1', 'h2', 'h3'], width, 0, 'top', 20),
        ...terminalRow(['x1', 'x2', 'x3', 'n'], width, height, 'bottom', 20),
      ],
      shapes: [
        { t: 'text', x: width / 2, y: height / 2 - 6, text: 'T 3~', size: 14, align: 'center' },
        { t: 'text', x: width / 2, y: height / 2 + 10, text: `${ratio} V · ${power} kVA`, size: 6, align: 'center', muted: true },
      ],
    };
  },
};

// Fuente conmutada: entrada monofásica o trifásica, tensión y corriente de salida, contacto DC-OK.
const configurablePsu = {
  id: 'generic.psu.configurable',
  category: powerCategory,
  brand: 'Genérico',
  name: 'Fuente de alimentación CC (configurable)',
  labelPrefix: 'PS',
  keywords: ['fuente', 'psu', 'alimentacion', 'sitop', 'switching', 'conmutada', 'dc'],
  parameters: [
    { key: 'input', label: 'Entrada', short: 'in', type: 'select', options: ['1F 230V', '3F 400V'], default: '1F 230V' },
    { key: 'voltage', label: 'Salida (V CC)', short: 'V', type: 'select', options: ['12', '24', '48'], default: '24' },
    { key: 'current', label: 'Corriente (A)', short: 'A', type: 'select', options: ['2.5', '5', '10', '20', '40'], default: '10' },
  ],
  build: ({ input, voltage, current }) => {
    const width = { '2.5': 50, '5': 70, '10': 90, '20': 110, '40': 140 }[current];
    const height = 130;
    const top = input === '3F 400V' ? ['l1', 'l2', 'l3', 'pe'] : ['l', 'n', 'pe'];
    return {
      width,
      height,
      terminals: [
        ...terminalRow(top, width, 0, 'top', 10),
        ...terminalRow(['plus', 'minus'], width, height, 'bottom', 10),
        { id: 'ok.c', x: width, y: 100, side: 'right' },
        { id: 'ok.no', x: width, y: 110, side: 'right' },
      ],
      shapes: [
        { t: 'text', x: width / 2, y: height / 2 - 4, text: `${voltage}V`, size: 12, align: 'center' },
        { t: 'text', x: width / 2, y: height / 2 + 10, text: `${current}A`, size: 8, align: 'center', muted: true },
      ],
    };
  },
};

const thermalRelay = ({ id, brand, name, keywords }) =>
  rowDevice({
    id,
    category,
    brand,
    name,
    width: 50,
    height: 90,
    pitch: 15,
    labelPrefix: 'FR',
    keywords: ['rele termico', 'sobrecarga', 'termico', ...keywords],
    top: ['1', '3', '5'],
    bottom: ['2', '4', '6'],
    symbol: 'FR',
    extraTerminals: [
      { id: '95', x: 50, y: 15, side: 'right' },
      { id: '96', x: 50, y: 30, side: 'right' },
      { id: '97', x: 50, y: 45, side: 'right' },
      { id: '98', x: 50, y: 60, side: 'right' },
    ],
  });

export const powerDefinitions = [
  mcb,
  transformer1ph,
  transformer3ph,
  configurablePsu,
  thermalRelay({ id: 'siemens.3ru2116.thermal', brand: 'Siemens', name: 'Relé térmico 3RU2116', keywords: ['sirius', '3ru'] }),
  thermalRelay({ id: 'generic.thermalrelay', brand: 'Genérico', name: 'Relé térmico de sobrecarga', keywords: [] }),

  rowDevice({
    id: 'generic.contactor.4p',
    category,
    brand: 'Genérico',
    name: 'Contactor 4 polos 24V CC',
    width: 80,
    height: 80,
    pitch: 20,
    labelPrefix: 'KM',
    keywords: ['contactor', '4 polos', 'tetrapolar'],
    top: ['1', '3', '5', '7'],
    bottom: ['2', '4', '6', '8'],
    symbol: 'KM',
    extraTerminals: contactorCoil(80, 80),
  }),
  rowDevice({
    id: 'generic.spd.3pn',
    category,
    brand: 'Genérico',
    name: 'Protector de sobretensiones 3F+N (SPD)',
    width: 80,
    height: 70,
    pitch: 10,
    labelPrefix: 'F',
    keywords: ['spd', 'descargador', 'sobretension', 'rayos', 'protector'],
    top: ['l1', 'l2', 'l3', 'n'],
    bottom: ['pe'],
    symbol: 'SPD',
  }),
  rowDevice({
    id: 'generic.phasemonitor',
    category,
    brand: 'Genérico',
    name: 'Relé de secuencia / falta de fase',
    width: 50,
    height: 80,
    pitch: 10,
    labelPrefix: 'KF',
    keywords: ['secuencia', 'falta de fase', 'monitor', 'tension', '3ug', 'asimetria'],
    top: ['l1', 'l2', 'l3', 'n'],
    bottom: ['15', '16', '18'],
    symbol: 'KF',
  }),
  rowDevice({
    id: 'generic.meter.3ph',
    category: 'Medición',
    brand: 'Genérico',
    name: 'Analizador de red trifásico (TI externos)',
    width: 80,
    height: 90,
    pitch: 10,
    labelPrefix: 'PM',
    keywords: ['analizador', 'medidor', 'energia', 'potencia', 'multimedidor', 'pm'],
    top: ['l1', 'l2', 'l3', 'n'],
    bottom: ['s1.1', 's2.1', 's1.2', 's2.2', 's1.3', 's2.3'],
    symbol: 'PM',
    extraTerminals: [
      { id: 'rs485.a', x: 80, y: 30, side: 'right' },
      { id: 'rs485.b', x: 80, y: 40, side: 'right' },
    ],
  }),
];
