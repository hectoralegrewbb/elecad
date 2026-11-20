import { DocumentStore } from '../core/documentStore.js';
import { createId } from '../core/ids.js';
import { titleBlockFields } from '../core/titleBlock.js';
import { AutosaveService } from '../io/autosaveService.js';
import { downloadBlob, saveDocument } from '../io/fileAccess.js';
import { loadAutosave, saveAutosave } from '../io/localStore.js';
import { printSvg } from '../io/printService.js';
import { createUnifilarDemo } from './demo.js';
import { addCircuit, addElement, conductorSets, createUnifilar, getSymbol, removeSelection,
  sameEnd, snap, symbols, portsFor, updateCircuit, updateElement, updateSheet, validateUnifilar } from './model.js';
import { circuitPoints, isInside, orthogonalPoints, sheetGeometry, sheetMarkup, sheetWarnings } from './sheet.js';

const draftKey = 'unifilar';
const gridSize = 5;
const closest = (event, selector) => event.target.closest(selector);
const button = (label, action, extra = '') => `<button type="button" class="btn" data-action="${action}" ${extra}>${label}</button>`;

function makeField(label, name, value, { choices, type = 'text', limit = 80 } = {}) {
  const field = document.createElement('label');
  field.className = 'uf-field';
  const caption = document.createElement('span');
  caption.textContent = label;
  const input = document.createElement(choices ? 'select' : 'input');
  input.name = name;
  input.setAttribute('aria-label', label);
  if (choices) {
    for (const [key, text] of choices) input.add(new Option(text, key));
  } else {
    input.type = type;
    input.maxLength = limit;
    if (type === 'number') input.step = 'any';
  }
  input.value = value ?? '';
  field.append(caption, input);
  return field;
}

export class UnifilarWorkspace {
  constructor({ root, onReturn, onOpen }) {
    this.root = root;
    this.onReturn = onReturn;
    this.onOpen = onOpen;
    this.store = new DocumentStore(createUnifilar());
    this.selection = null;
    this.tool = 'select';
    this.fileHandle = null;
    this.zoom = 1;
    this.bends = [];
    this.fileBusy = false;
    this.restoring = true;
    this.savedState = this.store.state;
    root.innerHTML = `
      <header class="uf-toolbar">
        <div class="uf-doc">
          <div class="brand">El<b>Cad</b> <span>Unifilar</span></div>
          <strong data-role="name"></strong>
        </div>
        <div class="uf-actions" aria-label="Archivo">
          ${button('Gabinetes', 'return')} ${button('Nuevo', 'new')} ${button('Abrir…', 'open')}
          ${button('Guardar', 'save')} ${button('Guardar como…', 'save-as')} ${button('SVG', 'svg')} ${button('Imprimir / PDF', 'print')}
        </div>
        <div class="uf-actions" aria-label="Edición">
          ${button('Símbolos', 'library', 'aria-expanded="false" aria-controls="uf-library"')}
          ${button('Seleccionar', 'select', 'aria-pressed="true"')}
          ${button('Conectar', 'connect', 'aria-pressed="false"')}
          ${button('Deshacer', 'undo')} ${button('Rehacer', 'redo')}
          ${button('Propiedades', 'properties', 'aria-expanded="false" aria-controls="uf-properties"')}
        </div>
      </header>
      <main class="uf-stage" tabindex="0" aria-label="Editor del plano unifilar">
        <div class="uf-sheet"></div>
      </main>
      <aside id="uf-library" class="uf-panel uf-library" aria-label="Biblioteca unifilar">
        <div class="uf-panel-head"><h2>Símbolos de potencia</h2>${button('Cerrar', 'close-library')}</div>
        <input data-role="search" type="search" aria-label="Buscar símbolos" placeholder="Buscar símbolo…">
        <div class="uf-symbols">${Object.entries(symbols).map(([kind, symbol]) =>
          `<button type="button" class="btn" data-kind="${kind}">${symbol.name}</button>`).join('')}</div>
        <p data-role="no-results" hidden>Sin coincidencias. ${button('Limpiar búsqueda', 'clear-search')}</p>
        ${button('Cargar ejemplo', 'demo')}
      </aside>
      <aside id="uf-properties" class="uf-panel uf-inspector" aria-label="Propiedades del unifilar">
        <div class="uf-panel-head"><h2>Propiedades</h2>${button('Cerrar', 'close-properties')}</div>
        <div data-role="fields"></div>
      </aside>
      <footer class="uf-status">
        <div><div data-role="feedback" role="status" aria-live="polite"></div><div data-role="warnings"></div></div>
        <div class="uf-actions" aria-label="Zoom">${button('−', 'zoom-out', 'aria-label="Alejar"')}
          ${button('Ajustar', 'fit')} ${button('+', 'zoom-in', 'aria-label="Acercar"')}</div>
      </footer>
      <dialog class="form-dialog uf-dialog" aria-labelledby="uf-sheet-heading"><form method="dialog"></form></dialog>`;
    this.stage = root.querySelector('.uf-stage');
    this.sheet = root.querySelector('.uf-sheet');
    this.inspector = this.byRole('fields');
    this.dialog = root.querySelector('dialog');
    this.compact = window.matchMedia('(max-width: 960px)');
    this.setPanel('library', !this.compact.matches);
    this.setPanel('properties', !this.compact.matches);
    this.compact.addEventListener('change', ({ matches }) => {
      this.setPanel('library', !matches);
      this.setPanel('properties', !matches);
    });
    this.store.subscribe(({ reason }) => {
      if (reason !== 'transient') {
        this.pruneSelection();
        if (!this.editingField) this.renderInspector();
        this.renderStatus();
        this.fitSheet();
      }
      this.renderSheet();
    });
    this.bindEvents();
    new ResizeObserver(() => this.fitSheet()).observe(this.stage);
    this.autosave = new AutosaveService(this.store, {
      save: (state) => saveAutosave(state, draftKey),
      onStatus: (status) => {
        if (status === 'error') this.feedback('No se pudo guardar el borrador. Usá Guardar para descargar el plano.', true);
      },
    });
    this.ready = this.restore();
    this.render();
  }

