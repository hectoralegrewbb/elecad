import { getTitleBlock, titleBlockFields } from '../core/titleBlock.js';

// Diálogo para editar el rótulo (cajetín) del plano. Guarda en state.meta.titleBlock (deshacible).
export class TitleBlockDialog {
  constructor({ editor }) {
    this.editor = editor;
    this.dialog = document.createElement('dialog');
    this.dialog.className = 'form-dialog';
    document.body.append(this.dialog);
  }

  open() {
    const { editor, dialog } = this;
    const current = getTitleBlock(editor.store.state.meta);
    if (!current.date) current.date = new Date().toISOString().slice(0, 10);

    const form = document.createElement('form');
    form.method = 'dialog';
    const title = document.createElement('h2');
    title.textContent = 'Rótulo del plano';
    form.append(title);

    const enabled = document.createElement('input');
    enabled.type = 'checkbox';
    enabled.checked = true;
    const enabledLabel = document.createElement('label');
    enabledLabel.className = 'form-check';
    enabledLabel.append(enabled, document.createTextNode(' Mostrar el rótulo bajo el plano (y en PDF / PNG / SVG)'));
    form.append(enabledLabel);

    const inputs = {};
    const grid = document.createElement('div');
    grid.className = 'form-grid';
    titleBlockFields.forEach((field) => {
      const wrapper = document.createElement('label');
      wrapper.className = 'prop-field';
      const caption = document.createElement('span');
      caption.textContent = field.label;
      const input = document.createElement('input');
      input.type = 'text';
      input.value = current[field.key] ?? '';
      inputs[field.key] = input;
      wrapper.append(caption, input);
      grid.append(wrapper);
    });
    form.append(grid);

    const actions = document.createElement('div');
    actions.className = 'form-actions';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'prop-button';
    cancel.textContent = 'Cancelar';
    cancel.addEventListener('click', () => dialog.close());
    const hide = document.createElement('button');
    hide.type = 'button';
    hide.className = 'prop-button';
    hide.textContent = 'Ocultar rótulo';
    hide.addEventListener('click', () => {
      this.save({ enabled: false });
      dialog.close();
    });
    const accept = document.createElement('button');
    accept.type = 'submit';
    accept.className = 'prop-button primary';
    accept.textContent = 'Aceptar';
    actions.append(cancel, hide, accept);
    form.append(actions);

    form.addEventListener('submit', () => {
      this.save({ enabled: enabled.checked, ...Object.fromEntries(Object.entries(inputs).map(([key, input]) => [key, input.value])) });
    });

    dialog.replaceChildren(form);
    dialog.showModal();
    inputs.title.focus();
  }

  save(patch) {
    const { editor } = this;
    editor.store.apply((state) => editor.commands.updateMeta(state, { titleBlock: patch }));
    editor.requestRender();
  }
}
