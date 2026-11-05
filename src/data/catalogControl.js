import { configurableIoDevice, fixedIoDevice } from './ioDeviceBuilder.js';

const category = 'Control (PLC / E/S / comunicación)';
const siemens = { brand: 'Siemens', category };

// CPU S7-1200 DC/DC/DC con la E/S integrada real de cada modelo.
const cpu = (model, params) =>
  fixedIoDevice({
    ...siemens,
    id: `siemens.s71200.cpu${model.toLowerCase()}`,
    name: `PLC S7-1200 CPU ${model} DC/DC/DC`,
    title: `S7-1200 ${model}`,
    labelPrefix: 'PLC',
    keywords: ['plc', 's7-1200', 'cpu', model.toLowerCase(), 'siemens'],
    params: { power: '24vdc', ethernet: 1, ...params },
  });

const signalModule = (id, name, params, keywords = []) =>
  fixedIoDevice({ ...siemens, id, name, title: name.replace('Módulo ', ''), labelPrefix: 'SM', keywords: ['modulo', 'senales', 'sm', ...keywords], params });

const communicationModule = (id, name, params, keywords = []) =>
  fixedIoDevice({ ...siemens, id, name, title: name.replace('Módulo ', ''), labelPrefix: 'CM', keywords: ['modulo', 'comunicacion', 'cm', ...keywords], params });

