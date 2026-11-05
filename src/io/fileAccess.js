import { parseDocument, serializeDocument } from './elcadFormat.js';

const pickerTypes = [{ description: 'Documento ElCad', accept: { 'application/octet-stream': ['.elcad'] } }];

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// File System Access API (Chromium). En otros navegadores cae a descarga / <input type=file>.
// Si el usuario cancela el selector se lanza AbortError: el llamador lo ignora.
export async function saveDocument(state, { handle = null, forcePicker = false } = {}) {
  const blob = await serializeDocument(state);
  const fileName = `${state.meta.name}.elcad`;
  if (!('showSaveFilePicker' in window)) {
    downloadBlob(blob, fileName);
    return { handle: null, name: fileName };
  }
  const target = !forcePicker && handle ? handle : await window.showSaveFilePicker({ suggestedName: fileName, types: pickerTypes });
  const writable = await target.createWritable();
  await writable.write(blob);
  await writable.close();
  return { handle: target, name: target.name };
}

function pickFileWithInput() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.elcad';
    input.onchange = () => (input.files[0] ? resolve(input.files[0]) : reject(new DOMException('Cancelado', 'AbortError')));
    input.click();
  });
}

export async function openDocument() {
  if ('showOpenFilePicker' in window) {
    const [handle] = await window.showOpenFilePicker({ types: pickerTypes });
    const file = await handle.getFile();
    return { state: await parseDocument(file), handle, name: file.name };
  }
  const file = await pickFileWithInput();
  return { state: await parseDocument(file), handle: null, name: file.name };
}
