import { createThumbnail } from './componentThumbnail.js';

// Paleta universal. El registro sigue siendo la única fuente de acciones y permisos.
export class CommandPalette {
  constructor({ root, registry, catalog }) {
    this.registry = registry;
    this.catalog = catalog;
    this.results = [];
    this.activeIndex = 0;
    this.filter = 'Todos';
    this.backdrop = document.createElement('div');
    this.backdrop.className = 'palette-backdrop';
    this.backdrop.hidden = true;
    const dialog = document.createElement('div');
    dialog.className = 'palette';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-label', 'Componentes y comandos');
    dialog.setAttribute('aria-modal','true');
    const header = document.createElement('div'); header.className = 'palette-heading';
    const title = document.createElement('span'); title.textContent = 'COMPONENTES Y COMANDOS';
    const close = document.createElement('button'); close.type = 'button'; close.textContent = 'Esc'; close.setAttribute('aria-label','Cerrar búsqueda');
    close.addEventListener('click', () => this.close()); header.append(title,close);
    this.input = document.createElement('input');
    this.input.className = 'palette-input'; this.input.type = 'text';
    this.input.placeholder = 'Contactor Siemens 24V…'; this.input.autocomplete = 'off'; this.input.spellcheck = false;
    this.input.setAttribute('aria-label','Buscar componente o comando');
    this.input.setAttribute('role','combobox'); this.input.setAttribute('aria-autocomplete','list');
    this.input.setAttribute('aria-controls','commandResults');
    this.tabs = document.createElement('div'); this.tabs.className = 'palette-tabs';
    this.tabs.setAttribute('aria-label','Filtrar resultados');
    [['Todos','Todo'],['Componente','Componentes'],['Comandos','Comandos']].forEach(([value,label]) => {
      const tab = document.createElement('button'); tab.type = 'button'; tab.textContent = label; tab.dataset.filter = value;
      tab.addEventListener('click', () => { this.filter = value; this.refresh(); this.input.focus(); }); this.tabs.append(tab);
    });
    this.list = document.createElement('ul'); this.list.className = 'palette-list'; this.list.id = 'commandResults';
    this.list.setAttribute('role','listbox'); this.list.setAttribute('aria-label','Resultados');
    this.empty = document.createElement('p'); this.empty.className = 'palette-empty'; this.empty.textContent = 'No hay coincidencias. Probá con otra marca, equipo o comando.'; this.empty.hidden = true;
    const footer = document.createElement('div'); footer.className = 'palette-footer'; footer.textContent = '↑ ↓ navegar · Enter elegir · Esc cerrar';
    dialog.append(header,this.input,this.tabs,this.list,this.empty,footer); this.backdrop.append(dialog); root.append(this.backdrop);
    this.input.addEventListener('input', () => this.refresh());
    dialog.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        const controls = [...dialog.querySelectorAll('button,input')];
        const first = controls[0], last = controls.at(-1);
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
      this.onKeyDown(e);
    });
    this.backdrop.addEventListener('pointerdown', e => { if (e.target === this.backdrop) this.close(); });
    this.list.addEventListener('click', e => { const item = e.target.closest('li'); if(item) this.run(Number(item.dataset.index)); });
    this.list.addEventListener('pointermove', e => { const item = e.target.closest('li'); if(item) this.setActive(Number(item.dataset.index),false); });
  }
  get isOpen() { return !this.backdrop.hidden; }
  open(query = '', filter = 'Todos') {
    this.previousFocus = document.activeElement;
    this.filter = filter; this.backdrop.hidden = false; this.input.value = query;
    this.input.setAttribute('aria-expanded','true'); this.refresh(); this.input.focus();
  }
  close() { this.backdrop.hidden = true; this.input.setAttribute('aria-expanded','false'); this.previousFocus?.focus(); }
  toggle() { if(this.isOpen) this.close(); else this.open(); }
  refresh() {
    this.results = this.registry.search(this.input.value,1000).filter(c => this.filter === 'Todos' || (this.filter === 'Componente' ? c.group === 'Componente' : c.group !== 'Componente')).slice(0,60);
    this.activeIndex = 0;
    this.list.replaceChildren(...this.results.map((c,i) => this.createItem(c,i)));
    this.empty.hidden = this.results.length > 0;
    [...this.tabs.children].forEach(tab => tab.setAttribute('aria-pressed',String(tab.dataset.filter === this.filter)));
    this.setActive(0);
  }
  createItem(command,index) {
    const item = document.createElement('li'); item.dataset.index = String(index); item.id = `command-result-${index}`; item.setAttribute('role','option');
    const preview = document.createElement('span'); preview.className = 'palette-preview';
    if(command.id.startsWith('place.') && this.catalog) {
      const definition = this.catalog.get(command.id.slice(6));
      preview.append(createThumbnail(definition, 44));
    } else preview.textContent = '⌘';
    const text = document.createElement('div'); text.className = 'palette-text';
    const title = document.createElement('span'); title.className = 'palette-title'; title.textContent = command.title;
    const subtitle = document.createElement('span'); subtitle.className = 'palette-subtitle'; subtitle.textContent = command.subtitle || command.group;
    text.append(title,subtitle);
    const meta = document.createElement('span'); meta.className = 'palette-meta'; meta.textContent = command.shortcut || (command.group === 'Componente' ? 'Insertar ↵' : '↵');
    item.append(preview,text,meta); return item;
  }
  setActive(index,scroll = true) {
    this.activeIndex = index;
    [...this.list.children].forEach((item,i) => {
      item.classList.toggle('active',i === index); item.setAttribute('aria-selected',String(i === index));
      if(i === index && scroll) item.scrollIntoView({block:'nearest'});
    });
    if(this.results.length) this.input.setAttribute('aria-activedescendant',`command-result-${index}`);
    else this.input.removeAttribute('aria-activedescendant');
  }
  run(index) { const command = this.results[index]; if(!command) return; this.close(); command.run(); }
  onKeyDown(e) {
    const count = this.results.length;
    if(e.key === 'ArrowDown' && count) { e.preventDefault(); this.setActive((this.activeIndex+1)%count); }
    else if(e.key === 'ArrowUp' && count) { e.preventDefault(); this.setActive((this.activeIndex-1+count)%count); }
    else if(e.key === 'Enter' && e.target === this.input) { e.preventDefault(); this.run(this.activeIndex); }
    else if(e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); this.close(); }
  }
}
