// Registra en la paleta: componentes del catálogo (modo colocación) + comandos de archivo, edición, vista y cotas.
export function registerAppCommands({ registry, editor, actions, documents, dialogs }) {
  const hasSelection = () => editor.selection.size > 0;
  const hasComponentSelection = () => actions.selectedComponentCount() > 0;
  const atLeast = (count) => () => actions.selectedComponentCount() >= count;

  registry.registerMany([
    { id: 'tool.select', title: 'Herramienta: Seleccionar', group: 'Herramientas', shortcut: 'V', run: () => editor.setTool('select') },
    { id: 'tool.wire', title: 'Herramienta: Cableado', subtitle: 'Click en un borne para iniciar', group: 'Herramientas', shortcut: 'W', run: () => editor.setTool('wire') },

    { id: 'doc.unlock', title: 'Desbloquear gabinetes', group: 'Documento', run: () => editor.store.apply(state => {
      let next = state;
      Object.values(state.components).filter(c => c.locked && editor.catalog.resolve(c).category === 'Gabinetes').forEach(c => { next = editor.commands.updateComponent(next, c.id, { locked: false }); });
      return next;
    }) },
    { id: 'file.new', title: 'Nuevo documento', group: 'Archivo', run: () => documents.newDocument() },
    { id: 'file.open', title: 'Abrir…', subtitle: 'Archivo .elcad', group: 'Archivo', shortcut: 'Ctrl+O', run: () => documents.open() },
    { id: 'file.save', title: 'Guardar', subtitle: 'Exporta el .elcad al disco', group: 'Archivo', shortcut: 'Ctrl+S', run: () => documents.save() },
    { id: 'file.saveAs', title: 'Guardar como…', group: 'Archivo', shortcut: 'Ctrl+Shift+S', run: () => documents.save({ forcePicker: true }) },
    { id: 'file.exportSvg', title: 'Exportar SVG (vectorial, 1:1 en mm)', group: 'Archivo', keywords: ['plano', 'vector'], run: () => documents.exportSvg() },
    { id: 'file.exportPng', title: 'Exportar PNG', group: 'Archivo', keywords: ['imagen'], run: () => documents.exportPng() },
    { id: 'file.print', title: 'Imprimir / guardar como PDF', subtitle: 'Vectorial, ajustado a la hoja', group: 'Archivo', keywords: ['pdf', 'plano', 'imprimir'], run: () => documents.printPlan() },
    { id: 'file.exportBom', title: 'Exportar lista de materiales (CSV)', subtitle: 'Cantidades y referencias por componente', group: 'Archivo', keywords: ['bom', 'excel', 'materiales'], run: () => documents.exportBom() },
    { id: 'file.exportWires', title: 'Exportar lista de cables (CSV)', subtitle: 'Origen, destino, calibre y largo', group: 'Archivo', keywords: ['excel', 'cableado', 'largo'], run: () => documents.exportWireList() },
    { id: 'file.demo', title: 'Cargar ejemplo', subtitle: 'Gabinete + disyuntor → contactor → variador', group: 'Archivo', run: () => documents.loadDemo() },

    { id: 'edit.undo', title: 'Deshacer', group: 'Edición', shortcut: 'Ctrl+Z', enabled: () => editor.store.canUndo, run: () => actions.undo() },
    { id: 'edit.redo', title: 'Rehacer', group: 'Edición', shortcut: 'Ctrl+Y', enabled: () => editor.store.canRedo, run: () => actions.redo() },
    { id: 'edit.delete', title: 'Eliminar selección', group: 'Edición', shortcut: 'Supr', enabled: hasSelection, run: () => actions.deleteSelection() },
    { id: 'edit.rotate', title: 'Rotar 90°', group: 'Edición', shortcut: 'R', enabled: hasComponentSelection, run: () => actions.rotateSelection() },
    { id: 'edit.selectAll', title: 'Seleccionar todos los componentes', group: 'Edición', shortcut: 'Ctrl+A', run: () => actions.selectAll() },
    { id: 'edit.renumber', title: 'Numerar cables por nodo', subtitle: 'Mismo número para todos los cables de un nodo', group: 'Cableado', keywords: ['etiquetar', 'numeracion'], run: () => actions.renumberWires() },
    { id: 'edit.copy', title: 'Copiar', group: 'Edición', shortcut: 'Ctrl+C', enabled: hasSelection, run: () => actions.copySelection() },
    { id: 'edit.cut', title: 'Cortar', group: 'Edición', shortcut: 'Ctrl+X', enabled: hasSelection, run: () => actions.cutSelection() },
    { id: 'edit.paste', title: 'Pegar', subtitle: 'En la posición del cursor', group: 'Edición', shortcut: 'Ctrl+V', enabled: () => actions.hasClipboard(), run: () => actions.pasteClipboard() },
    { id: 'edit.duplicate', title: 'Duplicar', group: 'Edición', shortcut: 'Ctrl+D', enabled: hasSelection, run: () => actions.duplicateSelection() },

    { id: 'doc.titleBlock', title: 'Rótulo del plano…', subtitle: 'Proyecto, plano, revisión, fecha, autor (sale en PDF / PNG / SVG)', group: 'Documento', keywords: ['cajetin', 'rotulo', 'titulo', 'plano', 'carátula', 'revision'], run: () => dialogs.titleBlock.open() },

    { id: 'align.left', title: 'Alinear a la izquierda', group: 'Alinear', enabled: atLeast(2), run: () => actions.alignSelection('left') },
    { id: 'align.centerX', title: 'Alinear centros (vertical)', group: 'Alinear', enabled: atLeast(2), run: () => actions.alignSelection('centerX') },
    { id: 'align.right', title: 'Alinear a la derecha', group: 'Alinear', enabled: atLeast(2), run: () => actions.alignSelection('right') },
    { id: 'align.top', title: 'Alinear arriba', group: 'Alinear', enabled: atLeast(2), run: () => actions.alignSelection('top') },
    { id: 'align.centerY', title: 'Alinear centros (horizontal)', group: 'Alinear', enabled: atLeast(2), run: () => actions.alignSelection('centerY') },
    { id: 'align.bottom', title: 'Alinear abajo', group: 'Alinear', enabled: atLeast(2), run: () => actions.alignSelection('bottom') },
    { id: 'align.distributeX', title: 'Distribuir horizontalmente', subtitle: 'Separaciones iguales (3 o más)', group: 'Alinear', enabled: atLeast(3), run: () => actions.distributeSelection('x') },
    { id: 'align.distributeY', title: 'Distribuir verticalmente', subtitle: 'Separaciones iguales (3 o más)', group: 'Alinear', enabled: atLeast(3), run: () => actions.distributeSelection('y') },

    { id: 'wire.reset', title: 'Cables: volver a auto-ruteo y rótulos por defecto', subtitle: 'Sobre los cables seleccionados, o todos si no hay ninguno', group: 'Cableado', keywords: ['reacomodar', 'ruteo', 'reset'], run: () => actions.resetWireLayout() },
    { id: 'wire.toggleNumber', title: 'Rótulos de cable: mostrar / ocultar número', group: 'Cableado', run: () => actions.toggleDisplay('wireNumber', 'Número de cable') },
    { id: 'wire.togglePhase', title: 'Rótulos de cable: mostrar / ocultar función (L1, N, 24V…)', group: 'Cableado', run: () => actions.toggleDisplay('wirePhase', 'Función del cable') },
    { id: 'wire.toggleGauge', title: 'Rótulos de cable: mostrar / ocultar sección (mm²)', group: 'Cableado', keywords: ['calibre', 'seccion', 'diametro'], run: () => actions.toggleDisplay('wireGauge', 'Sección del cable') },

    { id: 'view.symbols', title: 'Vista: alternar forma física / símbolo eléctrico', subtitle: 'Dibuja cada componente con su símbolo IEC (también en exportaciones)', group: 'Vista', shortcut: 'S', keywords: ['simbolo', 'iec', 'esquema', 'unifilar', 'forma'], run: () => actions.toggleViewMode() },
    { id: 'view.fit', title: 'Ajustar vista al contenido', group: 'Vista', shortcut: 'F', run: () => documents.fitView() },

    { id: 'dim.width', title: 'Cota: ancho del componente', subtitle: 'Seleccioná 1 componente', group: 'Cotas', enabled: () => actions.selectedComponentCount() === 1, run: () => actions.addDimension('width') },
    { id: 'dim.height', title: 'Cota: alto del componente', subtitle: 'Seleccioná 1 componente', group: 'Cotas', enabled: () => actions.selectedComponentCount() === 1, run: () => actions.addDimension('height') },
    { id: 'dim.gapX', title: 'Cota: separación horizontal', subtitle: 'Seleccioná 2 componentes', group: 'Cotas', enabled: () => actions.selectedComponentCount() === 2, run: () => actions.addDimension('gapX') },
    { id: 'dim.gapY', title: 'Cota: separación vertical', subtitle: 'Seleccioná 2 componentes', group: 'Cotas', enabled: () => actions.selectedComponentCount() === 2, run: () => actions.addDimension('gapY') },
  ]);

  editor.catalog.list().forEach((definition) => {
    registry.register({
      id: `place.${definition.id}`,
      title: definition.name,
      subtitle: [definition.brand, definition.category].filter(Boolean).join(' · '),
      group: 'Componente',
      keywords: [...definition.keywords, definition.id],
      run: () => editor.setTool('place', { definitionId: definition.id }),
    });
  });
}
