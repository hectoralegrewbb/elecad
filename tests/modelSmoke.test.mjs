import assert from 'node:assert/strict';
import { createEmptyState } from '../src/core/documentState.js';
import { createDefaultCatalog } from '../src/data/defaultCatalog.js';
import { buildDemoState } from '../src/data/demoDocument.js';
import { createCommands } from '../src/core/commands.js';
import { DocumentStore } from '../src/core/documentStore.js';
import { WireRouter } from '../src/core/wireRouter.js';
import { RouteService } from '../src/core/routeService.js';
import { HopCalculator, toPathOps } from '../src/core/wireGeometry.js';
import { buildNetlist } from '../src/core/netlist.js';
import { getComponentBounds } from '../src/core/componentGeometry.js';
import { resolveDimension } from '../src/core/dimensionGeometry.js';
import { buildDimension } from '../src/core/dimensionFactory.js';
import { computeMoveSnap } from '../src/core/snapping.js';
import { serializeDocument, parseDocument } from '../src/io/elcadFormat.js';
import { orderedComponents } from '../src/core/componentOrder.js';
import { hitTestComponent } from '../src/interaction/hitTesting.js';
import { renumberWiresByNet } from '../src/core/numbering.js';
import { inferWireStyle } from '../src/core/wireStyle.js';
import { moveWireSegment } from '../src/core/wireEdit.js';
import { orthogonalize } from '../src/core/pathUtils.js';
import { computeWireLabels, hitTestWireLabel, WireLabelPlacer } from '../src/core/wireLabel.js';
import { alignComponents, distributeComponents } from '../src/core/align.js';
import { getContentBounds, getSceneBounds, getTitleBlockLayout } from '../src/core/sceneBounds.js';
import { conductorDiameter } from '../src/core/wireStandards.js';
import { exportSvg } from '../src/io/svgExporter.js';
import { repairDocument } from '../src/core/documentRepair.js';
import { clipboardAnchor, extractClipboard, parseClipboard, serializeClipboard } from '../src/core/clipboard.js';
import { bomColumns, buildBom, buildWireList, toCsv } from '../src/core/reports.js';

const catalog = createDefaultCatalog();
const commands = createCommands(catalog);
const routeService = new RouteService(catalog, new WireRouter());
const state = buildDemoState(commands);
const wires = Object.values(state.wires);
const components = Object.values(state.components);

// 1) Catálogo: búsqueda estilo paleta
const found = catalog.search('Contactor Siemens 24V');
assert.equal(found[0].id, 'siemens.3rt2016.24vdc', 'la búsqueda debe priorizar el contactor Siemens');

// 2) Router: ortogonal y sin atravesar obstáculos
const blockers = components
  .filter((component) => catalog.get(component.defId).blocksRouting)
  .map((component) => getComponentBounds(component, catalog.get(component.defId)));
const started = performance.now();
const paths = wires.map((wire) => routeService.getPath(wire, state));
const routingMs = performance.now() - started;
paths.forEach((points, index) => {
  assert.ok(points.length >= 2, `cable ${index} sin camino`);
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    assert.ok(a.x === b.x || a.y === b.y, `cable ${index}: tramo no ortogonal ${JSON.stringify([a, b])}`);
    const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y));
    for (let s = 0; s <= steps; s += 1) {
      const t = steps === 0 ? 0 : s / steps;
      const p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      blockers.forEach((rect) => {
        const inside = p.x > rect.left + 0.5 && p.x < rect.right - 0.5 && p.y > rect.top + 0.5 && p.y < rect.bottom - 0.5;
        assert.ok(!inside, `cable ${index} atraviesa un componente en ${JSON.stringify(p)}`);
      });
    }
  }
});
assert.equal(routeService.getPath(wires[0], state), paths[0], 'la caché debe devolver la misma referencia');

// 3) Puentes: el cable de bobina cruza los 3 cables contactor→variador
const hopCalculator = new HopCalculator({ radius: 3 });
const hops = hopCalculator.compute(wires.map((wire, index) => ({ id: wire.id, points: paths[index] })));
const coilWire = wires[wires.length - 1];
const hopCount = [...(hops.get(coilWire.id)?.values() ?? [])].reduce((sum, list) => sum + list.length, 0);
assert.equal(hopCount, 3, `se esperaban 3 puentes en el cable de bobina, hay ${hopCount}`);
assert.ok(toPathOps(paths[paths.length - 1], hops.get(coilWire.id), 3).some((op) => op.op === 'H'));

