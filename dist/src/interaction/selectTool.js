import { computeMoveSnap } from '../core/snapping.js';
import { computeWireLabels, hitTestWireLabel } from '../core/wireLabel.js';
import { moveWireSegment, segmentOrientation } from '../core/wireEdit.js';
import { getComponentBounds } from '../core/componentGeometry.js';
import { rectFromPoints, rectsIntersect, snapToGrid, unionRects } from '../core/geometry.js';
import { isComponentId } from '../core/documentState.js';
import { hitTestComponent, hitTestDimension, hitTestWireSegment } from './hitTesting.js';

const dragThresholdPixels = 3;

export class SelectTool {
  constructor(editor) {
    this.editor = editor;
    this.cursor = 'default';
    this.reset();
  }

  reset() {
    this.mode = 'idle';
    this.origin = null;
    this.originScreen = null;
    this.dragIds = [];
    this.movingRect = null;
    this.otherRects = [];
    this.moved = false;
    this.wireEdit = null;
    this.cursor = 'default';
  }

  activate() {
    this.reset();
  }

  deactivate() {
    this.editor.store.commitTransient();
    this.reset();
  }

  wireLabels(state) {
    const { editor } = this;
    return computeWireLabels({ state, catalog: editor.catalog, routeService: editor.routeService, placer: editor.labelPlacer });
  }

  onPointerDown(pointer) {
    if (pointer.button !== 0) return;
    const { editor } = this;
    const state = editor.store.state;
    const wireRadius = editor.pixelsToWorld(6);

    this.origin = pointer.world;
    this.originScreen = pointer.screen;

    // 1) Rótulo de cable: se arrastra para acomodarlo.
    const labelWireId = hitTestWireLabel(pointer.world, this.wireLabels(state), editor.pixelsToWorld(2));
    if (labelWireId !== null) {
      editor.selection.set([labelWireId]);
      const offset = state.wires[labelWireId].labelOffset ?? { dx: 0, dy: 0 };
      this.wireEdit = { kind: 'label', wireId: labelWireId, offset };
      this.mode = 'wireEdit';
      this.moved = false;
      return;
    }

    const segmentHit = hitTestWireSegment(pointer.world, state, editor.routeService, wireRadius);
    const hitId =
      segmentHit?.wireId ??
      hitTestDimension(pointer.world, state, editor.catalog, wireRadius) ??
      hitTestComponent(pointer.world, state, editor.catalog);

    if (hitId === null) {
      this.mode = 'marquee';
      if (!pointer.shiftKey) editor.selection.clear();
      return;
    }

    if (pointer.shiftKey) editor.selection.toggle(hitId);
    else if (!editor.selection.has(hitId)) editor.selection.set([hitId]);

    // 2) Tramo de cable (con ese cable como única selección): se arrastra a otra línea de la grilla.
    if (segmentHit && !pointer.shiftKey && editor.selection.size === 1) {
      const points = editor.routeService.getPath(state.wires[segmentHit.wireId], state);
      const orientation = segmentOrientation(points[segmentHit.index], points[segmentHit.index + 1]);
      if (orientation) {
        const start = orientation === 'horizontal' ? points[segmentHit.index].y : points[segmentHit.index].x;
        this.wireEdit = { kind: 'segment', wireId: segmentHit.wireId, index: segmentHit.index, points, orientation, start };
        this.mode = 'wireEdit';
        this.moved = false;
      }
      return;
    }

    if (isComponentId(hitId) && editor.selection.has(hitId)) this.beginDrag(state);
  }

  beginDrag(state) {
    const { editor } = this;
    this.dragIds = editor.selection.toArray().filter(id => isComponentId(id) && !state.components[id]?.locked);
    const dragSet = new Set(this.dragIds);
    const boundsOf = (component) => getComponentBounds(component, editor.catalog.resolve(component));
    this.movingRect = unionRects(this.dragIds.map((id) => boundsOf(state.components[id])));
    this.otherRects = Object.values(state.components)
      .filter((component) => !dragSet.has(component.id))
      .map(boundsOf);
    this.mode = 'drag';
    this.moved = false;
  }

