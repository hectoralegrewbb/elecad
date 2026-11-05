import { rowDevice, terminalRow } from './catalogHelpers.js';

const category = 'Sensores y transmisores';
const field = (definition) => ({ category, brand: 'Genérico', ...definition });

const transmitter = {
  id: 'field.transmitter',
  category,
  brand: 'Genérico',
  name: 'Transmisor 4-20 mA (configurable)',
  labelPrefix: 'BT',
  keywords: ['transmisor', 'transductor', '4-20ma', 'analogico', 'presion', 'nivel', 'caudal', 'temperatura', 'humedad', 'sensor'],
  parameters: [
    { key: 'kind', label: 'Magnitud', short: 'mag', type: 'select', options: ['presión', 'nivel', 'caudal', 'temperatura', 'humedad', 'peso'], default: 'presión' },
    { key: 'wires', label: 'Hilos', short: 'hilos', type: 'select', options: ['2', '3', '4'], default: '2' },
  ],
  build: ({ kind, wires }) => {
    const ids = { 2: ['plus', 'minus'], 3: ['plus', 'minus', 'sig'], 4: ['plus', 'minus', 'sig+', 'sig-'] }[wires];
    const width = Math.max(40, ids.length * 10 + 10);
    return {
      width,
      height: 50,
      terminals: terminalRow(ids, width, 0, 'top', 10),
      shapes: [
        { t: 'circle', x: width / 2, y: 28, r: 12 },
        { t: 'text', x: width / 2, y: 28, text: kind.slice(0, 1).toUpperCase(), size: 10, align: 'center' },
        { t: 'text', x: width / 2, y: 46, text: '4-20mA', size: 5, align: 'center', muted: true },
      ],
    };
  },
};

const rtd = {
  id: 'field.rtd',
  category,
  brand: 'Genérico',
  name: 'Sonda RTD Pt100 (configurable)',
  labelPrefix: 'BR',
  keywords: ['pt100', 'rtd', 'sonda', 'temperatura', 'resistencia', 'pt1000'],
  parameters: [
    { key: 'wires', label: 'Hilos', short: 'hilos', type: 'select', options: ['2', '3', '4'], default: '3' },
    { key: 'type', label: 'Tipo', short: 'tipo', type: 'select', options: ['Pt100', 'Pt1000'], default: 'Pt100' },
  ],
  build: ({ wires, type }) => {
    const ids = ['a', 'b', 'c', 'd'].slice(0, Number(wires));
    const width = Math.max(40, ids.length * 10 + 10);
    return {
      width,
      height: 40,
      terminals: terminalRow(ids, width, 0, 'top', 10),
      shapes: [{ t: 'text', x: width / 2, y: 26, text: type, size: 8, align: 'center' }],
    };
  },
};

const thermocouple = {
  id: 'field.thermocouple',
  category,
  brand: 'Genérico',
  name: 'Termocupla (configurable)',
  labelPrefix: 'BC',
  keywords: ['termocupla', 'thermocouple', 'tc', 'temperatura', 'sonda'],
  parameters: [{ key: 'type', label: 'Tipo', short: 'tipo', type: 'select', options: ['K', 'J', 'T', 'S', 'N'], default: 'K' }],
  build: ({ type }) => ({
    width: 40,
    height: 40,
    terminals: terminalRow(['plus', 'minus'], 40, 0, 'top', 10),
    shapes: [{ t: 'text', x: 20, y: 26, text: `TC ${type}`, size: 8, align: 'center' }],
  }),
};