// 4) Grafo eléctrico + huérfanos al borrar un componente
const netlist = buildNetlist(state);
assert.equal(netlist.nets.length, 7, 'Q1→KM1 (3) + KM1→VF1 (3) + 24V (1) = 7 nodos');
const contactor = components.find((component) => component.defId.includes('3rt2016'));
const afterDelete = commands.removeEntities(state, [contactor.id]);
assert.equal(Object.keys(afterDelete.components).length, components.length - 1);
assert.equal(Object.keys(afterDelete.wires).length, wires.length, 'los cables no se borran');
assert.equal(buildNetlist(afterDelete).orphanWireIds.length, 7, 'los 7 cables que tocaban al contactor quedan huérfanos');
afterDelete && Object.values(afterDelete.wires).forEach((wire) => routeService.getPath(wire, afterDelete));

// 5) Store: undo/redo y transacción de arrastre = 1 sola entrada
const store = new DocumentStore(state);
const before = store.state;
[1, 2, 3, 4].forEach((step) => store.applyTransient((base) => commands.moveComponents(base, [contactor.id], step * 10, 0)));
store.commitTransient();
assert.equal(store.state.components[contactor.id].x, contactor.x + 40);
assert.ok(store.undo());
assert.equal(store.state, before, 'un drag completo se deshace de una vez');
assert.ok(store.redo());
assert.equal(store.state.components[contactor.id].x, contactor.x + 40);

// 6) Cotas ligadas: al mover el gabinete la cota se mueve con él
const enclosure = components.find((component) => component.defId.startsWith('layout.enclosure'));
const dimension = buildDimension(state, catalog, [enclosure.id], 'width');
const withDimension = commands.addDimension(state, dimension);
assert.equal(resolveDimension(dimension, withDimension, catalog).value, 600);
const moved = commands.moveComponents(withDimension, [enclosure.id], 100, 50);
assert.equal(resolveDimension(dimension, moved, catalog).segments[0].x1, 100);

// 7) Snapping: alineación con otro componente y fallback a grilla
const snap = computeMoveSnap({
  movingRect: { left: 0, top: 0, right: 50, bottom: 80 },
  dx: 98.7,
  dy: 3.2,
  otherRects: [{ left: 100, top: 200, right: 160, bottom: 290 }],
  threshold: 4,
  gridSize: 5,
});
assert.equal(snap.dx, 100);
assert.equal(snap.dy, 5);
assert.equal(snap.guides.length, 1);

// 8) Formato .elcad: ida y vuelta gzip
const blob = await serializeDocument(state);
const restored = await parseDocument(blob);
assert.deepEqual(restored.components, state.components);
assert.deepEqual(restored.wires, state.wires);

// 9) Z-order: un gabinete colocado DESPUÉS de los equipos no debe taparlos
let zState = buildDemoState(commands);
const zContactor = Object.values(zState.components).find((component) => component.defId.includes('3rt2016'));
const lateEnclosure = commands.makeComponent(zState, 'layout.enclosure.600x800', 300, 400);
zState = commands.addComponent(zState, lateEnclosure);
assert.equal(orderedComponents(zState, catalog)[0].id, Object.values(zState.components).find((c) => c.defId.startsWith('layout.enclosure')).id);
assert.equal(hitTestComponent({ x: zContactor.x, y: zContactor.y }, zState, catalog), zContactor.id, 'el hit-test debe devolver el equipo, no el gabinete');

// 10) Numeración por nodo: cables que comparten borne comparten número
const sharedWire = commands.makeWire({ from: wires[0].from, to: { componentId: contactor.id, terminalId: 'a2' } });
const numbered = renumberWiresByNet(commands.addWire(state, sharedWire), catalog);
assert.equal(numbered.wires[wires[0].id].label, numbered.wires[sharedWire.id].label, 'mismo nodo → mismo número');
assert.equal(new Set(Object.values(numbered.wires).map((wire) => wire.label)).size, 7, '7 nodos → 7 números distintos');

// 11) Reportes: BOM, lista de cables y CSV
const duplicated = commands.duplicateComponents(state, [contactor.id], 100, 0).state;
const bom = buildBom(duplicated, catalog);
assert.equal(bom.length, 5);
assert.deepEqual(bom.find((row) => row.codigo === 'siemens.3rt2016.24vdc').referencias, 'KM1, KM2');
const wireList = buildWireList(state, catalog, routeService);
assert.equal(wireList.length, 7);
const coilRow = wireList.find((row) => row.fase === '24V');
assert.equal(coilRow.origen, 'PS1:plus');
assert.equal(coilRow.destino, 'KM1:a1');
assert.ok(Number(coilRow.largo.replace(',', '.')) > 200, 'el largo sigue el trazado real, no la distancia recta');
const csv = toCsv(bom, bomColumns);
assert.ok(csv.startsWith('﻿Cantidad;Marca;'));
assert.ok(csv.includes('"KM1, KM2"') === false, 'la coma no obliga a comillas; el separador es ;');

