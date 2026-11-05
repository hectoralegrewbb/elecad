import { rowDevice } from './catalogHelpers.js';

// Bornes de control (lado izquierdo). Numeración tipo SINAMICS G120C, o genérica para otras marcas.
const g120cControl = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '12', '13', '18', '19', '20', '31', '32'];
const genericControl = ['+10v', '0v', 'ai1+', 'ai1-', 'di1', 'di2', 'di3', 'di4', 'di5', '+24v', 'dq.c', 'dq.no', 'dq.nc', 'ao+', 'ao-'];

const controlTerminals = (ids, height) =>
  ids.map((id, index) => ({ id, x: 0, y: 25 + index * 10, side: 'left' })).filter((terminal) => terminal.y <= height - 20);

const drive = ({ id, brand, name, width, height, keywords, withEarth = false, top, bottom, control = genericControl, extra = [] }) =>
  rowDevice({
    id,
    category: 'Variadores / inversores de frecuencia',
    brand,
    name,
    width,
    height,
    pitch: 20,
    labelPrefix: 'VF',
    keywords: ['variador', 'inversor', 'vfd', 'drive', 'frecuencia', ...keywords],
    top: top ?? (withEarth ? ['l1', 'l2', 'l3', 'pe'] : ['l1', 'l2', 'l3']),
    bottom: bottom ?? (withEarth ? ['u', 'v', 'w', 'pe2'] : ['u', 'v', 'w']),
    symbol: 'VF',
    symbolSize: 14,
    extraTerminals: [...controlTerminals(control, height), ...extra],
  });

const singlePhaseTop = ['l', 'n', 'pe'];
const motorBottom = ['u', 'v', 'w', 'pe2'];
const dcBus = (width) => [
  { id: 'dc+', x: width, y: 40, side: 'right' },
  { id: 'dc-', x: width, y: 60, side: 'right' },
];

const field = (definition) => ({ category: 'Campo y comando', brand: 'Genérico', ...definition });

