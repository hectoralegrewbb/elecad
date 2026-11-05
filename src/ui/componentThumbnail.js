import { drawComponent } from '../render/drawComponents.js';
import { darkTheme } from '../render/theme.js';

// Miniatura de un componente del catálogo (símbolo dibujado con el mismo renderer del lienzo).
export function createThumbnail(definition, size = 44) {
  const pixels = size * 2;
  const canvas = document.createElement('canvas');
  canvas.width = pixels;
  canvas.height = pixels;
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d');
  const scale = Math.min((pixels * 0.72) / definition.width, (pixels * 0.72) / definition.height);
  ctx.translate(pixels / 2, pixels / 2);
  ctx.scale(scale, scale);
  drawComponent(ctx, { x: 0, y: 0, rotation: 0, label: '' }, definition, { theme: darkTheme, scale, symbols: true });
  return canvas;
}