// 12) Catálogo: ids únicos, bornes únicos por componente y sobre la grilla de 5 mm
{
  const seen = new Set();
  catalog.list().forEach((definition) => {
    assert.ok(!seen.has(definition.id), `id duplicado ${definition.id}`);
    seen.add(definition.id);
    const terminalIds = new Set();
    definition.terminals.forEach((terminal) => {
      assert.ok(!terminalIds.has(terminal.id), `${definition.id}: borne duplicado ${terminal.id}`);
      terminalIds.add(terminal.id);
      assert.ok(terminal.x % 5 === 0 && terminal.y % 5 === 0, `${definition.id}: borne ${terminal.id} fuera de la grilla`);
    });
  });
  assert.ok(catalog.list().length >= 80, 'catálogo ampliado');
}

// 13) Paramétricos: E/S configurable del PLC, barras y regletas
{
  const small = catalog.resolve({ defId: 'generic.plc.configurable', props: { di: 4, dq: 2, ai: 0, rtd: 0, ethernet: 0 } });
  const big = catalog.resolve({ defId: 'generic.plc.configurable', props: { di: 16, dq: 8, ai: 4, rtd: 2, rtdWires: '4', profibus: 1, rs485: 1 } });
  const ids = (definition) => definition.terminals.map((terminal) => terminal.id);
  assert.ok(ids(big).includes('i1.7') === false || ids(big).includes('i0.7'), 'DI con numeración por byte');
  assert.equal(ids(big).filter((id) => /^i\d+\.\d$/.test(id)).length, 16);
  assert.equal(ids(small).filter((id) => /^i\d+\.\d$/.test(id)).length, 4);
  assert.ok(ids(big).some((id) => id.startsWith('rtd0.')) && ids(big).some((id) => id.startsWith('pb0.')) && ids(big).some((id) => id.startsWith('rs485.')));
  assert.ok(big.width >= small.width && big.height >= small.height);
  const cpu1214 = catalog.get('siemens.s71200.cpu1214c');
  assert.equal(cpu1214.terminals.filter((t) => /^i\d+\.\d$/.test(t.id)).length, 14);
  assert.equal(cpu1214.terminals.filter((t) => /^q\d+\.\d$/.test(t.id)).length, 10);
  assert.equal(cpu1214.terminals.filter((t) => /^ai\d/.test(t.id)).length, 4, '2 AI = 4 bornes (+/−)');
  assert.ok(catalog.describe({ defId: 'generic.plc.configurable', props: { di: 16 } }).includes('DI 16'));
  const strip = catalog.resolve({ defId: 'generic.terminalstrip', props: { poles: 12 } });
  assert.equal(strip.terminals.length, 24);
  assert.equal(strip.width, 120);
}

// 14) Nodos equipotenciales: barra de neutro y regleta unen bornes sin cable entre ellos
{
  let eq = createEmptyState();
  const place = (defId, x, y, props = {}) => {
    const component = { ...commands.makeComponent(eq, defId, x, y), props };
    eq = commands.addComponent(eq, component);
    return component;
  };
  const bar = place('bus.neutral', 300, 100, { points: 4 });
  const loadA = place('field.pilot.light', 100, 300);
  const loadB = place('field.pilot.light', 500, 300);
  const toBar = (component, terminalId, barTerminal) =>
    eq = commands.addWire(eq, commands.makeWire({ from: { componentId: component.id, terminalId }, to: { componentId: bar.id, terminalId: barTerminal } }));
  toBar(loadA, 'x2', 't0');
  toBar(loadB, 'x2', 't3');
  assert.equal(buildNetlist(eq).nets.length, 2, 'sin catálogo son 2 nodos');
  assert.equal(buildNetlist(eq, catalog).nets.length, 1, 'con catálogo la barra une todo en 1 nodo');
  const strip = place('generic.terminalstrip', 300, 500, { poles: 3 });
  const stripWire = (terminalId, load) =>
    commands.makeWire({ from: { componentId: strip.id, terminalId }, to: { componentId: load.id, terminalId: 'x1' } });
  const withStrip = commands.addWire(commands.addWire(eq, stripWire('t1', loadA)), stripWire('b1', loadB));
  assert.equal(buildNetlist(withStrip).nets.length, 4, 'sin catálogo: 2 cables a la barra + 2 de regleta, todos separados');
  assert.equal(buildNetlist(withStrip, catalog).nets.length, 2, 'borne de paso: arriba y abajo del mismo polo son el mismo nodo');
}

