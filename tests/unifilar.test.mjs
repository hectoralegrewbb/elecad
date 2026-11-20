import assert from 'node:assert/strict';
import { DocumentStore } from '../src/core/documentStore.js';
import { parseDocument, readDocument, serializeDocument } from '../src/io/elcadFormat.js';
import { createUnifilarDemo } from '../src/unifilar/demo.js';
import { addCircuit, addElement, createUnifilar, portsFor, removeSelection, updateElement, updateSheet } from '../src/unifilar/model.js';
import { circuitPoints, sheetGeometry, sheetMarkup, sheetWarnings } from '../src/unifilar/sheet.js';

const demo = createUnifilarDemo();
assert.equal(Object.keys(demo.elements).length, 8);
assert.equal(Object.keys(demo.circuits).length, 7);
assert.deepEqual(sheetWarnings(demo), []);

const fixture = await serializeDocument(demo, { kind: 'unifilar' });
const read = await readDocument(fixture);
assert.equal(read.kind, 'unifilar');
assert.deepEqual(read.state, demo);
assert.deepEqual(await parseDocument(fixture), demo);
const malformed = JSON.stringify({ format: 'elcad-unifilar', version: 1, state: {
  ...demo, circuits: { broken: { ...demo.circuits.infeed, id: 'broken', to: { elementId: 'missing', port: 'in' } } },
} });
await assert.rejects(() => readDocument(new Blob([malformed])), /circuito inválido/);
await assert.rejects(() => readDocument(new Blob(['{"format":"elcad-unifilar","version":7}'])), /Versión/);
for (const file of ['electrico', 'pulido']) {
  const { readFile } = await import('node:fs/promises');
  const bytes = await readFile(new URL(`./fixtures/${file}.elcad`, import.meta.url));
  assert.equal((await readDocument(new Blob([bytes]))).kind, 'layout');
}

const store = new DocumentStore(demo);
store.apply((state) => removeSelection(state, { type: 'element', id: 'vfd' }));
assert.equal(Object.keys(store.state.circuits).length, 5);
store.undo();
assert.deepEqual(store.state, demo);
store.redo();
assert.equal(store.state.elements.vfd, undefined);
store.undo();
store.apply((state) => updateElement(state, 'vfd', { x: 115, rotation: 90 }));
assert.deepEqual(portsFor(store.state.elements.vfd)[0], { elementId: 'vfd', port: 'in', x: 125, y: 175 });
const routed = circuitPoints(store.state, store.state.circuits.drivefeed);
assert.equal(routed.at(-1).x, 125);
assert(routed.slice(1).every((point, i) => point.x === routed[i].x || point.y === routed[i].y));

let cross = createUnifilar();
for (const [id, kind, x, y, rotation] of [
  ['top', 'source', 130, 40, 0], ['bottom', 'load', 130, 145, 0],
  ['left', 'source', 70, 95, 270], ['right', 'load', 190, 95, 270],
]) {
  cross = addElement(cross, kind, { x, y }, id);
  cross = updateElement(cross, id, { rotation });
}
const end = (elementId, port) => ({ elementId, port });
cross = addCircuit(cross, end('top', 'out'), end('bottom', 'in'), [], {}, 'vertical');
cross = addCircuit(cross, end('left', 'out'), end('right', 'in'), [], {}, 'horizontal');
assert.equal(addCircuit(cross, end('right', 'in'), end('left', 'out')), cross);
assert.doesNotMatch(sheetMarkup(cross), /r="0\.9"/);
cross = removeSelection(cross, { type: 'circuit', id: 'vertical' });
cross = removeSelection(cross, { type: 'circuit', id: 'horizontal' });
cross = addElement(cross, 'junction', { x: 130, y: 95 }, 'junction');
cross = addCircuit(cross, end('top', 'out'), end('junction', 'join'));
cross = addCircuit(cross, end('junction', 'join'), end('bottom', 'in'));
cross = addCircuit(cross, end('junction', 'join'), end('right', 'in'));
assert.equal(Object.values(cross.circuits).filter(({ from, to }) => from.elementId === 'junction' || to.elementId === 'junction').length, 3);
assert.match(sheetMarkup(cross), /r="0\.9"/);

for (const [paper, orientation, width, height] of [
  ['A4', 'portrait', 210, 297], ['A4', 'landscape', 297, 210],
  ['A3', 'portrait', 297, 420], ['A3', 'landscape', 420, 297],
]) {
  const state = updateSheet(demo, { paper, orientation, titleBlock: { title: '<svg onload="alert(1)">', scale: '1:1' } });
  const geometry = sheetGeometry(state.meta);
  assert.equal(geometry.width, width);
  assert.equal(geometry.height, height);
  assert.equal(geometry.title.rect.right, geometry.frame.right);
  assert.equal(geometry.title.rect.bottom, geometry.frame.bottom);
  const svg = sheetMarkup(state);
  assert(svg.includes(`width="${width}mm" height="${height}mm"`));
  assert(svg.includes('&lt;svg onload='));
  assert(!svg.includes('<svg onload='));
  assert(svg.includes('S/E'));
  if (paper === 'A4') assert(sheetWarnings(state).length > 0);
}

console.log('OK — unifilar: modelo, conexiones explícitas, historial, lámina, SVG y compatibilidad de archivos.');
