import { createEmptyState } from '../core/documentState.js';
import { repairDocument } from '../core/documentRepair.js';
import { bomColumns, buildBom, buildWireList, toCsv, wireListColumns } from '../core/reports.js';
import { getSceneBounds } from '../core/sceneBounds.js';
import { buildDemoState } from '../data/demoDocument.js';
import { downloadBlob, openDocument, saveDocument } from '../io/fileAccess.js';
import { exportPng } from '../io/pngExporter.js';
import { printSvg } from '../io/printService.js';
import { exportSvg } from '../io/svgExporter.js';

const emptyViewRect = { left: 0, top: 0, right: 600, bottom: 400 };

// Orquesta archivo / exportación / vista. No conoce el DOM salvo por los módulos de io.
export class DocumentService {
  constructor({ editor, services, getViewportSize, notify }) {
    this.editor = editor;
    this.services = services;
    this.getViewportSize = getViewportSize;
    this.notify = notify;
    this.fileHandle = null;
  }

  get state() {
    return this.editor.store.state;
  }

  loadState(state) {
    const repaired = repairDocument(state, this.editor.catalog);
    if (repaired.removedComponents + repaired.detachedEndpoints > 0) {
      this.notify(`Documento reparado: ${repaired.removedComponents} componentes desconocidos, ${repaired.detachedEndpoints} extremos sueltos`, { kind: 'error' });
    }
    // Abrir, nuevo y ejemplo son reversibles: nunca descartan el plano anterior.
    this.editor.store.cancelTransient();
    this.editor.store.apply(() => repaired.state);
    this.editor.selection.clear();
    this.fitView();
  }

  newDocument() {
    this.fileHandle = null;
    this.loadState(createEmptyState());
  }

  loadDemo() {
    this.fileHandle = null;
    this.loadState(buildDemoState(this.editor.commands));
  }

  fitView() {
    const { editor, services } = this;
    const bounds = getSceneBounds(this.state, services.catalog, services.routeService) ?? emptyViewRect;
    const size = this.getViewportSize();
    editor.viewport.fitRect(bounds, size.width, size.height);
    editor.requestRender();
  }

  async save({ forcePicker = false } = {}) {
    try {
      const result = await saveDocument(this.state, { handle: this.fileHandle, forcePicker });
      this.fileHandle = result.handle;
      this.notify(`Guardado: ${result.name}`);
    } catch (error) {
      if (error.name !== 'AbortError') this.notify(`No se pudo guardar: ${error.message}`, { kind: 'error' });
    }
  }

  async open() {
    try {
      const { state, handle, name } = await openDocument();
      this.fileHandle = handle;
      this.loadState(state);
      this.notify(`Abierto: ${name}`);
    } catch (error) {
      if (error.name !== 'AbortError') this.notify(`No se pudo abrir: ${error.message}`, { kind: 'error' });
    }
  }

  async exportPng() {
    try {
      const blob = await exportPng({ state: this.state, services: this.services });
      downloadBlob(blob, `${this.state.meta.name}.png`);
    } catch (error) {
      this.notify(error.message, { kind: 'error' });
    }
  }

  exportSvg() {
    try {
      const svg = exportSvg({ state: this.state, ...this.services });
      downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), `${this.state.meta.name}.svg`);
    } catch (error) {
      this.notify(error.message, { kind: 'error' });
    }
  }

  printPlan() {
    try {
      printSvg(exportSvg({ state: this.state, ...this.services }), this.state.meta.name);
    } catch (error) {
      this.notify(error.message, { kind: 'error' });
    }
  }

  exportBom() {
    const rows = buildBom(this.state, this.services.catalog);
    if (rows.length === 0) {
      this.notify('No hay componentes para listar.', { kind: 'error' });
      return;
    }
    this.downloadCsv(toCsv(rows, bomColumns), `${this.state.meta.name} - materiales.csv`);
  }

  exportWireList() {
    const rows = buildWireList(this.state, this.services.catalog, this.services.routeService);
    if (rows.length === 0) {
      this.notify('No hay cables para listar.', { kind: 'error' });
      return;
    }
    this.downloadCsv(toCsv(rows, wireListColumns), `${this.state.meta.name} - cables.csv`);
  }

  downloadCsv(content, fileName) {
    downloadBlob(new Blob([content], { type: 'text/csv;charset=utf-8' }), fileName);
  }
}