// 15) Cambiar parámetros deja huérfanos los cables de bornes que desaparecen; reparación de documentos
{
  let cfg = createEmptyState();
  const plc = { ...commands.makeComponent(cfg, 'generic.plc.configurable', 300, 300), props: { di: 8 } };
  cfg = commands.addComponent(cfg, plc);
  const sensor = commands.makeComponent(cfg, 'field.sensor.inductive', 300, 100);
  cfg = commands.addComponent(cfg, sensor);
  const keep = commands.makeWire({ from: { componentId: plc.id, terminalId: 'i0.1' }, to: { componentId: sensor.id, terminalId: 'blk' } });
  const drop = commands.makeWire({ from: { componentId: plc.id, terminalId: 'i0.7' }, to: { componentId: sensor.id, terminalId: 'brn' } });
  cfg = commands.addWire(commands.addWire(cfg, keep), drop);
  const reduced = commands.updateComponentProps(cfg, plc.id, { di: 4 });
  assert.equal(reduced.wires[keep.id].from.componentId, plc.id, 'i0.1 sigue existiendo');
  assert.equal(reduced.wires[drop.id].from.componentId, undefined, 'i0.7 ya no existe: extremo libre');
  assert.deepEqual(buildNetlist(reduced).orphanWireIds, [drop.id]);

  const broken = {
    ...cfg,
    components: { ...cfg.components, cmp_x: { id: 'cmp_x', defId: 'ya.no.existe', x: 0, y: 0, rotation: 0, label: 'Z1', props: {} } },
    wires: { ...cfg.wires, [keep.id]: { ...keep, from: { componentId: plc.id, terminalId: 'inexistente' } } },
  };
  const repaired = repairDocument(broken, catalog);
  assert.equal(repaired.removedComponents, 1);
  assert.equal(repaired.detachedEndpoints, 1);
  assert.equal(repaired.state.components.cmp_x, undefined);
  assert.equal(repaired.state.wires[keep.id].from.componentId, undefined);
  assert.equal(repairDocument(cfg, catalog).state, cfg, 'un documento sano no se toca');
}

// 16) Ruteo sin solapes: ningún tramo de un cable corre sobre la misma línea que otro
{
  let dense = createEmptyState();
  const place = (defId, x, y) => {
    const component = commands.makeComponent(dense, defId, x, y);
    dense = commands.addComponent(dense, component);
    return component;
  };
  const plc = place('siemens.s71200.cpu1214c', 300, 300);
  const strip = place('generic.terminalstrip', 300, 600);
  const inputs = ['i0.0', 'i0.1', 'i0.2', 'i0.3', 'i0.4', 'i0.5'];
  inputs.forEach((terminalId, index) => {
    dense = commands.addWire(dense, commands.makeWire({
      from: { componentId: plc.id, terminalId },
      to: { componentId: strip.id, terminalId: `t${index}` },
    }));
  });
  const densePaths = Object.values(dense.wires).map((wire) => ({ id: wire.id, points: routeService.getPath(wire, dense) }));
  assert.ok(densePaths.every((item) => item.points.length >= 2), 'todos los cables tienen trazado');
  const overlaps = [];
  const segs = (points) => points.slice(1).map((p, i) => ({ a: points[i], b: p }));
  const collinearOverlap = (s, t) => {
    const horizontal = (u) => u.a.y === u.b.y;
    if (horizontal(s) && horizontal(t) && s.a.y === t.a.y) {
      return Math.min(Math.max(s.a.x, s.b.x), Math.max(t.a.x, t.b.x)) - Math.max(Math.min(s.a.x, s.b.x), Math.min(t.a.x, t.b.x)) > 0.01;
    }
    if (!horizontal(s) && !horizontal(t) && s.a.x === t.a.x) {
      return Math.min(Math.max(s.a.y, s.b.y), Math.max(t.a.y, t.b.y)) - Math.max(Math.min(s.a.y, s.b.y), Math.min(t.a.y, t.b.y)) > 0.01;
    }
    return false;
  };
  for (let i = 0; i < densePaths.length; i += 1) {
    for (let j = i + 1; j < densePaths.length; j += 1) {
      segs(densePaths[i].points).forEach((s) => segs(densePaths[j].points).forEach((t) => {
        if (collinearOverlap(s, t)) overlaps.push([i, j]);
      }));
    }
  }
  assert.deepEqual(overlaps, [], `cables solapados: ${JSON.stringify(overlaps)}`);
  // Los cruces perpendiculares generan puentes también cuando el cable vertical es el posterior
  const crossingHops = new HopCalculator({ radius: 3 }).compute([
    { id: 'a', points: [{ x: 0, y: 50 }, { x: 100, y: 50 }] },
    { id: 'b', points: [{ x: 50, y: 0 }, { x: 50, y: 100 }] },
  ]);
  assert.equal(crossingHops.get('a')?.get(0)?.length, 1, 'el horizontal salta sobre el vertical, sea cual sea el orden');
  assert.equal(crossingHops.get('b'), undefined);
}