  get state() { return this.store.state; }
  get active() { return !this.root.hidden; }
  byRole(role) { return this.root.querySelector(`[data-role="${role}"]`); }

  async restore() {
    try {
      const record = await loadAutosave(draftKey);
      if (record?.state) this.store.replace(validateUnifilar(record.state));
    } catch {
      this.feedback('No se pudo recuperar el borrador. Podés abrir un archivo guardado.', true);
    } finally {
      this.autosave.start();
      this.restoring = false;
      this.renderStatus();
    }
  }

  show({ focus = true } = {}) {
    this.root.hidden = false;
    this.render();
    this.fitSheet();
    if (focus) this.stage.focus();
  }

  hide() {
    this.resetTool();
    this.dialog.close();
    this.root.hidden = true;
  }

  load(state, handle = null) {
    this.fileHandle = handle;
    this.selection = null;
    this.resetTool();
    this.zoom = 1;
    this.savedState = state;
    this.store.replace(state);
    this.feedback();
  }

  setPanel(name, open) {
    if (open && this.compact.matches) this.setPanel(name === 'library' ? 'properties' : 'library', false);
    this.root.dataset[name + 'Open'] = String(open);
    this.root.querySelector(`#uf-${name}`).hidden = !open;
    this.root.querySelector(`[data-action="${name}"]`).setAttribute('aria-expanded', String(open));
  }

  pruneSelection() {
    if (!this.selection) return;
    const collection = this.selection.type === 'element' ? this.state.elements : this.state.circuits;
    if (!Object.hasOwn(collection, this.selection.id)) this.selection = null;
  }

  feedback(message, error = false) {
    this.message = message;
    this.error = error;
    this.renderStatus();
  }

