import { configurableIoDevice, fixedIoDevice, buildIoDevice, ioParametersWith } from './ioDeviceBuilder.js';
import { rowDevice, terminalRow } from './catalogHelpers.js';

const hmiCategory = 'HMI / Paneles de operador';
const netCategory = 'Redes industriales (PROFINET / PROFIBUS / Modbus)';
const tempCategory = 'Sensores y transmisores';
const sourceCategory = 'Fuentes de tensión';
const genericCategory = 'Bloques genéricos';

const hmi = (id, brand, name, title, params, keywords = []) =>
  fixedIoDevice({ id, category: hmiCategory, brand, name, title, labelPrefix: 'HMI', keywords: ['hmi', 'pantalla', 'panel', 'touch', 'operador', ...keywords], params: { power: '24vdc', ...params } });

const networkDevice = (id, brand, name, title, params, labelPrefix, keywords = []) =>
  fixedIoDevice({ id, category: netCategory, brand, name, title, labelPrefix, keywords: ['red', 'profinet', 'ethernet', ...keywords], params: { power: '24vdc', ...params } });

// Bloque genérico: alimentación de entrada, salida de alimentación y señales a definir por el usuario.
const supplyIn = ['ninguna', '24vdc', '230vac', '400vac'];
const supplyOut = ['ninguna', '24vdc', '230vac'];

const genericBlock = {
  id: 'generic.block',
  category: genericCategory,
  brand: 'Genérico',
  name: 'Bloque genérico (alimentación, entradas y salidas a definir)',
  labelPrefix: 'U',
  keywords: ['generico', 'bloque', 'equipo', 'custom', 'personalizado', 'caja negra', 'alimentacion', 'entradas', 'salidas'],
  parameters: [
    { key: 'title', label: 'Nombre / leyenda', short: 'nombre', type: 'text', maxLength: 18, default: 'EQUIPO' },
    ...ioParametersWith({ power: '24vdc', di: 0, dq: 0 })
      .filter((parameter) => ['power', 'di', 'dq', 'ai', 'aq', 'ethernet', 'rs485'].includes(parameter.key))
      .map((parameter) => (parameter.key === 'power' ? { ...parameter, label: 'Alimentación de entrada', options: supplyIn } : parameter)),
    { key: 'supplyOut', label: 'Salida de alimentación', short: 'salida', type: 'select', options: supplyOut, default: 'ninguna' },
    { key: 'pins', label: 'Bornes genéricos extra', short: 'bornes', type: 'number', min: 0, max: 40, default: 0 },
  ],
  build: ({ title, supplyOut: outKind, pins, ...rest }) => {
    const base = buildIoDevice({ ...rest, rtdWires: '3' }, title || 'EQUIPO');
    const extra = [];
    let height = base.height;
    const left = base.terminals.filter((terminal) => terminal.side === 'left').length;
    const outIds = outKind === '24vdc' ? [['out+', '24V'], ['out-', '0V']] : outKind === '230vac' ? [['out.l', 'L1'], ['out.n', 'N']] : [];
    const needed = Math.max(left, pins) * 10 + 30 + 10;
    height = Math.max(height, Math.ceil(needed / 10) * 10, outIds.length > 0 ? 60 : 0);
    const terminals = base.terminals.map((terminal) => (terminal.side === 'bottom' ? { ...terminal, y: height } : terminal));
    outIds.forEach(([id, phase], index) => extra.push({ id, x: base.width, y: 20 + index * 10, side: 'right', phase }));
    for (let index = 0; index < pins; index += 1) extra.push({ id: `x${index + 1}`, x: 0, y: 20 + (left + (left > 0 ? 1 : 0) + index) * 10, side: 'left' });
    const maxLeft = Math.max(...[...terminals, ...extra].filter((t) => t.side === 'left').map((t) => t.y), 0);
    height = Math.max(height, Math.ceil((maxLeft + 20) / 10) * 10);
    const fixed = terminals.map((terminal) => (terminal.side === 'bottom' ? { ...terminal, y: height } : terminal));
    const shapes = base.shapes.map((shape) => (shape.t === 'text' && shape.size === 10 ? { ...shape, y: height / 2 } : shape.y > base.height / 2 && shape.muted ? { ...shape, y: shape.y - base.height + height } : shape));
    return { width: base.width, height, terminals: [...fixed, ...extra], shapes };
  },
};