// 17) Copiar / pegar: cables internos y cotas se remapean; los cables a componentes no copiados quedan afuera
{
  const drive = components.find((component) => component.defId === 'siemens.g120c.fsa');
  const clipState = commands.addDimension(state, buildDimension(state, catalog, [contactor.id, drive.id], 'gapY'));
  const payload = extractClipboard(clipState, [contactor.id, drive.id]);
  assert.equal(payload.components.length, 2);
  assert.equal(payload.wires.length, 3, 'solo los 3 cables contactor→variador son internos');
  assert.equal(payload.dimensions.length, 1);
  const pasted = commands.pasteEntities(clipState, parseClipboard(serializeClipboard(payload)), 200, 0);
  assert.equal(Object.keys(pasted.state.components).length, Object.keys(clipState.components).length + 2);
  assert.equal(Object.keys(pasted.state.wires).length, Object.keys(clipState.wires).length + 3);
  assert.equal(Object.keys(pasted.state.dimensions).length, 2);
  const newIds = new Set(pasted.ids);
  Object.values(pasted.state.wires).filter((wire) => newIds.has(wire.id)).forEach((wire) => {
    assert.ok(newIds.has(wire.from.componentId) && newIds.has(wire.to.componentId), 'los cables pegados conectan las copias, no los originales');
  });
  const labels = Object.values(pasted.state.components).map((component) => component.label);
  assert.equal(new Set(labels).size, labels.length, 'etiquetas únicas tras pegar');
  assert.equal(extractClipboard(clipState, []), null);
  assert.equal(parseClipboard('texto cualquiera'), null);
  const anchor = clipboardAnchor(payload);
  assert.ok(Number.isFinite(anchor.x) && Number.isFinite(anchor.y));
}

// 18) BOM agrupa por configuración
{
  let cfg = createEmptyState();
  [{ di: 8 }, { di: 8 }, { di: 16 }].forEach((props, index) => {
    cfg = commands.addComponent(cfg, { ...commands.makeComponent(cfg, 'generic.plc.configurable', index * 300, 0), props });
  });
  const rows = buildBom(cfg, catalog);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map((row) => row.cantidad).sort(), [1, 2]);
}

// 19) Estilo de cable inferido por función + termomagnética configurable
{
  let styled = createEmptyState();
  const place = (defId, x, y, props = {}) => {
    const component = { ...commands.makeComponent(styled, defId, x, y), props };
    styled = commands.addComponent(styled, component);
    return component;
  };
  const supply = place('generic.psu.24v5a', 100, 100);
  const plc24 = place('siemens.s71200.cpu1214c', 400, 100);
  const bar = place('bus.neutral', 100, 400, { points: 4 });
  const breaker = place('generic.mcb', 300, 400, { poles: '3P+N', curve: 'C', rating: '10' });
  const endpoint = (component, terminalId) => ({ componentId: component.id, terminalId });
  assert.deepEqual(inferWireStyle(styled, catalog, endpoint(supply, 'plus'), endpoint(plc24, 'l+')), { phase: '24V', color: 'azul', gauge: '1' });
  assert.equal(inferWireStyle(styled, catalog, endpoint(breaker, 'n2'), endpoint(bar, 't0')).color, 'celeste');
  assert.equal(inferWireStyle(styled, catalog, endpoint(bar, 't1'), endpoint(breaker, '2')).phase, 'N', 'la barra de neutro declara su función');
  assert.deepEqual(inferWireStyle(styled, catalog, endpoint(breaker, '2'), endpoint(breaker, '4')), {}, 'sin función conocida no se inventa nada');
  const withWire = commands.addWire(styled, commands.makeWire({ from: endpoint(breaker, '2'), to: endpoint(supply, 'l'), phase: 'L1', color: 'marrón' }));
  assert.equal(inferWireStyle(withWire, catalog, endpoint(breaker, '2'), endpoint(plc24, 'i0.0')).phase, 'L1', 'hereda la función del borne ya cableado');
  const defn = catalog.resolve(breaker);
  assert.deepEqual(defn.terminals.map((terminal) => terminal.id).sort(), ['1', '2', '3', '4', '5', '6', 'n1', 'n2']);
  assert.equal(catalog.resolve({ defId: 'generic.mcb', props: { poles: '1P' } }).terminals.length, 2);
}

