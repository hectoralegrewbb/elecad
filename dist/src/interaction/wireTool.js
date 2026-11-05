import { snapToGrid } from '../core/geometry.js';
import { orthogonalize } from '../core/pathUtils.js';
import { inferWireStyle } from '../core/wireStyle.js';
import { hitTestTerminal } from './hitTesting.js';

const terminalMagnetPixels = 12;

// Cableado: click en un borne inicia, clicks en vacío agregan waypoints manuales, click en otro borne conecta.
// Sin waypoints el cable queda en auto-ruteo (A*); con waypoints se respeta el trazado del usuario.
export class WireTool {
  constructor(editor) {
    this.editor = editor;
    this.cursor = 'crosshair';
    this.start = null;
    this.waypoints = [];
  }

  activate() {
    this.cancel();
  }

  deactivate() {
    this.cancel();
  }

  cancel() {
    this.start = null;
    this.waypoints = [];
    this.editor.overlay.wirePreview = null;
    this.editor.overlay.hoverTerminal = null;
    this.editor.requestRender();
  }

  findTerminal(pointer) {
    const { editor } = this;
    return hitTestTerminal(pointer.world, editor.store.state, editor.catalog, editor.pixelsToWorld(terminalMagnetPixels));
  }

  snapPoint(world) {
    const gridSize = this.editor.store.state.meta.gridSize;
    return { x: snapToGrid(world.x, gridSize), y: snapToGrid(world.y, gridSize) };
  }

  onPointerMove(pointer) {
    const { editor } = this;
    const terminal = this.findTerminal(pointer);
    editor.overlay.hoverTerminal = terminal;
    if (this.start) {
      const target = terminal ?? this.snapPoint(pointer.world);
      editor.overlay.wirePreview = {
        points: orthogonalize([
          { x: this.start.x, y: this.start.y },
          ...this.waypoints,
          { x: target.x, y: target.y },
        ]),
      };
    }
    editor.requestRender();
  }

  onPointerDown(pointer) {
    if (pointer.button !== 0) return;
    const terminal = this.findTerminal(pointer);
    if (!this.start) {
      if (terminal) this.start = terminal;
      return;
    }
    if (terminal) {
      const sameTerminal = terminal.componentId === this.start.componentId && terminal.terminalId === this.start.terminalId;
      if (!sameTerminal) this.finish(terminal);
      return;
    }
    this.waypoints.push(this.snapPoint(pointer.world));
  }

  finish(terminal) {
    const { editor } = this;
    const from = { componentId: this.start.componentId, terminalId: this.start.terminalId };
    const to = { componentId: terminal.componentId, terminalId: terminal.terminalId };
    const wire = editor.commands.makeWire({
      from,
      to,
      waypoints: this.waypoints,
      ...inferWireStyle(editor.store.state, editor.catalog, from, to),
    });
    editor.store.apply((state) => editor.commands.addWire(state, wire));
    editor.selection.set([wire.id]);
    this.cancel();
  }

  onPointerUp() {}

  onKeyDown(event) {
    if (event.key === 'Escape') this.cancel();
    if (event.key === 'Backspace' && this.waypoints.length > 0) {
      this.waypoints.pop();
      this.editor.requestRender();
    }
  }
}
