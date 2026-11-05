import { getDisplay } from '../core/wireLabel.js';

// Controles de presentación: reutilizan acciones existentes, sin escribir en el modelo.
const paths = {
  pointer: 'm5 3 14 9-7 1-3 7Z', wire: 'M5 5h5v14h9M3 3h4v4H3zM17 17h4v4h-4z',
  search: 'M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5-2 6 6',
  undo: 'M9 5 4 10l5 5M4 10h10a6 6 0 0 1 6 6v3',
  redo: 'm15 5 5 5-5 5m5-5H10a6 6 0 0 0-6 6v3',
  save: 'M5 3h12l4 4v14H3V3h2Zm2 0v6h10V3M7 21v-8h10v8',
  export: 'M12 3v12m-4-4 4 4 4-4M4 15v6h16v-6',
  fit: 'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5',
  minus: 'M5 12h14', plus: 'M5 12h14M12 5v14',
  shape: 'M4 4h16v16H4zM8 8h8v8H8z', symbol: 'M5 2v5m0 10v5M19 2v5m0 10v5M3 7h4v10H3zm14 0h4v10h-4zM7 12h10',
  more: 'M5 11h1v1H5zm6 0h1v1h-1zm6 0h1v1h-1z',
  chevron: 'm8 10 4 4 4-4', rotate: 'M20 8V3l-4 4a8 8 0 1 0 4 9M20 3h-5',
  copy: 'M8 8h13v13H8zM16 8V3H3v13h5', trash: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7',
};
const icon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.more}"/></svg>`;
const button = (id, label, name, text = '') => `<button type="button" id="${id}" title="${label}" aria-label="${label}">${icon(name)}${text ? `<span>${text}</span>` : ''}</button>`;