// 20) Los carriles de cables quedan separados cuando hay lugar (≥ 2 celdas entre paralelos de tramo largo)
{
  let lanes = createEmptyState();
  const plc = { ...commands.makeComponent(lanes, 'siemens.s71200.cpu1214c', 300, 300), props: {} };
  lanes = commands.addComponent(lanes, plc);
  const strip = { ...commands.makeComponent(lanes, 'generic.terminalstrip', 300, 600), props: { poles: 6 } };
  lanes = commands.addComponent(lanes, strip);
  ['i0.0', 'i0.1', 'i0.2'].forEach((terminalId, index) => {
    lanes = commands.addWire(lanes, commands.makeWire({ from: { componentId: plc.id, terminalId }, to: { componentId: strip.id, terminalId: `t${index}` } }));
  });
  const verticals = Object.values(lanes.wires).flatMap((wire) => {
    const points = routeService.getPath(wire, lanes);
    return points.slice(1).map((point, index) => ({ a: points[index], b: point })).filter((s) => s.a.x === s.b.x && Math.abs(s.a.y - s.b.y) > 100).map((s) => s.a.x);
  });
  const sorted = [...verticals].sort((p, q) => p - q);
  sorted.slice(1).forEach((x, index) => assert.ok(x - sorted[index] >= 10, `carriles verticales muy pegados: ${sorted}`));
}

// 21) Mover tramos de cable por la grilla
{
  const path = [{ x: 0, y: 0 }, { x: 0, y: 20 }, { x: 40, y: 20 }, { x: 40, y: 50 }];
  assert.deepEqual(moveWireSegment(path, 1, 30), [{ x: 0, y: 30 }, { x: 40, y: 30 }], 'tramo horizontal intermedio sube/baja sus dos esquinas');
  const straight = [{ x: 0, y: 0 }, { x: 0, y: 100 }];
  const around = moveWireSegment(straight, 0, 10);
  assert.deepEqual(around, [{ x: 10, y: 0 }, { x: 10, y: 100 }], 'un cable recto se desvía con codos que conservan los bornes');
  const rebuilt = orthogonalize([straight[0], ...around, straight[1]]);
  assert.ok(rebuilt.slice(1).every((point, index) => point.x === rebuilt[index].x || point.y === rebuilt[index].y), 'queda ortogonal');
  assert.equal(moveWireSegment([{ x: 0, y: 0 }, { x: 5, y: 5 }], 0, 3), null, 'un tramo diagonal no se mueve');
  // el cable con waypoints editados se rutea como manual y los demás lo respetan
  let manual = createEmptyState();
  const a = { ...commands.makeComponent(manual, 'field.pilot.light', 100, 100), props: {} };
  const b = { ...commands.makeComponent(manual, 'field.pilot.light', 100, 300), props: {} };
  manual = commands.addComponent(commands.addComponent(manual, a), b);
  let wire = commands.makeWire({ from: { componentId: a.id, terminalId: 'x1' }, to: { componentId: b.id, terminalId: 'x1' } });
  manual = commands.addWire(manual, wire);
  const auto = routeService.getPath(manual.wires[wire.id], manual);
  const waypoints = moveWireSegment(auto, 1, auto[1].x === auto[2].x ? auto[1].x + 20 : auto[1].y + 20) ?? [];
  manual = commands.updateWire(manual, wire.id, { waypoints });
  const edited = routeService.getPath(manual.wires[wire.id], manual);
  assert.ok(edited.length >= 2 && edited[0].x === auto[0].x && edited[edited.length - 1].y === auto[auto.length - 1].y, 'sigue conectado a ambos bornes');
}

// 22) Rótulos de cable: texto con sección, sin pisarse entre sí, y desplazables
{
  let labelState = createEmptyState();
  const plc = { ...commands.makeComponent(labelState, 'siemens.s71200.cpu1214c', 300, 300), props: {} };
  const strip = { ...commands.makeComponent(labelState, 'generic.terminalstrip', 300, 600), props: { poles: 6 } };
  labelState = commands.addComponent(commands.addComponent(labelState, plc), strip);
  ['i0.0', 'i0.1', 'i0.2', 'i0.3'].forEach((terminalId, index) => {
    labelState = commands.addWire(labelState, commands.makeWire({
      from: { componentId: plc.id, terminalId },
      to: { componentId: strip.id, terminalId: `t${index}` },
      phase: '24V', color: 'azul', gauge: '1', label: String(index + 1),
    }));
  });
  const placer = new WireLabelPlacer();
  const labels = computeWireLabels({ state: labelState, catalog, routeService, placer });
  assert.equal(labels.size, 4);
  const [first] = [...labels.values()];
  assert.equal(first.text, '1 · 24V · 1 mm²');
  const rects = [...labels.values()].map((label) => label.rect);
  rects.forEach((p, i) => rects.slice(i + 1).forEach((q) => assert.ok(!(p.left < q.right && p.right > q.left && p.top < q.bottom && p.bottom > q.top), 'rótulos superpuestos')));
  const wireId = Object.keys(labelState.wires)[0];
  const moved = commands.updateWire(labelState, wireId, { labelOffset: { dx: 12, dy: -7 } });
  const movedLabel = computeWireLabels({ state: moved, catalog, routeService, placer }).get(wireId);
  assert.equal(Math.round(movedLabel.x - labels.get(wireId).x), 12);
  assert.equal(Math.round(movedLabel.y - labels.get(wireId).y), -7);
  assert.equal(hitTestWireLabel({ x: movedLabel.x, y: movedLabel.y }, computeWireLabels({ state: moved, catalog, routeService, placer })), wireId);
  const hidden = commands.updateMeta(labelState, { display: { wireGauge: false, wirePhase: false } });
  assert.equal(computeWireLabels({ state: hidden, catalog, routeService, placer }).get(wireId).text, '1');
}

