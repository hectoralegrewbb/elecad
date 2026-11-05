const zoomSensitivity = 0.0015;

// Traduce eventos del canvas a "pointers" en mm y los delega a la herramienta activa.
// Maneja pan (botón central o Espacio + arrastrar) y zoom con rueda, comunes a todas las herramientas.
export class InteractionController {
  constructor(canvas, editor) {
    this.canvas = canvas;
    this.editor = editor;
    this.panning = false;
    this.spaceDown = false;
    this.lastScreen = null;
    this.cursorListeners = new Set();
  }

  attach() {
    const { canvas } = this;
    canvas.addEventListener('pointerdown', (event) => this.onPointerDown(event));
    canvas.addEventListener('pointermove', (event) => this.onPointerMove(event));
    canvas.addEventListener('pointerup', (event) => this.onPointerUp(event));
    canvas.addEventListener('pointercancel', (event) => this.onPointerUp(event));
    canvas.addEventListener('wheel', (event) => this.onWheel(event), { passive: false });
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
    window.addEventListener('keydown', (event) => this.onKeyDown(event));
    window.addEventListener('keyup', (event) => this.onKeyUp(event));
    this.editor.subscribe(() => this.updateCursor());
    this.updateCursor();
  }

  // Posición del cursor en mm (para la barra de estado).
  onCursorMove(listener) {
    this.cursorListeners.add(listener);
  }

  createPointer(event) {
    const rect = this.canvas.getBoundingClientRect();
    const screen = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    return {
      screen,
      world: this.editor.viewport.screenToWorld(screen.x, screen.y),
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      ctrlKey: event.ctrlKey || event.metaKey,
      button: event.button,
    };
  }

  onPointerDown(event) {
    this.canvas.setPointerCapture(event.pointerId);
    this.canvas.focus();
    const pointer = this.createPointer(event);
    if (event.button === 1 || (event.button === 0 && this.spaceDown)) {
      this.panning = true;
      this.lastScreen = pointer.screen;
      this.canvas.style.cursor = 'grabbing';
      event.preventDefault();
      return;
    }
    this.editor.currentTool?.onPointerDown(pointer);
    this.editor.requestRender();
  }

  onPointerMove(event) {
    const pointer = this.createPointer(event);
    this.cursorListeners.forEach((listener) => listener(pointer.world));
    if (this.panning) {
      this.editor.viewport.panBy(pointer.screen.x - this.lastScreen.x, pointer.screen.y - this.lastScreen.y);
      this.lastScreen = pointer.screen;
      this.editor.requestRender();
      return;
    }
    this.editor.currentTool?.onPointerMove(pointer);
    if (!this.spaceDown) this.updateCursor();
  }

  onPointerUp(event) {
    if (this.canvas.hasPointerCapture(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId);
    if (this.panning) {
      this.panning = false;
      this.updateCursor();
      return;
    }
    this.editor.currentTool?.onPointerUp(this.createPointer(event));
  }

  onWheel(event) {
    event.preventDefault();
    const pointer = this.createPointer(event);
    this.editor.viewport.zoomAt(pointer.screen.x, pointer.screen.y, Math.exp(-event.deltaY * zoomSensitivity));
    this.editor.requestRender();
  }

  isTypingTarget(event) {
    const tag = event.target?.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || event.target?.isContentEditable;
  }

  onKeyDown(event) {
    if (event.code !== 'Space' || this.isTypingTarget(event)) return;
    event.preventDefault();
    if (!this.spaceDown) {
      this.spaceDown = true;
      this.canvas.style.cursor = 'grab';
    }
  }

  onKeyUp(event) {
    if (event.code !== 'Space') return;
    this.spaceDown = false;
    this.updateCursor();
  }

  updateCursor() {
    this.canvas.style.cursor = this.editor.currentTool?.cursor ?? 'default';
  }
}
