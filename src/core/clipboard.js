import { isComponentId } from './documentState.js';

export const clipboardMarker = 'elcad-clipboard';

// Extrae del documento lo seleccionado, listo para pegar:
// - componentes seleccionados
// - cables cuyos extremos conectados pertenecen todos a los componentes copiados
//   (los cables hacia componentes no copiados no se llevan: quedarían colgando de la nada);
//   un cable con ambos extremos libres solo se copia si está seleccionado
// - cotas entre componentes copiados
// Devuelve null si no hay nada copiable. El payload es JSON puro (sirve para el portapapeles del sistema).
export function extractClipboard(state, ids) {
  const selected = new Set(ids);
  const componentIds = new Set(ids.filter((id) => isComponentId(id) && state.components[id]));
  const endpointInside = (endpoint) => endpoint.componentId === undefined || componentIds.has(endpoint.componentId);

  const wires = Object.values(state.wires).filter((wire) => {
    if (!endpointInside(wire.from) || !endpointInside(wire.to)) return false;
    const touchesCopied = wire.from.componentId !== undefined || wire.to.componentId !== undefined;
    return touchesCopied || selected.has(wire.id);
  });
  const dimensions = Object.values(state.dimensions).filter(
    (dimension) => componentIds.has(dimension.a.componentId) && componentIds.has(dimension.b.componentId),
  );
  const components = [...componentIds].map((id) => state.components[id]);

  if (components.length + wires.length === 0) return null;
  return { kind: clipboardMarker, components, wires, dimensions };
}

export const serializeClipboard = (payload) => JSON.stringify(payload);

export function parseClipboard(text) {
  if (typeof text !== 'string' || !text.includes(clipboardMarker)) return null;
  try {
    const payload = JSON.parse(text);
    if (payload?.kind !== clipboardMarker || !Array.isArray(payload.components)) return null;
    return { kind: clipboardMarker, components: payload.components, wires: payload.wires ?? [], dimensions: payload.dimensions ?? [] };
  } catch {
    return null;
  }
}

// Centro del conjunto copiado (caja que envuelve centros de componentes y puntos libres de cables).
export function clipboardAnchor(payload) {
  const points = [
    ...payload.components.map((component) => ({ x: component.x, y: component.y })),
    ...payload.wires.flatMap((wire) => [wire.from, wire.to].filter((endpoint) => endpoint.componentId === undefined)),
  ];
  if (points.length === 0) return { x: 0, y: 0 };
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
}
