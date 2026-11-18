import { rowDevice } from './catalogHelpers.js';

// ATENCIÓN: dimensiones y nombres de bornes de control SIMPLIFICADOS (potencia + E/S principales).
// Verificar contra el manual del fabricante antes de usar en planos reales.

const category = 'Variadores / inversores de frecuencia';

// --- Listas de bornes de control (lado izquierdo, paso 10 mm) -----------------------------------
const g120cControl = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '12', '13', '18', '19', '20', '31', '32'];
const genericControl = ['+10v', '0v', 'ai1+', 'ai1-', 'di1', 'di2', 'di3', 'di4', 'di5', '+24v', 'dq.c', 'dq.no', 'dq.nc', 'ao+', 'ao-'];

const schneiderAtv12Control = ['+5v', 'ai1', 'com', 'li1', 'li2', 'li3', 'li4', '+24', 'r1a', 'r1b', 'r1c'];
const schneiderAtv212Control = ['pp', 'via', 'vib', 'cc', 'fm', 'f', 'r', 'res', 's1', 's2', 's3', 'p24', 'plc', 'fla', 'flb', 'flc', 'ry', 'rc'];
const schneiderAtvControl = ['+10', 'ai1', 'ai2', 'ai3', 'com', 'aq1', 'li1', 'li2', 'li3', 'li4', 'li5', 'li6', 'p24', '0v', '+24', 'r1a', 'r1b', 'r1c', 'r2a', 'r2c', 'stoa', 'stob'];

const abbAcs355Control = ['scr', 'ai1', 'agnd', '+10v', 'ai2', 'agnd2', 'ao1', 'agnd3', '+24v', 'gnd', 'dcom', 'di1', 'di2', 'di3', 'di4', 'di5', 'ro1c', 'ro1a', 'ro1b'];
const abbAcs580Control = ['scr', 'ai1', 'agnd', '+10v', 'ai2', 'agnd2', 'ao1', 'agnd3', '+24v', 'dgnd', 'dcom', 'di1', 'di2', 'di3', 'di4', 'di5', 'di6', 'ro1c', 'ro1a', 'ro1b', 'ro2c', 'ro2a', 'ro2b'];

const danfossFc302Control = ['12', '13', '18', '19', '20', '27', '29', '32', '33', '37', '39', '42', '50', '53', '54', '55', '01', '02', '03', '04', '05', '06'];
const danfossFc280Control = ['12', '13', '18', '19', '27', '29', '32', '33', '37', '42', '50', '53', '54', '55', '01', '02', '03'];

