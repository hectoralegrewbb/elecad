import { createId } from './ids.js';
import { getTerminalPose } from './componentGeometry.js';
import { isComponentId, isDimensionId, isWireId } from './documentState.js';

// Reducers puros: (state, ...args) => nuevoState. Los ids se generan fuera del reducer (make*).
// Endpoint de cable: { componentId, terminalId } (conectado) o { x, y } (libre / huérfano).
export function createCommands(catalog) {
  const resolveEndpointPoint = (state, endpoint) => {
    if (endpoint.componentId === undefined) return { x: endpoint.x, y: endpoint.y };
    const component = state.components[endpoint.componentId];
    if (!component) return null;
    const pose = getTerminalPose(component, catalog.resolve(component), endpoint.terminalId);
    return pose ? { x: pose.x, y: pose.y } : null;
  };

  const nextLabel = (state, prefix) => {
    const used = new Set(Object.values(state.components).map((component) => component.label));
    let counter = 1;
    while (used.has(`${prefix}${counter}`)) counter += 1;
    return `${prefix}${counter}`;
  };

  const patchEntity = (state, collection, id, patch) => {
    const current = state[collection][id];
    if (!current) return state;
    return { ...state, [collection]: { ...state[collection], [id]: { ...current, ...patch } } };
  };

  const makeComponent = (state, defId, x, y, rotation = 0) => {
    const definition = catalog.get(defId);
    return { id: createId('cmp'), defId, x, y, rotation, label: nextLabel(state, definition.labelPrefix), props: {} };
  };

  const makeWire = ({ from, to, waypoints = [], color = 'negro', gauge = '1.5', phase = '', label = '' }) => ({
    id: createId('wir'),
    from,
    to,
    waypoints,
    color,
    gauge,
    phase,
    label,
  });

  const addComponent = (state, component) => ({
    ...state,
    components: { ...state.components, [component.id]: component },
  });

  const addWire = (state, wire) => ({ ...state, wires: { ...state.wires, [wire.id]: wire } });

  const addDimension = (state, dimension) => ({
    ...state,
    dimensions: { ...state.dimensions, [dimension.id]: dimension },
  });

  const moveComponents = (state, ids, dx, dy) => {
    const components = { ...state.components };
    ids.forEach((id) => {
      const component = components[id];
      if (component && !component.locked) components[id] = { ...component, x: component.x + dx, y: component.y + dy };
    });
    return { ...state, components };
  };

  const rotateComponents = (state, ids, delta = 90) => {
    const components = { ...state.components };
    ids.forEach((id) => {
      const component = components[id];
      if (component && !component.locked) components[id] = { ...component, rotation: (((component.rotation + delta) % 360) + 360) % 360 };
    });
    return { ...state, components };
  };

  // Borrar un componente deja sus cables huérfanos (endpoint libre en la última posición del borne).
  const removeEntities = (state, ids) => {
    const removedComponents = new Set(ids.filter((id) => isComponentId(id) && state.components[id] && !state.components[id].locked));
    const removedWires = new Set(ids.filter(isWireId));
    const removedDimensions = new Set(ids.filter(isDimensionId));
    if (removedComponents.size + removedWires.size + removedDimensions.size === 0) return state;

    const components = { ...state.components };
    removedComponents.forEach((id) => delete components[id]);

    const wires = {};
    Object.values(state.wires).forEach((wire) => {
      if (removedWires.has(wire.id)) return;
      let next = wire;
      ['from', 'to'].forEach((key) => {
        const endpoint = wire[key];
        if (endpoint.componentId !== undefined && removedComponents.has(endpoint.componentId)) {
          next = { ...next, [key]: resolveEndpointPoint(state, endpoint) ?? { x: 0, y: 0 } };
        }
      });
      wires[wire.id] = next;
    });

    const dimensions = {};
    Object.values(state.dimensions).forEach((dimension) => {
      const dangling = removedComponents.has(dimension.a.componentId) || removedComponents.has(dimension.b.componentId);
      if (!dangling && !removedDimensions.has(dimension.id)) dimensions[dimension.id] = dimension;
    });

    return { ...state, components, wires, dimensions };
  };

  // Devuelve { state, ids } porque necesita crear ids nuevos.
  const duplicateComponents = (state, ids, dx, dy) => {
    let next = state;
    const newIds = [];
    ids.filter(isComponentId).forEach((id) => {
      const source = state.components[id];
      if (!source || source.locked) return;
      const copy = { ...makeComponent(next, source.defId, source.x + dx, source.y + dy, source.rotation), labelOrientation: source.labelOrientation, terminalOrientation: source.terminalOrientation, bodyTextOrientation: source.bodyTextOrientation, props: { ...source.props } };
      next = addComponent(next, copy);
      newIds.push(copy.id);
    });
    return { state: next, ids: newIds };
  };

  // Pega un payload de clipboard.js desplazado (dx, dy). Ids nuevos, cables y cotas remapeados.
  // Devuelve { state, ids } con los ids pegados (para seleccionarlos).
  const pasteEntities = (state, payload, dx, dy) => {
    let next = state;
    const idMap = new Map();
    const ids = [];
    payload.components.forEach((source) => {
      if (!catalog.has(source.defId)) return;
      const copy = {
        ...makeComponent(next, source.defId, source.x + dx, source.y + dy, source.rotation),
        labelOrientation: source.labelOrientation, terminalOrientation: source.terminalOrientation, bodyTextOrientation: source.bodyTextOrientation,
        props: { ...(source.props ?? {}) },
      };
      idMap.set(source.id, copy.id);
      next = addComponent(next, copy);
      ids.push(copy.id);
    });
    const remapEndpoint = (endpoint) => {
      if (endpoint.componentId === undefined) return { x: endpoint.x + dx, y: endpoint.y + dy };
      const target = idMap.get(endpoint.componentId);
      return target ? { componentId: target, terminalId: endpoint.terminalId } : null;
    };
    payload.wires.forEach((source) => {
      const from = remapEndpoint(source.from);
      const to = remapEndpoint(source.to);
      if (!from || !to) return;
      const wire = makeWire({
        from,
        to,
        waypoints: (source.waypoints ?? []).map((point) => ({ x: point.x + dx, y: point.y + dy })),
        color: source.color,
        gauge: source.gauge,
        phase: source.phase,
        label: source.label,
      });
      next = addWire(next, wire);
      ids.push(wire.id);
    });
    payload.dimensions.forEach((source) => {
      const a = idMap.get(source.a.componentId);
      const b = idMap.get(source.b.componentId);
      if (!a || !b) return;
      const dimension = { ...source, id: createId('dim'), a: { ...source.a, componentId: a }, b: { ...source.b, componentId: b } };
      next = addDimension(next, dimension);
      ids.push(dimension.id);
    });
    return { state: next, ids };
  };

  // Cambia parámetros (props) de un componente paramétrico. Los cables que apuntaban a bornes
  // que dejan de existir quedan huérfanos en la última posición del borne.
  const updateComponentProps = (state, id, propsPatch) => {
    const current = state.components[id];
    if (!current) return state;
    if (current.locked) return state;
    const updated = { ...current, props: { ...current.props, ...propsPatch } };
    const nextDefinition = catalog.resolve(updated);
    const wires = {};
    Object.values(state.wires).forEach((wire) => {
      let next = wire;
      ['from', 'to'].forEach((key) => {
        const endpoint = wire[key];
        if (endpoint.componentId !== id) return;
        if (nextDefinition.terminals.some((terminal) => terminal.id === endpoint.terminalId)) return;
        next = { ...next, [key]: resolveEndpointPoint(state, endpoint) ?? { x: current.x, y: current.y } };
      });
      wires[wire.id] = next;
    });
    return { ...state, components: { ...state.components, [id]: updated }, wires };
  };

  return {
    makeComponent,
    updateComponentProps,
    // Metadatos del documento (nombre, display, rótulo). display y titleBlock se fusionan campo a campo.
    updateMeta: (state, patch) => {
      const meta = { ...state.meta, ...patch };
      if (patch.display) meta.display = { ...(state.meta.display ?? {}), ...patch.display };
      if (patch.titleBlock) meta.titleBlock = { ...(state.meta.titleBlock ?? {}), ...patch.titleBlock };
      return { ...state, meta };
    },
    pasteEntities,
    makeWire,
    addComponent,
    addWire,
    addDimension,
    moveComponents,
    rotateComponents,
    removeEntities,
    duplicateComponents,
    updateComponent: (state, id, patch) => {
      const current = state.components[id];
      if (!current) return state;
      const safe = { ...patch };
      for (const key of ['labelOrientation', 'terminalOrientation', 'bodyTextOrientation']) {
        if (key in safe && !['horizontal', 'vertical'].includes(safe[key])) delete safe[key];
      }
      if ('locked' in safe && typeof safe.locked !== 'boolean') delete safe.locked;
      if (current.locked) return patchEntity(state, 'components', id, safe.locked === false ? { locked: false } : {});
      return patchEntity(state, 'components', id, safe);
    },
    updateWire: (state, id, patch) => patchEntity(state, 'wires', id, patch),
    updateDimension: (state, id, patch) => patchEntity(state, 'dimensions', id, patch),
  };
}
