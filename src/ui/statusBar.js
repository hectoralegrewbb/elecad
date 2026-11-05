const toolLabels = {
  select: 'Seleccionar (V)',
  wire: 'Cableado (W)',
  place: 'Colocar componente',
};

const saveLabels = {
  pending: 'Cambios sin guardar…',
  saved: 'Autoguardado ✓',
  error: 'Error de autoguardado',
  idle: 'Local · Listo',
};

export class StatusBar {
  constructor({ root, editor }) {
    this.editor = editor;
    this.cursor = { x: 0, y: 0 };
    this.saveStatus = 'idle';
    this.fields = {};
    ['tool', 'zoom', 'cursor', 'counts', 'save'].forEach((name) => {
      const span = document.createElement('span');
      span.dataset.field = name;
      root.append(span);
      this.fields[name] = span;
    });
    editor.subscribe(() => this.render());
    editor.store.subscribe(() => this.render());
    this.render();
  }

  setCursor(world) {
    this.cursor = world;
    this.renderCursor();
  }

  setSaveStatus(status) {
    this.saveStatus = status;
    this.fields.save.textContent = saveLabels[status] ?? '';
  }

  renderCursor() {
    this.fields.cursor.textContent = `X ${Math.round(this.cursor.x)}  Y ${Math.round(this.cursor.y)} mm`;
  }

  render() {
    const { editor } = this;
    const state = editor.store.state;
    this.fields.tool.textContent = toolLabels[editor.currentToolName] ?? '';
    this.fields.zoom.textContent = `${Math.round(editor.viewport.scale * 100)}%`;
    this.fields.counts.textContent = `${Object.keys(state.components).length} componentes · ${Object.keys(state.wires).length} cables`;
    this.renderCursor();
    this.setSaveStatus(this.saveStatus);
  }
}