  renderStatus() {
    const { name, paper, orientation } = this.state.meta;
    this.byRole('name').textContent = name + ' · ' + paper + (orientation === 'portrait' ? ' vertical' : ' apaisada');
    const hint = this.tool === 'place' ? `Tocá la lámina para colocar ${getSymbol(this.kind).name.toLowerCase()}.`
      : this.tool === 'connect' ? this.from
        ? 'Elegí el puerto de destino. Tocá la hoja para agregar un quiebre.'
        : 'Elegí un puerto de origen.'
      : 'Elegí un símbolo o cargá el ejemplo desde la biblioteca.';
    const status = this.byRole('feedback');
    status.textContent = this.restoring ? 'Recuperando el borrador local…' : this.fileBusy ? 'Procesando el archivo…' : this.message || hint;
    status.classList.toggle('uf-error', Boolean(this.error && !this.fileBusy));
    this.byRole('warnings').textContent = sheetWarnings(this.state).join(' ');
    const available = !this.fileBusy && !this.restoring;
    for (const [name, enabled] of [
      ['undo', this.store.canUndo], ['redo', this.store.canRedo],
      ['save', available], ['save-as', available], ['open', available],
      ['return', !this.fileBusy], ['new', available], ['demo', available],
      ['connect', available], ['select', available], ['svg', available], ['print', available],
    ]) this.root.querySelector(`[data-action="${name}"]`).disabled = !enabled;
    for (const tool of ['select', 'connect']) {
      this.root.querySelector(`[data-action="${tool}"]`).setAttribute('aria-pressed', String(this.tool === tool));
    }
  }

  renderSheet() {
    if (!this.active) return;
    const { width, height } = sheetGeometry(this.state.meta);
    this.sheet.style.aspectRatio = width / height;
    this.sheet.innerHTML = sheetMarkup(this.state, {
      interactive: true, selection: this.selection, connecting: this.tool === 'connect', from: this.from, grid: true,
      preview: this.from && this.cursor ? orthogonalPoints(this.from, this.cursor, this.bends) : [],
    });
  }

  fitSheet() {
    if (!this.active) return;
    const { width, height } = sheetGeometry(this.state.meta);
    const padding = Number.parseFloat(getComputedStyle(this.stage).paddingLeft) * 2;
    const fittedWidth = Math.min(this.stage.clientWidth - padding, (this.stage.clientHeight - padding) * width / height);
    this.sheet.style.width = Math.max(1, fittedWidth * this.zoom) + 'px';
  }

  renderInspector() {
    const selected = this.selection;
    const { meta } = this.state;
    const contents = [];
    if (selected?.type === 'element') {
      const element = this.state.elements[selected.id];
      const heading = document.createElement('h3');
      heading.textContent = getSymbol(element.kind).name;
      contents.push(heading,
        makeField('Identificación', 'tag', element.tag, { limit: 18 }),
        makeField('Datos del equipo', 'detail', element.detail, { limit: 28 }),
        makeField('Posición X (mm)', 'x', element.x, { type: 'number' }),
        makeField('Posición Y (mm)', 'y', element.y, { type: 'number' }));
      contents.push(this.actionButton('Girar 90°', 'rotate'));
    } else if (selected?.type === 'circuit') {
      const circuit = this.state.circuits[selected.id];
      contents.push(makeField('Circuito', 'label', circuit.label, { limit: 18 }),
        makeField('Conductores', 'conductors', circuit.conductors, { choices: [['', 'Sin indicar'], ...conductorSets.map((value) => [value, value])] }),
        makeField('Sección (mm²)', 'section', circuit.section, { type: 'number' }));
      if (circuit.bends.length) contents.push(this.actionButton('Quitar quiebres', 'clear-bends'));
      if (selected.point) contents.push(this.actionButton('Insertar unión en el tramo', 'split'));
    } else {
      contents.push(makeField('Nombre del documento', 'name', meta.name),
        makeField('Formato', 'paper', meta.paper, { choices: [['A4', 'A4'], ['A3', 'A3']] }),
        makeField('Orientación', 'orientation', meta.orientation, { choices: [['landscape', 'Apaisada'], ['portrait', 'Vertical']] }),
        this.actionButton('Editar cajetín', 'cajetin'));
      if (!Object.keys(this.state.elements).length) contents.push(this.actionButton('Abrir biblioteca', 'library'));
    }
    if (selected) contents.push(this.actionButton('Eliminar selección', 'delete'), this.actionButton('Ver datos de la lámina', 'deselect'));
    this.inspector.replaceChildren(...contents);
  }

