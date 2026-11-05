import { drawScene } from './sceneDrawer.js';
import { darkTheme } from './theme.js';

// Implementación de IRenderer sobre <canvas> 2D: render(scene) + resize().
// Puede reemplazarse (PixiJS, WebGL) sin tocar modelo ni herramientas.
export class CanvasRenderer {
  constructor(canvas, { viewport, services, theme = darkTheme }) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.viewport = viewport;
    this.services = services;
    this.theme = theme;
    this.width = 0;
    this.height = 0;
    this.pixelRatio = 1;
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.pixelRatio = window.devicePixelRatio || 1;
    this.width = Math.max(1, Math.floor(rect.width));
    this.height = Math.max(1, Math.floor(rect.height));
    this.canvas.width = Math.floor(this.width * this.pixelRatio);
    this.canvas.height = Math.floor(this.height * this.pixelRatio);
  }

  render(scene) {
    drawScene(this.context, {
      width: this.width,
      height: this.height,
      viewport: this.viewport,
      pixelRatio: this.pixelRatio,
      scene,
      theme: this.theme,
      services: this.services,
      interactive: true,
    });
  }
}
