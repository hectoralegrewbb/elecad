import { EventEmitter } from '../core/eventEmitter.js';

export class SelectionModel extends EventEmitter {
  constructor() {
    super();
    this.ids = new Set();
  }

  get size() {
    return this.ids.size;
  }

  has(id) {
    return this.ids.has(id);
  }

  toArray() {
    return [...this.ids];
  }

  set(ids) {
    this.ids = new Set(ids);
    this.emit({ type: 'selection' });
  }

  toggle(id) {
    if (this.ids.has(id)) this.ids.delete(id);
    else this.ids.add(id);
    this.emit({ type: 'selection' });
  }

  clear() {
    if (this.ids.size === 0) return;
    this.set([]);
  }

  // Quita ids que ya no existen en el documento (tras borrar, undo, abrir archivo).
  prune(state) {
    const exists = (id) => Boolean(state.components[id] || state.wires[id] || state.dimensions[id]);
    const kept = this.toArray().filter(exists);
    if (kept.length !== this.ids.size) this.set(kept);
  }
}