export const sensorDefinitions = [
  transmitter,
  rtd,
  thermocouple,
  field(rowDevice({ id: 'field.sensor.capacitive', name: 'Sensor capacitivo 3 hilos (PNP)', width: 30, height: 40, pitch: 10, labelPrefix: 'B', keywords: ['sensor', 'capacitivo', 'nivel', 'pnp'], top: ['brn', 'blu', 'blk'], symbol: 'B' })),
  field(rowDevice({ id: 'field.sensor.photo.3w', name: 'Sensor fotoeléctrico difuso 3 hilos (PNP)', width: 30, height: 40, pitch: 10, labelPrefix: 'B', keywords: ['fotoelectrico', 'optico', 'difuso', 'barrera', 'sensor', 'pnp'], top: ['brn', 'blu', 'blk'], symbol: 'BO' })),
  field(rowDevice({ id: 'field.sensor.photo.4w', name: 'Sensor fotoeléctrico 4 hilos (NA/NC)', width: 40, height: 40, pitch: 10, labelPrefix: 'B', keywords: ['fotoelectrico', 'optico', 'retrorreflectivo', 'sensor', 'pnp'], top: ['brn', 'blu', 'blk', 'wht'], symbol: 'BO' })),
  field(rowDevice({ id: 'field.sensor.photo.emitter', name: 'Barrera fotoeléctrica — emisor', width: 30, height: 40, pitch: 10, labelPrefix: 'BE', keywords: ['barrera', 'emisor', 'fotoelectrico', 'seguridad'], top: ['brn', 'blu'], symbol: 'TX' })),
  field(rowDevice({ id: 'field.sensor.photo.receiver', name: 'Barrera fotoeléctrica — receptor', width: 30, height: 40, pitch: 10, labelPrefix: 'BR', keywords: ['barrera', 'receptor', 'fotoelectrico', 'seguridad'], top: ['brn', 'blu', 'blk'], symbol: 'RX' })),
  field(rowDevice({ id: 'field.limitswitch', name: 'Final de carrera 1NA+1NC', width: 40, height: 40, pitch: 10, labelPrefix: 'SQ', keywords: ['final de carrera', 'limit switch', 'fin de carrera', 'posicion'], bottom: ['13', '14', '21', '22'], symbol: 'SQ' })),
  field(rowDevice({ id: 'field.pressureswitch', name: 'Presostato', width: 40, height: 50, pitch: 10, labelPrefix: 'BP', keywords: ['presostato', 'presion', 'switch'], bottom: ['c', 'no', 'nc'], symbol: 'P' })),
  field(rowDevice({ id: 'field.floatswitch', name: 'Flotante de nivel', width: 40, height: 50, pitch: 10, labelPrefix: 'BL', keywords: ['flotante', 'nivel', 'boya', 'tanque'], bottom: ['c', 'no', 'nc'], symbol: 'L' })),
  field(rowDevice({ id: 'field.flowswitch', name: 'Flujostato', width: 40, height: 50, pitch: 10, labelPrefix: 'BF', keywords: ['flujostato', 'caudal', 'flujo', 'switch'], bottom: ['c', 'no', 'nc'], symbol: 'F' })),
  field(rowDevice({ id: 'field.encoder.abz', name: 'Encoder incremental ABZ 24 V', width: 60, height: 50, pitch: 10, labelPrefix: 'BE', keywords: ['encoder', 'posicion', 'velocidad', 'incremental'], top: ['plus', 'minus', 'a', 'b', 'z'], symbol: 'ENC' })),
  field(rowDevice({ id: 'field.loadcell', name: 'Celda de carga (4 hilos + malla)', width: 60, height: 50, pitch: 10, labelPrefix: 'BW', keywords: ['celda de carga', 'balanza', 'peso', 'pesaje', 'galga'], top: ['exc+', 'exc-', 'sig+', 'sig-', 'shield'], symbol: 'kg' })),
  field({ id: 'field.flame.ionization', name: 'Sonda de ionización — electrodo genérico',
    labelPrefix: 'BF', width: 20, height: 80, blocksRouting: true,
    keywords: ['llama', 'ionizacion', 'varilla', 'quemador', 'electrodo', 'sonda'],
    terminals: [{ id: 'ION', x: 10, y: 0, side: 'top' }],
    shapes: [ { t: 'rect', x: 5, y: 10, w: 10, h: 22 },
      { t: 'line', x1: 10, y1: 0, x2: 10, y2: 10 },
      { t: 'line', x1: 10, y1: 32, x2: 10, y2: 68 },
      { t: 'line', x1: 10, y1: 68, x2: 16, y2: 74 } ] }),

];