  actionButton(label, action) {
    const control = document.createElement('button');
    control.type = 'button';
    control.className = 'btn';
    control.dataset.action = action;
    control.textContent = label;
    return control;
  }

  render() {
    this.renderSheet();
    this.renderStatus();
    this.renderInspector();
  }

  resetTool(tool = 'select') {
    if (this.drag) this.store.cancelTransient();
    this.drag = null;
    this.from = null;
    this.bends = [];
    this.cursor = null;
    this.tool = tool;
  }

  setTool(tool, kind) {
    this.resetTool(tool);
    this.kind = kind;
    if (this.compact.matches && tool !== 'select') this.setPanel('library', false);
    this.stage.focus();
    this.feedback();
    this.renderSheet();
  }

  openTitleBlock() {
    const form = this.dialog.querySelector('form');
    const heading = document.createElement('h2');
    heading.id = 'uf-sheet-heading';
    heading.textContent = 'Cajetín de la lámina';
    const grid = document.createElement('div');
    grid.className = 'form-grid';
    for (const { key, label } of titleBlockFields) {
      const field = makeField(label, key, this.state.meta.titleBlock[key], { type: key === 'date' ? 'date' : 'text' });
      if (key === 'scale') field.querySelector('input').readOnly = true;
      grid.append(field);
    }
    const cancel = this.actionButton('Cancelar', 'cancel-title');
    const accept = document.createElement('button');
    accept.className = 'btn primary';
    accept.type = 'submit';
    accept.textContent = 'Aplicar';
    const actions = document.createElement('div');
    actions.className = 'form-actions';
    actions.append(cancel, accept);
    form.replaceChildren(heading, grid, actions);
    form.onsubmit = (event) => {
      event.preventDefault();
      const titleBlock = Object.fromEntries(new FormData(form));
      this.store.apply((state) => updateSheet(state, { titleBlock }));
      this.dialog.close();
    };
    this.dialog.showModal();
  }

  async runFile(task) {
    if (this.fileBusy || this.restoring) return;
    this.fileBusy = true;
    this.root.setAttribute('aria-busy', 'true');
    this.renderStatus();
    try {
      await task();
    } catch (error) {
      if (error.name !== 'AbortError') this.feedback(error.message || 'Falló la operación. Volvé a intentarlo.', true);
    } finally {
      this.fileBusy = false;
      this.root.removeAttribute('aria-busy');
      this.renderStatus();
    }
  }

  save(forcePicker) {
    return this.runFile(async () => {
      const state = this.state;
      const result = await saveDocument(state, { handle: this.fileHandle, forcePicker, kind: 'unifilar' });
      this.fileHandle = result.handle;
      this.savedState = state;
      this.feedback(`Guardado: ${result.name}`);
    });
  }

