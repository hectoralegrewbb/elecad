import { getSceneBounds } from '../core/sceneBounds.js';
import { drawScene } from '../render/sceneDrawer.js';
import { printTheme } from '../render/theme.js';
import { Viewport } from '../render/viewport.js';
import { createEmptyOverlay } from '../app/editor.js';

const maxCanvasSide = 8000;

// Renderiza el documento completo (tema de impresión, fondo blanco) fuera de pantalla y devuelve un Blob PNG.
export function exportPng({ state, services, pixelsPerMm = 3, padding = 20 }) {
  const bounds = getSceneBounds(state, services.catalog, services.routeService);
  if (!bounds) return Promise.reject(new Error('El documento está vacío.'));

  const widthMm = bounds.right - bounds.left + padding * 2;
  const heightMm = bounds.bottom - bounds.top + padding * 2;
  const scale = Math.min(pixelsPerMm, maxCanvasSide / widthMm, maxCanvasSide / heightMm);

  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(widthMm * scale);
  canvas.height = Math.ceil(heightMm * scale);

  const viewport = new Viewport();
  viewport.scale = scale;
  viewport.x = (padding - bounds.left) * scale;
  viewport.y = (padding - bounds.top) * scale;

  drawScene(canvas.getContext('2d'), {
    width: canvas.width,
    height: canvas.height,
    viewport,
    pixelRatio: 1,
    scene: { state, selection: new Set(), overlay: createEmptyOverlay() },
    theme: printTheme,
    services,
    interactive: false,
  });
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}