// 23) Alinear y distribuir
{
  let layout = createEmptyState();
  const spots = [[100, 100], [250, 180], [500, 120]];
  const ids = spots.map(([x, y]) => {
    const component = { ...commands.makeComponent(layout, 'generic.relay.24vdc.1c', x, y), props: {} };
    layout = commands.addComponent(layout, component);
    return component.id;
  });
  const left = alignComponents(layout, catalog, ids, 'left');
  const lefts = ids.map((id) => getComponentBounds(left.components[id], catalog.resolve(left.components[id])).left);
  assert.equal(new Set(lefts).size, 1);
  const tops = alignComponents(layout, catalog, ids, 'top');
  assert.equal(new Set(ids.map((id) => getComponentBounds(tops.components[id], catalog.resolve(tops.components[id])).top)).size, 1);
  const spread = distributeComponents(layout, catalog, ids, 'x');
  const boxes = ids.map((id) => getComponentBounds(spread.components[id], catalog.resolve(spread.components[id]))).sort((p, q) => p.left - q.left);
  assert.equal(boxes[1].left - boxes[0].right, boxes[2].left - boxes[1].right, 'separaciones iguales');
  assert.equal(alignComponents(layout, catalog, [ids[0]], 'left'), layout, 'con 1 componente no hace nada');
  Object.values(left.components).forEach((component) => assert.ok(component.x % 5 === 0 && component.y % 5 === 0, 'sigue sobre la grilla'));
}

// 24) Rótulo del plano y diámetros de cable
{
  const plain = getSceneBounds(state, catalog, routeService);
  const withBlock = commands.updateMeta(state, { titleBlock: { enabled: true, title: 'Tablero principal', project: 'Planta L3', drawingNo: 'EL-001' } });
  const bounds = getSceneBounds(withBlock, catalog, routeService);
  assert.ok(bounds.bottom > plain.bottom, 'el rótulo agranda la escena hacia abajo');
  const layout = getTitleBlockLayout(withBlock, catalog, routeService);
  assert.ok(layout.rect.top > getContentBounds(withBlock, catalog, routeService).bottom, 'queda debajo del contenido');
  assert.ok(layout.shapes.some((shape) => shape.text === 'Tablero principal') && layout.shapes.some((shape) => shape.text === 'EL-001'));
  assert.equal(getTitleBlockLayout(state, catalog, routeService), null, 'desactivado por defecto');
  const svg = exportSvg({ state: withBlock, catalog, routeService, hopCalculator: new HopCalculator({ radius: 3 }) });
  assert.ok(svg.includes('Tablero principal') && svg.includes('mm²'), 'el SVG lleva rótulo y sección de los cables');
  assert.ok(Math.abs(conductorDiameter('2.5') - 1.784) < 0.01);
  const list = buildWireList(state, catalog, routeService);
  assert.ok(list.every((row) => row.diametro && row.diametroExterior));
  assert.equal(commands.updateMeta(withBlock, { titleBlock: { title: 'Otro' } }).meta.titleBlock.project, 'Planta L3', 'el rótulo se fusiona campo a campo');
}