  export(print) {
    const warnings = sheetWarnings(this.state);
    if (warnings.length && !window.confirm(`${warnings.join('\n')}\n\n¿Querés exportar igual?`)) return;
    const svg = sheetMarkup(this.state);
    if (print) printSvg(svg, this.state.meta.name, sheetGeometry(this.state.meta));
    else downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), `${this.state.meta.name}.svg`);
  }

  bindEvents() {
    const actions = {
      return: () => this.onReturn(),
      new: () => this.replaceDraft(createUnifilar),
      demo: () => this.replaceDraft(createUnifilarDemo),
      open: () => this.runFile(() => this.onOpen()),
      save: () => this.save(false),
      'save-as': () => this.save(true),
      svg: () => this.export(false),
      print: () => this.export(true),
      select: () => this.setTool('select'),
      connect: () => this.setTool('connect'),
      undo: () => this.history(false),
      redo: () => this.history(true),
      rotate: () => this.rotate(),
      delete: () => this.deleteSelection(),
      deselect: () => this.select(null),
      'clear-bends': () => this.store.apply((state) => updateCircuit(state, this.selection.id, { bends: [] })),
      split: () => this.splitCircuit(),
      library: (event) => this.togglePanel('library', event),
      properties: (event) => this.togglePanel('properties', event),
      'close-library': () => this.setPanel('library', false),
      'close-properties': () => this.setPanel('properties', false),
      cajetin: () => this.openTitleBlock(),
      'cancel-title': () => this.dialog.close(),
      'clear-search': () => {
        const search = this.byRole('search');
        search.value = '';
        search.dispatchEvent(new Event('input'));
        search.focus();
      },
      fit: () => this.setZoom(1),
      'zoom-in': () => this.setZoom(this.zoom * 1.25),
      'zoom-out': () => this.setZoom(this.zoom / 1.25),
    };
    this.root.addEventListener('click', (event) => {
      const action = closest(event, '[data-action]');
      const kind = closest(event, '[data-kind]');
      if (action) actions[action.dataset.action]?.(event);
      if (kind && !this.restoring && !this.fileBusy) this.setTool('place', kind.dataset.kind);
    });
    this.byRole('search').addEventListener('input', ({ target }) => {
      const normalize = (text) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
      const query = normalize(target.value.trim());
      let visible = 0;
      for (const item of this.root.querySelectorAll('[data-kind]')) {
        item.hidden = !normalize(item.textContent).includes(query);
        if (!item.hidden) visible += 1;
      }
      this.byRole('no-results').hidden = visible > 0;
    });
    this.inspector.addEventListener('change', ({ target }) => {
      this.editingField = true;
      try {
        this.changeField(target);
      } finally {
        this.editingField = false;
      }
    });
    this.stage.addEventListener('pointerdown', (event) => this.pointerDown(event));
    this.stage.addEventListener('pointermove', (event) => this.pointerMove(event));
    this.stage.addEventListener('pointerup', (event) => this.pointerUp(event));
    this.stage.addEventListener('pointercancel', () => { this.drag = null; this.store.cancelTransient(); });
    this.stage.addEventListener('wheel', (event) => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      this.setZoom(this.zoom * (event.deltaY < 0 ? 1.15 : 1 / 1.15));
    }, { passive: false });
    window.addEventListener('keydown', (event) => this.keydown(event));
    const flush = () => { if (this.autosave.timer !== null) this.autosave.flush(); };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
  }

  mayReplaceDraft(replacement) {
    if (this.savedState === this.state) return true;
    if (replacement && JSON.stringify(replacement) === JSON.stringify(this.state)) return true;
    return window.confirm('¿Reemplazar el borrador abierto? Guardalo como .elcad si querés conservarlo.');
  }

  replaceDraft(factory) {
    if (this.mayReplaceDraft()) this.load(factory());
  }

  togglePanel(name, event) {
    const open = event.target.closest('.uf-inspector') || this.root.dataset[name + 'Open'] !== 'true';
    this.setPanel(name, open);
    if (open) this.root.querySelector(`#uf-${name} input, #uf-${name} button`)?.focus();
  }

  setZoom(value) {
    this.zoom = Math.min(4, Math.max(0.85, value));
    this.fitSheet();
    if (value === 1) this.stage.scrollTo(0, 0);
  }

  history(redo) {
    this.resetTool();
    if (redo) this.store.redo();
    else this.store.undo();
    this.feedback();
    this.renderSheet();
  }

  select(selection) {
    this.selection = selection;
    this.feedback(selection ? 'Selección activa. Podés editar sus datos en Propiedades.' : '');
    this.renderInspector();
    this.renderSheet();
  }

  rotate() {
    if (this.selection?.type !== 'element') return;
    const { id } = this.selection;
    this.store.apply((state) => updateElement(state, id, { rotation: (state.elements[id].rotation + 90) % 360 }));
  }

  deleteSelection() {
    if (!this.selection) return;
    const selection = this.selection;
    this.selection = null;
    this.store.apply((state) => removeSelection(state, selection));
    this.feedback('Selección eliminada. Podés deshacer el cambio.');
  }

  changeField(target) {
    const { name, value } = target;
    const selected = this.selection;
    if (target.validity.badInput) return this.feedback('Ingresá un valor numérico válido.', true);
    if (selected?.type === 'element') {
      if ((name === 'x' || name === 'y') && (value === '' || Math.abs(Number(value)) > 2000)) {
        this.feedback('Ingresá una coordenada entre −2000 y 2000 mm.', true);
        return;
      }
      const fieldValue = name === 'x' || name === 'y' ? Number(value) : value;
      this.store.apply((state) => updateElement(state, selected.id, { [name]: fieldValue }));
      target.value = this.state.elements[selected.id][name];
    } else if (selected?.type === 'circuit') {
      if (name === 'section' && value !== '' && (Number(value) <= 0 || Number(value) > 2000)) {
        this.feedback('Ingresá una sección mayor que cero y de hasta 2000 mm².', true);
        return;
      }
      this.store.apply((state) => updateCircuit(state, selected.id, { [name]: value }));
      target.value = this.state.circuits[selected.id][name] ?? '';
    } else {
      this.store.apply((state) => updateSheet(state, { [name]: value }));
      target.value = this.state.meta[name];
    }
  }

  worldPoint(event) {
    const svg = this.sheet.firstElementChild;
    const matrix = svg?.getScreenCTM();
    return matrix ? new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse()) : null;
  }

  pointerDown(event) {
    if (this.restoring || this.fileBusy || event.button !== 0 || !closest(event, 'svg')) return;
    const point = this.worldPoint(event);
    if (!point) return;
    this.drag = {
      pointerId: event.pointerId, point, x: event.clientX, y: event.clientY,
      elementId: closest(event, '[data-element]')?.dataset.element,
      circuitId: closest(event, '[data-circuit]')?.dataset.circuit,
      port: closest(event, '[data-port]')?.dataset,
      moved: false,
    };
    if (this.drag.elementId) this.drag.element = this.state.elements[this.drag.elementId];
    this.stage.setPointerCapture(event.pointerId);
  }

  pointerMove(event) {
    const point = this.worldPoint(event);
    if (!point) return;
    if (this.tool === 'connect' && this.from) {
      const cursor = { x: snap(point.x), y: snap(point.y) };
      if (cursor.x !== this.cursor?.x || cursor.y !== this.cursor?.y) {
        this.cursor = cursor;
        this.renderSheet();
      }
    }
    if (this.tool !== 'select' || !this.drag?.element || this.drag.pointerId !== event.pointerId) return;
    const drag = this.drag;
    if (!drag.moved && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 4) return;
    drag.moved = true;
    this.selection = { type: 'element', id: drag.elementId };
    this.store.applyTransient((state) => updateElement(state, drag.elementId, {
      x: drag.element.x + point.x - drag.point.x, y: drag.element.y + point.y - drag.point.y,
    }));
  }

  pointerUp(event) {
    const drag = this.drag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    this.drag = null;
    if (drag.moved) {
      this.store.commitTransient();
      this.renderInspector();
      return;
    }
    if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 8) return;
    const point = { x: snap(drag.point.x), y: snap(drag.point.y) };
    if (this.tool === 'place') {
      const { area } = sheetGeometry(this.state.meta);
      if (!isInside(point, area)) return this.feedback('Colocá el símbolo dentro del área útil de la lámina.', true);
      const id = createId('sym');
      this.store.apply((state) => addElement(state, this.kind, point, id));
      if (!this.state.elements[id]) return this.feedback('La lámina alcanzó el límite de símbolos.', true);
      this.resetTool();
      this.select({ type: 'element', id });
    } else if (this.tool === 'connect') this.connectAt(drag, point);
    else if (drag.elementId) this.select({ type: 'element', id: drag.elementId });
    else if (drag.circuitId) this.select({ type: 'circuit', id: drag.circuitId, point: drag.point });
    else this.select(null);
  }

  connectAt(drag, point) {
    if (drag.port) {
      const elementId = drag.port.portElement;
      const port = drag.port.port;
      const end = portsFor(this.state.elements[elementId]).find((candidate) => candidate.port === port);
      if (!end) return;
      if (!this.from) {
        this.from = end;
        this.feedback();
      } else if (!sameEnd(end, this.from)) {
        const id = createId('ckt');
        const next = addCircuit(this.state, this.from, end, this.bends, {}, id);
        if (next === this.state) return this.feedback('Elegí puertos de equipos distintos y evitá duplicar circuitos.', true);
        this.store.apply(() => next);
        this.resetTool();
        this.select({ type: 'circuit', id });
      }
    } else if (this.from && this.bends.length < 30 && isInside(point, sheetGeometry(this.state.meta).area)) {
      this.bends.push(point);
      this.feedback();
    }
    this.renderSheet();
  }

  splitCircuit() {
    const { id, point } = this.selection;
    const previous = this.state.circuits[id];
    if (!point || !previous) return;
    const points = circuitPoints(this.state, previous);
    let nearest = null;
    for (let index = 1; index < points.length; index += 1) {
      const a = points[index - 1];
      const b = points[index];
      const clamp = (value, start, end) => Math.min(Math.max(value, Math.min(start, end)), Math.max(start, end));
      const projection = { x: clamp(point.x, a.x, b.x), y: clamp(point.y, a.y, b.y) };
      const distance = Math.hypot(point.x - projection.x, point.y - projection.y);
      if (!nearest || distance < nearest.distance) nearest = { index, distance, ...projection };
    }
    if (!nearest) return;
    const junction = { x: snap(nearest.x), y: snap(nearest.y) };
    const equals = (other) => junction.x === other.x && junction.y === other.y;
    if (equals(points[0]) || equals(points.at(-1))) {
      return this.feedback('Elegí un punto intermedio del tramo, alejado de los extremos.', true);
    }
    const junctionId = createId('sym');
    const join = { elementId: junctionId, port: 'join' };
    let next = removeSelection(this.state, { type: 'circuit', id });
    next = addElement(next, 'junction', junction, junctionId);
    next = addCircuit(next, previous.from, join, points.slice(1, nearest.index), previous, id);
    const secondId = createId('ckt');
    next = addCircuit(next, join, previous.to, points.slice(nearest.index, -1), { ...previous, label: '' }, secondId);
    if (!next.circuits[id] || !next.circuits[secondId]) return this.feedback('No se pudo dividir el tramo. Reducí los quiebres y reintentá.', true);
    this.selection = { type: 'element', id: junctionId };
    this.store.apply(() => next);
    this.feedback('Unión insertada. Usá Conectar para agregar un ramal.');
  }

  keydown(event) {
    if (!this.active || this.restoring || this.fileBusy || this.dialog.open || event.target.closest?.('input, textarea, select, [contenteditable]')) return;
    const key = event.key.toLowerCase();
    const mod = event.ctrlKey || event.metaKey;
    if (mod && ['s', 'o', 'z', 'y'].includes(key)) {
      event.preventDefault();
      if (key === 's') this.save(event.shiftKey);
      else if (key === 'o') this.runFile(() => this.onOpen());
      else this.history(key === 'y' || event.shiftKey);
      return;
    }
    if (mod) return;
    if (key === 'escape') this.setTool('select');
    else if (key === 'w') this.setTool('connect');
    else if (key === 'v') this.setTool('select');
    else if (key === 'r') this.rotate();
    else if (key === 'delete') this.deleteSelection();
    else if (key === 'f') this.setZoom(1);
    else if (this.selection?.type === 'element' && this.tool === 'select' && key.startsWith('arrow')) {
      const movement = { arrowleft: [-gridSize, 0], arrowright: [gridSize, 0], arrowup: [0, -gridSize], arrowdown: [0, gridSize] }[key];
      if (!movement) return;
      event.preventDefault();
      const { id } = this.selection;
      const { x, y } = this.state.elements[id];
      this.store.apply((state) => updateElement(state, id, { x: x + movement[0], y: y + movement[1] }));
    }
  }
}
