// Símbolos eléctricos (estilo IEC 60617) para la vista "símbolo". Cada generador recibe la definición
// efectiva del componente (ya resuelta, con sus bornes) y devuelve shapes declarativos en coordenadas
// locales. Si un componente no tiene símbolo propio, la vista cae en su dibujo normal.

const line = (x1, y1, x2, y2, extra = {}) => ({ t: 'line', x1, y1, x2, y2, ...extra });
const rect = (x, y, w, h, extra = {}) => ({ t: 'rect', x, y, w, h, ...extra });
const circle = (x, y, r, extra = {}) => ({ t: 'circle', x, y, r, ...extra });
const text = (x, y, value, size = 8, extra = {}) => ({ t: 'text', x, y, text: value, size, align: 'center', ...extra });
const dashed = [3, 2];

const onSide = (definition, side) =>
  definition.terminals.filter((terminal) => terminal.side === side).sort((a, b) => (side === 'top' || side === 'bottom' ? a.x - b.x : a.y - b.y));
const terminalById = (definition, id) => definition.terminals.find((terminal) => terminal.id === id);

// Un polo = bornes superior e inferior del mismo índice.
function poles(definition) {
  const top = onSide(definition, 'top');
  const bottom = onSide(definition, 'bottom');
  return top.slice(0, Math.min(top.length, bottom.length)).map((terminal, index) => ({ x: terminal.x, xb: bottom[index].x }));
}

// Contacto normalmente abierto vertical entre y1 e y2 (cuchilla que no toca el borne inferior).
function contactNO(x, y1, y2) {
  const mid = (y1 + y2) / 2;
  const d = Math.min(10, (y2 - y1) / 4);
  return { shapes: [line(x, y1, x, mid - d), line(x, mid - d, x - d * 0.75, mid + d * 0.8), line(x, y2, x, mid + d)], mid, d };
}

const linkage = (xs, y, toX = null) => {
  const from = Math.min(...xs);
  const to = toX ?? Math.max(...xs);
  return from === to ? [] : [line(from - 3, y, to, y, { dash: dashed })];
};

function poleSymbol(definition, decorate) {
  const list = poles(definition);
  if (list.length === 0) return null;
  const shapes = [];
  list.forEach(({ x }) => {
    const contact = contactNO(x, 0, definition.height);
    shapes.push(...contact.shapes);
    if (decorate) shapes.push(...decorate(x, contact));
  });
  const mid = definition.height / 2;
  shapes.push(...linkage(list.map((pole) => pole.x), mid));
  return { shapes, mid, xs: list.map((pole) => pole.x) };
}

// La bobina usa el canal libre a la derecha de los polos: nunca invade L3.
function coilBounds(definition) {
  const rightPole = Math.max(0, ...poles(definition).map(pole => pole.x));
  const gap = Math.max(2, definition.width - rightPole);
  const width = Math.min(12, gap * 0.55);
  return { cx: rightPole + gap * 0.6, width };
}

// Bobina a la derecha (bornes a1 / a2 sobre el lado derecho).
function coilOnRight(definition, label) {
  const a1 = terminalById(definition, 'a1');
  const a2 = terminalById(definition, 'a2');
  if (!a1 || !a2 || a1.side !== 'right') return [];
  const { cx, width } = coilBounds(definition);
  const mid = definition.height / 2;
  return [
    line(a1.x, a1.y, cx, a1.y), line(cx, a1.y, cx, mid - 10),
    rect(cx - width / 2, mid - 10, width, 20),
    line(cx, mid + 10, cx, a2.y), line(cx, a2.y, a2.x, a2.y),
    text(cx, mid, label, Math.min(6, width * 0.55)),
  ];
}

const cross = (x, y) => [line(x - 3, y - 3, x + 3, y + 3), line(x - 3, y + 3, x + 3, y - 3)];

