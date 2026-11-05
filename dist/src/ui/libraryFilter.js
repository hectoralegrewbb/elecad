import { matchScore } from '../core/textSearch.js';

export const allCategories = 'Todas';

// Categorías del catálogo con su cantidad, en orden de aparición.
export function listCategories(catalog) {
  const counts = new Map();
  catalog.definitions.forEach((definition) => counts.set(definition.category, (counts.get(definition.category) ?? 0) + 1));
  return [...counts.entries()].map(([name, count]) => ({ name, count }));
}

// Definiciones que cumplen la categoría y la búsqueda (mejor coincidencia primero; sin búsqueda, orden del catálogo).
export function filterLibrary(catalog, { query = '', category = allCategories } = {}) {
  const text = query.trim();
  const pool = [...catalog.definitions.values()].filter((definition) => category === allCategories || definition.category === category);
  if (!text) return pool;
  return pool
    .map((definition) => ({ definition, score: matchScore(definition.searchText, text) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.definition);
}
