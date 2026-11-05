// Color de aislación sugerido por función (convención argentina: R marrón, S negro, T rojo, N celeste,
// PE verde-amarillo). Un único lugar para cambiarlo.
export const phaseColors = {
  L1: 'marrón',
  L2: 'negro',
  L3: 'rojo',
  N: 'celeste',
  PE: 'verde-amarillo',
  '24V': 'azul',
  '0V': 'gris',
  ETH: 'verde', // PROFINET / Ethernet industrial (cable verde según guías PI)
  PB: 'violeta', // PROFIBUS DP
  RS485: 'gris',
  CAN: 'blanco',
};

// Calibre típico por función (mm²): potencia 2,5; control/CC 1.
export const phaseGauges = { L1: '2.5', L2: '2.5', L3: '2.5', N: '2.5', PE: '2.5', '24V': '1', '0V': '1', ETH: '', PB: '', RS485: '', CAN: '' }; // buses: cable de comunicación, sin calibre de potencia

// Diámetro del conductor (cobre macizo equivalente) para una sección en mm²: d = 2·√(S/π).
export const conductorDiameter = (section) => 2 * Math.sqrt((Number(section) || 0) / Math.PI);

// Diámetro exterior aproximado con aislación, cable flexible tipo H07V-K / IRAM NM 247-3 (mm).
// Valores orientativos: verificar con la hoja de datos del fabricante.
export const outerDiameters = { '0.5': 2.1, '0.75': 2.4, '1': 2.6, '1.5': 3.0, '2.5': 3.6, '4': 4.2, '6': 4.8, '10': 6.3, '16': 7.8, '25': 9.8 };

export const formatSection = (section) => `${String(section).replace('.', ',')} mm²`;