export const driveAndFieldDefinitions = [
  drive({ id: 'siemens.g120c.fsa', brand: 'Siemens', name: 'Variador SINAMICS G120C FSA', width: 70, height: 200, keywords: ['sinamics', 'g120c'], control: g120cControl }),
  drive({ id: 'siemens.g120c.fsb', brand: 'Siemens', name: 'Variador SINAMICS G120C FSB', width: 100, height: 200, keywords: ['sinamics', 'g120c'], control: g120cControl }),
  drive({ id: 'siemens.g120c.fsc', brand: 'Siemens', name: 'Variador SINAMICS G120C FSC', width: 120, height: 240, keywords: ['sinamics', 'g120c'], control: g120cControl }),
  drive({ id: 'siemens.v20.1ph', brand: 'Siemens', name: 'Variador SINAMICS V20 monofásico 230 V', width: 100, height: 200, keywords: ['sinamics', 'v20'], top: singlePhaseTop, bottom: motorBottom }),
  drive({ id: 'siemens.v20.3ph', brand: 'Siemens', name: 'Variador SINAMICS V20 trifásico 400 V', width: 100, height: 200, keywords: ['sinamics', 'v20'], withEarth: true }),
  drive({ id: 'siemens.g120x.fsa', brand: 'Siemens', name: 'Variador SINAMICS G120X FSA', width: 80, height: 220, keywords: ['sinamics', 'g120x'], withEarth: true }),
  drive({ id: 'abb.acs580.r1', brand: 'ABB', name: 'Variador ACS580 R1', width: 80, height: 200, keywords: ['acs580'], withEarth: true }),
  drive({ id: 'schneider.atv320', brand: 'Schneider', name: 'Variador Altivar ATV320 trifásico', width: 100, height: 200, keywords: ['altivar', 'atv320'], withEarth: true, extra: dcBus(100) }),
  drive({ id: 'schneider.atv630', brand: 'Schneider', name: 'Variador Altivar Process ATV630', width: 140, height: 300, keywords: ['altivar', 'atv630', 'process'], withEarth: true, extra: dcBus(140) }),
  drive({ id: 'weg.cfw500', brand: 'WEG', name: 'Variador CFW500 trifásico', width: 80, height: 200, keywords: ['weg', 'cfw500'], withEarth: true }),
  drive({ id: 'danfoss.fc51.1ph', brand: 'Danfoss', name: 'Variador VLT Micro FC 51 monofásico', width: 80, height: 200, keywords: ['danfoss', 'fc51', 'vlt'], top: singlePhaseTop, bottom: motorBottom }),
  drive({ id: 'generic.inverter.1ph', brand: 'Genérico', name: 'Inversor de frecuencia monofásico → trifásico', width: 80, height: 200, keywords: ['monofasico'], top: singlePhaseTop, bottom: motorBottom }),
  drive({ id: 'generic.inverter.3ph', brand: 'Genérico', name: 'Inversor de frecuencia trifásico', width: 100, height: 200, keywords: ['trifasico'], withEarth: true, extra: dcBus(100) }),
  rowDevice({ id: 'generic.brakeresistor', category: 'Variadores / inversores de frecuencia', brand: 'Genérico', name: 'Resistencia de frenado', width: 40, height: 60, pitch: 20, labelPrefix: 'RB', keywords: ['resistencia', 'frenado', 'freno dinamico', 'braking'], top: ['br+', 'br-'], symbol: 'RB', symbolSize: 8 }),

  field(
    rowDevice({
      id: 'field.motor.3ph',
      name: 'Motor trifásico',
      width: 60,
      height: 60,
      pitch: 10,
      labelPrefix: 'M',
      keywords: ['motor', 'trifasico', 'carga', 'campo'],
      top: ['u1', 'v1', 'w1', 'pe'],
      shapes: [
        { t: 'circle', x: 30, y: 34, r: 20 },
        { t: 'text', x: 30, y: 30, text: 'M', size: 12, align: 'center' },
        { t: 'text', x: 30, y: 42, text: '3~', size: 7, align: 'center' },
      ],
    }),
  ),
  field(rowDevice({ id: 'field.motor.1ph', name: 'Motor monofásico', width: 60, height: 60, pitch: 20, labelPrefix: 'M', keywords: ['motor', 'monofasico', 'carga', 'campo'], top: ['l', 'n', 'pe'], shapes: [{ t: 'circle', x: 30, y: 34, r: 20 }, { t: 'text', x: 30, y: 30, text: 'M', size: 12, align: 'center' }, { t: 'text', x: 30, y: 42, text: '1~', size: 7, align: 'center' }] })),
  field(rowDevice({ id: 'field.motor.3ph.ptc', name: 'Motor trifásico con PTC', width: 60, height: 60, pitch: 10, labelPrefix: 'M', keywords: ['motor', 'trifasico', 'ptc', 'termistor', 'campo'], top: ['u1', 'v1', 'w1', 'pe', 't1', 't2'], shapes: [{ t: 'circle', x: 30, y: 34, r: 20 }, { t: 'text', x: 30, y: 30, text: 'M', size: 12, align: 'center' }, { t: 'text', x: 30, y: 42, text: '3~ PTC', size: 6, align: 'center' }] })),
  field(rowDevice({ id: 'field.motor.dc24', name: 'Motor CC 24 V', width: 40, height: 50, pitch: 20, labelPrefix: 'M', keywords: ['motor', 'continua', '24v', 'dc', 'campo'], top: ['plus', 'minus'], shapes: [{ t: 'circle', x: 20, y: 30, r: 14 }, { t: 'text', x: 20, y: 30, text: 'M=', size: 9, align: 'center' }] })),
  field(
    rowDevice({
      id: 'field.sensor.inductive',
      name: 'Sensor inductivo 3 hilos (PNP)',
      width: 30,
      height: 40,
      pitch: 10,
      labelPrefix: 'B',
      keywords: ['sensor', 'inductivo', 'proximidad', 'pnp', 'campo'],
      top: ['brn', 'blu', 'blk'],
      symbol: 'B',
    }),
  ),
  field(
    rowDevice({
      id: 'field.pushbutton.no',
      name: 'Pulsador NA 22 mm',
      width: 30,
      height: 30,
      pitch: 10,
      labelPrefix: 'S',
      keywords: ['pulsador', 'boton', 'marcha', 'comando'],
      bottom: ['13', '14'],
      shapes: [{ t: 'circle', x: 15, y: 13, r: 8 }],
    }),
  ),
  field(
    rowDevice({
      id: 'field.estop.nc',
      name: 'Paro de emergencia NC',
      width: 30,
      height: 30,
      pitch: 10,
      labelPrefix: 'SE',
      keywords: ['emergencia', 'hongo', 'paro', 'seta', 'comando'],
      bottom: ['11', '12'],
      shapes: [{ t: 'circle', x: 15, y: 13, r: 8 }, { t: 'text', x: 15, y: 13, text: 'E', size: 7, align: 'center' }],
    }),
  ),
  field(
    rowDevice({
      id: 'field.selector.2pos',
      name: 'Selector 2 posiciones',
      width: 30,
      height: 30,
      pitch: 10,
      labelPrefix: 'SA',
      keywords: ['selector', 'llave', 'comando'],
      bottom: ['13', '14'],
      shapes: [{ t: 'circle', x: 15, y: 13, r: 8 }, { t: 'line', x1: 15, y1: 13, x2: 21, y2: 7 }],
    }),
  ),
  field(
    rowDevice({
      id: 'field.pilot.light',
      name: 'Luz piloto 24V',
      width: 30,
      height: 30,
      pitch: 10,
      labelPrefix: 'H',
      keywords: ['piloto', 'luz', 'senalizacion', 'led'],
      bottom: ['x1', 'x2'],
      shapes: [{ t: 'circle', x: 15, y: 13, r: 8 }, { t: 'line', x1: 9, y1: 7, x2: 21, y2: 19 }, { t: 'line', x1: 21, y1: 7, x2: 9, y2: 19 }],
    }),
  ),
];
