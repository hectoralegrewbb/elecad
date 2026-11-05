import { contactorCoil, rowDevice } from './catalogHelpers.js';

const category = 'Protección y maniobra';
const poles3 = { top: ['1', '3', '5'], bottom: ['2', '4', '6'] };
const poles4 = { top: ['1', '3', '5', 'n1'], bottom: ['2', '4', '6', 'n2'] };
const poles2 = { top: ['1', 'n1'], bottom: ['2', 'n2'] };

const contactor = ({ id, brand, name, keywords }) =>
  rowDevice({
    id,
    category,
    brand,
    name,
    width: 50,
    height: 80,
    pitch: 15,
    labelPrefix: 'KM',
    keywords: ['contactor', ...keywords],
    ...poles3,
    symbol: 'KM',
    extraTerminals: contactorCoil(50, 80),
  });

const breaker = ({ id, brand, name, poles, width, prefix = 'Q', symbol = 'Q', keywords }) =>
  rowDevice({ id, category, brand, name, width, height: 90, pitch: 20, labelPrefix: prefix, keywords, ...poles, symbol });

const motorProtector = ({ id, brand, name, keywords }) =>
  rowDevice({
    id,
    category,
    brand,
    name,
    width: 50,
    height: 90,
    pitch: 15,
    labelPrefix: 'QM',
    keywords: ['guardamotor', 'motor protector', ...keywords],
    ...poles3,
    symbol: 'QM',
  });

export const protectionDefinitions = [
  contactor({ id: 'siemens.3rt2016.24vdc', brand: 'Siemens', name: 'Contactor 3RT2016-1BB41 24V CC', keywords: ['sirius', '3rt'] }),
  contactor({ id: 'abb.af09.24vdc', brand: 'ABB', name: 'Contactor AF09-30-10 24V CC', keywords: ['af09'] }),
  contactor({ id: 'schneider.lc1d09.24vdc', brand: 'Schneider', name: 'Contactor LC1D09BD 24V CC', keywords: ['tesys', 'lc1d'] }),

  breaker({ id: 'siemens.5sl6.3p.c16', brand: 'Siemens', name: 'Disyuntor 5SL6 3P C16', poles: poles3, width: 60, keywords: ['disyuntor', 'termomagnetica', 'mcb', 'tripolar'] }),
  breaker({ id: 'schneider.ic60n.3p.c16', brand: 'Schneider', name: 'Disyuntor iC60N 3P C16', poles: poles3, width: 60, keywords: ['disyuntor', 'termomagnetica', 'mcb', 'tripolar'] }),
  breaker({ id: 'siemens.5sl6.4p.c16', brand: 'Siemens', name: 'Disyuntor 5SL6 4P (3P+N) C16', poles: poles4, width: 80, keywords: ['disyuntor', 'termomagnetica', 'mcb', 'tetrapolar', 'neutro'] }),
  breaker({ id: 'schneider.ic60n.4p.c16', brand: 'Schneider', name: 'Disyuntor iC60N 4P (3P+N) C16', poles: poles4, width: 80, keywords: ['disyuntor', 'termomagnetica', 'mcb', 'tetrapolar', 'neutro'] }),
  breaker({ id: 'siemens.5sl6.2p.c10', brand: 'Siemens', name: 'Disyuntor 5SL6 1P+N C10', poles: poles2, width: 40, keywords: ['disyuntor', 'termomagnetica', 'mcb', 'monofasico', 'bipolar', 'neutro'] }),
  breaker({ id: 'schneider.ic60.rccb.4p.40a', brand: 'Schneider', name: 'Diferencial 4P 40A 30mA', poles: poles4, width: 80, prefix: 'QD', symbol: 'QD', keywords: ['diferencial', 'rccb', 'tetrapolar', 'neutro', '30ma'] }),
  breaker({ id: 'schneider.ic60.rccb.2p.25a', brand: 'Schneider', name: 'Diferencial 2P 25A 30mA', poles: poles2, width: 40, prefix: 'QD', symbol: 'QD', keywords: ['diferencial', 'rccb', 'bipolar', 'neutro', '30ma'] }),
  breaker({ id: 'siemens.3kc.disconnector.3p.63a', brand: 'Siemens', name: 'Seccionador 3P 63A', poles: poles3, width: 60, prefix: 'QS', symbol: 'QS', keywords: ['seccionador', 'interruptor general', 'corte'] }),
  breaker({ id: 'generic.fuseholder.3p', brand: 'Genérico', name: 'Portafusibles seccionable 3P', poles: poles3, width: 60, prefix: 'F', symbol: 'F', keywords: ['fusible', 'portafusible', 'nh', 'cilindrico'] }),

  motorProtector({ id: 'siemens.3rv2011.guardamotor', brand: 'Siemens', name: 'Guardamotor 3RV2011-1CA10', keywords: ['sirius', '3rv'] }),
  motorProtector({ id: 'abb.ms116.guardamotor', brand: 'ABB', name: 'Guardamotor MS116-10', keywords: ['ms116'] }),

  rowDevice({
    id: 'siemens.3rw30.softstarter',
    category,
    brand: 'Siemens',
    name: 'Arrancador suave 3RW3014 (3 fases)',
    width: 50,
    height: 120,
    pitch: 15,
    labelPrefix: 'SS',
    keywords: ['arrancador', 'suave', 'soft starter', 'sirius', '3rw'],
    top: ['l1', 'l2', 'l3'],
    bottom: ['t1', 't2', 't3'],
    symbol: 'SS',
    extraTerminals: contactorCoil(50, 120),
  }),
  rowDevice({
    id: 'generic.relay.24vdc.1c',
    category,
    brand: 'Genérico',
    name: 'Relé de interfaz 24V CC 1 inversor',
    width: 40,
    height: 60,
    pitch: 10,
    labelPrefix: 'K',
    keywords: ['rele', 'interfaz', 'acoplador', 'rif'],
    top: ['a1', 'a2'],
    bottom: ['11', '12', '14'],
    symbol: 'K',
  }),
  rowDevice({
    id: 'generic.transformer.1kva',
    category: 'Alimentación',
    brand: 'Genérico',
    name: 'Transformador 400/230 V 1 kVA',
    width: 80,
    height: 100,
    pitch: 20,
    labelPrefix: 'T',
    keywords: ['transformador', 'trafo', '230', '400'],
    top: ['h1', 'h2'],
    bottom: ['x1', 'x2'],
    symbol: 'T',
    symbolSize: 14,
  }),
  rowDevice({
    id: 'generic.psu.24v5a',
    category: 'Alimentación',
    brand: 'Genérico',
    name: 'Fuente 24V CC 5A',
    width: 70,
    height: 130,
    pitch: 20,
    labelPrefix: 'PS',
    keywords: ['fuente', 'psu', 'alimentacion', 'sitop'],
    top: ['l', 'n'],
    bottom: ['plus', 'minus'],
    symbol: '24V',
    symbolSize: 12,
  }),
  rowDevice({
    id: 'generic.psu.24v10a',
    category: 'Alimentación',
    brand: 'Genérico',
    name: 'Fuente 24V CC 10A',
    width: 90,
    height: 130,
    pitch: 20,
    labelPrefix: 'PS',
    keywords: ['fuente', 'psu', 'alimentacion', 'sitop'],
    top: ['l', 'n'],
    bottom: ['plus', 'minus'],
    symbol: '24V 10A',
    symbolSize: 12,
  }),
];
