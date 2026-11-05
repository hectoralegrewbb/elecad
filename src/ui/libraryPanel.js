import { createThumbnail } from './componentThumbnail.js';
import { allCategories, filterLibrary, listCategories } from './libraryFilter.js';

// Biblioteca acoplada a la izquierda: búsqueda + categoría + lista con miniaturas. Un clic arma la colocación
// (mismo comando `place.<id>` de la paleta, que sigue siendo la única fuente de acciones).
export class LibraryPanel {
  constructor({ root, catalog, registry }) {
    this.root = root;
    this.catalog = catalog;
    this.registry = registry;
    this.query = '';
    this.category = allCategories;
    this.thumbnails = new Map();
    root.innerHTML = `
      <div class="panel-title">Biblioteca <span id="libraryCount" class="panel-count"></span><button type="button" class="panel-close" aria-label="Cerrar biblioteca">×</button></div>
      <div class="library-controls">
        <input id="libraryQuery" type="search" placeholder="Buscar componente…" autocomplete="off" spellcheck="false" aria-label="Buscar en la biblioteca" />
        <select id="libraryCategory" aria-label="Categoría"></select>
      </div>
      <ul id="libraryList" class="library-list" aria-label="Componentes"></ul>
      <p id="libraryEmpty" class="library-empty" hidden>Sin coincidencias. Probá con otra marca o categoría.<button type="button" class="btn" id="clearLibrary">Limpiar filtros</button></p>`;
    root.querySelector('.panel-close').addEventListener('click', () => root.dispatchEvent(new CustomEvent('panelclose')));
    this.input = root.querySelector('#libraryQuery');
    this.select = root.querySelector('#libraryCategory');
    this.list = root.querySelector('#libraryList');
    this.empty = root.querySelector('#libraryEmpty');
    this.count = root.querySelector('#libraryCount');
    root.querySelector('#clearLibrary').addEventListener('click', () => { this.query = ''; this.category = allCategories; this.input.value = ''; this.select.value = allCategories; this.render(); this.input.focus(); });
    const categories = listCategories(catalog);
    this.select.append(new Option(`Todas (${catalog.definitions.size})`, allCategories));
    categories.forEach(({ name, count }) => this.select.append(new Option(`${name} (${count})`, name)));
    this.input.addEventListener('input', () => { this.query = this.input.value; this.render(); });
    this.select.addEventListener('change', () => { this.category = this.select.value; this.render(); });
    this.list.addEventListener('click', (event) => {
      const item = event.target.closest('li[data-id]');
      if (item) this.place(item.dataset.id);
    });
    this.list.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const item = event.target.closest('li[data-id]');
      if (!item) return;
      event.preventDefault();
      this.place(item.dataset.id);
    });
    this.render();
  }

  place(definitionId) {
    this.registry.commands.find((command) => command.id === `place.${definitionId}`)?.run();
  }

  render() {
    const results = filterLibrary(this.catalog, { query: this.query, category: this.category });
    this.count.textContent = String(results.length);
    this.empty.hidden = results.length > 0;
    this.list.replaceChildren(...results.map((definition) => this.createRow(definition)));
  }

  createRow(definition) {
    const item = document.createElement('li');
    item.dataset.id = definition.id;
    item.tabIndex = 0;
    item.setAttribute('role', 'button');
    item.title = `${definition.name} · clic para colocar`;
    const preview = document.createElement('span');
    preview.className = 'library-preview';
    const source = this.thumbnails.get(definition.id) ?? (this.thumbnails.set(definition.id, createThumbnail(definition, 36)), this.thumbnails.get(definition.id));
    const canvas = document.createElement('canvas');
    canvas.width = source.width;
    canvas.height = source.height;
    canvas.getContext('2d').drawImage(source, 0, 0);
    canvas.setAttribute('aria-hidden', 'true');
    preview.append(canvas);
    const text = document.createElement('span');
    text.className = 'library-text';
    const name = document.createElement('strong');
    name.textContent = definition.name;
    const meta = document.createElement('small');
    meta.textContent = [definition.brand, `${definition.width}×${definition.height} mm`].filter(Boolean).join(' · ');
    text.append(name, meta);
    item.append(preview, text);
    return item;
  }
}
