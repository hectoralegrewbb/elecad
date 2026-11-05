import { isComponentId, isDimensionId, isWireId } from '../core/documentState.js';
import { buildNetlist } from '../core/netlist.js';
import { conductorDiameter, outerDiameters, phaseColors } from '../core/wireStandards.js';
import { wireColorNames } from '../render/theme.js';

const gaugeOptions = ['', '0.5', '0.75', '1', '1.5', '2.5', '4', '6', '10', '16', '25'];
const phaseOptions = ['', 'L1', 'L2', 'L3', 'N', 'PE', '24V', '0V', 'ETH', 'PB', 'RS485', 'CAN'];
const rotationOptions = ['0', '90', '180', '270'];

function field(label, control) {
  const wrapper = document.createElement('label');
  wrapper.className = 'prop-field';
  const caption = document.createElement('span');
  caption.textContent = label;
  wrapper.append(caption, control);
  return wrapper;
}

function textInput(value, onCommit) {
  const input = document.createElement('input');
  input.type = 'text';
  input.value = value ?? '';
  input.addEventListener('change', () => onCommit(input.value));
  return input;
}

function numberInput(value, step, onCommit) {
  const input = document.createElement('input');
  input.type = 'number';
  input.step = String(step);
  input.value = String(Math.round(value * 10) / 10);
  input.addEventListener('change', () => {
    const parsed = Number(input.value);
    if (Number.isFinite(parsed)) onCommit(parsed);
  });
  return input;
}

function integerInput(value, { min = 0, max = 999 }, onCommit) {
  const input = document.createElement('input');
  input.type = 'number';
  input.step = '1';
  input.min = String(min);
  input.max = String(max);
  input.value = String(value);
  input.addEventListener('change', () => {
    const parsed = Math.round(Number(input.value));
    if (Number.isFinite(parsed)) onCommit(Math.min(max, Math.max(min, parsed)));
  });
  return input;
}

function sectionTitle(text) {
  const element = document.createElement('h3');
  element.className = 'prop-section';
  element.textContent = text;
  return element;
}

function selectInput(options, value, onCommit) {
  const select = document.createElement('select');
  options.forEach((option) => {
    const element = document.createElement('option');
    element.value = option;
    element.textContent = option === '' ? '—' : option;
    element.selected = option === String(value);
    select.append(element);
  });
  select.addEventListener('change', () => onCommit(select.value));
  return select;
}

function readOnlyRow(label, value) {
  const row = document.createElement('div');
  row.className = 'prop-readonly';
  const caption = document.createElement('span');
  caption.textContent = label;
  const content = document.createElement('strong');
  content.textContent = value;
  row.append(caption, content);
  return row;
}

function heading(title, subtitle) {
  const element = document.createElement('header');
  element.className = 'prop-heading';
  const main = document.createElement('h2');
  main.textContent = title;
  element.append(main);
  if (subtitle) {
    const sub = document.createElement('p');
    sub.textContent = subtitle;
    element.append(sub);
  }
  return element;
}

function actionButton(label, onClick, danger = false) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = danger ? 'prop-button danger' : 'prop-button';
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
}

// Panel de propiedades acoplado: sin selección muestra el documento (nombre, resumen, rótulo);
// con selección, solo lo que aplica al elemento elegido.
export class PropertiesPanel {
  constructor({ root, editor, onTitleBlock = null }) {
    this.root = root;
    this.editor = editor;
    this.onTitleBlock = onTitleBlock;
    editor.selection.subscribe(() => this.render());
    editor.store.subscribe(({ reason }) => {
      if (reason !== 'transient') this.render();
    });
    this.render();
  }

