import { EventEmitter } from '../core/eventEmitter.js';

export const createEmptyOverlay = () => ({
  guides: [],
  marquee: null,
  ghost: null,
  wirePreview: null,
  hoverTerminal: null,
});

// Contexto compartido por herramientas, UI y servicios. No contiene lógica de dominio:
// solo coordina store, selección, viewport, herramienta activa y el ciclo de render.
export class Editor extends EventEmitter {
  constructor({ store, commands, catalog, selection, viewport, routeService, labelPlacer }) {
    super();
    this.store = store;
    this.commands = commands;
    this.catalog = catalog;
    this.selection = selection;
    this.viewport = viewport;
    this.routeService = routeService;
    this.labelPlacer = labelPlacer;
    this.overlay = createEmptyOverlay();
    this.cursorWorld = null; // último punto del cursor sobre el canvas (mm), para pegar ahí
    this.tools = {};
    this.currentToolName = null;
    this.renderCallback = null;
    this.renderScheduled = false;
  }

  registerTool(name, tool) {
    this.tools[name] = tool;
  }

  get currentTool() {
    return this.tools[this.currentToolName] ?? null;
  }

  setTool(name, options) {
    this.currentTool?.deactivate();
    this.overlay = Object.assign(this.overlay, createEmptyOverlay());
    this.currentToolName = name;
    this.currentTool.activate(options);
    this.emit({ type: 'toolchange', tool: name });
    this.requestRender();
  }

  pixelsToWorld(pixels) {
    return pixels / this.viewport.scale;
  }

  setRenderCallback(callback) {
    this.renderCallback = callback;
  }

  requestRender() {
    if (this.renderScheduled) return;
    this.renderScheduled = true;
    requestAnimationFrame(() => {
      this.renderScheduled = false;
      this.renderCallback?.();
    });
  }
}
