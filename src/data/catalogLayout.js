import { centeredText, rowDevice, terminalRow, verticalArrow } from './catalogHelpers.js';

const enclosure = (width, height) => ({
  id: `layout.enclosure.${width}x${height}`,
  category: 'Gabinetes',
  name: `Gabinete ${width} × ${height} mm`,
  width,
  height,
  labelPrefix: 'GAB',
  keywords: ['gabinete', 'tablero', 'caja', 'enclosure'],
  blocksRouting: false,
  shapes: [{ t: 'rect', x: 15, y: 15, w: width - 30, h: height - 30, dash: [8, 5], muted: true }],
});

const dinRail = (length) => ({
  id: `layout.din.${length}`,
  category: 'Montaje',
  name: `Riel DIN 35 mm — ${length} mm`,
  width: length,
  height: 30,
  labelPrefix: 'RD',
  keywords: ['riel', 'din', 'rail'],
  blocksRouting: false,
  shapes: [
    { t: 'line', x1: 0, y1: 7.5, x2: length, y2: 7.5, muted: true },
    { t: 'line', x1: 0, y1: 22.5, x2: length, y2: 22.5, muted: true },
  ],
});

const slottedDuct = (length) => ({
  id: `layout.duct.40.${length}`,
  category: 'Montaje',
  name: `Canaleta ranurada 40 mm — ${length} mm`,
  width: length,
  height: 40,
  labelPrefix: 'CN',
  keywords: ['canaleta', 'ranurada', 'duct'],
  blocksRouting: false,
  shapes: Array.from({ length: Math.floor(length / 10) - 1 }, (_, index) => ({
    t: 'line',
    x1: (index + 1) * 10,
    y1: 4,
    x2: (index + 1) * 10,
    y2: 36,
    muted: true,
  })),
});

// Entrada / salida de potencia: la "acometida" y las "bajadas" a motores o cargas.
// Entradas: bornes hacia abajo (la potencia entra al gabinete). Salidas: bornes hacia arriba (la potencia sale).
const powerPoint = ({ id, name, direction, ids, width, label, keywords }) =>
  rowDevice({
    id,
    category: 'Potencia (entradas y salidas)',
    name,
    width,
    height: 30,
    labelPrefix: direction === 'in' ? 'XE' : 'XS',
    keywords: ['potencia', direction === 'in' ? 'acometida' : 'bajada', ...keywords],
    pitch: 20,
    top: direction === 'out' ? ids : [],
    bottom: direction === 'in' ? ids : [],
    shapes: [{ t: 'text', x: width / 2, y: direction === 'in' ? 7 : 24, text: label, size: 6, align: 'center' }, ...verticalArrow(width / 2, direction === 'in' ? 11 : 4)],
  });

const fieldPoint = ({ id, name, ids, width, label, keywords }) =>
  rowDevice({
    id,
    category: 'Potencia (entradas y salidas)',
    name,
    width,
    height: 30,
    labelPrefix: 'XC',
    keywords: ['bajada', 'campo', ...keywords],
    pitch: 20,
    top: ids,
    shapes: [{ t: 'text', x: width / 2, y: 24, text: label, size: 6, align: 'center' }, ...verticalArrow(width / 2, 4)],
  });

// Barra de distribución (todos sus puntos son el mismo nodo eléctrico).
const busbar = ({ id, name, symbol, labelPrefix, keywords, phase }) => ({
  id,
  phase,
  category: 'Barras y bornes',
  name,
  labelPrefix,
  keywords: ['barra', 'bus', 'distribucion', ...keywords],
  commonNet: true,
  parameters: [{ key: 'points', label: 'Cantidad de puntos', short: 'pts', type: 'number', min: 2, max: 40, default: 8 }],
  build: ({ points }) => {
    const width = (points + 1) * 10;
    const slots = Array.from({ length: points }, (_, index) => 10 * (index + 1));
    return {
      width,
      height: 20,
      terminals: [
        ...slots.map((x, index) => ({ id: `t${index}`, x, y: 0, side: 'top' })),
        ...slots.map((x, index) => ({ id: `b${index}`, x, y: 20, side: 'bottom' })),
      ],
      shapes: [centeredText(symbol, width, 20, 8)],
    };
  },
});

// Regleta de bornes de paso: cada borne conecta su punto superior con el inferior.
const terminalStrip = {
  id: 'generic.terminalstrip',
  category: 'Barras y bornes',
  brand: 'Genérico',
  name: 'Regleta de bornes de paso (configurable)',
  labelPrefix: 'X',
  keywords: ['regleta', 'borne', 'bornera', 'terminal', 'strip'],
  parameters: [{ key: 'poles', label: 'Cantidad de bornes', short: 'bornes', type: 'number', min: 1, max: 60, default: 10 }],
  build: ({ poles }) => {
    const width = Math.max(20, poles * 10);
    const terminals = [];
    for (let index = 0; index < poles; index += 1) {
      terminals.push({ id: `t${index}`, x: 10 * index + 5, y: 0, side: 'top', net: `p${index}` });
      terminals.push({ id: `b${index}`, x: 10 * index + 5, y: 40, side: 'bottom', net: `p${index}` });
    }
    return { width, height: 40, terminals, shapes: [] };
  },
};