// 25) Vista símbolo, HMI/PROFINET, bloque genérico, fuentes y estilos de red
{
  const onGrid = (definition) => definition.terminals.every((t) => t.x % 5 === 0 && t.y % 5 === 0);
  const add = (state0, defId, props = {}, x = 100, y = 100) => commands.addComponent(state0, { ...commands.makeComponent(state0, defId, x, y), props });
  const make = (defId, props = {}) => {
    const next = add(createEmptyState(), defId, props);
    const component = Object.values(next.components)[0];
    return { next, component, definition: catalog.resolve(component) };
  };

  const block = make('generic.block', { title: 'Horno', power: '400vac', di: 4, dq: 2, ai: 2, supplyOut: '24vdc', pins: 3, ethernet: 1 });
  assert.ok(onGrid(block.definition), 'bloque genérico sobre la grilla');
  assert.equal(new Set(block.definition.terminals.map((t) => t.id)).size, block.definition.terminals.length, 'ids únicos');
  const ids = block.definition.terminals.map((t) => t.id);
  assert.ok(['l1', 'l2', 'l3', 'pe', 'i0.0', 'q0.0', 'ai0+', 'out+', 'out-', 'x3', 'eth0'].every((id) => ids.includes(id)), 'alimentación, E/S, salida y bornes extra');
  assert.ok(catalog.describe(block.component).includes('Horno'), 'el nombre de texto aparece en la descripción');
  assert.ok(block.definition.shapes.some((shape) => shape.text === 'Horno'), 'la leyenda se dibuja en el bloque');
  assert.equal(catalog.getParameterValues({ defId: 'generic.block', props: { title: 'x'.repeat(50) } }).title.length, 18, 'texto limitado');

  ['generic.source.dc', 'generic.source.ac', 'generic.hmi.configurable', 'generic.pnio.device', 'field.rtd.transmitter', 'field.ntc', 'field.pyrometer'].forEach((id) => {
    const made = make(id);
    assert.ok(onGrid(made.definition), `${id} sobre la grilla`);
  });
  const ac3 = make('generic.source.ac', { phases: '3' });
  assert.ok(['l1', 'l2', 'l3', 'n', 'pe'].every((id) => ac3.definition.terminalMap.has(id)));
  const dc2 = make('generic.source.dc', { outputs: 2 });
  assert.equal(dc2.definition.terminals.length, 4);
  catalog.list().forEach((definition) => {
    const resolved = catalog.resolve({ defId: definition.id, props: {} });
    assert.ok(onGrid(resolved), `${definition.id} bornes en grilla`);
    assert.equal(new Set(resolved.terminals.map((t) => t.id)).size, resolved.terminals.length, `${definition.id} ids únicos`);
  });
  assert.ok(catalog.has('siemens.ktp400.basic') && catalog.has('siemens.tp700.comfort') && catalog.has('generic.gateway.pn.pb'));

  // estilos de cable de red
  let net = createEmptyState();
  net = add(net, 'siemens.s71200.cpu1215c');
  net = add(net, 'siemens.ktp700.basic', {}, 400, 100);
  const [plc, panel] = Object.keys(net.components);
  const style = inferWireStyle(net, catalog, { componentId: plc, terminalId: 'eth0' }, { componentId: panel, terminalId: 'eth0' });
  assert.equal(Object.keys(net.components).length, 2, 'ids de componente distintos');
  assert.notEqual(plc, panel);
  assert.equal(style.phase, 'ETH');
  assert.equal(style.color, 'verde');
  assert.equal(style.gauge, '', 'sin calibre de potencia en buses');
  net = add(net, 'siemens.cm1243.profibus', {}, 700, 100);
  const pbId = Object.keys(net.components).at(-1);
  assert.equal(inferWireStyle(net, catalog, { componentId: pbId, terminalId: 'pb0.a' }, { x: 0, y: 0 }).phase, 'PB');
  const labels = computeWireLabels({ state: { ...net, wires: { w: { id: 'w', from: { x: 0, y: 0 }, to: { x: 50, y: 0 }, phase: 'ETH', gauge: '', color: 'verde' } } }, catalog, routeService: new RouteService(catalog, new WireRouter()), placer: new WireLabelPlacer() });
  assert.ok(labels, 'etiquetas sin calibre no fallan');

  // vista símbolo: cambia el dibujo, el SVG y el contorno
  const withLayout = demoLayoutForSymbols();
  const shapeSvg = exportSvg({ state: withLayout, catalog, routeService, hopCalculator: new HopCalculator({ radius: 3 }) });
  const symbolSvg = exportSvg({ state: commands.updateMeta(withLayout, { display: { viewMode: 'symbol' } }), catalog, routeService, hopCalculator: new HopCalculator({ radius: 3 }) });
  assert.equal(Object.keys(withLayout.components).length, 4, 'layout de prueba completo');
  assert.notEqual(shapeSvg, symbolSvg, 'la vista símbolo cambia el SVG');
  assert.ok(symbolSvg.includes('stroke-dasharray="2 2"'), 'contorno físico tenue en vista símbolo');
  assert.equal(commands.updateMeta(commands.updateMeta(withLayout, { display: { wireNumber: false } }), { display: { viewMode: 'symbol' } }).meta.display.wireNumber, false, 'no pisa otras opciones');
}

function demoLayoutForSymbols() {
  let layout = createEmptyState();
  ['siemens.3rt.contactor.25a', 'generic.mcb', 'field.motor.3ph', 'generic.psu.configurable'].forEach((defId, index) => {
    const id = catalog.has(defId) ? defId : catalog.list().find((definition) => definition.id.includes(defId.split('.').pop()))?.id ?? defId;
    if (catalog.has(id)) layout = commands.addComponent(layout, commands.makeComponent(layout, id, 100 + index * 120, 100));
  });
  return layout;
}

console.log(`OK — 25 grupos de pruebas. Ruteo de ${wires.length} cables: ${routingMs.toFixed(1)} ms. .elcad: ${blob.size} bytes.`);
