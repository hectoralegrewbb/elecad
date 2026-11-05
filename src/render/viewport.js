const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// Transformación mundo (mm) ↔ pantalla (px CSS).
export class Viewport {
  constructor() {
    this.scale = 0.8;
    this.x = 0;
    this.y = 0;
    this.minScale = 0.05;
    this.maxScale = 12;
  }

  worldToScreen(worldX, worldY) {
    return { x: worldX * this.scale + this.x, y: worldY * this.scale + this.y };
  }

  screenToWorld(screenX, screenY) {
    return { x: (screenX - this.x) / this.scale, y: (screenY - this.y) / this.scale };
  }

  zoomAt(screenX, screenY, factor) {
    const anchor = this.screenToWorld(screenX, screenY);
    this.scale = clamp(this.scale * factor, this.minScale, this.maxScale);
    this.x = screenX - anchor.x * this.scale;
    this.y = screenY - anchor.y * this.scale;
  }

  panBy(dx, dy) {
    this.x += dx;
    this.y += dy;
  }

  fitRect(rect, screenWidth, screenHeight, padding = 60) {
    if (!rect) return;
    const width = Math.max(rect.right - rect.left, 1);
    const height = Math.max(rect.bottom - rect.top, 1);
    this.scale = clamp(
      Math.min((screenWidth - padding * 2) / width, (screenHeight - padding * 2) / height),
      this.minScale,
      this.maxScale,
    );
    this.x = (screenWidth - width * this.scale) / 2 - rect.left * this.scale;
    this.y = (screenHeight - height * this.scale) / 2 - rect.top * this.scale;
  }
}
