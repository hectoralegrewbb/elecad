import { getTerminalPose } from './componentGeometry.js';

// Reparación de documentos cargados (archivos viejos o catálogo modificado):
// - componente con defId desconocido: se descarta junto con sus cables y cotas
// - borne inexistente (p. ej. se redujo una E/S): el extremo del cable queda libre
// Devuelve { state, removedComponents, detachedEndpoints } sin mutar la entrada.
export function repairDocument(state, catalog) {
  const unknown = new Set();
  const components = {};
  Object.values(state.components).forEach((component) => {
    if (catalog.has(component.defId)) components[component.id] = component;
    else unknown.add(component.id);
  });

  let detachedEndpoints = 0;
  const repairEndpoint = (endpoint) => {
    if (endpoint.componentId === undefined) return endpoint;
    const component = components[endpoint.componentId];
    if (!component) return unknown.has(endpoint.componentId) ? null : { x: 0, y: 0 };
    const pose = getTerminalPose(component, catalog.resolve(component), endpoint.terminalId);
    if (pose) return endpoint;
    detachedEndpoints += 1;
    return { x: component.x, y: component.y };
  };

  const wires = {};
  Object.values(state.wires).forEach((wire) => {
    const from = repairEndpoint(wire.from);
    const to = repairEndpoint(wire.to);
    if (from && to) wires[wire.id] = from === wire.from && to === wire.to ? wire : { ...wire, from, to };
  });

  const dimensions = {};
  Object.values(state.dimensions).forEach((dimension) => {
    const ends = [dimension.a, dimension.b];
    if (ends.every((end) => end?.componentId === undefined || components[end.componentId])) dimensions[dimension.id] = dimension;
  });

  if (unknown.size === 0 && detachedEndpoints === 0 && Object.keys(dimensions).length === Object.keys(state.dimensions).length) {
    return { state, removedComponents: 0, detachedEndpoints: 0 };
  }
  return { state: { ...state, components, wires, dimensions }, removedComponents: unknown.size, detachedEndpoints };
}
