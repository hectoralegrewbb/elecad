import assert from 'node:assert/strict';
import { createDefaultCatalog } from '../src/data/defaultCatalog.js';
import { symbolShapesFor } from '../src/data/symbolLibrary.js';
import { filterLibrary } from '../src/ui/libraryFilter.js';

const catalog = createDefaultCatalog();
const onGrid = (definition) => definition.terminals.every((terminal) => terminal.x % 5 === 0 && terminal.y % 5 === 0);
const resolve = (defId, props = {}) => catalog.resolve({ defId, props });

// Variadores: todas las marcas pedidas, con bornes de potencia y control, y símbolo de variador
{
  const brands = new Set(catalog.list().filter((definition) => definition.category === 'Variadores / inversores de frecuencia').map((definition) => definition.brand));
  ['Schneider', 'Siemens', 'ABB', 'Danfoss', 'WEG', 'Yaskawa', 'Delta', 'Mitsubishi', 'Allen-Bradley'].forEach((brand) => assert.ok(brands.has(brand), `falta ${brand}`));
  const schneider = catalog.list().filter((definition) => definition.id.startsWith('schneider.atv'));
  assert.ok(schneider.length >= 9, 'línea Altivar ampliada (ATV12/212/320/340/610/630/930)');
  schneider.forEach((definition) => {
    ['u', 'v', 'w'].forEach((id) => assert.ok(definition.terminalMap.has(id), `${definition.id} sin ${id}`));
    assert.ok(symbolShapesFor(definition), `${definition.id} sin símbolo de variador`);
  });
  // Ningún borne de control queda fuera del equipo (la altura se ajusta a la cantidad de bornes)
  catalog.list().filter((definition) => definition.category === 'Variadores / inversores de frecuencia').forEach((definition) => {
    definition.terminals.forEach((terminal) => assert.ok(terminal.y <= definition.height && terminal.x <= definition.width, `${definition.id}: ${terminal.id} fuera del cuerpo`));
  });
  // Compatibilidad: los variadores originales conservan sus bornes
  assert.ok(catalog.get('schneider.atv320').terminalMap.has('di1'));
  assert.ok(catalog.get('siemens.g120c.fsa').terminalMap.has('18'));
}

// Filtros activos de armónicos
{
  const apf = catalog.get('schneider.easylogic.apf.100');
  assert.equal(apf.width, 600);
  ['l1', 'l2', 'l3', 'n', 'pe', 'ct1.s1', 'ct3.s2', 'rs485.0.a', 'eth0'].forEach((id) => assert.ok(apf.terminalMap.has(id), `APF sin ${id}`));
  assert.ok(onGrid(apf) && symbolShapesFor(apf), 'APF sobre la grilla y con símbolo');
  const generic = resolve('generic.apf', { ancho: '400', alto: '1200' });
  assert.deepEqual([generic.width, generic.height], [400, 1200]);
  assert.ok(onGrid(generic));
  assert.ok(filterLibrary(catalog, { query: 'easylogic apf' }).some((definition) => definition.id.startsWith('schneider.easylogic.apf')));
  assert.ok(filterLibrary(catalog, { query: 'filtro activo armonicos' }).length >= 4);
}

// Cajas chicas: contenedores (no bloquean el ruteo) y configurables
{
  ['layout.junction.100x100', 'layout.enclosure.200x300', 'layout.enclosure.custom', 'layout.pushbuttonbox'].forEach((id) => {
    assert.equal(catalog.get(id).blocksRouting, false, `${id} debe ser contenedor`);
    assert.equal(catalog.get(id).category, 'Gabinetes');
  });
  const custom = resolve('layout.enclosure.custom', { ancho: 187, alto: 253 });
  assert.deepEqual([custom.width, custom.height], [190, 250], 'se redondea a 10 mm para mantener centro y bornes en grilla');
  const buttons = resolve('layout.pushbuttonbox', { agujeros: 4 });
  assert.equal(buttons.shapes.filter((shape) => shape.t === 'circle').length, 4);
  assert.equal(resolve('layout.pushbuttonbox', { agujeros: 99 }).shapes.filter((shape) => shape.t === 'circle').length, 6, 'máximo 6 agujeros');
}

// Bobinas, reactores y toroides para circuitos de filtro
{
  assert.equal(catalog.get('magnetic.inductor.1ph').category, 'Bobinas y toroides');
  const reactor = resolve('magnetic.reactor.3ph', { corriente: '50', caida: '5%' });
  ['l1', 'l2', 'l3', 'l1o', 'l2o', 'l3o'].forEach((id) => assert.ok(reactor.terminalMap.has(id)));
  assert.equal(reactor.terminalMap.get('l1o').phase, 'L1', 'la salida del reactor hereda la fase');
  const choke = resolve('magnetic.choke.commonmode', { conductores: 4 });
  assert.equal(choke.terminals.length, 8);
  const ct = resolve('magnetic.ct.toroid', { relacion: '1000/5' });
  ['p1', 'p2', 's1', 's2'].forEach((id) => assert.ok(ct.terminalMap.has(id)));
  assert.ok(catalog.search('toroide').length >= 3, 'el buscador encuentra toroides');
  assert.ok(catalog.search('bobina').length >= 2);
  catalog.list().filter((definition) => definition.category === 'Bobinas y toroides').forEach((definition) => {
    const resolved = resolve(definition.id);
    assert.ok(onGrid(resolved) && resolved.width % 10 === 0 && resolved.height % 10 === 0, `${definition.id} en grilla`);
  });
}

// Router: el ruteo por defecto mantiene los cables separados y evita cruces innecesarios
{
  const { WireRouter } = await import('../src/core/wireRouter.js');
  const router = new WireRouter();
  assert.ok(router.crossPenalty > 0 && router.nearRadius >= 2);
  // Otro cable ocupa y = 0 entre x = 10 y 90: el nuevo debe dejar al menos 10 mm de separación en el tramo central.
  const path = router.route({ start: { x: 0, y: 0, side: 'right' }, end: { x: 100, y: 0, side: 'left' }, obstacles: [], gridSize: 5, occupiedSegments: [{ x1: 10, y1: 0, x2: 90, y2: 0 }] });
  const tooClose = path.slice(1).filter((point, index) => {
    const previous = path[index];
    return previous.y === point.y && Math.abs(point.y) < 10 && Math.min(previous.x, point.x) < 70 && Math.max(previous.x, point.x) > 30;
  });
  assert.equal(tooClose.length, 0, 'no corre pegado a un cable existente');
}

console.log('OK — catálogo ampliado (variadores, APF, cajas chicas, bobinas/toroides) y ruteo con separación.');
