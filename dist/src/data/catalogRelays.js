import { rowDevice, terminalRow } from './catalogHelpers.js';

const category = 'Relés, temporización y proceso';

const timer = ({ id, name, keywords, top, bottom, width, symbol }) =>
  rowDevice({ id, category, brand: 'Genérico', name, width, height: 70, pitch: 10, labelPrefix: 'KT', keywords: ['temporizador', 'timer', 'rele de tiempo', ...keywords], top, bottom, symbol });

const interfaceRelay = ({ id, name, contacts, width }) => {
  const bottom = Array.from({ length: contacts }, (_, index) => [`${index + 1}1`, `${index + 1}2`, `${index + 1}4`]).flat();
  return rowDevice({
    id,
    category,
    brand: 'Genérico',
    name,
    width,
    height: 70,
    pitch: 10,
    labelPrefix: 'K',
    keywords: ['rele', 'interfaz', 'enchufable', 'auxiliar', `${contacts} contactos`],
    top: ['a1', 'a2'],
    bottom,
    symbol: 'K',
  });
};

// Relé de estado sólido: carga arriba/abajo, control por el lado izquierdo.
const ssr = {
  id: 'generic.ssr',
  category,
  brand: 'Genérico',
  name: 'Relé de estado sólido SSR (configurable)',
  labelPrefix: 'KS',
  keywords: ['ssr', 'estado solido', 'rele estado solido', 'solid state', 'potencia', 'resistencia'],
  parameters: [
    { key: 'phases', label: 'Fases', short: 'F', type: 'select', options: ['1', '3'], default: '1' },
    { key: 'amps', label: 'Corriente (A)', short: 'A', type: 'select', options: ['10', '25', '40', '60', '90'], default: '25' },
    { key: 'control', label: 'Control', short: 'ctrl', type: 'select', options: ['3-32 V CC', '90-280 V CA'], default: '3-32 V CC' },
  ],
  build: ({ phases, amps }) => {
    const three = phases === '3';
    const width = three ? 70 : 40;
    const height = 70;
    const top = three ? ['l1', 'l2', 'l3'] : ['l1'];
    const bottom = three ? ['t1', 't2', 't3'] : ['t1'];
    return {
      width,
      height,
      terminals: [
        ...terminalRow(top, width, 0, 'top', 20),
        ...terminalRow(bottom, width, height, 'bottom', 20),
        { id: 'a1', x: 0, y: 25, side: 'left' },
        { id: 'a2', x: 0, y: 45, side: 'left' },
      ],
      shapes: [
        { t: 'text', x: width / 2, y: height / 2 - 4, text: 'SSR', size: 9, align: 'center' },
        { t: 'text', x: width / 2, y: height / 2 + 8, text: `${amps}A`, size: 7, align: 'center', muted: true },
      ],
    };
  },
};

// Controlador de temperatura PID: entrada, salida de control, alarmas, RS485, alimentación.
const temperatureController = {
  id: 'generic.tempcontroller',
  category,
  brand: 'Genérico',
  name: 'Controlador de temperatura PID (configurable)',
  labelPrefix: 'TIC',
  keywords: ['controlador', 'temperatura', 'pid', 'termostato', 'e5cc', 'tk4', 'autonics', 'omron', 'pirometro'],
  parameters: [
    { key: 'power', label: 'Alimentación', short: 'pwr', type: 'select', options: ['24vdc', '230vac'], default: '230vac' },
    { key: 'input', label: 'Entrada', short: 'in', type: 'select', options: ['pt100', 'termocupla', '4-20ma'], default: 'pt100' },
    { key: 'output', label: 'Salida de control', short: 'out', type: 'select', options: ['rele', 'ssr', '4-20ma'], default: 'ssr' },
    { key: 'alarms', label: 'Alarmas (relé)', short: 'AL', type: 'number', min: 0, max: 3, default: 1 },
    { key: 'rs485', label: 'RS485 (Modbus)', short: '485', type: 'select', options: ['no', 'si'], default: 'no' },
  ],
  build: ({ power, input, output, alarms, rs485 }) => {
    const powerIds = power === '24vdc' ? ['plus', 'minus'] : ['l', 'n'];
    const inputIds = { pt100: ['in.a', 'in.b', 'in.b2'], termocupla: ['tc+', 'tc-'], '4-20ma': ['ai+', 'ai-'] }[input];
    const outputIds = { rele: ['out.c', 'out.no', 'out.nc'], ssr: ['ssr+', 'ssr-'], '4-20ma': ['ao+', 'ao-'] }[output];
    const alarmIds = Array.from({ length: alarms }, (_, index) => [`al${index + 1}.c`, `al${index + 1}.no`]).flat();
    const top = [...powerIds, ...inputIds];
    const bottom = [...outputIds, ...alarmIds];
    const count = Math.max(top.length, bottom.length);
    const width = Math.max(60, Math.ceil((count * 10 + 20) / 10) * 10);
    const height = 90;
    return {
      width,
      height,
      terminals: [
        ...terminalRow(top, width, 0, 'top', 10),
        ...terminalRow(bottom, width, height, 'bottom', 10),
        ...(rs485 === 'si'
          ? [{ id: 'rs485.a', x: 0, y: 35, side: 'left' }, { id: 'rs485.b', x: 0, y: 45, side: 'left' }]
          : []),
      ],
      shapes: [
        { t: 'text', x: width / 2, y: height / 2 - 4, text: 'PID', size: 12, align: 'center' },
        { t: 'text', x: width / 2, y: height / 2 + 10, text: `${input} → ${output}`, size: 6, align: 'center', muted: true },
      ],
    };
  },
};

export const relayDefinitions = [
  timer({ id: 'generic.timer.on', name: 'Temporizador a la conexión (1 contacto)', keywords: ['on delay', 'ton', 'conexion'], top: ['a1', 'a2'], bottom: ['15', '16', '18'], width: 30, symbol: 'T-ON' }),
  timer({ id: 'generic.timer.off', name: 'Temporizador a la desconexión (con control)', keywords: ['off delay', 'tof', 'desconexion'], top: ['a1', 'b1', 'a2'], bottom: ['15', '16', '18'], width: 40, symbol: 'T-OFF' }),
  timer({ id: 'generic.timer.multi', name: 'Temporizador multifunción (2 contactos)', keywords: ['multifuncion', 'ciclico', 'intermitente', '3rp'], top: ['a1', 'a2'], bottom: ['15', '16', '18', '25', '26', '28'], width: 60, symbol: 'T-MF' }),
  timer({ id: 'generic.timer.stardelta', name: 'Temporizador estrella-triángulo', keywords: ['estrella', 'triangulo', 'arranque', 'yd'], top: ['a1', 'a2'], bottom: ['17', '18', '27', '28'], width: 40, symbol: 'Y-Δ' }),
  rowDevice({
    id: 'generic.hourmeter',
    category,
    brand: 'Genérico',
    name: 'Horómetro 24 V CC',
    width: 40,
    height: 40,
    pitch: 10,
    labelPrefix: 'PH',
    keywords: ['horometro', 'contador de horas', 'contador'],
    top: ['plus', 'minus'],
    symbol: 'h',
  }),
  interfaceRelay({ id: 'generic.relay.24vdc.2c', name: 'Relé de interfaz 24V CC 2 inversores', contacts: 2, width: 60 }),
  interfaceRelay({ id: 'generic.relay.24vdc.4c', name: 'Relé de interfaz 24V CC 4 inversores', contacts: 4, width: 130 }),
  ssr,
  temperatureController,
];