  onPointerMove(pointer) {
    const { editor } = this;
    if (this.mode === 'drag') this.updateDrag(pointer);
    else if (this.mode === 'wireEdit') this.updateWireEdit(pointer);
    else if (this.mode === 'idle') this.updateHoverCursor(pointer);
    else if (this.mode === 'marquee') {
      editor.overlay.marquee = rectFromPoints(this.origin, pointer.world);
      editor.requestRender();
    }
  }

  // Cursor contextual: tramo de un cable seleccionado (flechas), rótulo (mover).
  updateHoverCursor(pointer) {
    const { editor } = this;
    const state = editor.store.state;
    this.cursor = 'default';
    if (hitTestWireLabel(pointer.world, this.wireLabels(state), editor.pixelsToWorld(2)) !== null) {
      this.cursor = 'move';
      return;
    }
    const hit = hitTestWireSegment(pointer.world, state, editor.routeService, editor.pixelsToWorld(6));
    if (hit && editor.selection.has(hit.wireId)) {
      const points = editor.routeService.getPath(state.wires[hit.wireId], state);
      const orientation = segmentOrientation(points[hit.index], points[hit.index + 1]);
      if (orientation) this.cursor = orientation === 'horizontal' ? 'ns-resize' : 'ew-resize';
    }
  }

  updateWireEdit(pointer) {
    const { editor } = this;
    const edit = this.wireEdit;
    if (!edit) return;
    if (!this.moved) {
      const travelled = Math.hypot(pointer.screen.x - this.originScreen.x, pointer.screen.y - this.originScreen.y);
      if (travelled < dragThresholdPixels) return;
      this.moved = true;
    }
    const dx = pointer.world.x - this.origin.x;
    const dy = pointer.world.y - this.origin.y;
    if (edit.kind === 'label') {
      const labelOffset = { dx: Math.round(edit.offset.dx + dx), dy: Math.round(edit.offset.dy + dy) };
      editor.store.applyTransient((base) => editor.commands.updateWire(base, edit.wireId, { labelOffset }));
    } else {
      const gridSize = editor.store.state.meta.gridSize;
      const delta = edit.orientation === 'horizontal' ? dy : dx;
      const value = pointer.altKey ? edit.start + delta : snapToGrid(edit.start + delta, gridSize);
      const waypoints = moveWireSegment(edit.points, edit.index, value);
      if (!waypoints) return;
      editor.store.applyTransient((base) => editor.commands.updateWire(base, edit.wireId, { waypoints }));
    }
    editor.requestRender();
  }

  updateDrag(pointer) {
    const { editor } = this;
    if (!this.moved) {
      const travelled = Math.hypot(pointer.screen.x - this.originScreen.x, pointer.screen.y - this.originScreen.y);
      if (travelled < dragThresholdPixels) return;
      this.moved = true;
    }
    const snap = computeMoveSnap({
      movingRect: this.movingRect,
      dx: pointer.world.x - this.origin.x,
      dy: pointer.world.y - this.origin.y,
      otherRects: this.otherRects,
      threshold: editor.pixelsToWorld(6),
      gridSize: editor.store.state.meta.gridSize,
      enabled: !pointer.altKey,
    });
    editor.overlay.guides = snap.guides;
    editor.store.applyTransient((base) => editor.commands.moveComponents(base, this.dragIds, snap.dx, snap.dy));
    editor.requestRender();
  }

  onPointerUp(pointer) {
    const { editor } = this;
    if (this.mode === 'drag') {
      editor.store.commitTransient();
      editor.overlay.guides = [];
    } else if (this.mode === 'wireEdit') {
      editor.store.commitTransient();
    } else if (this.mode === 'marquee') {
      this.finishMarquee(pointer);
    }
    this.reset();
    editor.requestRender();
  }

  finishMarquee(pointer) {
    const { editor } = this;
    const rect = rectFromPoints(this.origin, pointer.world);
    editor.overlay.marquee = null;
    if (rect.right - rect.left < editor.pixelsToWorld(2) && rect.bottom - rect.top < editor.pixelsToWorld(2)) return;
    const state = editor.store.state;
    const inside = Object.values(state.components)
      .filter((component) => !component.locked && rectsIntersect(rect, getComponentBounds(component, editor.catalog.resolve(component))))
      .map((component) => component.id);
    const base = pointer.shiftKey ? editor.selection.toArray() : [];
    editor.selection.set([...new Set([...base, ...inside])]);
  }

  onKeyDown() {}
}
