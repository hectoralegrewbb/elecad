const typingTags = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

export function registerShortcuts({ editor, actions, documents, palette }) {
  const clipboardAllowed = (event) =>
    !palette.isOpen && !typingTags.has(event.target?.tagName) && !event.target?.isContentEditable;

  // Copiar / cortar / pegar con los eventos nativos: portapapeles del sistema sin pedir permisos.
  window.addEventListener('copy', (event) => {
    if (!clipboardAllowed(event)) return;
    const text = actions.copySelection();
    if (text) {
      event.clipboardData.setData('text/plain', text);
      event.preventDefault();
    }
  });
  window.addEventListener('cut', (event) => {
    if (!clipboardAllowed(event)) return;
    const text = actions.cutSelection();
    if (text) {
      event.clipboardData.setData('text/plain', text);
      event.preventDefault();
    }
  });
  window.addEventListener('paste', (event) => {
    if (!clipboardAllowed(event)) return;
    event.preventDefault();
    actions.pasteClipboard(event.clipboardData?.getData('text/plain'));
  });

  window.addEventListener('keydown', (event) => {
    const modifier = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();

    if (modifier && key === 'k') {
      event.preventDefault();
      palette.toggle();
      return;
    }
    const typing = typingTags.has(event.target?.tagName) || event.target?.isContentEditable;
    if (palette.isOpen || typing) return;

    if (modifier) {
      const handlers = {
        z: () => (event.shiftKey ? actions.redo() : actions.undo()),
        y: () => actions.redo(),
        s: () => documents.save({ forcePicker: event.shiftKey }),
        o: () => documents.open(),
        d: () => actions.duplicateSelection(),
        a: () => actions.selectAll(),
      };
      if (handlers[key]) {
        event.preventDefault();
        handlers[key]();
      }
      return;
    }

    const toolName = editor.currentToolName;
    editor.currentTool?.onKeyDown?.(event);

    const step = editor.store.state.meta.gridSize * (event.shiftKey ? 10 : 1);
    const nudges = { arrowleft: [-step, 0], arrowright: [step, 0], arrowup: [0, -step], arrowdown: [0, step] };
    if (nudges[key] && toolName === 'select') {
      event.preventDefault();
      actions.nudgeSelection(...nudges[key]);
      return;
    }

    switch (key) {
      case 'v':
        editor.setTool('select');
        break;
      case 'w':
        editor.setTool('wire');
        break;
      case 'delete':
      case 'backspace':
        if (toolName !== 'wire') actions.deleteSelection();
        break;
      case 'r':
        if (toolName !== 'place') actions.rotateSelection();
        break;
      case 'f':
        documents.fitView();
        break;
      case 's':
        actions.toggleViewMode();
        break;
      case 'escape':
        if (toolName === 'select') editor.selection.clear();
        break;
      default:
        break;
    }
  });
}
