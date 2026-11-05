import { rowDevice, terminalRow } from './catalogHelpers.js';

const category = 'Climatización y servicios de gabinete';

// Ventilador con filtro: tensión y tamaño configurables.
const fan = {
  id: 'cool.fan',
  category,
  brand: 'Genérico',
  name: 'Ventilador con filtro de gabinete (configurable)',
  labelPrefix: 'EV',
  keywords: ['cooler', 'ventilador', 'fan', 'extractor', 'refrigeracion', 'filtro', 'ventilacion'],
  parameters: [
    { key: 'voltage', label: 'Alimentación', short: 'V', type: 'select', options: ['24vdc', '230vac', '400vac 3F'], default: '230vac' },
    { key: 'size', label: 'Tamaño (mm)', short: 'mm', type: 'select', options: ['100', '120', '150', '200'], default: '120' },
  ],
  build: ({ voltage, size }) => {
    const side = Number(size);
    const ids = { '24vdc': ['plus', 'minus'], '230vac': ['l', 'n', 'pe'], '400vac 3F': ['l1', 'l2', 'l3', 'pe'] }[voltage];
    const radius = side * 0.38;
    const center = side / 2;
    const blades = [0, 90, 180, 270].map((degrees) => {
      const angle = (degrees * Math.PI) / 180;
      return { t: 'line', x1: center, y1: center, x2: center + Math.cos(angle + 0.5) * radius, y2: center + Math.sin(angle + 0.5) * radius };
    });
    return {
      width: side,
      height: side,
      terminals: terminalRow(ids, side, side, 'bottom', 10),
      shapes: [{ t: 'circle', x: center, y: center, r: radius }, ...blades],
    };
  },
};

const thermostat = {
  id: 'cool.thermostat',
  category,
  brand: 'Genérico',
  name: 'Termostato de gabinete (configurable)',
  labelPrefix: 'BT',
  keywords: ['termostato', 'temperatura', 'gabinete', 'flz', 'bimetalico', 'ventilador', 'calefaccion'],
  parameters: [
    { key: 'contact', label: 'Contacto', short: 'cto', type: 'select', options: ['NC', 'NA', 'inversor'], default: 'NC' },
    { key: 'range', label: 'Rango (°C)', short: '°C', type: 'select', options: ['0-60', '-20-35', '20-80'], default: '0-60' },
  ],
  build: ({ contact, range }) => {
    const ids = { NC: ['1', '2'], NA: ['3', '4'], inversor: ['1', '2', '4'] }[contact];
    return {
      width: 40,
      height: 60,
      terminals: terminalRow(ids, 40, 60, 'bottom', 10),
      shapes: [
        { t: 'text', x: 20, y: 22, text: 'ϑ', size: 14, align: 'center' },
        { t: 'text', x: 20, y: 40, text: range, size: 5, align: 'center', muted: true },
      ],
    };
  },
};

const heater = {
  id: 'cool.heater',
  category,
  brand: 'Genérico',
  name: 'Resistencia calefactora de gabinete (configurable)',
  labelPrefix: 'EH',
  keywords: ['calefactor', 'resistencia', 'heater', 'anticondensacion', 'calefaccion', 'humedad'],
  parameters: [
    { key: 'voltage', label: 'Alimentación', short: 'V', type: 'select', options: ['230vac', '24vdc'], default: '230vac' },
    { key: 'power', label: 'Potencia (W)', short: 'W', type: 'select', options: ['10', '20', '50', '100', '150'], default: '50' },
  ],
  build: ({ voltage, power }) => ({
    width: 60,
    height: 80,
    terminals: terminalRow(voltage === '230vac' ? ['l', 'n'] : ['plus', 'minus'], 60, 0, 'top', 20),
    shapes: [
      { t: 'line', x1: 20, y1: 20, x2: 40, y2: 28 },
      { t: 'line', x1: 40, y1: 28, x2: 20, y2: 36 },
      { t: 'line', x1: 20, y1: 36, x2: 40, y2: 44 },
      { t: 'line', x1: 40, y1: 44, x2: 20, y2: 52 },
      { t: 'text', x: 30, y: 68, text: `${power} W`, size: 6, align: 'center', muted: true },
    ],
  }),
};

export const coolingDefinitions = [
  fan,
  thermostat,
  heater,
  rowDevice({
    id: 'cool.hygrostat',
    category,
    brand: 'Genérico',
    name: 'Higróstato de gabinete',
    width: 40,
    height: 60,
    pitch: 10,
    labelPrefix: 'BH',
    keywords: ['higrostato', 'humedad', 'condensacion'],
    bottom: ['1', '2'],
    symbol: 'φ',
    symbolSize: 14,
  }),
  rowDevice({
    id: 'cool.ac.1000w',
    category,
    brand: 'Genérico',
    name: 'Aire acondicionado de gabinete 1000 W',
    width: 300,
    height: 500,
    pitch: 20,
    labelPrefix: 'AC',
    keywords: ['aire acondicionado', 'climatizador', 'refrigeracion', 'enfriador', 'split', 'chiller'],
    top: ['l', 'n', 'pe'],
    bottom: ['al.c', 'al.no', 'al.nc'],
    symbol: 'AC 1000 W',
    symbolSize: 14,
  }),
  rowDevice({
    id: 'cabinet.socket.din',
    category,
    brand: 'Genérico',
    name: 'Tomacorriente DIN 230 V 10 A',
    width: 50,
    height: 60,
    pitch: 15,
    labelPrefix: 'XS',
    keywords: ['tomacorriente', 'enchufe', 'toma', 'servicio', 'schuko'],
    top: ['l', 'n', 'pe'],
    symbol: 'TC',
  }),
  rowDevice({
    id: 'cabinet.lamp',
    category,
    brand: 'Genérico',
    name: 'Luminaria LED de gabinete 230 V',
    width: 80,
    height: 30,
    pitch: 20,
    labelPrefix: 'EL',
    keywords: ['luz', 'lampara', 'iluminacion', 'led', 'gabinete'],
    top: ['l', 'n'],
    symbol: 'LED',
  }),
];