const symbols = {
  contactor(definition) {
    const base = poleSymbol(definition);
    if (!base) return null;
    const coil = coilOnRight(definition, 'KM');
    const { cx, width } = coilBounds(definition);
    const coilLeft = cx - width / 2;
    return [...base.shapes, ...coil, ...(coil.length ? [line(Math.max(...base.xs), base.mid, coilLeft, base.mid, { dash: dashed })] : [])];
  },
  breaker(definition) {
    const base = poleSymbol(definition, (x, contact) => [...cross(x, contact.mid - contact.d), rect(x - 3, 14, 6, 12)]);
    return base?.shapes ?? null;
  },
  disconnector(definition) {
    const base = poleSymbol(definition, (x, contact) => [line(x - contact.d, contact.mid - contact.d, x + 3, contact.mid - contact.d)]);
    return base?.shapes ?? null;
  },
  fuse(definition) {
    const list = poles(definition);
    if (list.length === 0) return null;
    return list.flatMap(({ x }) => [line(x, 0, x, definition.height), rect(x - 3, definition.height / 2 - 10, 6, 20, {})]);
  },
  thermalRelay(definition) {
    const list = poles(definition);
    if (list.length === 0) return null;
    const mid = definition.height / 2;
    return [
      ...list.flatMap(({ x }) => [line(x, 0, x, mid - 10), line(x, mid + 10, x, definition.height), rect(x - 5, mid - 10, 10, 20), line(x - 3, mid + 5, x + 3, mid - 5)]),
      ...linkage(list.map((pole) => pole.x), mid - 16),
    ];
  },
  motor(definition) {
    const cx = definition.width / 2;
    const cy = definition.height / 2 + 4;
    const r = Math.min(definition.width, definition.height) * 0.36;
    const phases = definition.id.includes('1ph') ? '1~' : definition.id.includes('dc') ? '=' : '3~';
    return [circle(cx, cy, r), text(cx, cy - 3, 'M', 10), text(cx, cy + 6, phases, 6)];
  },
  transformer(definition) {
    const cx = definition.width / 2;
    const cy = definition.height / 2;
    const r = Math.min(definition.width / 4, definition.height / 5);
    return [circle(cx, cy - r * 0.6, r), circle(cx, cy + r * 0.6, r)];
  },
  psu(definition) {
    const inset = 6;
    const w = definition.width;
    const h = definition.height;
    return [
      rect(inset, h / 2 - 22, w - inset * 2, 44),
      line(inset, h / 2 + 22, w - inset, h / 2 - 22),
      text(w / 2 - (w - inset * 2) / 4 + 2, h / 2 - 10, '~', 10),
      text(w / 2 + (w - inset * 2) / 4 - 2, h / 2 + 10, '=', 10),
    ];
  },
  drive(definition) {
    const w = definition.width;
    const h = definition.height;
    const boxW = Math.min(w - 20, 56);
    const x = w / 2 - boxW / 2;
    const y = h / 2 - boxW / 2;
    return [rect(x, y, boxW, boxW), line(x, y + boxW, x + boxW, y), text(x + boxW * 0.28, y + boxW * 0.3, '~', 10), text(x + boxW * 0.72, y + boxW * 0.72, '~', 10)];
  },
  pushbutton(definition) {
    const bottom = onSide(definition, 'bottom');
    if (bottom.length < 2) return null;
    const normallyClosed = definition.id.includes('.nc') || definition.id.includes('estop');
    const [a, b] = bottom;
    const top = Math.max(10, definition.height - 18);
    const mid = (a.x + b.x) / 2;
    return [
      line(a.x, a.y, a.x, top), line(b.x, b.y, b.x, top),
      normallyClosed ? line(a.x, top, b.x, top) : line(a.x, top, b.x - 3, top - 7),
      line(mid, top - 4, mid, 3, { dash: dashed }), line(mid - 4, 3, mid + 4, 3),
      ...(definition.id.includes('estop') ? [text(mid, definition.height / 2 - 2, 'E', 6)] : []),
    ];
  },
  lamp(definition) {
    const bottom = onSide(definition, 'bottom');
    if (bottom.length < 2) return null;
    const cx = (bottom[0].x + bottom[1].x) / 2;
    const cy = definition.height / 2 - 2;
    const r = 7;
    return [
      line(bottom[0].x, bottom[0].y, bottom[0].x, cy + 5), line(bottom[1].x, bottom[1].y, bottom[1].x, cy + 5),
      circle(cx, cy, r), line(cx - 5, cy - 5, cx + 5, cy + 5), line(cx - 5, cy + 5, cx + 5, cy - 5),
    ];
  },
  coil(definition) {
    const top = onSide(definition, 'top');
    if (top.length < 2) return null;
    const cx = (top[0].x + top[top.length - 1].x) / 2;
    const mid = definition.height / 2 + 4;
    return [line(top[0].x, 0, top[0].x, mid - 9), line(top[1].x, 0, top[1].x, mid - 9), rect(Math.min(top[0].x, top[1].x) - 2, mid - 9, Math.abs(top[1].x - top[0].x) + 4, 18), text(cx, mid, definition.id.includes('valve') ? 'YV' : 'K', 7)];
  },
  sensor(definition) {
    const cx = definition.width / 2;
    const cy = definition.height / 2 + 4;
    const s = 9;
    return [line(cx, cy - s, cx + s, cy), line(cx + s, cy, cx, cy + s), line(cx, cy + s, cx - s, cy), line(cx - s, cy, cx, cy - s), text(cx, cy, 'B', 6)];
  },
  limitSwitch(definition) {
    const bottom = onSide(definition, 'bottom');
    if (bottom.length < 2) return null;
    const [a, b] = bottom;
    const top = Math.max(10, definition.height - 18);
    return [line(a.x, a.y, a.x, top), line(b.x, b.y, b.x, top), line(a.x, top, b.x - 3, top - 7), circle(b.x, top - 12, 3)];
  },
  resistor(definition) {
    const cx = definition.width / 2;
    const cy = definition.height / 2;
    const terminals = onSide(definition, 'top');
    return [
      ...terminals.map((terminal) => line(terminal.x, 0, terminal.x, cy - 10)),
      rect(Math.min(...terminals.map((t) => t.x), cx - 6) - 2, cy - 10, Math.max(12, Math.abs((terminals[1]?.x ?? cx) - (terminals[0]?.x ?? cx)) + 4), 20),
    ];
  },
  rtd(definition) {
    const cx = definition.width / 2;
    return [rect(cx - 6, 12, 12, 22), line(cx - 10, 36, cx + 10, 8), text(cx, definition.height - 6, 'θ', 7)];
  },
  fan(definition) {
    const cx = definition.width / 2;
    const cy = definition.height / 2;
    const r = Math.min(definition.width, definition.height) * 0.3;
    return [circle(cx, cy, r), text(cx, cy, 'M', 10), text(cx, cy + r + 8, 'M ~', 6, { muted: true })];
  },
  source(definition) {
    const cx = definition.width / 2;
    const cy = definition.height / 2;
    const ac = definition.id.includes('.ac');
    return [circle(cx, cy, 14), text(cx, cy, ac ? '~' : '=', 12)];
  },
  busbar(definition) {
    const top = onSide(definition, 'top');
    if (top.length === 0) return null;
    return [line(top[0].x - 4, definition.height / 2, top[top.length - 1].x + 4, definition.height / 2, { weight: 3 }), ...top.map((terminal) => line(terminal.x, 0, terminal.x, definition.height / 2))];
  },
  terminalStrip(definition) {
    const top = onSide(definition, 'top');
    const bottom = onSide(definition, 'bottom');
    return top.flatMap((terminal, index) => [line(terminal.x, 0, bottom[index]?.x ?? terminal.x, definition.height), circle(terminal.x, definition.height / 2, 2.5)]);
  },
  spd(definition) {
    const top = onSide(definition, 'top');
    const cx = definition.width / 2;
    return [rect(cx - 14, 18, 28, 26), line(cx, 22, cx, 40), line(cx - 4, 34, cx, 40), line(cx + 4, 34, cx, 40), ...top.map((terminal) => line(terminal.x, 0, terminal.x, 18))];
  },
};

