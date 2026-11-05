import { getComponentBounds } from './componentGeometry.js';
export const textAngle = value => value === 'vertical' ? -90 : 0;
export function componentLabelLayout(component, definition) {
  const b = getComponentBounds(component, definition);
  const vertical = component.labelOrientation === 'vertical';
  const text = String(component.label || '');
  const size = 9;
  const length = Math.max(size, text.length * size * 0.65);
  const x = vertical ? (b.left + b.right) / 2 : b.left;
  const y = b.top - 4;
  return { x, y, size, angle: textAngle(component.labelOrientation),
    bounds: { left: vertical ? x - size : x, right: vertical ? x + 2 : x + length,
      top: vertical ? y - length : y - size, bottom: y + 2 } };
}
