import { distanceToSegment, pointInRect, distance } from '../core/geometry.js';
import { getComponentBounds, getTerminalPose } from '../core/componentGeometry.js';
import { orderedComponents } from '../core/componentOrder.js';
import { resolveDimension } from '../core/dimensionGeometry.js';

// Terminal más cercano dentro del radio (mm). Es la "atracción magnética" del cableado.
export function hitTestTerminal(world, state, catalog, radius) {
  let best = null;
  Object.values(state.components).forEach((component) => {
    const definition = catalog.resolve(component);
    definition.terminals.forEach((terminal) => {
      const pose = getTerminalPose(component, definition, terminal.id);
      const gap = distance(world, pose);
      if (gap <= radius && (best === null || gap < best.gap)) {
        best = { componentId: component.id, terminalId: terminal.id, x: pose.x, y: pose.y, side: pose.side, gap };
      }
    });
  });
  return best;
}

// El componente más arriba (último dibujado) bajo el punto.
export function hitTestComponent(world, state, catalog) {
  const components = orderedComponents(state, catalog);
  for (let index = components.length - 1; index >= 0; index -= 1) {
    const component = components[index];
    if (!component.locked && pointInRect(world, getComponentBounds(component, catalog.resolve(component)))) return component.id;
  }
  return null;
}

export function hitTestWire(world, state, routeService, radius) {
  const wires = Object.values(state.wires);
  for (let index = wires.length - 1; index >= 0; index -= 1) {
    const points = routeService.getPath(wires[index], state);
    for (let i = 0; i < points.length - 1; i += 1) {
      if (distanceToSegment(world, points[i], points[i + 1]) <= radius) return wires[index].id;
    }
  }
  return null;
}

export function hitTestDimension(world, state, catalog, radius) {
  const dimensions = Object.values(state.dimensions);
  for (let index = dimensions.length - 1; index >= 0; index -= 1) {
    const resolved = resolveDimension(dimensions[index], state, catalog);
    if (!resolved) continue;
    const main = resolved.segments[0];
    if (distanceToSegment(world, { x: main.x1, y: main.y1 }, { x: main.x2, y: main.y2 }) <= radius) {
      return dimensions[index].id;
    }
  }
  return null;
}

// Tramo de cable bajo el punto: { wireId, index } (índice del segmento dentro del trazado) o null.
export function hitTestWireSegment(world, state, routeService, radius) {
  const wires = Object.values(state.wires);
  for (let index = wires.length - 1; index >= 0; index -= 1) {
    const points = routeService.getPath(wires[index], state);
    for (let i = 0; i < points.length - 1; i += 1) {
      if (distanceToSegment(world, points[i], points[i + 1]) <= radius) return { wireId: wires[index].id, index: i };
    }
  }
  return null;
}
