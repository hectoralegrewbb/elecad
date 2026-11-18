// Cajas y gabinetes de menor medida para tareas puntuales: pulsadores, luces, cajas de paso, derivaciones.
// Son contenedores (blocksRouting = false), igual que los gabinetes grandes: los equipos y bornes se colocan
// encima y los cables pasan por dentro. Medidas orientativas (múltiplos de 10 mm): verificar con el fabricante.

const category = 'Gabinetes';

// Margen del contorno interior punteado: proporcional al tamaño para que las cajas chicas no queden “vacías”.
const innerMargin = (width, height) => {
  const smallest = Math.min(width, height);
  if (smallest >= 300) return 15;
  return smallest >= 150 ? 10 : 5;
};

const innerRect = (width, height) => {
  const margin = innerMargin(width, height);
  return { t: 'rect', x: margin, y: margin, w: width - margin * 2, h: height - margin * 2, dash: [6, 4], muted: true };
};

const box = ({ id, name, width, height, labelPrefix, keywords }) => ({
  id,
  category,
  name,
  width,
  height,
  labelPrefix,
  keywords,
  blocksRouting: false,
  shapes: [innerRect(width, height)],
});

const junctionBox = (width, height) =>
  box({
    id: `layout.junction.${width}x${height}`,
    name: `Caja de paso ${width} × ${height} mm`,
    width,
    height,
    labelPrefix: 'CP',
    keywords: ['caja de paso', 'caja de derivacion', 'derivacion', 'empalme', 'estanca', 'plastica', 'junction box'],
  });

const smallEnclosure = (width, height) =>
  box({
    id: `layout.enclosure.${width}x${height}`,
    name: `Gabinete chico ${width} × ${height} mm`,
    width,
    height,
    labelPrefix: 'GAB',
    keywords: ['gabinete', 'gabinete chico', 'tablero', 'tablerito', 'caja', 'mural', 'enclosure'],
  });

// Gabinete de cualquier medida: se configura en el panel de propiedades (ancho y alto en mm).
const customEnclosure = {
  id: 'layout.enclosure.custom',
  category,
  name: 'Gabinete a medida (ancho × alto configurables)',
  labelPrefix: 'GAB',
  keywords: ['gabinete', 'tablero', 'caja', 'a medida', 'custom', 'configurable', 'chico', 'mini'],
  blocksRouting: false,
  parameters: [
    { key: 'ancho', label: 'Ancho (mm)', short: 'ancho', type: 'number', min: 60, max: 2400, default: 200 },
    { key: 'alto', label: 'Alto (mm)', short: 'alto', type: 'number', min: 60, max: 2400, default: 300 },
  ],
  build: ({ ancho, alto }) => {
    const width = Math.round(ancho / 10) * 10;
    const height = Math.round(alto / 10) * 10;
    return { width, height, terminals: [], shapes: [innerRect(width, height)] };
  },
};

const holePitch = 50;
const holeRadius = 11.25; // agujero estándar de 22,5 mm para pulsadores, selectores y pilotos

// Botonera / caja de comando de campo: N agujeros de 22,5 mm en columna.
const pushbuttonBox = {
  id: 'layout.pushbuttonbox',
  category,
  name: 'Botonera / caja de pulsadores Ø22,5 mm (agujeros configurables)',
  labelPrefix: 'BT',
  keywords: ['botonera', 'caja de pulsadores', 'caja de comando', 'pulsadores', 'luces', 'pilotos', 'selector', 'estacion de mando', 'campo'],
  blocksRouting: false,
  parameters: [{ key: 'agujeros', label: 'Cantidad de agujeros', short: 'agujeros', type: 'number', min: 1, max: 6, default: 2 }],
  build: ({ agujeros }) => {
    const width = 80;
    const height = 30 + agujeros * holePitch;
    const holes = Array.from({ length: agujeros }, (_, index) => ({ t: 'circle', x: width / 2, y: 40 + index * holePitch, r: holeRadius, muted: true }));
    return { width, height, terminals: [], shapes: [innerRect(width, height), ...holes] };
  },
};

export const smallEnclosureDefinitions = [
  junctionBox(100, 100),
  junctionBox(150, 100),
  junctionBox(150, 150),
  junctionBox(200, 200),
  smallEnclosure(200, 300),
  smallEnclosure(300, 300),
  smallEnclosure(300, 400),
  customEnclosure,
  pushbuttonBox,
];