  render() {
    const { editor } = this;
    const state = editor.store.state;
    const ids = editor.selection.toArray();
    this.root.replaceChildren();
    const title = document.createElement('div');
    title.className = 'panel-title';
    title.textContent = ids.length ? 'Propiedades' : 'Documento';
    const close = document.createElement('button');
    close.type = 'button'; close.className = 'panel-close'; close.textContent = '×';
    close.setAttribute('aria-label', 'Cerrar propiedades');
    close.addEventListener('click', () => this.root.dispatchEvent(new CustomEvent('panelclose')));
    title.append(close);
    this.root.append(title);
    const body = document.createElement('div');
    body.className = 'panel-body';
    this.root.append(body);
    this.body = body;

    if (ids.length === 0) return this.renderDocument(state);
    if (ids.length > 1) {
      this.body.append(heading(`${ids.length} elementos seleccionados`, 'R rota · Supr elimina · Ctrl+D duplica · Ctrl+K → Alinear'));
      return;
    }

    const [id] = ids;
    if (isComponentId(id) && state.components[id]) this.renderComponent(state.components[id]);
    else if (isWireId(id) && state.wires[id]) this.renderWire(state.wires[id], state);
    else if (isDimensionId(id) && state.dimensions[id]) this.renderDimension(state.dimensions[id], state);
    else this.renderDocument(state);
  }

  // Resumen del documento (sin selección).
  renderDocument(state) {
    const { editor } = this;
    const netlist = buildNetlist(state, editor.catalog);
    const components = Object.keys(state.components).length;
    const wires = Object.keys(state.wires).length;
    this.body.append(
      heading('Documento', 'Sin selección · elegí algo en el lienzo para editarlo'),
      field('Nombre', textInput(state.meta.name, (value) => this.apply((current) => editor.commands.updateMeta(current, { name: value.trim() || 'Sin título' })))),
      sectionTitle('Resumen'),
      readOnlyRow('Componentes', String(components)),
      readOnlyRow('Cables', String(wires)),
      readOnlyRow('Nodos', String(netlist.nets.length)),
      readOnlyRow('Huérfanos', String(netlist.orphanWireIds.length)),
    );
    const locked = Object.values(state.components).filter(c => c.locked);
    if (locked.length) this.body.append(sectionTitle('Elementos bloqueados'));
    locked.forEach(c => this.body.append(actionButton(`Desbloquear ${c.label || c.id}`, () => this.apply(current => editor.commands.updateComponent(current, c.id, { locked: false })))));
    if (this.onTitleBlock) this.body.append(actionButton('Rótulo del plano…', () => this.onTitleBlock()));
    this.body.append(
      sectionTitle('Atajos'),
      readOnlyRow('Buscar / comandos', 'Ctrl K'),
      readOnlyRow('Cablear', 'W (clic en un borne)'),
      readOnlyRow('Rotar', 'R'),
      readOnlyRow('Pan / zoom', 'Espacio + arrastrar · rueda'),
    );
  }

  apply(reducer) {
    this.editor.store.apply(reducer);
  }

  renderComponent(component) {
    const { commands, catalog } = this.editor;
    const definition = catalog.resolve(component);
    const update = (patch) => this.apply((state) => commands.updateComponent(state, component.id, patch));
    if (definition.category === 'Gabinetes') this.body.append(actionButton('Bloquear gabinete', () => {
      update({ locked: true }); this.editor.selection.clear();
    }));
    this.body.append(
      heading(definition.name, [definition.brand, definition.category].filter(Boolean).join(' · ')),
      field('Etiqueta', textInput(component.label, (value) => update({ label: value }))),
      field('Texto etiqueta', selectInput(['horizontal', 'vertical'], component.labelOrientation || 'horizontal', value => update({ labelOrientation: value }))),
      field('Texto bornes', selectInput(['horizontal', 'vertical'], component.terminalOrientation || 'horizontal', value => update({ terminalOrientation: value }))),
      field('Texto interior', selectInput(['horizontal', 'vertical'], component.bodyTextOrientation || 'horizontal', value => update({ bodyTextOrientation: value }))),
      field('Centro X (mm)', numberInput(component.x, 5, (value) => update({ x: value }))),
      field('Centro Y (mm)', numberInput(component.y, 5, (value) => update({ y: value }))),
      field('Rotación (°)', selectInput(rotationOptions, component.rotation, (value) => update({ rotation: Number(value) }))),
      ...this.parameterFields(component),
      actionButton('Eliminar', () => this.removeSelection(), true),
    );
  }

