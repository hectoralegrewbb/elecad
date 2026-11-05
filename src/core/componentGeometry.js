import { normalizeRotation, rotateSide, rotateVector } from './geometry.js';

// La posición (x, y) de un componente es su CENTRO; la rotación se aplica sobre él.
export function getRotatedSize(definition, rotation) {
  const swapped = normalizeRotation(rotation) % 180 !== 0;
  return swapped
    ? { width: definition.height, height: definition.width }
    : { width: definition.width, height: definition.height };
}

export function getComponentBounds(component, definition) {
  const { width, height } = getRotatedSize(definition, component.rotation);
  return {
    left: component.x - width / 2,
    top: component.y - height / 2,
    right: component.x + width / 2,
    bottom: component.y + height / 2,
  };
}

export function localToWorld(component, definition, localX, localY) {
  const rotated = rotateVector(localX - definition.width / 2, localY - definition.height / 2, component.rotation);
  return { x: component.x + rotated.x, y: component.y + rotated.y };
}

export function getTerminalPose(component, definition, terminalId) {
  const terminal = definition.terminalMap.get(terminalId);
  if (!terminal) return null;
  const position = localToWorld(component, definition, terminal.x, terminal.y);
  return { x: position.x, y: position.y, side: rotateSide(terminal.side, component.rotation) };
}

export function getAnchorValue(component, definition, anchor) {
  const bounds = getComponentBounds(component, definition);
  switch (anchor) {
    case 'left':
      return bounds.left;
    case 'right':
      return bounds.right;
    case 'top':
      return bounds.top;
    case 'bottom':
      return bounds.bottom;
    case 'centerX':
      return component.x;
    default:
      return component.y;
  }
}
