import { phaseColors, phaseGauges } from './wireStandards.js';

// Función eléctrica por id de borne cuando la definición no la declara (definition.phase / terminal.phase).
const terminalPhases = {
  l1: 'L1', l2: 'L2', l3: 'L3', l: 'L1',
  n: 'N', n1: 'N', n2: 'N',
  pe: 'PE', pe2: 'PE',
  plus: '24V', 'l+': '24V', '1l+': '24V', '2l+': '24V', '+24v': '24V',
  minus: '0V', m: '0V', '1m': '0V', '2m': '0V', '0v': '0V', a2: '0V',
};

// Puertos de comunicación por patrón de id (eth0, pb0.a, rs485.0.a, can0.h).
const networkPhase = (id) => {
  if (/^eth\d+$/.test(id)) return 'ETH';
  if (/^pb\d+\./.test(id)) return 'PB';
  if (/^rs485\./.test(id)) return 'RS485';
  if (/^can\d+\./.test(id)) return 'CAN';
  return null;
};

const endpointPhase = (state, catalog, endpoint) => {
  if (endpoint.componentId === undefined) return null;
  const component = state.components[endpoint.componentId];
  if (!component || !catalog.has(component.defId)) return null;
  const definition = catalog.resolve(component);
  const terminal = definition.terminalMap.get(endpoint.terminalId);
  if (!terminal) return null;
  return terminal.phase ?? definition.phase ?? terminalPhases[endpoint.terminalId.toLowerCase()] ?? networkPhase(endpoint.terminalId.toLowerCase());
};

const sameEndpoint = (a, b) => a.componentId !== undefined && a.componentId === b.componentId && a.terminalId === b.terminalId;

// Un cable que toca un borne ya cableado con una función (p. ej. L1) hereda esa función.
const inheritedPhase = (state, endpoints) => {
  for (const wire of Object.values(state.wires)) {
    if (!wire.phase) continue;
    if (endpoints.some((endpoint) => sameEndpoint(endpoint, wire.from) || sameEndpoint(endpoint, wire.to))) return wire.phase;
  }
  return null;
};

// Estilo sugerido para un cable nuevo: función (fase), color de aislación y calibre típicos.
// Devuelve {} si no se puede inferir; el usuario siempre puede cambiarlo en el panel.
export function inferWireStyle(state, catalog, from, to) {
  const phase = endpointPhase(state, catalog, from) ?? endpointPhase(state, catalog, to) ?? inheritedPhase(state, [from, to]);
  if (!phase || !phaseColors[phase]) return {};
  return { phase, color: phaseColors[phase], gauge: phaseGauges[phase] ?? '1.5' };
}