  // Campos de configuración de componentes paramétricos (E/S del PLC, puntos de una barra, etc.).
  // Cambiar un parámetro reconstruye los bornes; los cables a bornes que desaparecen quedan huérfanos.
  parameterFields(component) {
    const { commands, catalog } = this.editor;
    const base = catalog.get(component.defId);
    if (!base.build) return [];
    const values = catalog.getParameterValues(component);
    const update = (patch) => this.apply((state) => commands.updateComponentProps(state, component.id, patch));
    return [
      sectionTitle('Configuración'),
      ...base.parameters.map((parameter) =>
        field(
          parameter.label,
          parameter.type === 'select'
            ? selectInput(parameter.options, values[parameter.key], (value) => update({ [parameter.key]: value }))
            : parameter.type === 'text'
              ? textInput(values[parameter.key], (value) => update({ [parameter.key]: value }))
              : integerInput(values[parameter.key], parameter, (value) => update({ [parameter.key]: value })),
        ),
      ),
    ];
  }

  renderWire(wire, state) {
    const { commands } = this.editor;
    const update = (patch) => this.apply((current) => commands.updateWire(current, wire.id, patch));
    const netlist = buildNetlist(state, this.editor.catalog);
    const orphan = netlist.orphanWireIds.includes(wire.id);
    const manual = Boolean(wire.waypoints && wire.waypoints.length > 0);
    this.body.append(
      heading('Cable', wire.label || undefined),
      field('Color', selectInput(wireColorNames, wire.color, (value) => update({ color: value }))),
      field('Calibre (mm²)', selectInput(gaugeOptions, wire.gauge, (value) => update({ gauge: value }))),
      field('Fase / función', selectInput(phaseOptions, wire.phase, (value) => update(phaseColors[value] ? { phase: value, color: phaseColors[value] } : { phase: value }))),
      field('Etiqueta', textInput(wire.label, (value) => update({ label: value }))),
      readOnlyRow('Ø conductor', `${(Math.round(conductorDiameter(wire.gauge) * 100) / 100).toLocaleString('es-AR')} mm`),
      readOnlyRow('Ø exterior (aprox.)', outerDiameters[String(wire.gauge)] ? `${String(outerDiameters[String(wire.gauge)]).replace('.', ',')} mm` : '—'),
      readOnlyRow('Nodo', netlist.netIdByWire.get(wire.id) ?? '—'),
      readOnlyRow('Estado', orphan ? 'Huérfano (extremo libre)' : 'Conectado'),
      readOnlyRow('Trazado', manual ? 'Manual (waypoints)' : 'Automático (A*)'),
    );
    this.body.append(readOnlyRow('Mover', 'Arrastrá un tramo (■) o el rótulo'));
    if (manual) this.body.append(actionButton('Volver a auto-ruteo', () => update({ waypoints: [] })));
    if (wire.labelOffset && (wire.labelOffset.dx || wire.labelOffset.dy)) {
      this.body.append(actionButton('Restablecer posición del rótulo', () => update({ labelOffset: { dx: 0, dy: 0 } })));
    }
    this.body.append(actionButton('Eliminar', () => this.removeSelection(), true));
  }

  renderDimension(dimension) {
    const { commands } = this.editor;
    this.body.append(
      heading('Cota', 'Ligada a sus componentes: se actualiza sola'),
      field(
        'Separación (mm)',
        numberInput(dimension.offset ?? 30, 5, (value) =>
          this.apply((state) => commands.updateDimension(state, dimension.id, { offset: value })),
        ),
      ),
      actionButton('Eliminar', () => this.removeSelection(), true),
    );
  }

  removeSelection() {
    const { editor } = this;
    const ids = editor.selection.toArray();
    this.apply((state) => editor.commands.removeEntities(state, ids));
    editor.selection.prune(editor.store.state);
    editor.requestRender();
  }
}
