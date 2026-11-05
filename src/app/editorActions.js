import { isComponentId } from '../core/documentState.js';
import { buildDimension } from '../core/dimensionFactory.js';
import { clipboardAnchor, extractClipboard, parseClipboard, serializeClipboard } from '../core/clipboard.js';
import { alignComponents, distributeComponents } from '../core/align.js';
import { getDisplay } from '../core/wireLabel.js';
import { renumberWiresByNet } from '../core/numbering.js';
import { isWireId } from '../core/documentState.js';

// Acciones de edición reutilizadas por atajos, paleta y panel de propiedades.
export function createEditorActions(editor, notify) {
  const { store, commands, selection, catalog } = editor;
  const selectedComponentIds = () => selection.toArray().filter(isComponentId);
  const gridSize = () => store.state.meta.gridSize;
  const snap = (value) => Math.round(value / gridSize()) * gridSize();

  // Portapapeles interno (siempre disponible) + copia al del sistema cuando se puede (entre pestañas).
  let internalClipboard = null;
  let lastPaste = null;

  const pastePayload = (payload) => {
    const anchor = clipboardAnchor(payload);
    const cursor = editor.cursorWorld;
    const base = cursor ?? { x: anchor.x + gridSize() * 4, y: anchor.y + gridSize() * 4 };
    let dx = snap(base.x - anchor.x);
    let dy = snap(base.y - anchor.y);
    // Pegar varias veces en el mismo punto no apila copias: cada una se corre una grilla*4.
    if (lastPaste && lastPaste.payload === payload && lastPaste.dx === dx && lastPaste.dy === dy) {
      dx += gridSize() * 4;
      dy += gridSize() * 4;
    }
    lastPaste = { payload, dx, dy };
    let pastedIds = [];
    store.apply((state) => {
      const result = commands.pasteEntities(state, payload, dx, dy);
      pastedIds = result.ids;
      return result.state;
    });
    selection.set(pastedIds);
    editor.setTool('select');
  };

  return {
    selectedComponentCount: () => selectedComponentIds().length,

    deleteSelection() {
      const ids = selection.toArray();
      if (ids.length === 0) return;
      store.apply((state) => commands.removeEntities(state, ids));
      selection.prune(store.state);
    },

    rotateSelection() {
      const ids = selectedComponentIds();
      if (ids.length === 0) return;
      store.apply((state) => commands.rotateComponents(state, ids, 90));
    },

    // Duplicar = copiar + pegar corrido, sin tocar el portapapeles; lleva cables internos y cotas.
    duplicateSelection() {
      const payload = extractClipboard(store.state, selection.toArray());
      if (!payload) return;
      const offset = gridSize() * 4;
      let newIds = [];
      store.apply((state) => {
        const result = commands.pasteEntities(state, payload, offset, offset);
        newIds = result.ids;
        return result.state;
      });
      selection.set(newIds);
    },

    // Copia la selección. Devuelve el texto serializado (para event.clipboardData) o null.
    copySelection() {
      const payload = extractClipboard(store.state, selection.toArray());
      if (!payload) return null;
      internalClipboard = payload;
      lastPaste = null;
      const text = serializeClipboard(payload);
      navigator.clipboard?.writeText(text).catch(() => {});
      notify(`Copiado: ${payload.components.length} componentes, ${payload.wires.length} cables`);
      return text;
    },

    cutSelection() {
      const text = this.copySelection();
      if (text) this.deleteSelection();
      return text;
    },

    // text: contenido del portapapeles del sistema (si vino de un evento paste); si no, el interno.
    pasteClipboard(text) {
      const payload = parseClipboard(text) ?? internalClipboard;
      if (!payload) {
        notify('No hay nada copiado.', { kind: 'error' });
        return;
      }
      pastePayload(payload);
    },

    hasClipboard: () => internalClipboard !== null,

    alignSelection(mode) {
      const ids = selectedComponentIds();
      if (ids.length < 2) {
        notify('Seleccioná al menos 2 componentes para alinear.', { kind: 'error' });
        return;
      }
      store.apply((state) => alignComponents(state, catalog, ids, mode));
    },

    distributeSelection(axis) {
      const ids = selectedComponentIds();
      if (ids.length < 3) {
        notify('Seleccioná al menos 3 componentes para distribuir.', { kind: 'error' });
        return;
      }
      store.apply((state) => distributeComponents(state, catalog, ids, axis));
    },

    // Cables seleccionados (o todos si no hay ninguno): vuelven al ruteo automático y a la posición de rótulo por defecto.
    resetWireLayout() {
      const selected = selection.toArray().filter(isWireId);
      const targets = selected.length > 0 ? selected : Object.keys(store.state.wires);
      if (targets.length === 0) return;
      store.apply((state) => {
        const wires = { ...state.wires };
        targets.forEach((id) => {
          if (wires[id]) wires[id] = { ...wires[id], waypoints: [], labelOffset: { dx: 0, dy: 0 } };
        });
        return { ...state, wires };
      });
      notify(selected.length > 0 ? 'Cables reacomodados' : 'Todos los cables vuelven al auto-ruteo');
    },

    toggleViewMode() {
      const next = getDisplay(store.state.meta).viewMode === 'symbol' ? 'shape' : 'symbol';
      store.apply((state) => commands.updateMeta(state, { display: { viewMode: next } }));
      notify(next === 'symbol' ? 'Vista: símbolos eléctricos' : 'Vista: forma de los componentes');
    },

    toggleDisplay(key, message) {
      const next = !getDisplay(store.state.meta)[key];
      store.apply((state) => commands.updateMeta(state, { display: { [key]: next } }));
      notify(`${message}: ${next ? 'visible' : 'oculto'}`);
    },

    selectAll() {
      selection.set(Object.values(store.state.components).filter(c => !c.locked).map(c => c.id));
    },

    renumberWires() {
      if (Object.keys(store.state.wires).length === 0) {
        notify('No hay cables para numerar.', { kind: 'error' });
        return;
      }
      store.apply((state) => renumberWiresByNet(state, catalog));
      notify('Cables numerados por nodo');
    },

    nudgeSelection(dx, dy) {
      const ids = selectedComponentIds();
      if (ids.length === 0) return;
      store.apply((state) => commands.moveComponents(state, ids, dx, dy));
    },

    undo() {
      store.undo();
      selection.prune(store.state);
    },

    redo() {
      store.redo();
      selection.prune(store.state);
    },

    addDimension(kind) {
      const dimension = buildDimension(store.state, catalog, selection.toArray(), kind);
      if (!dimension) {
        notify('Esa cota necesita 1 componente (ancho/alto) o 2 (separación) seleccionados.', { kind: 'error' });
        return;
      }
      store.apply((state) => commands.addDimension(state, dimension));
      selection.set([dimension.id]);
    },
  };
}
