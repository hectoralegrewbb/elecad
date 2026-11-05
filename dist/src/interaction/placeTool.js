import { getRotatedSize } from '../core/componentGeometry.js';
import { snapToGrid } from '../core/geometry.js';

// Modo colocación: el componente elegido en la paleta sigue al cursor (ghost); click lo coloca.
// Shift + click coloca varios seguidos. R rota el ghost.
export class PlaceTool {
  constructor(editor) {
    this.editor = editor;
    this.cursor = 'copy';
    this.definitionId = null;
    this.rotation = 0;
    this.lastWorld = null;
  }

  activate(options = {}) {
    this.definitionId = options.definitionId ?? null;
    this.rotation = 0;
    this.lastWorld = null;
  }

  deactivate() {
    this.editor.overlay.ghost = null;
  }

  // El centro se calcula para que la esquina superior-izquierda caiga en la grilla.
  snappedCenter(world) {
    const { editor } = this;
    const gridSize = editor.store.state.meta.gridSize;
    const { width, height } = getRotatedSize(editor.catalog.resolve({ defId: this.definitionId, props: {} }), this.rotation);
    return {
      x: snapToGrid(world.x - width / 2, gridSize) + width / 2,
      y: snapToGrid(world.y - height / 2, gridSize) + height / 2,
    };
  }

  updateGhost() {
    if (!this.lastWorld || !this.definitionId) return;
    this.editor.overlay.ghost = {
      defId: this.definitionId,
      rotation: this.rotation,
      ...this.snappedCenter(this.lastWorld),
    };
    this.editor.requestRender();
  }

  onPointerMove(pointer) {
    this.lastWorld = pointer.world;
    this.updateGhost();
  }

  onPointerDown(pointer) {
    if (pointer.button !== 0 || !this.definitionId) return;
    const { editor } = this;
    const center = this.snappedCenter(pointer.world);
    const component = editor.commands.makeComponent(editor.store.state, this.definitionId, center.x, center.y, this.rotation);
    editor.store.apply((state) => editor.commands.addComponent(state, component));
    if (!pointer.shiftKey) {
      editor.selection.set([component.id]);
      editor.setTool('select');
    }
  }

  onPointerUp() {}

  onKeyDown(event) {
    if (event.key.toLowerCase() === 'r' && !event.ctrlKey && !event.metaKey) {
      this.rotation = (this.rotation + 90) % 360;
      this.updateGhost();
    }
    if (event.key === 'Escape') this.editor.setTool('select');
  }
}
