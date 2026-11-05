import { rowDevice } from './catalogHelpers.js';

const category = 'Comando y señalización';
const button = (definition) => ({ category, brand: 'Genérico', width: 30, height: 30, pitch: 10, ...definition });
const knob = [{ t: 'circle', x: 15, y: 13, r: 8 }];

const color = (id, name, keywords) =>
  rowDevice(button({ id: `field.pilot.${id}`, name: `Luz piloto ${name} 24 V`, labelPrefix: 'H', keywords: ['piloto', 'luz', 'señalizacion', name, ...keywords], bottom: ['x1', 'x2'], shapes: [...knob, { t: 'line', x1: 9, y1: 7, x2: 21, y2: 19 }, { t: 'line', x1: 21, y1: 7, x2: 9, y2: 19 }] }));

export const commandDefinitions = [
  rowDevice(button({ id: 'field.pushbutton.nc', name: 'Pulsador NC 22 mm (paro)', labelPrefix: 'S', keywords: ['pulsador', 'boton', 'paro', 'stop', 'nc'], bottom: ['11', '12'], shapes: knob })),
  rowDevice(button({ id: 'field.pushbutton.1no1nc', name: 'Pulsador 1NA+1NC', width: 40, labelPrefix: 'S', keywords: ['pulsador', 'boton', '1na1nc', 'doble contacto'], bottom: ['13', '14', '21', '22'], shapes: [{ t: 'circle', x: 20, y: 13, r: 8 }] })),
  rowDevice(button({ id: 'field.pushbutton.lit', name: 'Pulsador luminoso NA 24 V', width: 40, labelPrefix: 'S', keywords: ['pulsador', 'boton', 'luminoso', 'led', 'marcha'], bottom: ['13', '14', 'x1', 'x2'], shapes: [{ t: 'circle', x: 20, y: 13, r: 8 }, { t: 'circle', x: 20, y: 13, r: 3 }] })),
  rowDevice(button({ id: 'field.pushbutton.startstop', name: 'Botonera marcha / paro', width: 40, height: 40, labelPrefix: 'S', keywords: ['botonera', 'marcha', 'paro', 'start', 'stop', 'pulsador doble'], bottom: ['13', '14', '21', '22'], shapes: [{ t: 'circle', x: 10, y: 14, r: 6 }, { t: 'circle', x: 30, y: 14, r: 6 }, { t: 'text', x: 10, y: 14, text: 'I', size: 6, align: 'center' }, { t: 'text', x: 30, y: 14, text: '0', size: 6, align: 'center' }] })),
  rowDevice(button({ id: 'field.estop.2nc', name: 'Paro de emergencia 2NC (seguridad)', width: 40, labelPrefix: 'SE', keywords: ['emergencia', 'hongo', 'seta', 'seguridad', 'paro', '2nc'], bottom: ['11', '12', '21', '22'], shapes: [{ t: 'circle', x: 20, y: 13, r: 8 }, { t: 'text', x: 20, y: 13, text: 'E', size: 7, align: 'center' }] })),
  rowDevice(button({ id: 'field.selector.3pos', name: 'Selector 3 posiciones (I-0-II)', width: 40, labelPrefix: 'SA', keywords: ['selector', 'llave', 'manual', 'automatico', '3 posiciones'], bottom: ['13', '14', '23', '24'], shapes: [{ t: 'circle', x: 20, y: 13, r: 8 }, { t: 'line', x1: 20, y1: 13, x2: 20, y2: 5 }] })),
  rowDevice(button({ id: 'field.keyswitch', name: 'Selector con llave 2 posiciones', labelPrefix: 'SK', keywords: ['llave', 'selector', 'local remoto', 'habilitacion'], bottom: ['13', '14'], shapes: [{ t: 'circle', x: 15, y: 13, r: 8 }, { t: 'text', x: 15, y: 13, text: 'K', size: 6, align: 'center' }] })),
  rowDevice(button({ id: 'field.potentiometer', name: 'Potenciómetro 10 kΩ (referencia de velocidad)', width: 40, labelPrefix: 'RP', keywords: ['potenciometro', 'referencia', 'velocidad', 'analogico', 'perilla'], bottom: ['1', '2', '3'], shapes: [{ t: 'circle', x: 20, y: 13, r: 8 }, { t: 'text', x: 20, y: 13, text: 'kΩ', size: 5, align: 'center' }] })),
  color('green', 'verde', ['marcha', 'verde']),
  color('red', 'roja', ['paro', 'falla', 'rojo']),
  color('yellow', 'amarilla', ['alarma', 'amarillo']),
  rowDevice({
    id: 'field.stacklight.3',
    category,
    brand: 'Genérico',
    name: 'Columna de señalización 3 colores (R/A/V) 24 V',
    width: 40,
    height: 90,
    pitch: 10,
    labelPrefix: 'H',
    keywords: ['columna', 'baliza', 'semaforo', 'senalizacion', 'torre luminosa', 'rojo amarillo verde'],
    bottom: ['com', 'r', 'y', 'g'],
    shapes: [
      { t: 'circle', x: 20, y: 18, r: 9 },
      { t: 'circle', x: 20, y: 40, r: 9 },
      { t: 'circle', x: 20, y: 62, r: 9 },
    ],
  }),
  rowDevice({ id: 'field.horn', category, brand: 'Genérico', name: 'Sirena / buzzer 24 V', width: 40, height: 40, pitch: 10, labelPrefix: 'HA', keywords: ['sirena', 'buzzer', 'alarma', 'sonora', 'bocina'], bottom: ['plus', 'minus'], symbol: 'HA' }),
  rowDevice({ id: 'field.valve.solenoid', category: 'Campo y comando', brand: 'Genérico', name: 'Electroválvula 24 V CC (bobina)', width: 40, height: 40, pitch: 10, labelPrefix: 'YV', keywords: ['electrovalvula', 'valvula', 'solenoide', 'neumatica', 'bobina'], top: ['a1', 'a2'], symbol: 'YV' }),
  rowDevice({
    id: 'safety.relay.2ch',
    category,
    brand: 'Genérico',
    name: 'Relé de seguridad 2 canales (paro de emergencia)',
    width: 80,
    height: 90,
    pitch: 10,
    labelPrefix: 'KS',
    keywords: ['seguridad', 'pnoz', 'rele de seguridad', 'emergencia', 'safety', 'categoria 3', 'sil'],
    top: ['a1', 's11', 's12', 's21', 's22', 's33', 's34'],
    bottom: ['a2', '13', '14', '23', '24', '41', '42'],
    symbol: 'SAFE',
  }),
];
