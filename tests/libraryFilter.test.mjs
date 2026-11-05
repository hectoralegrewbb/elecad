import assert from 'node:assert/strict';
import { createDefaultCatalog } from '../src/data/defaultCatalog.js';
import { allCategories, filterLibrary, listCategories } from '../src/ui/libraryFilter.js';

const catalog = createDefaultCatalog();
const categories = listCategories(catalog);

// las categorías suman todo el catálogo
assert.equal(categories.reduce((sum, item) => sum + item.count, 0), catalog.definitions.size);
// sin filtros devuelve todo
assert.equal(filterLibrary(catalog).length, catalog.definitions.size);
// por categoría
const first = categories[0];
assert.equal(filterLibrary(catalog, { category: first.name }).length, first.count);
assert.ok(filterLibrary(catalog, { category: first.name }).every((definition) => definition.category === first.name));
// búsqueda: todas las palabras deben aparecer; el mejor resultado contiene la consulta
const found = filterLibrary(catalog, { query: 'contactor siemens' });
assert.ok(found.length > 0 && found.every((definition) => /contactor/i.test(definition.searchText) && /siemens/i.test(definition.searchText)));
// búsqueda + categoría se combinan
assert.equal(filterLibrary(catalog, { query: 'contactor', category: first.name }).every((definition) => definition.category === first.name), true);
// sin coincidencias
assert.equal(filterLibrary(catalog, { query: 'zzz-no-existe' }).length, 0);
assert.equal(allCategories, 'Todas');
console.log('OK — biblioteca: categorías, búsqueda y combinación de filtros.');