const wegControl = ['+10v', 'ai1', 'ai2', '0v', 'di1', 'di2', 'di3', 'di4', 'di5', 'di6', '+24v', 'dq1', 'dq2', 'ro1.nc', 'ro1.c', 'ro1.no'];
const yaskawaV1000Control = ['s1', 's2', 's3', 's4', 's5', 'sc', 'h1', 'hc', '+v', 'a1', 'a2', 'ac', 'ma', 'mb', 'mc', 'm1', 'm2', 'fm', 'am'];
const yaskawaGa500Control = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 'sc', 'h1', 'h2', 'hc', '+v', 'a1', 'a2', 'ac', 'ma', 'mb', 'mc', 'm1', 'm2'];
const deltaElControl = ['+10v', 'avi', 'aci', 'acm', 'afm', 'mi1', 'mi2', 'mi3', 'mi4', 'mi5', 'mi6', 'dcm', '+24v', 'ra', 'rb', 'rc'];
const deltaMs300Control = ['+10v', 'avi', 'aci', 'acm', 'afm', 'mi1', 'mi2', 'mi3', 'mi4', 'mi5', 'mi6', 'mi7', 'dcm', '+24v', 'ra', 'rb', 'rc', 'dfm'];
const mitsubishiControl = ['stf', 'str', 'rh', 'rm', 'rl', 'res', 'sd', 'pc', '10', '2', '5', '4', 'a', 'b', 'c', 'am'];
const powerflexControl = ['stop', 'start', 'dir', 'com', 'di5', 'di6', 'di7', 'di8', '+24v', 'com2', '+10v', 'v-in', 'com3', 'i-in', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6'];

// --- Construcción ---------------------------------------------------------------------------------
const controlTerminals = (ids, height) =>
  ids.map((id, index) => ({ id, x: 0, y: 25 + index * 10, side: 'left' })).filter((terminal) => terminal.y <= height - 20);

// Alto mínimo para que entren todos los bornes de control (múltiplo de 10 mm).
const minHeightFor = (control) => Math.ceil((25 + (control.length - 1) * 10 + 20) / 10) * 10;

const singlePhaseTop = ['l', 'n', 'pe'];
const motorBottom = ['u', 'v', 'w', 'pe2'];

// Bornes de bus CC / resistencia de frenado sobre el lado derecho (y = 40, 60, 80…).
const sideBus = (width, ids) => ids.map((id, index) => ({ id, x: width, y: 40 + index * 20, side: 'right' }));
const dcBus = (width) => sideBus(width, ['dc+', 'dc-']);
const brakeBus = (width, ids = ['dc+', 'br', 'dc-']) => sideBus(width, ids);

const drive = ({ id, brand, name, width, height, keywords, withEarth = false, top, bottom, control = genericControl, extra = [] }) => {
  const effectiveHeight = Math.max(height, minHeightFor(control));
  return rowDevice({
    id,
    category,
    brand,
    name,
    width,
    height: effectiveHeight,
    pitch: 20,
    labelPrefix: 'VF',
    keywords: ['variador', 'inversor', 'vfd', 'drive', 'frecuencia', ...keywords],
    top: top ?? (withEarth ? ['l1', 'l2', 'l3', 'pe'] : ['l1', 'l2', 'l3']),
    bottom: bottom ?? (withEarth ? ['u', 'v', 'w', 'pe2'] : ['u', 'v', 'w']),
    symbol: 'VF',
    symbolSize: 14,
    symbolKind: 'drive',
    extraTerminals: [...controlTerminals(control, effectiveHeight), ...extra],
  });
};

const threePhase = { withEarth: true };
const singlePhase = { top: singlePhaseTop, bottom: motorBottom };

// Variadores existentes (ids, bornes y dimensiones sin cambios: los .elcad guardados siguen válidos).
const legacyDrives = [
  drive({ id: 'siemens.g120c.fsa', brand: 'Siemens', name: 'Variador SINAMICS G120C FSA', width: 70, height: 200, keywords: ['sinamics', 'g120c'], control: g120cControl }),
  drive({ id: 'siemens.g120c.fsb', brand: 'Siemens', name: 'Variador SINAMICS G120C FSB', width: 100, height: 200, keywords: ['sinamics', 'g120c'], control: g120cControl }),
  drive({ id: 'siemens.g120c.fsc', brand: 'Siemens', name: 'Variador SINAMICS G120C FSC', width: 120, height: 240, keywords: ['sinamics', 'g120c'], control: g120cControl }),
  drive({ id: 'siemens.v20.1ph', brand: 'Siemens', name: 'Variador SINAMICS V20 monofásico 230 V', width: 100, height: 200, keywords: ['sinamics', 'v20'], ...singlePhase }),
  drive({ id: 'siemens.v20.3ph', brand: 'Siemens', name: 'Variador SINAMICS V20 trifásico 400 V', width: 100, height: 200, keywords: ['sinamics', 'v20'], ...threePhase }),
  drive({ id: 'siemens.g120x.fsa', brand: 'Siemens', name: 'Variador SINAMICS G120X FSA', width: 80, height: 220, keywords: ['sinamics', 'g120x'], ...threePhase }),
  drive({ id: 'abb.acs580.r1', brand: 'ABB', name: 'Variador ACS580 R1', width: 80, height: 200, keywords: ['acs580'], ...threePhase }),
  drive({ id: 'schneider.atv320', brand: 'Schneider', name: 'Variador Altivar ATV320 trifásico', width: 100, height: 200, keywords: ['altivar', 'atv320'], ...threePhase, extra: dcBus(100) }),
  drive({ id: 'schneider.atv630', brand: 'Schneider', name: 'Variador Altivar Process ATV630', width: 140, height: 300, keywords: ['altivar', 'atv630', 'process'], ...threePhase, extra: dcBus(140) }),
  drive({ id: 'weg.cfw500', brand: 'WEG', name: 'Variador CFW500 trifásico', width: 80, height: 200, keywords: ['weg', 'cfw500'], ...threePhase }),
  drive({ id: 'danfoss.fc51.1ph', brand: 'Danfoss', name: 'Variador VLT Micro FC 51 monofásico', width: 80, height: 200, keywords: ['danfoss', 'fc51', 'vlt'], ...singlePhase }),
  drive({ id: 'generic.inverter.1ph', brand: 'Genérico', name: 'Inversor de frecuencia monofásico → trifásico', width: 80, height: 200, keywords: ['monofasico'], ...singlePhase }),
  drive({ id: 'generic.inverter.3ph', brand: 'Genérico', name: 'Inversor de frecuencia trifásico', width: 100, height: 200, keywords: ['trifasico'], ...threePhase, extra: dcBus(100) }),
];

// Schneider Electric — Altivar. PA/+ · PB (resistencia de frenado) · PC/- sobre el lado derecho.
const schneiderBrake = (width) => brakeBus(width, ['pa+', 'pb', 'pc-']);
const schneiderDrives = [
  drive({ id: 'schneider.atv12.1ph', brand: 'Schneider', name: 'Variador Altivar ATV12 monofásico 230 V', width: 70, height: 160, keywords: ['altivar', 'atv12', 'schneider'], ...singlePhase, control: schneiderAtv12Control, extra: sideBus(70, ['pa+', 'pb']) }),
  drive({ id: 'schneider.atv12.3ph', brand: 'Schneider', name: 'Variador Altivar ATV12 trifásico 230 V', width: 70, height: 160, keywords: ['altivar', 'atv12', 'schneider'], ...threePhase, control: schneiderAtv12Control, extra: sideBus(70, ['pa+', 'pb']) }),
  drive({ id: 'schneider.atv212.3ph', brand: 'Schneider', name: 'Variador Altivar ATV212 trifásico 400 V (HVAC)', width: 100, height: 240, keywords: ['altivar', 'atv212', 'hvac', 'bombas', 'ventiladores', 'schneider'], ...threePhase, control: schneiderAtv212Control, extra: sideBus(100, ['pa+', 'pc-']) }),
  drive({ id: 'schneider.atv320.1ph', brand: 'Schneider', name: 'Variador Altivar ATV320 monofásico 230 V', width: 100, height: 260, keywords: ['altivar', 'atv320', 'schneider'], ...singlePhase, control: schneiderAtvControl, extra: schneiderBrake(100) }),
  drive({ id: 'schneider.atv340', brand: 'Schneider', name: 'Variador Altivar Machine ATV340 trifásico', width: 140, height: 280, keywords: ['altivar', 'machine', 'atv340', 'schneider'], ...threePhase, control: schneiderAtvControl, extra: schneiderBrake(140) }),
  drive({ id: 'schneider.atv610', brand: 'Schneider', name: 'Variador Altivar Process ATV610', width: 140, height: 300, keywords: ['altivar', 'process', 'atv610', 'schneider'], ...threePhase, control: schneiderAtvControl, extra: schneiderBrake(140) }),
  drive({ id: 'schneider.atv930', brand: 'Schneider', name: 'Variador Altivar Process ATV930', width: 180, height: 340, keywords: ['altivar', 'process', 'atv930', 'schneider'], ...threePhase, control: schneiderAtvControl, extra: schneiderBrake(180) }),
];

const siemensDrives = [
  drive({ id: 'siemens.g120x.fsb', brand: 'Siemens', name: 'Variador SINAMICS G120X FSB', width: 100, height: 260, keywords: ['sinamics', 'g120x'], ...threePhase, control: g120cControl }),
  drive({ id: 'siemens.g120x.fsc', brand: 'Siemens', name: 'Variador SINAMICS G120X FSC', width: 120, height: 300, keywords: ['sinamics', 'g120x'], ...threePhase, control: g120cControl }),
];

const abbDrives = [
  drive({ id: 'abb.acs355.3ph', brand: 'ABB', name: 'Variador ACS355 trifásico', width: 80, height: 220, keywords: ['acs355'], ...threePhase, control: abbAcs355Control, extra: sideBus(80, ['udc+', 'r-']) }),
  drive({ id: 'abb.acs580.r3', brand: 'ABB', name: 'Variador ACS580 R3', width: 100, height: 280, keywords: ['acs580'], ...threePhase, control: abbAcs580Control, extra: sideBus(100, ['udc+', 'r-', 'udc-']) }),
  drive({ id: 'abb.acs880.r3', brand: 'ABB', name: 'Variador ACS880-01 R3', width: 120, height: 300, keywords: ['acs880', 'industrial'], ...threePhase, control: abbAcs580Control, extra: sideBus(120, ['udc+', 'r-', 'udc-']) }),
];

const danfossDrives = [
  drive({ id: 'danfoss.fc302', brand: 'Danfoss', name: 'Variador VLT AutomationDrive FC 302', width: 100, height: 280, keywords: ['danfoss', 'fc302', 'vlt', 'automationdrive'], ...threePhase, control: danfossFc302Control, extra: sideBus(100, ['dc+', 'r+', 'r-', 'dc-']) }),
  drive({ id: 'danfoss.fc280', brand: 'Danfoss', name: 'Variador VLT Midi Drive FC 280', width: 90, height: 220, keywords: ['danfoss', 'fc280', 'vlt', 'midi'], ...threePhase, control: danfossFc280Control, extra: sideBus(90, ['dc+', 'r+', 'r-', 'dc-']) }),
  drive({ id: 'danfoss.fc102', brand: 'Danfoss', name: 'Variador VLT HVAC Drive FC 102', width: 100, height: 280, keywords: ['danfoss', 'fc102', 'vlt', 'hvac', 'bombas', 'ventiladores'], ...threePhase, control: danfossFc302Control, extra: sideBus(100, ['dc+', 'r+', 'r-', 'dc-']) }),
];

const wegDrives = [
  drive({ id: 'weg.cfw300.1ph', brand: 'WEG', name: 'Variador CFW300 monofásico 220 V', width: 70, height: 180, keywords: ['weg', 'cfw300'], ...singlePhase, control: wegControl }),
  drive({ id: 'weg.cfw11', brand: 'WEG', name: 'Variador CFW11 trifásico', width: 120, height: 260, keywords: ['weg', 'cfw11'], ...threePhase, control: wegControl, extra: dcBus(120) }),
];

const otherBrandDrives = [
  drive({ id: 'yaskawa.v1000', brand: 'Yaskawa', name: 'Variador V1000 trifásico', width: 80, height: 240, keywords: ['yaskawa', 'v1000'], ...threePhase, control: yaskawaV1000Control }),
  drive({ id: 'yaskawa.ga500', brand: 'Yaskawa', name: 'Variador GA500 trifásico', width: 90, height: 250, keywords: ['yaskawa', 'ga500'], ...threePhase, control: yaskawaGa500Control }),
  drive({ id: 'delta.vfdel.1ph', brand: 'Delta', name: 'Variador VFD-EL monofásico 230 V', width: 70, height: 200, keywords: ['delta', 'vfd-el', 'vfdel'], ...singlePhase, control: deltaElControl }),
  drive({ id: 'delta.ms300.3ph', brand: 'Delta', name: 'Variador MS300 trifásico', width: 80, height: 240, keywords: ['delta', 'ms300'], ...threePhase, control: deltaMs300Control }),
  drive({ id: 'mitsubishi.frd720s.1ph', brand: 'Mitsubishi', name: 'Variador FR-D720S monofásico 230 V', width: 70, height: 180, keywords: ['mitsubishi', 'fr-d720', 'fr-d700'], ...singlePhase, control: mitsubishiControl }),
  drive({ id: 'mitsubishi.fre820.3ph', brand: 'Mitsubishi', name: 'Variador FR-E820 trifásico', width: 80, height: 200, keywords: ['mitsubishi', 'fr-e820', 'fr-e800'], ...threePhase, control: mitsubishiControl }),
  drive({ id: 'rockwell.powerflex525', brand: 'Allen-Bradley', name: 'Variador PowerFlex 525 trifásico', width: 90, height: 250, keywords: ['allen bradley', 'rockwell', 'powerflex', 'pf525', '525'], ...threePhase, control: powerflexControl, extra: sideBus(90, ['dc+', 'br+', 'br-', 'dc-']) }),
];

const brakeResistor = rowDevice({
  id: 'generic.brakeresistor',
  category,
  brand: 'Genérico',
  name: 'Resistencia de frenado',
  width: 40,
  height: 60,
  pitch: 20,
  labelPrefix: 'RB',
  keywords: ['resistencia', 'frenado', 'freno dinamico', 'braking'],
  top: ['br+', 'br-'],
  symbol: 'RB',
  symbolSize: 8,
});

export const driveDefinitions = [
  ...legacyDrives,
  ...schneiderDrives,
  ...siemensDrives,
  ...abbDrives,
  ...danfossDrives,
  ...wegDrives,
  ...otherBrandDrives,
  brakeResistor,
];
