import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseDocument, serializeDocument } from '../src/io/elcadFormat.js';
import { createDefaultCatalog } from '../src/data/defaultCatalog.js';
import { repairDocument } from '../src/core/documentRepair.js';
const catalog = createDefaultCatalog();
for (const version of ['pulido', 'electrico']) {
  const bytes = await readFile(new URL(`./fixtures/${version}.elcad`, import.meta.url));
  const state = await parseDocument(new Blob([bytes]));
  assert.equal(Object.keys(state.components).length, 5);
  assert.equal(Object.keys(state.wires).length, 7);
  assert.deepEqual(await parseDocument(await serializeDocument(state)), state);
  assert.deepEqual(repairDocument(state, catalog).state, state);
}
console.log('OK — archivos originales de ambas versiones: carga, reparación sin cambios y round-trip.');