// [patrón de id, generador]. El primero que coincide gana.
const rules = [
  [/^(siemens\.3rt|abb\.af|schneider\.lc1d|generic\.contactor)/, 'contactor'],
  [/^generic\.fuseholder/, 'fuse'],
  [/^siemens\.3kc/, 'disconnector'],
  [/^(siemens\.5sl6|schneider\.ic60|generic\.mcb|siemens\.3rv|abb\.ms116)/, 'breaker'],
  [/^(siemens\.3ru|generic\.thermalrelay)/, 'thermalRelay'],
  [/^(generic\.timer|generic\.ssr|safety\.relay)/, 'coil'],
  [/^(field\.(pressureswitch|floatswitch|flowswitch)|cool\.(thermostat|hygrostat)|field\.temp\.switch)/, 'limitSwitch'],
  [/^(field\.(thermocouple|ntc))/, 'rtd'],
  [/^cabinet\.lamp/, 'lamp'],
  [/^field\.motor\./, 'motor'],
  [/^generic\.transformer/, 'transformer'],
  [/^generic\.psu/, 'psu'],
  [/(g120|v20|acs580|atv|cfw|fc51|inverter)/, 'drive'],
  [/^field\.(pushbutton|estop|selector|keyswitch)/, 'pushbutton'],
  [/^field\.pilot/, 'lamp'],
  [/^(field\.valve|generic\.relay|generic\.hourmeter)/, 'coil'],
  [/^field\.sensor\.(inductive|capacitive|photo)/, 'sensor'],
  [/^field\.limitswitch/, 'limitSwitch'],
  [/^(cool\.heater|generic\.brakeresistor)/, 'resistor'],
  [/^field\.rtd/, 'rtd'],
  [/^cool\.fan/, 'fan'],
  [/^generic\.source/, 'source'],
  [/^bus\./, 'busbar'],
  [/^generic\.terminalstrip|^phoenix\./, 'terminalStrip'],
  [/^generic\.spd/, 'spd'],
];

const cache = new WeakMap();

// Shapes del símbolo del componente o null si no tiene (la vista usa entonces su dibujo normal).
export function symbolShapesFor(definition) {
  if (cache.has(definition)) return cache.get(definition);
  const rule = rules.find(([pattern]) => pattern.test(definition.id));
  let shapes = null;
  if (rule?.[1] && symbols[rule[1]]) {
    try {
      shapes = symbols[rule[1]](definition);
    } catch {
      shapes = null;
    }
  }
  cache.set(definition, shapes);
  return shapes;
}
