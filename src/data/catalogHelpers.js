// ATENCIÓN: dimensiones y posición de bornes APROXIMADAS (múltiplos de 10 mm; bornes en múltiplos de 5 mm
// para caer sobre la grilla). Verificar contra la hoja de datos antes de usar en planos reales.

// Fila de bornes centrada: x = ancho/2 + (i - (n-1)/2) * paso.
export const terminalRow = (ids, width, y, side, pitch) =>
  ids.map((id, index) => ({ id, x: width / 2 + (index - (ids.length - 1) / 2) * pitch, y, side }));

export const centeredText = (text, width, height, size = 10) => ({
  t: 'text',
  x: width / 2,
  y: height / 2,
  text,
  size,
  align: 'center',
});

// Equipo con una fila de bornes arriba y otra abajo (+ extras laterales opcionales).
export const rowDevice = ({ top = [], bottom = [], pitch, symbol, symbolSize = 10, extraTerminals = [], shapes = [], ...definition }) => ({
  ...definition,
  terminals: [
    ...terminalRow(top, definition.width, 0, 'top', pitch),
    ...terminalRow(bottom, definition.width, definition.height, 'bottom', pitch),
    ...extraTerminals,
  ],
  shapes: [...(symbol ? [centeredText(symbol, definition.width, definition.height, symbolSize)] : []), ...shapes],
});

export const contactorCoil = (width, height) => [
  { id: 'a1', x: width, y: 15, side: 'right' },
  { id: 'a2', x: width, y: height - 15, side: 'right' },
];

// Flecha vertical de 10 mm centrada en x (dir: 'down' entra al gabinete / sale de él, según el símbolo).
export const verticalArrow = (x, y, direction = 'down') => {
  const tip = direction === 'down' ? y + 12 : y;
  const tail = direction === 'down' ? y : y + 12;
  const wing = direction === 'down' ? tip - 5 : tip + 5;
  return [
    { t: 'line', x1: x, y1: tail, x2: x, y2: tip },
    { t: 'line', x1: x - 4, y1: wing, x2: x, y2: tip },
    { t: 'line', x1: x + 4, y1: wing, x2: x, y2: tip },
  ];
};