export class Workbench {
  // `topbar`: cabecera con herramientas; `stage`: contenedor del lienzo (acá flotan zoom y acciones de selección).
  constructor({ topbar, stage, editor, actions, documents, palette, registry, canvas }) {
    this.editor = editor;
    const root = document.createElement('div');
    root.className = 'workbench-root';
    this.root = root;
    topbar.append(root);
    topbar.classList.add('topbar');
    root.innerHTML = `
      <div class="document-row"><div class="brand-block"><span class="brand">El<b>Cad</b></span><span class="brand-sub">eléctrico</span></div>
      <button type="button" id="documentMenu" class="document-title" aria-expanded="false" aria-controls="fileMenu"><span id="documentName">Sin título</span>${icon('chevron')}</button>
      </div><div class="tools-row">${button('toggleLibrary','Mostrar u ocultar biblioteca','shape','Biblioteca')}
      <div class="bar-group" role="group" aria-label="Historial">${button('undoAction','Deshacer (Ctrl+Z)','undo')}${button('redoAction','Rehacer (Ctrl+Y)','redo')}</div>
      <span class="bar-divider"></span>
      <div class="bar-group" role="group" aria-label="Herramientas">${button('selectTool','Seleccionar (V)','pointer','Seleccionar')}${button('wireTool','Cablear (W)','wire','Cablear')}</div>
      <span class="bar-divider"></span>
      <div class="bar-group" role="group" aria-label="Vista">${button('shapeView','Vista de forma física','shape','Forma')}${button('symbolView','Vista de símbolos eléctricos','symbol','Símbolo')}</div>
      <span class="bar-divider"></span>
      ${button('openPalette','Buscar componentes y comandos (Ctrl+K)','search','Comandos')}<kbd class="toolbar-shortcut">Ctrl K</kbd>
      <span class="bar-spacer"></span>
      <div class="bar-group" role="group" aria-label="Archivo">${button('saveAction','Guardar .elcad (Ctrl+S)','save','Guardar')}${button('exportMenu','Exportar plano y reportes','export','Exportar')}</div>
      ${button('toggleProperties','Mostrar u ocultar propiedades y documento','more','Propiedades')}</div>
      <div id="fileMenu" class="popover" hidden></div>`;
    const viewBar = document.createElement('div');
    viewBar.className = 'view-options';
    viewBar.setAttribute('aria-label', 'Vista: rótulos de cables');
    const caption = document.createElement('span'); caption.textContent = 'RÓTULOS'; viewBar.append(caption);
    for (const [key, label] of [['wireNumber','Número'], ['wirePhase','Función'], ['wireGauge','Sección mm²']]) {
      const control = document.createElement('button'); control.type = 'button'; control.textContent = label;
      control.dataset.displayKey = key;
      control.addEventListener('click', () => actions.toggleDisplay(key, label)); viewBar.append(control);
    }
    topbar.append(viewBar); this.viewBar = viewBar;
    const overlay = document.createElement('div');
    overlay.className = 'stage-overlay';
    overlay.innerHTML = `
      <nav class="selection-actions floating-panel" aria-label="Acciones de selección" hidden>
        <span id="selectionCount"></span>${button('rotateAction','Rotar selección (R)','rotate')}${button('duplicateAction','Duplicar selección (Ctrl+D)','copy')}${button('deleteAction','Eliminar selección (Supr)','trash')}
      </nav>
      <nav class="zoom-controls floating-panel" aria-label="Zoom">
        ${button('zoomOut','Alejar','minus')}<button type="button" id="zoomReset" title="Restablecer zoom" aria-label="Restablecer zoom">100%</button>${button('zoomIn','Acercar','plus')}<span class="bar-divider"></span>${button('fitView','Encuadrar plano (F)','fit')}
      </nav>`;
    stage.append(overlay);
    this.overlay = overlay;
    const byId = (id) => root.querySelector(`#${id}`) ?? overlay.querySelector(`#${id}`);
    const bind = (id, fn) => byId(id).addEventListener('click', fn);
    // El estado de paneles vive únicamente en RAM; no modifica el documento.
    const app = topbar.closest('.app');
    const panels = { library: app.querySelector('#library'), properties: app.querySelector('#properties') };
    const compact = window.matchMedia('(max-width: 960px)');
    const visible = { library: !compact.matches, properties: false };
    let documentPinned = false;
    const syncPanels = () => {
      for (const name of Object.keys(panels)) {
        panels[name].hidden = !visible[name];
        app.dataset[name + 'Open'] = String(visible[name]);
        byId(name === 'library' ? 'toggleLibrary' : 'toggleProperties').setAttribute('aria-expanded', String(visible[name]));
      }
    };
    const setPanel = (name, open, focus = false) => {
      visible[name] = open;
      if (open && compact.matches) visible[name === 'library' ? 'properties' : 'library'] = false;
      if (name === 'properties') documentPinned = open && editor.selection.size === 0;
      syncPanels();
      if (focus) {
        const target = open ? panels[name].querySelector('input, button, select') : byId(name === 'library' ? 'toggleLibrary' : 'toggleProperties');
        target?.focus();
      }
    };
    for (const name of Object.keys(panels)) {
      const id = name === 'library' ? 'toggleLibrary' : 'toggleProperties';
      byId(id).setAttribute('aria-controls', name);
      bind(id, () => setPanel(name, !visible[name], true));
      panels[name].addEventListener('panelclose', () => setPanel(name, false, true));
      panels[name].addEventListener('keydown', event => {
        if (event.key === 'Escape') { event.stopPropagation(); setPanel(name, false, true); }
      });
    }
    compact.addEventListener('change', () => {
      visible.library = !compact.matches;
      visible.properties = !compact.matches && editor.selection.size > 0;
      documentPinned = false;
      syncPanels();
    });
    let canvasGesture = false;
    let pendingContext = false;
    canvas.addEventListener('pointerdown', () => { canvasGesture = true; }, { capture: true });
    const updateContext = () => {
      if (canvasGesture) { pendingContext = true; return; }
      if (!compact.matches) {
        visible.properties = editor.selection.size > 0 || documentPinned;
        syncPanels();
      }
    };
    editor.selection.subscribe(updateContext);
    const finishGesture = () => {
      canvasGesture = false;
      if (pendingContext) { pendingContext = false; updateContext(); }
    };
    canvas.addEventListener('pointerup', finishGesture);
    canvas.addEventListener('pointercancel', finishGesture);
    editor.subscribe(event => {
      if (compact.matches && event.type === 'toolchange' && event.tool === 'place') {
        setPanel('library', false);
        canvas.focus();
      }
    });
    syncPanels();
    bind('selectTool', () => editor.setTool('select'));
    bind('wireTool', () => editor.setTool('wire'));
    const setView = (mode) => { if (getDisplay(editor.store.state.meta).viewMode !== mode) actions.toggleViewMode(); };
    bind('shapeView', () => setView('shape'));
    bind('symbolView', () => setView('symbol'));
    bind('openPalette', () => palette.open());
    bind('undoAction', () => actions.undo()); bind('redoAction', () => actions.redo());
    bind('saveAction', () => documents.save()); bind('fitView', () => documents.fitView());
    bind('rotateAction', () => actions.rotateSelection()); bind('duplicateAction', () => actions.duplicateSelection());
    bind('deleteAction', () => actions.deleteSelection());
    const zoom = (factor) => {
      const rect = canvas.getBoundingClientRect();
      editor.viewport.zoomAt(rect.width / 2, rect.height / 2, factor);
      editor.requestRender(); this.render();
    };
    bind('zoomIn', () => zoom(1.25)); bind('zoomOut', () => zoom(0.8));
    bind('zoomReset', () => zoom(1 / editor.viewport.scale));
    this.menu = byId('fileMenu');
    const closeMenu = () => {
      this.menu.hidden = true;
      byId('documentMenu').setAttribute('aria-expanded','false');
      byId('exportMenu').setAttribute('aria-expanded','false');
    };
    const showMenu = (exportOnly) => {
      if (!this.menu.hidden && this.menu.dataset.mode === String(exportOnly)) { closeMenu(); return; }
      this.menu.dataset.mode = String(exportOnly);
      this.menu.classList.toggle('export-popover',exportOnly);
      this.menu.replaceChildren();
      const caption = document.createElement('div'); caption.className = 'menu-caption';
      caption.textContent = exportOnly ? 'EXPORTAR' : 'DOCUMENTO';
      this.menu.append(caption);
      const ids = exportOnly ? ['file.exportSvg','file.exportPng','file.print','file.exportBom','file.exportWires'] : ['file.new','file.open','file.save','file.saveAs','doc.titleBlock','doc.unlock','file.demo'];
      ids.forEach(id => {
        const command = registry.commands.find(c => c.id === id);
        if (!command) return;
        const item = document.createElement('button'); item.type = 'button'; item.textContent = command.title;
        item.addEventListener('click', () => { closeMenu(); command.run(); }); this.menu.append(item);
      });
      this.menu.hidden = false;
      byId('documentMenu').setAttribute('aria-expanded',String(!exportOnly));
      byId('exportMenu').setAttribute('aria-expanded',String(exportOnly));
    };
    bind('documentMenu', () => showMenu(false)); bind('exportMenu', () => showMenu(true));
    document.addEventListener('pointerdown', e => { if (!this.menu.contains(e.target) && !e.target.closest('#documentMenu, #exportMenu')) closeMenu(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !this.menu.hidden) { closeMenu(); byId('documentMenu').focus(); } });
    editor.subscribe(() => this.render()); editor.store.subscribe(() => this.render()); editor.selection.subscribe(() => this.render());
    this.render();
  }
  render() {
    const { editor, root, overlay } = this;
    const byId = (id) => root.querySelector(`#${id}`) ?? overlay.querySelector(`#${id}`);
    byId('documentName').textContent = editor.store.state.meta.name;
    byId('documentMenu').title = editor.store.state.meta.name + ' · Archivo';
    byId('undoAction').disabled = !editor.store.canUndo;
    byId('redoAction').disabled = !editor.store.canRedo;
    this.viewBar.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(getDisplay(editor.store.state.meta)[b.dataset.displayKey])));
    const symbol = getDisplay(editor.store.state.meta).viewMode === 'symbol';
    [['selectTool',editor.currentToolName === 'select'],['wireTool',editor.currentToolName === 'wire'],['shapeView',!symbol],['symbolView',symbol]].forEach(([id,active]) => {
      byId(id).classList.toggle('active',active); byId(id).setAttribute('aria-pressed',String(active));
    });
    byId('zoomReset').textContent = `${Math.round(editor.viewport.scale * 100)}%`;
    overlay.querySelector('.selection-actions').hidden = editor.selection.size === 0;
    byId('selectionCount').textContent = `${editor.selection.size} sel.`;
    const components = editor.selection.toArray().filter(id => editor.store.state.components[id]);
    byId('rotateAction').disabled = components.length === 0;
    byId('duplicateAction').disabled = components.length === 0;
  }
}
