// Rótulo (cajetín) del plano: datos del proyecto que se dibujan bajo el esquema y salen en PDF / PNG / SVG.
// Se genera como shapes declarativos en coordenadas de mundo (mm), así lo dibujan igual el canvas y el SVG.

export const titleBlockFields = [
  { key: 'company', label: 'Empresa' },
  { key: 'title', label: 'Título del plano' },
  { key: 'project', label: 'Proyecto' },
  { key: 'client', label: 'Cliente / planta' },
  { key: 'drawingNo', label: 'N° de plano' },
  { key: 'sheet', label: 'Hoja' },
  { key: 'revision', label: 'Revisión' },
  { key: 'drawnBy', label: 'Dibujó' },
  { key: 'checkedBy', label: 'Revisó' },
  { key: 'date', label: 'Fecha' },
  { key: 'scale', label: 'Escala' },
];

export const defaultTitleBlock = {
  enabled: false,
  company: '',
  title: '',
  project: '',
  client: '',
  drawingNo: '',
  sheet: '1/1',
  revision: '0',
  drawnBy: '',
  checkedBy: '',
  date: '',
  scale: 'S/E',
};

export const getTitleBlock = (meta) => ({ ...defaultTitleBlock, ...(meta?.titleBlock ?? {}) });

const width = 190;
const rows = [
  { height: 16, big: true, cells: [['company', 0.35], ['title', 0.65]] },
  { height: 12, cells: [['project', 0.5], ['client', 0.5]] },
  { height: 12, cells: [['drawingNo', 0.4], ['sheet', 0.3], ['revision', 0.3]] },
  { height: 12, cells: [['drawnBy', 0.3], ['checkedBy', 0.3], ['date', 0.2], ['scale', 0.2]] },
];
export const titleBlockSize = { width, height: rows.reduce((sum, row) => sum + row.height, 0) };

const labelOf = Object.fromEntries(titleBlockFields.map((field) => [field.key, field.label]));
const fit = (text, maxWidth, size) => {
  const maxChars = Math.max(1, Math.floor(maxWidth / (size * 0.55)));
  return text.length > maxChars ? `${text.slice(0, Math.max(1, maxChars - 1))}…` : text;
};

// bounds: rect del contenido del plano. Devuelve { rect, shapes } o null si está desactivado / no hay contenido.
export function layoutTitleBlock(titleBlock, bounds) {
  if (!titleBlock?.enabled || !bounds) return null;
  const right = Math.max(bounds.right, bounds.left + width);
  const left = right - width;
  const top = bounds.bottom + 20;
  const shapes = [{ t: 'rect', x: left, y: top, w: width, h: titleBlockSize.height }];
  let y = top;
  rows.forEach((row, rowIndex) => {
    if (rowIndex > 0) shapes.push({ t: 'line', x1: left, y1: y, x2: left + width, y2: y });
    let x = left;
    row.cells.forEach(([key, fraction], cellIndex) => {
      const cellWidth = width * fraction;
      if (cellIndex > 0) shapes.push({ t: 'line', x1: x, y1: y, x2: x, y2: y + row.height });
      const valueSize = row.big && key === 'title' ? 8 : 6;
      shapes.push({ t: 'text', x: x + 2, y: y + 3.5, text: labelOf[key], size: 3.6, align: 'left', muted: true });
      shapes.push({ t: 'text', x: x + 2, y: y + row.height * 0.66, text: fit(String(titleBlock[key] ?? ''), cellWidth - 4, valueSize), size: valueSize, align: 'left' });
      x += cellWidth;
    });
    y += row.height;
  });
  return { rect: { left, top, right, bottom: top + titleBlockSize.height }, shapes };
}
