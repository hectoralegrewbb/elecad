// Grafo eléctrico derivado del documento: nodos (nets) = bornes unidos por cables (union-find).
// Base para numeración de cables, referencias cruzadas y BOM.
// Con `catalog`, los bornes equipotenciales (barras, bornes de paso: commonNet / terminal.net)
// quedan en el mismo nodo aunque no los una un cable.
export function buildNetlist(state, catalog = null) {
  const parent = new Map();
  const find = (key) => {
    if (!parent.has(key)) parent.set(key, key);
    let root = key;
    while (parent.get(root) !== root) root = parent.get(root);
    let cursor = key;
    while (parent.get(cursor) !== root) {
      const next = parent.get(cursor);
      parent.set(cursor, root);
      cursor = next;
    }
    return root;
  };
  const terminalKey = (endpoint) => `${endpoint.componentId}:${endpoint.terminalId}`;
  const isConnected = (endpoint) => endpoint.componentId !== undefined;

  const wires = Object.values(state.wires);
  const orphanWireIds = [];
  wires.forEach((wire) => {
    const fromConnected = isConnected(wire.from);
    const toConnected = isConnected(wire.to);
    if (!fromConnected || !toConnected) orphanWireIds.push(wire.id);
    if (fromConnected) find(terminalKey(wire.from));
    if (toConnected) find(terminalKey(wire.to));
    if (fromConnected && toConnected) parent.set(find(terminalKey(wire.from)), find(terminalKey(wire.to)));
  });

  if (catalog) unionEquipotential(state, catalog, parent, find);

  const groups = new Map();
  const netIdByWire = new Map();
  wires.forEach((wire) => {
    const anchor = isConnected(wire.from) ? wire.from : isConnected(wire.to) ? wire.to : null;
    if (!anchor) return;
    const root = find(terminalKey(anchor));
    if (!groups.has(root)) groups.set(root, { id: `N${groups.size + 1}`, wireIds: [], terminals: new Set() });
    const group = groups.get(root);
    group.wireIds.push(wire.id);
    [wire.from, wire.to].filter(isConnected).forEach((endpoint) => group.terminals.add(terminalKey(endpoint)));
    netIdByWire.set(wire.id, group.id);
  });

  const nets = [...groups.values()].map((group) => ({ ...group, terminals: [...group.terminals] }));
  return { nets, netIdByWire, orphanWireIds };
}

function unionEquipotential(state, catalog, parent, find) {
  const byGroup = new Map();
  [...parent.keys()].forEach((key) => {
    const separator = key.indexOf(':');
    const componentId = key.slice(0, separator);
    const terminalId = key.slice(separator + 1);
    const component = state.components[componentId];
    if (!component || !catalog.has(component.defId)) return;
    const definition = catalog.resolve(component);
    const terminal = definition.terminals.find((candidate) => candidate.id === terminalId);
    if (!terminal) return;
    const groupName = definition.commonNet ? 'all' : terminal.net;
    if (groupName === undefined) return;
    const groupKey = `${componentId}|${groupName}`;
    if (!byGroup.has(groupKey)) byGroup.set(groupKey, []);
    byGroup.get(groupKey).push(key);
  });
  byGroup.forEach((keys) => keys.slice(1).forEach((key) => parent.set(find(key), find(keys[0]))));
}