// Fuente ideal de tensión (símbolo IEC de generador). Distinta de la fuente conmutada (generic.psu).
const dcSource = {
  id: 'generic.source.dc',
  category: sourceCategory,
  brand: 'Genérico',
  name: 'Fuente de tensión continua (CC)',
  labelPrefix: 'G',
  keywords: ['fuente', 'continua', 'cc', 'dc', 'bateria', 'generador', '12v', '24v', '48v'],
  parameters: [
    { key: 'volts', label: 'Tensión (V CC)', short: 'V', type: 'select', options: ['5', '12', '24', '48', '110'], default: '24' },
    { key: 'outputs', label: 'Salidas (pares +/−)', short: 'salidas', type: 'number', min: 1, max: 4, default: 1 },
  ],
  build: ({ volts, outputs }) => {
    const width = Math.max(40, outputs * 20 + 20);
    const ids = Array.from({ length: outputs }, (_, index) => (outputs === 1 ? ['plus', 'minus'] : [`plus${index + 1}`, `minus${index + 1}`])).flat();
    const live = volts === '24';
    const terminals = terminalRow(ids, width, 0, 'top', 10).map((terminal) => ({ ...terminal, ...(live ? { phase: terminal.id.startsWith('plus') ? '24V' : '0V' } : {}) }));
    return { width, height: 50, terminals, shapes: [{ t: 'text', x: width / 2, y: 44, text: `${volts} V CC`, size: 6, align: 'center', muted: true }] };
  },
};

const acSource = {
  id: 'generic.source.ac',
  category: sourceCategory,
  brand: 'Genérico',
  name: 'Fuente de tensión alterna (CA)',
  labelPrefix: 'G',
  keywords: ['fuente', 'alterna', 'ca', 'ac', 'red', 'generador', 'acometida', '220', '380'],
  parameters: [
    { key: 'volts', label: 'Tensión (V CA)', short: 'V', type: 'select', options: ['24', '110', '230', '400'], default: '230' },
    { key: 'phases', label: 'Fases', short: 'fases', type: 'select', options: ['1', '3'], default: '1' },
  ],
  build: ({ volts, phases }) => {
    const ids = phases === '3' ? ['l1', 'l2', 'l3', 'n', 'pe'] : ['l', 'n', 'pe'];
    const width = Math.max(40, ids.length * 10 + 10);
    return { width, height: 50, terminals: terminalRow(ids, width, 0, 'top', 10), shapes: [{ t: 'text', x: width / 2, y: 44, text: `${volts} V CA ${phases}F`, size: 6, align: 'center', muted: true }] };
  },
};

const tempField = (definition) => ({ category: tempCategory, brand: 'Genérico', ...definition });

