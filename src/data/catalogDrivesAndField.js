import { rowDevice } from './catalogHelpers.js';
import { driveDefinitions } from './catalogDrives.js';

const field = (definition) => ({ category: 'Campo y comando', brand: 'Genérico', ...definition });

const fieldDefinitions = [
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

export const driveAndFieldDefinitions = [...driveDefinitions, ...fieldDefinitions];