export const controlDefinitions = [
  cpu('1211C', { di: 6, dq: 4, ai: 2 }),
  cpu('1212C', { di: 8, dq: 6, ai: 2 }),
  cpu('1214C', { di: 14, dq: 10, ai: 2 }),
  cpu('1215C', { di: 14, dq: 10, ai: 2, aq: 2, ethernet: 2 }),
  cpu('1217C', { di: 14, dq: 10, ai: 2, aq: 2, ethernet: 2 }),

  signalModule('siemens.sm1221.di8', 'Módulo SM 1221 8 DI 24V', { di: 8 }, ['entradas digitales']),
  signalModule('siemens.sm1221.di16', 'Módulo SM 1221 16 DI 24V', { di: 16 }, ['entradas digitales']),
  signalModule('siemens.sm1222.dq8', 'Módulo SM 1222 8 DQ 24V', { dq: 8 }, ['salidas digitales']),
  signalModule('siemens.sm1222.dq16', 'Módulo SM 1222 16 DQ 24V', { dq: 16 }, ['salidas digitales']),
  signalModule('siemens.sm1223.di8dq8', 'Módulo SM 1223 8 DI / 8 DQ', { di: 8, dq: 8 }, ['entradas', 'salidas', 'digitales']),
  signalModule('siemens.sm1223.di16dq16', 'Módulo SM 1223 16 DI / 16 DQ', { di: 16, dq: 16 }, ['entradas', 'salidas', 'digitales']),
  signalModule('siemens.sm1231.ai4', 'Módulo SM 1231 4 AI', { ai: 4 }, ['entradas analogicas', '4-20ma']),
  signalModule('siemens.sm1231.ai8', 'Módulo SM 1231 8 AI', { ai: 8 }, ['entradas analogicas', '4-20ma']),
  signalModule('siemens.sm1231.rtd4', 'Módulo SM 1231 4 RTD', { rtd: 4, rtdWires: '3' }, ['rtd', 'pt100', 'temperatura']),
  signalModule('siemens.sm1231.rtd8', 'Módulo SM 1231 8 RTD', { rtd: 8, rtdWires: '3' }, ['rtd', 'pt100', 'temperatura']),
  signalModule('siemens.sm1231.tc4', 'Módulo SM 1231 4 TC', { tc: 4 }, ['termocupla', 'temperatura']),
  signalModule('siemens.sm1231.tc8', 'Módulo SM 1231 8 TC', { tc: 8 }, ['termocupla', 'temperatura']),
  signalModule('siemens.sm1232.aq2', 'Módulo SM 1232 2 AQ', { aq: 2 }, ['salidas analogicas']),
  signalModule('siemens.sm1232.aq4', 'Módulo SM 1232 4 AQ', { aq: 4 }, ['salidas analogicas']),
  signalModule('siemens.sm1234.ai4aq2', 'Módulo SM 1234 4 AI / 2 AQ', { ai: 4, aq: 2 }, ['analogicas']),

  communicationModule('siemens.cm1241.rs485', 'Módulo CM 1241 RS485', { rs485: 1 }, ['modbus', 'serie']),
  communicationModule('siemens.cm1241.rs232', 'Módulo CM 1241 RS232', { rs232: 1 }, ['serie']),
  communicationModule('siemens.cm1243.profibus', 'Módulo CM 1243-5 PROFIBUS DP maestro', { profibus: 1, power: '24vdc' }, ['profibus', 'dp']),
  fixedIoDevice({
    ...siemens,
    id: 'siemens.csm1277',
    name: 'Switch Ethernet CSM 1277 (4 puertos)',
    title: 'CSM 1277',
    labelPrefix: 'SW',
    keywords: ['switch', 'ethernet', 'profinet', 'red'],
    params: { power: '24vdc', ethernet: 4 },
  }),
  fixedIoDevice({
    ...siemens,
    id: 'siemens.ktp700.basic',
    name: 'HMI KTP700 Basic PN',
    title: 'KTP700',
    labelPrefix: 'HMI',
    keywords: ['hmi', 'pantalla', 'panel', 'ktp700', 'touch'],
    params: { power: '24vdc', ethernet: 1 },
  }),
  fixedIoDevice({
    ...siemens,
    id: 'siemens.et200sp.im155',
    name: 'ET 200SP interfaz IM 155-6 PN (2 puertos)',
    title: 'ET200SP IM155',
    labelPrefix: 'IM',
    keywords: ['et200sp', 'periferia', 'remota', 'profinet', 'im155'],
    params: { power: '24vdc', ethernet: 2 },
  }),

  // Switches Ethernet industriales (alimentación 24 V CC + puertos RJ45).
  ...[
    ['siemens.scalance.xb005', 'Switch SCALANCE XB005 (5 puertos)', 'XB005', 5, 'Siemens'],
    ['siemens.scalance.xb008', 'Switch SCALANCE XB008 (8 puertos)', 'XB008', 8, 'Siemens'],
    ['siemens.scalance.xc208', 'Switch administrable SCALANCE XC208 (8 puertos)', 'XC208', 8, 'Siemens'],
    ['generic.switch.5p', 'Switch Ethernet industrial 5 puertos', 'SW 5', 5, 'Genérico'],
    ['generic.switch.8p', 'Switch Ethernet industrial 8 puertos', 'SW 8', 8, 'Genérico'],
    ['generic.switch.16p', 'Switch Ethernet industrial 16 puertos (rack)', 'SW 16', 16, 'Genérico'],
  ].map(([id, name, title, ports, brand]) =>
    fixedIoDevice({
      category,
      brand,
      id,
      name,
      title,
      labelPrefix: 'SW',
      keywords: ['switch', 'ethernet', 'profinet', 'red', 'hub', 'scalance', 'industrial'],
      params: { power: '24vdc', ethernet: ports },
    }),
  ),

  // Configurables: el usuario define cuántas E/S de cada tipo y qué puertos de comunicación tiene.
  configurableIoDevice({
    id: 'generic.plc.configurable',
    category,
    brand: 'Genérico',
    name: 'PLC configurable (definir E/S y comunicación)',
    title: 'PLC',
    labelPrefix: 'PLC',
    keywords: ['plc', 'controlador', 'configurable', 'personalizado', 'cpu', 'logo', 's7-1500', 'compactlogix'],
    defaults: { di: 14, dq: 10, ai: 2, ethernet: 1 },
  }),
  configurableIoDevice({
    id: 'generic.io.configurable',
    category,
    brand: 'Genérico',
    name: 'Módulo de E/S configurable',
    title: 'MÓDULO E/S',
    labelPrefix: 'SM',
    keywords: ['modulo', 'io', 'entradas', 'salidas', 'analogicas', 'rtd', 'termocupla', 'periferia', 'configurable'],
    defaults: { power: 'ninguna', di: 8, dq: 0, ethernet: 0 },
  }),
];