export const networkDefinitions = [
  hmi('siemens.ktp400.basic', 'Siemens', 'HMI KTP400 Basic PN', 'KTP400', { ethernet: 1 }, ['ktp400']),
  hmi('siemens.ktp900.basic', 'Siemens', 'HMI KTP900 Basic PN', 'KTP900', { ethernet: 1 }, ['ktp900']),
  hmi('siemens.ktp1200.basic', 'Siemens', 'HMI KTP1200 Basic PN', 'KTP1200', { ethernet: 1 }, ['ktp1200']),
  hmi('siemens.tp700.comfort', 'Siemens', 'HMI TP700 Comfort', 'TP700 COMF', { ethernet: 2, profibus: 1 }, ['tp700', 'comfort']),
  hmi('siemens.tp1500.comfort', 'Siemens', 'HMI TP1500 Comfort', 'TP1500 COMF', { ethernet: 2, profibus: 1 }, ['tp1500', 'comfort']),
  hmi('weintek.mt8071ip', 'Weintek', 'HMI Weintek MT8071iP', 'MT8071iP', { ethernet: 1, rs485: 1, rs232: 1 }, ['weintek', 'modbus']),
  hmi('delta.dop107', 'Delta', 'HMI Delta DOP-107', 'DOP-107', { ethernet: 1, rs485: 1, rs232: 1 }, ['delta', 'modbus']),
  hmi('schneider.hmist6', 'Schneider', 'HMI Schneider Harmony ST6', 'HMIST6', { ethernet: 1, rs485: 1, can: 1 }, ['harmony', 'magelis']),
  configurableIoDevice({
    id: 'generic.hmi.configurable',
    category: hmiCategory,
    brand: 'Genérico',
    name: 'HMI configurable (definir puertos)',
    title: 'HMI',
    labelPrefix: 'HMI',
    keywords: ['hmi', 'pantalla', 'panel', 'touch', 'operador', 'configurable'],
    defaults: { power: '24vdc', di: 0, dq: 0, ethernet: 1, rs485: 1 },
  }),

  networkDevice('siemens.et200s.im151', 'Siemens', 'ET 200S interfaz IM 151-3 PN (periferia remota)', 'ET200S IM151', { ethernet: 2 }, 'IM', ['et200s', 'periferia']),
  networkDevice('siemens.et200mp.im155', 'Siemens', 'ET 200MP interfaz IM 155-5 PN', 'ET200MP IM155-5', { ethernet: 2 }, 'IM', ['et200mp', 'periferia']),
  networkDevice('siemens.scalance.xr', 'Siemens', 'Switch SCALANCE XR 8 puertos (administrable)', 'XR 208', { ethernet: 8 }, 'SW', ['switch', 'scalance', 'anillo', 'mrp']),
  networkDevice('siemens.scalance.sc', 'Siemens', 'Router/Firewall SCALANCE SC-600 (4 puertos)', 'SC-600', { ethernet: 4 }, 'FW', ['firewall', 'router', 'seguridad']),
  networkDevice('generic.gateway.pn.pb', 'Genérico', 'Gateway PROFINET ↔ PROFIBUS DP', 'GW PN/PB', { ethernet: 2, profibus: 1 }, 'GW', ['gateway', 'profibus', 'conversor']),
  networkDevice('generic.gateway.pn.modbus', 'Genérico', 'Gateway PROFINET ↔ Modbus RTU', 'GW PN/MB', { ethernet: 2, rs485: 1 }, 'GW', ['gateway', 'modbus', 'rs485', 'conversor']),
  networkDevice('generic.gateway.eth.can', 'Genérico', 'Gateway Ethernet ↔ CANopen', 'GW ETH/CAN', { ethernet: 1, can: 1 }, 'GW', ['gateway', 'can', 'canopen']),
  configurableIoDevice({
    id: 'generic.pnio.device',
    category: netCategory,
    brand: 'Genérico',
    name: 'Equipo PROFINET IO configurable (periferia, medidor, variador…)',
    title: 'PN IO',
    labelPrefix: 'IO',
    keywords: ['profinet', 'io device', 'ethernet', 'periferia', 'nodo', 'configurable', 'red'],
    defaults: { power: '24vdc', di: 0, dq: 0, ethernet: 2 },
  }),
  rowDevice({
    id: 'generic.profibus.connector',
    category: netCategory,
    brand: 'Genérico',
    name: 'Conector PROFIBUS DP con terminación (a/b/blindaje)',
    width: 40,
    height: 30,
    labelPrefix: 'XPB',
    keywords: ['profibus', 'conector', 'terminacion', 'resistencia'],
    pitch: 10,
    top: ['a', 'b', 'sh'],
    shapes: [{ t: 'text', x: 20, y: 22, text: 'PB', size: 7, align: 'center' }],
  }),

  tempField({
    id: 'field.rtd.transmitter',
    name: 'Transmisor de cabezal Pt100 → 4-20 mA',
    width: 50,
    height: 50,
    labelPrefix: 'BT',
    keywords: ['transmisor', 'cabezal', 'pt100', 'temperatura', '4-20ma', 'rtd'],
    ...{ terminals: [...terminalRow(['a', 'b', 'c'], 50, 50, 'bottom', 10), ...terminalRow(['plus', 'minus'], 50, 0, 'top', 10)] },
    shapes: [{ t: 'text', x: 25, y: 25, text: 'TT', size: 9, align: 'center' }, { t: 'text', x: 25, y: 18, text: '4-20', size: 5, align: 'center', muted: true }],
  }),
  tempField({
    id: 'field.ntc',
    name: 'Sensor NTC / PTC 2 hilos',
    width: 30,
    height: 30,
    labelPrefix: 'BN',
    keywords: ['ntc', 'ptc', 'termistor', 'temperatura', 'sensor'],
    terminals: terminalRow(['a', 'b'], 30, 0, 'top', 10),
    shapes: [{ t: 'text', x: 15, y: 20, text: 'NTC', size: 7, align: 'center' }],
  }),
  tempField({
    id: 'field.temp.digital',
    name: 'Sensor de temperatura digital 3 hilos (DS18B20 / 1-Wire)',
    width: 40,
    height: 30,
    labelPrefix: 'BD',
    keywords: ['ds18b20', '1-wire', 'digital', 'temperatura', 'sensor'],
    terminals: terminalRow(['vcc', 'gnd', 'data'], 40, 0, 'top', 10),
    shapes: [{ t: 'text', x: 20, y: 22, text: 'T°', size: 8, align: 'center' }],
  }),
  tempField({
    id: 'field.temp.switch',
    name: 'Termostato de contacto (bimetálico NC)',
    width: 30,
    height: 30,
    labelPrefix: 'BS',
    keywords: ['termostato', 'bimetal', 'bimetalico', 'temperatura', 'contacto'],
    terminals: terminalRow(['1', '2'], 30, 0, 'top', 10),
    shapes: [{ t: 'text', x: 15, y: 20, text: 'θ', size: 9, align: 'center' }],
  }),
  tempField({
    id: 'field.pyrometer',
    name: 'Pirómetro infrarrojo 4-20 mA',
    width: 40,
    height: 40,
    labelPrefix: 'BP',
    keywords: ['pirometro', 'infrarrojo', 'ir', 'temperatura', '4-20ma'],
    terminals: terminalRow(['plus', 'minus'], 40, 0, 'top', 10),
    shapes: [{ t: 'text', x: 20, y: 26, text: 'IR', size: 9, align: 'center' }],
  }),

  genericBlock,
  dcSource,
  acSource,
];
