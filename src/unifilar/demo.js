import { addCircuit, addElement, createUnifilar, updateElement, updateSheet } from './model.js';

export function createUnifilarDemo() {
  let state = updateSheet(createUnifilar(), {
    name: 'Ejemplo - tablero de potencia',
    titleBlock: { title: 'Tablero de potencia', drawingNo: 'EL-001', revision: '00' },
  });
  for (const [id, kind, x, y, detail] of [
    ['feed', 'source', 150, 35, 'Red 3~'],
    ['main', 'breaker', 150, 65, 'Interruptor general'],
    ['bar', 'bus', 150, 95, 'Distribución'],
    ['breaker_a', 'breaker', 110, 140, 'Salida a variador'],
    ['breaker_b', 'breaker', 205, 140, 'Segunda salida'],
    ['vfd', 'drive', 110, 175, 'Control de motor'],
    ['motor_a', 'motor', 110, 210, 'Motor 3~'],
    ['out_b', 'load', 205, 175, 'Carga auxiliar'],
  ]) {
    state = addElement(state, kind, { x, y }, id);
    state = updateElement(state, id, { detail });
  }
  for (const [id, from, fromPort, to, toPort, conductors, bends] of [
    ['infeed', 'feed', 'out', 'main', 'in', '3F + N + PE', []],
    ['mainbar', 'main', 'out', 'bar', 'tap3', '', []],
    ['outfeed_a', 'bar', 'tap1', 'breaker_a', 'in', '', [{ x: 130, y: 115 }, { x: 110, y: 115 }]],
    ['outfeed_b', 'bar', 'tap5', 'breaker_b', 'in', '', [{ x: 170, y: 115 }, { x: 205, y: 115 }]],
    ['drivefeed', 'breaker_a', 'out', 'vfd', 'in', '', []],
    ['motorfeed', 'vfd', 'out', 'motor_a', 'in', '3F + PE', []],
    ['loadfeed', 'breaker_b', 'out', 'out_b', 'in', '', []],
  ]) {
    state = addCircuit(state, { elementId: from, port: fromPort }, { elementId: to, port: toPort }, bends, { conductors }, id);
  }
  return state;
}
