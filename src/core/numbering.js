import { buildNetlist } from './netlist.js';

// Numeración de cables por nodo eléctrico: todos los cables del mismo nodo comparten número
// (convención de tablerismo). Los huérfanos conservan su etiqueta actual.
// Reducer puro: (state) => nuevoState. Se aplica con store.apply, así que es deshacible.
export function renumberWiresByNet(state, catalog, { startAt = 1 } = {}) {
  const { nets } = buildNetlist(state, catalog);
  const wires = { ...state.wires };
  nets.forEach((net, index) => {
    net.wireIds.forEach((wireId) => {
      wires[wireId] = { ...wires[wireId], label: String(startAt + index) };
    });
  });
  return { ...state, wires };
}