const singleTerminal = (id, name, symbol, keywords) => ({
  id,
  category: 'Barras y bornes',
  brand: 'Phoenix Contact',
  name,
  width: 10,
  height: 40,
  labelPrefix: symbol === 'PE' ? 'XPE' : symbol === 'N' ? 'XN' : 'X',
  keywords,
  commonNet: true,
  phase: symbol === 'PE' ? 'PE' : symbol === 'N' ? 'N' : undefined,
  terminals: terminalRow(['t'], 10, 0, 'top', 10).concat(terminalRow(['b'], 10, 40, 'bottom', 10)),
  shapes: symbol ? [{ t: 'text', x: 5, y: 20, text: symbol, size: 5, align: 'center' }] : [],
});

export const layoutDefinitions = [
  enclosure(400, 500),
  enclosure(600, 600),
  enclosure(600, 800),
  enclosure(800, 1200),
  enclosure(800, 2000),
  enclosure(1000, 2000),
  dinRail(300),
  dinRail(500),
  slottedDuct(300),
  slottedDuct(500),

  powerPoint({ id: 'power.in.3pn', name: 'Entrada de potencia 3F+N+PE', direction: 'in', ids: ['l1', 'l2', 'l3', 'n', 'pe'], width: 100, label: 'ENTRADA 3F+N+PE', keywords: ['trifasica', 'neutro', '380', '400'] }),
  powerPoint({ id: 'power.in.3p', name: 'Entrada de potencia 3F+PE (sin neutro)', direction: 'in', ids: ['l1', 'l2', 'l3', 'pe'], width: 80, label: 'ENTRADA 3F+PE', keywords: ['trifasica'] }),
  powerPoint({ id: 'power.in.1pn', name: 'Entrada de potencia 1F+N+PE', direction: 'in', ids: ['l', 'n', 'pe'], width: 60, label: 'ENTRADA 1F+N', keywords: ['monofasica', 'neutro', '220', '230'] }),
  powerPoint({ id: 'power.in.dc24', name: 'Entrada 24 V CC', direction: 'in', ids: ['plus', 'minus'], width: 40, label: '24V', keywords: ['continua', '24v', 'dc'] }),
  powerPoint({ id: 'power.out.3pn', name: 'Salida de potencia 3F+N+PE', direction: 'out', ids: ['l1', 'l2', 'l3', 'n', 'pe'], width: 100, label: 'SALIDA 3F+N+PE', keywords: ['trifasica', 'neutro', 'carga'] }),
  powerPoint({ id: 'power.out.1pn', name: 'Salida de potencia 1F+N+PE', direction: 'out', ids: ['l', 'n', 'pe'], width: 60, label: 'SALIDA 1F+N', keywords: ['monofasica', 'neutro', 'carga'] }),
  powerPoint({ id: 'power.out.motor', name: 'Bajada a motor trifásico (U V W PE)', direction: 'out', ids: ['u', 'v', 'w', 'pe'], width: 80, label: 'BAJADA MOTOR', keywords: ['motor', 'trifasico', 'salida'] }),
  powerPoint({ id: 'power.out.dc24', name: 'Salida 24 V CC', direction: 'out', ids: ['plus', 'minus'], width: 40, label: '24V', keywords: ['continua', '24v', 'dc', 'carga'] }),
  fieldPoint({ id: 'field.signal.2w', name: 'Bajada de señal 2 hilos (4-20 mA)', ids: ['plus', 'minus'], width: 40, label: '4-20mA', keywords: ['senal', 'analogica', 'transmisor'] }),
  fieldPoint({ id: 'field.signal.3w', name: 'Bajada de sensor 3 hilos (24V / 0V / señal)', ids: ['plus', 'minus', 'sig'], width: 60, label: 'SENSOR 3H', keywords: ['sensor', 'senal', 'digital'] }),

  busbar({ phase: 'N', id: 'bus.neutral', name: 'Barra de neutro (N)', symbol: 'N', labelPrefix: 'BN', keywords: ['neutro', 'n'] }),
  busbar({ phase: 'PE', id: 'bus.earth', name: 'Barra de tierra (PE)', symbol: 'PE', labelPrefix: 'BPE', keywords: ['tierra', 'pe', 'proteccion'] }),
  busbar({ phase: '0V', id: 'bus.0v', name: 'Barra 0 V (común CC)', symbol: '0V', labelPrefix: 'B0V', keywords: ['0v', 'comun', 'negativo'] }),
  busbar({ phase: '24V', id: 'bus.24v', name: 'Barra +24 V CC', symbol: '+24V', labelPrefix: 'B24', keywords: ['24v', 'positivo'] }),
  busbar({ phase: 'L1', id: 'bus.l1', name: 'Barra de fase L1', symbol: 'L1', labelPrefix: 'BL1', keywords: ['fase', 'l1', 'r'] }),
  busbar({ phase: 'L2', id: 'bus.l2', name: 'Barra de fase L2', symbol: 'L2', labelPrefix: 'BL2', keywords: ['fase', 'l2', 's'] }),
  busbar({ phase: 'L3', id: 'bus.l3', name: 'Barra de fase L3', symbol: 'L3', labelPrefix: 'BL3', keywords: ['fase', 'l3', 't'] }),
  terminalStrip,
  singleTerminal('phoenix.ut2_5', 'Borne de paso 2,5 mm²', '', ['borne', 'terminal', 'ut 2,5', 'bornera']),
  singleTerminal('phoenix.ut2_5.pe', 'Borne de tierra PE 2,5 mm²', 'PE', ['borne', 'tierra', 'pe']),
  singleTerminal('phoenix.ut2_5.n', 'Borne de neutro N 2,5 mm²', 'N', ['borne', 'neutro']),
];
