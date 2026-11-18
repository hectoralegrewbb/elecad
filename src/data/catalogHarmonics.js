import { terminalRow } from './catalogHelpers.js';

// Filtros activos de armónicos (APF / AHF): se conectan EN PARALELO a la red, aguas abajo del interruptor
// de cabecera, y miden la corriente de carga con 3 transformadores de corriente (TI) externos.
// ATENCIÓN: bornes SIMPLIFICADOS (potencia, 3 TI, Modbus RS485, Ethernet). Dimensiones de los EasyLogic APF
// tomadas de la hoja de datos de Schneider (versión mural IP31, 400 V: 835 / 960 / 1015 mm de alto × 600 mm de
// ancho); el alto se redondea a múltiplos de 10 mm para que los bornes caigan sobre la grilla. Verificar contra
// el manual antes de usar en planos reales.

const category = 'Filtros activos de armónicos (APF)';

const buildApf = ({ width, height }) => {
  const ctIds = ['ct1.s1', 'ct1.s2', 'ct2.s1', 'ct2.s2', 'ct3.s1', 'ct3.s2'];
  return {
    width,
    height,
    terminals: [
      ...terminalRow(['l1', 'l2', 'l3', 'n', 'pe'], width, 0, 'top', 40),
      ...ctIds.map((id, index) => ({ id, x: 0, y: 60 + index * 20, side: 'left' })),
      { id: 'rs485.0.a', x: width, y: 60, side: 'right' },
      { id: 'rs485.0.b', x: width, y: 80, side: 'right' },
      { id: 'eth0', x: width, y: 100, side: 'right' },
    ],
    shapes: [
      { t: 'text', x: width / 2, y: height / 2 - 10, text: 'APF', size: 24, align: 'center' },
      { t: 'text', x: width / 2, y: height / 2 + 14, text: 'FILTRO ACTIVO', size: 8, align: 'center', muted: true },
    ],
  };
};

const easyLogicApf = ({ amps, height, depth, keywords = [] }) => ({
  id: `schneider.easylogic.apf.${amps}`,
  category,
  brand: 'Schneider',
  name: `Filtro activo EasyLogic APF ${amps} A, 400 V (mural IP31)`,
  labelPrefix: 'APF',
  keywords: ['apf', 'filtro activo', 'armonicos', 'active harmonic filter', 'easylogic', 'thdi', 'schneider', `${amps}a`, `prof ${depth}`, ...keywords],
  ...buildApf({ width: 600, height }),
});

const sizeOptions = (values) => values.map(String);

// Filtro activo genérico: ancho y alto a elección, para modelar otras marcas (AccuSine, Danfoss AAF, ABB…)
// con las medidas de su hoja de datos.
const genericApf = {
  id: 'generic.apf',
  category,
  brand: 'Genérico',
  name: 'Filtro activo de armónicos (medidas configurables)',
  labelPrefix: 'APF',
  keywords: ['apf', 'ahf', 'filtro activo', 'armonicos', 'active harmonic filter', 'accusine', 'aaf'],
  parameters: [
    { key: 'ancho', label: 'Ancho (mm)', type: 'select', options: sizeOptions([300, 400, 500, 600, 800]), default: '600' },
    { key: 'alto', label: 'Alto (mm)', type: 'select', options: sizeOptions([500, 600, 800, 1000, 1200, 1600, 2000]), default: '800' },
  ],
  build: ({ ancho, alto }) => buildApf({ width: Number(ancho), height: Number(alto) }),
};

export const harmonicFilterDefinitions = [
  easyLogicApf({ amps: 50, height: 840, depth: 210 }),
  easyLogicApf({ amps: 100, height: 960, depth: 230 }),
  easyLogicApf({ amps: 150, height: 1020, depth: 300 }),
  genericApf,
];
