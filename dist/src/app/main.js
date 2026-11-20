import { createDefaultCatalog } from '../data/defaultCatalog.js';
import { createCommands } from '../core/commands.js';
import { createEmptyState, migrateState } from '../core/documentState.js';
import { repairDocument } from '../core/documentRepair.js';
import { DocumentStore } from '../core/documentStore.js';
import { RouteService } from '../core/routeService.js';
import { WireRouter } from '../core/wireRouter.js';
import { HopCalculator } from '../core/wireGeometry.js';
import { WireLabelPlacer } from '../core/wireLabel.js';
import { CanvasRenderer } from '../render/canvasRenderer.js';
import { hopRadius } from '../render/sceneDrawer.js';
import { Viewport } from '../render/viewport.js';
import { InteractionController } from '../interaction/interactionController.js';
import { PlaceTool } from '../interaction/placeTool.js';
import { SelectionModel } from '../interaction/selectionModel.js';
import { SelectTool } from '../interaction/selectTool.js';
import { WireTool } from '../interaction/wireTool.js';
import { AutosaveService } from '../io/autosaveService.js';
import { loadAutosave, saveAutosave } from '../io/localStore.js';
import { CommandPalette } from '../ui/commandPalette.js';
import { CommandRegistry } from '../ui/commandRegistry.js';
import { LibraryPanel } from '../ui/libraryPanel.js';
import { PropertiesPanel } from '../ui/propertiesPanel.js';
import { Workbench } from '../ui/workbench.js';
import { StatusBar } from '../ui/statusBar.js';
import { TitleBlockDialog } from '../ui/titleBlockDialog.js';
import { createToaster } from '../ui/toast.js';
import { registerAppCommands } from './appCommands.js';
import { DocumentService } from './documentService.js';
import { Editor } from './editor.js';
import { createEditorActions } from './editorActions.js';
import { registerShortcuts } from './shortcuts.js';
import { UnifilarWorkspace } from '../unifilar/workspace.js';

const byId = (id) => document.getElementById(id);

// Composición: acá se cablean las dependencias; ningún módulo de dominio conoce el DOM.
const canvas = byId('editorCanvas');
const catalog = createDefaultCatalog();
const commands = createCommands(catalog);
const routeService = new RouteService(catalog, new WireRouter());
const hopCalculator = new HopCalculator({ radius: hopRadius });
const labelPlacer = new WireLabelPlacer();
const services = { catalog, routeService, hopCalculator, labelPlacer };

const viewport = new Viewport();
const selection = new SelectionModel();
const store = new DocumentStore(createEmptyState());
const editor = new Editor({ store, commands, catalog, selection, viewport, routeService, labelPlacer });
const renderer = new CanvasRenderer(canvas, { viewport, services });

const notify = createToaster(byId('toastRoot'));
const layout = byId('layoutWorkspace');
const unifilar = new UnifilarWorkspace({
  root: byId('unifilarWorkspace'),
  onReturn: () => navigateWorkspace(false),
  onOpen: () => documents.open(),
});

function applyWorkspace(focus = true) {
  const active = window.location.hash === '#unifilar';
  layout.hidden = active;
  byId('paletteRoot').hidden = active;
  if (active) {
    palette.close();
    unifilar.show({ focus });
  } else {
    unifilar.hide();
    renderer.resize();
    editor.requestRender();
    if (focus) canvas.focus();
  }
}

function navigateWorkspace(active) {
  const url = new URL(window.location.href);
  url.hash = active ? 'unifilar' : '';
  if (url.href !== window.location.href) window.history.pushState(null, '', url);
  applyWorkspace();
}
const documents = new DocumentService({
  editor,
  services,
  getViewportSize: () => ({ width: renderer.width, height: renderer.height }),
  notify: (message, options) => unifilar.active ? unifilar.feedback(message, options?.kind === 'error') : notify(message, options),
  onOpen: async ({ kind, state, handle, name }) => {
    if (kind === 'unifilar') {
      await unifilar.ready;
      if (!unifilar.mayReplaceDraft(state)) return true;
      unifilar.load(state, handle);
      navigateWorkspace(true);
      unifilar.feedback(`Abierto: ${name}`);
      return true;
    }
    if (unifilar.active) navigateWorkspace(false);
    return false;
  },
});
const actions = createEditorActions(editor, notify);

const registry = new CommandRegistry();
const dialogs = { titleBlock: new TitleBlockDialog({ editor }) };
registerAppCommands({ registry, editor, actions, documents, dialogs, showUnifilar: () => navigateWorkspace(true) });
const palette = new CommandPalette({ root: byId('paletteRoot'), registry, catalog });
let workbench;

editor.registerTool('select', new SelectTool(editor));
editor.registerTool('wire', new WireTool(editor));
editor.registerTool('place', new PlaceTool(editor));

const emptyHint = byId('emptyHint');
editor.setRenderCallback(() => {
  renderer.render({ state: store.state, selection, overlay: editor.overlay });
  emptyHint.hidden = Object.keys(store.state.components).length > 0;
  statusBar.render();
  workbench?.render();
});

store.subscribe(({ reason }) => {
  if (reason !== 'transient') selection.prune(store.state);
  editor.requestRender();
});
selection.subscribe(() => editor.requestRender());

const statusBar = new StatusBar({ root: byId('statusBar'), editor });
new LibraryPanel({ root: byId('library'), catalog, registry });
new PropertiesPanel({ root: byId('properties'), editor, onTitleBlock: () => dialogs.titleBlock.open() });

const controller = new InteractionController(canvas, editor);
controller.onCursorMove((world) => {
  editor.cursorWorld = world;
  statusBar.setCursor(world);
});
controller.attach();
registerShortcuts({ editor, actions, documents, palette, isActive: () => !unifilar.active });

// El workbench solo conecta controles visuales con las acciones existentes.
workbench = new Workbench({ topbar: byId('topbarRoot'), stage: byId('stage'), editor, actions, documents, palette, registry, canvas });
byId('startCatalog').addEventListener('click', () => palette.open('', 'Componente'));
byId('startDemo').addEventListener('click', () => documents.loadDemo());

new ResizeObserver(() => {
  const previous = { width: renderer.width, height: renderer.height };
  renderer.resize();
  if (previous.width && previous.height) viewport.panBy((renderer.width - previous.width) / 2, (renderer.height - previous.height) / 2);
  editor.requestRender();
}).observe(canvas);
renderer.resize();
editor.setTool('select');

// Local-first: el autoguardado en IndexedDB es la red de seguridad; "Guardar" exporta el .elcad.
const autosave = new AutosaveService(store, { save: saveAutosave, onStatus: (status) => statusBar.setSaveStatus(status) });

async function restoreSession() {
  try {
    const record = await loadAutosave();
    const restored = record?.state ? migrateState(record.state) : null;
    if (restored && Object.keys(restored.components).length + Object.keys(restored.wires).length > 0) {
      store.replace(repairDocument(restored, catalog).state);
      notify('Sesión anterior restaurada');
    }
  } catch (error) {
    console.warn('No se pudo restaurar el autoguardado', error);
  }
  documents.fitView();
  autosave.start();
}

window.addEventListener('pagehide', () => autosave.flush());
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') autosave.flush();
});

window.elcad = { editor, store, catalog, documents };
restoreSession();
window.addEventListener('popstate', () => applyWorkspace());
if (window.location.hash === '#unifilar') applyWorkspace(false);
