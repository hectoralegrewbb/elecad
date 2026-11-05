# ElCad eléctrico — Documentación de desarrollo

Editor local de gabinetes y esquemas eléctricos. JavaScript ES modules + Canvas 2D, **sin build y sin dependencias**. Todo corre en el navegador; nada se envía a un servidor.

## 1. Puesta en marcha

```bash
node serve.mjs                 # http://localhost:5173  (PORT=xxxx para cambiar)
npm test                       # modelSmoke + documentService + libraryFilter
npm run build                  # copia index.html, styles.css y src/ a dist/
```

Los módulos ES no cargan desde `file://`: hace falta el servidor estático incluido (`serve.mjs`, sin caché).

## 2. Arquitectura en capas

| Capa | Carpeta | Responsabilidad | Conoce el DOM |
|---|---|---|---|
| Dominio | `src/core` | documento inmutable, comandos, historial, geometría, ruteo A*, netlist, cotas, reportes, portapapeles, numeración | No |
| Datos | `src/data` | catálogo (188 definiciones), símbolos, dispositivos configurables, documento de ejemplo | No |
| Render | `src/render` | cámara, escena, temas, overlays, dibujo de componentes/cables sobre Canvas 2D | Solo el canvas |
| Interacción | `src/interaction` | selección, herramientas (seleccionar, cablear, colocar), hit-testing, eventos de puntero | Canvas |
| E/S | `src/io` | formato `.elcad`, IndexedDB, acceso a archivos, SVG/PNG/impresión | Sí (APIs del navegador) |
| UI | `src/ui` | barra superior, biblioteca, propiedades, paleta, cajetín, estado, avisos | Sí |
| App | `src/app` | composición (`main.js`), acciones, atajos, servicio de documento | Sí |

Regla: las dependencias van hacia abajo (UI → app → interacción/render → core). `core` y `data` nunca importan nada de `ui`/`render`.

`src/app/main.js` es la **raíz de composición**: instancia catálogo, store, servicios, renderer, herramientas y paneles, y los conecta. Ningún módulo de dominio conoce el DOM.

## 3. Modelo de documento

Estado inmutable (los reducers comparten estructura):

```js
{
  meta: { name, units: 'mm', gridSize: 5, version: 1, display?: { viewMode: 'shape'|'symbol' }, titleBlock? },
  components: { [id]: { id: 'cmp_…', defId, x, y, rotation: 0|90|180|270, label, props: {} } },
  wires:      { [id]: { id: 'wir_…', from: { componentId, terminalId }, to: {…}, waypoints: [], color, gauge, phase, label, labelOffset? } },
  dimensions: { [id]: { id: 'dim_…', … offset } }
}
```

- Unidades en **mm**; el origen de cada definición es la esquina superior izquierda y la rotación 0.
- Los prefijos de id (`cmp_`, `wir_`, `dim_`) los usan `isComponentId/isWireId/isDimensionId`.
- `migrateState(raw)` rellena campos faltantes; `repairDocument(state, catalog)` quita referencias a componentes/bornes inexistentes (cables huérfanos).
- Un cable sin extremo conectado es **huérfano** (naranja punteado); el estado se deriva en `buildNetlist` (union-find sobre bornes), nunca se guarda.

### Historial
`DocumentStore` mantiene un historial por referencias (límite 200):
- `apply(reducer)`: un cambio = una entrada de deshacer.
- `applyTransient(reducer)` + `commitTransient()`: gestos continuos (arrastre) = una sola entrada. El reducer recibe siempre el estado del inicio del gesto.
- `replace(state)`: reemplaza sin historial (restauración inicial). `DocumentService.loadState` usa una transacción deshacible (nuevo/abrir/ejemplo se pueden deshacer).

### Comandos
`createCommands(catalog)` (`core/commands.js`) devuelve reducers puros: `addComponent`, `addWire`, `moveComponents`, `updateComponent`, `updateComponentProps`, `updateWire`, `updateDimension`, `updateMeta`, `removeEntities`, etc. Se aplican siempre vía `store.apply(...)`.

## 4. Catálogo de componentes

Definición estática (en `src/data/catalog*.js`):

```js
{ id, category, brand, name, width, height, labelPrefix, keywords: [], blocksRouting, commonNet,
  terminals: [{ id, x, y, side: 'top'|'right'|'bottom'|'left', net? }],
  shapes: [{ t: 'rect'|'line'|'circle'|'text', … }] }
```

Definición **paramétrica**: agrega `parameters: [{ key, label, type: 'number'|'select'|'text', min, max, options, default }]` y `build(params) → { width, height, terminals, shapes }`. Los valores viven en `component.props`; `catalog.resolve(component)` devuelve la definición efectiva (se reconstruyen los bornes al cambiar un parámetro; los cables a bornes que desaparecen quedan huérfanos).

### Agregar un componente
1. Elegí el archivo por categoría (`catalogProtection.js`, `catalogControl.js`, …) o creá uno y registralo en `defaultCatalog.js`.
2. Usá los helpers de `catalogHelpers.js`: `rowDevice({ top, bottom, pitch, symbol, … })`, `terminalRow`, `centeredText`, `contactorCoil`, `verticalArrow`.
3. Dimensiones y posición de bornes en **múltiplos de 5 mm** (caen sobre la grilla). Son aproximadas: verificar con la hoja de datos antes de usar en planos reales.
4. Poné `keywords` útiles (el buscador usa `name + brand + category + keywords + id`).
5. `npm test`: `modelSmoke` valida que todas las definiciones sean consistentes.

### Símbolos eléctricos
`data/symbolLibrary.js` define el dibujo en vista **Símbolo**; la vista **Forma** usa `shapes`. `drawComponent(ctx, component, definition, { theme, scale, symbols })` sirve a ambos y a las miniaturas.

## 5. Cableado

- Herramienta `wire` (`W`): clic en un borne, waypoints opcionales, clic en el borne destino.
- `RouteService` + `WireRouter`: **A\*** ortogonal sobre grilla virtual, estado = (celda, dirección) para penalizar giros (`bendPenalty` 6, `nearPenalty` 4, `overlapPenalty` 200, `nodeLimit` 250 000). Los componentes con `blocksRouting` son obstáculos.
- Un cable con `waypoints` es **manual**; sin ellos es automático y se recalcula al mover componentes.
- `HopCalculator` dibuja puentes en los cruces; `WireLabelPlacer` ubica rótulos.
- Color/función: `wireStandards.js` (`phaseColors`: L1 marrón, L2 negro, L3 rojo, N celeste, PE verde-amarillo, 24V azul…; `phaseGauges`; diámetros). Un solo lugar para cambiar la convención.
- `numbering.js`: «Numerar cables por nodo» (mismo número para todos los cables de un nodo; deshacible).

## 6. Render

`CanvasRenderer.render({ state, selection, overlay })` dibuja en orden: grilla (`drawOverlays`) → componentes (`drawComponents`) → cables (`drawWires`) → cotas → overlays de interacción. No muta el documento. `Viewport` maneja pan/zoom (`zoomAt`). La posición del puntero usa `canvas.getBoundingClientRect()`, así que el lienzo puede estar acoplado en cualquier lugar del layout.

### Temas
`render/theme.js` define `darkTheme` (tinta `#14181f`, acento `#4da3ff`, igual que ElCad 3D) y `printTheme` (fondo blanco, trazos negros). **El color de cada cable es función eléctrica**, no estilo: `wireColors` se mantiene aparte para pantalla (más claros) e impresión (saturados oscuros).

## 7. Interfaz

Layout acoplado (grid en `styles.css`):

```
┌──────────────────────── barra superior (Workbench) ───────────────────────┐
│ Biblioteca (LibraryPanel) │        lienzo + zoom/selección flotantes        │ Propiedades │
├───────────────────────────┴─────────────────────────────────────────────────┴─────────────┤
│ barra de estado                                                                            │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

| Módulo | Qué hace |
|---|---|
| `ui/workbench.js` | Barra superior (archivo, historial, herramientas, vista, comandos) + zoom y acciones de selección sobre el lienzo. Delega en `actions` y `documents`; no escribe en el modelo. |
| `ui/libraryPanel.js` | Biblioteca: búsqueda, categoría, miniaturas. Un clic ejecuta el comando `place.<id>` del registro (arma la colocación). |
| `ui/libraryFilter.js` | Lógica pura de filtrado (testeada). |
| `ui/componentThumbnail.js` | Miniatura con el renderer real (compartida por biblioteca y paleta). |
| `ui/propertiesPanel.js` | Siempre visible: **Documento** sin selección; componente / cable / cota / multi-selección con selección. |
| `ui/commandPalette.js` + `commandRegistry.js` | `Ctrl+K`: componentes y comandos. **El registro es la única fuente de acciones**: menú, paleta y biblioteca ejecutan los mismos comandos. |
| `ui/titleBlockDialog.js` | Rótulo del plano (proyecto, plano, revisión, fecha, autor). |
| `ui/statusBar.js` | Herramienta, zoom, cursor en mm, contadores, estado de autoguardado. |

Accesibilidad: botones con nombre accesible, `aria-pressed` en herramientas/vistas, paleta como combobox/listbox con flechas/Enter/Esc y foco contenido, foco visible, animaciones solo sin `prefers-reduced-motion`.

Responsive: ≤1100 px paneles de 232 px; ≤780 px el lienzo queda arriba y biblioteca/propiedades se apilan debajo. `tests/responsive.html` es un harness manual (360/768/1024 px).

### Agregar un comando
```js
registry.register({ id: 'doc.miComando', title: 'Mi comando', subtitle: '…', group: 'Documento',
  keywords: ['sinónimos'], shortcut: 'Ctrl+Alt+M', enabled: () => true, run: () => … });
```
(en `app/appCommands.js`). Aparece solo en la paleta; para sumarlo a un menú agregá su id en la lista de `workbench.js`.

### Agregar un campo de propiedades
En `propertiesPanel.js` usá `field(label, control)` con `textInput/numberInput/selectInput/integerInput` y aplicá el cambio con `this.apply(state => commands.updateX(state, id, patch))`.

## 8. Entrada/salida

| Tema | Detalle |
|---|---|
| `.elcad` | JSON `{ format:'elcad', version:1, savedAt, state }` comprimido con **gzip nativo** (`CompressionStream`). `parseDocument` acepta gzip o JSON plano y pasa por `migrateState`. |
| Autoguardado | IndexedDB (`elcad` / `documents` / `autosave`), debounce 1,5 s, `flush` en `pagehide`/`visibilitychange`. «Guardar» exporta el `.elcad` al disco (File System Access si existe). |
| SVG | Vectorial 1:1 en mm (`svgExporter.js`), con tema de impresión y rótulo. |
| PNG | `pngExporter.js`. |
| PDF | Diálogo de impresión del navegador sobre el SVG (A3 apaisada por defecto, cambiable). |
| CSV | Lista de materiales y de cables; separador `;` y coma decimal (Excel regional argentino). El largo de cable sale del trazado real, sin holgura. |
| Portapapeles | `core/clipboard.js` (marcador `elcad-clipboard`): copia componentes con sus cables internos y cotas; funciona entre pestañas. |

## 9. Pruebas

- `tests/modelSmoke.test.mjs`: 25 grupos (catálogo, comandos, ruteo, netlist, reportes, portapapeles, SVG, formato).
- `tests/documentService.test.mjs`: nuevo/abrir/ejemplo reversibles; bobina separada de los polos.
- `tests/libraryFilter.test.mjs`: categorías, búsqueda y combinación.
- Pruebas de interfaz: ad hoc con Playwright (no incluidas); usar `window.elcad` (`editor`, `store`, `catalog`, `documents`) para inspeccionar el estado desde la consola.

## 10. Convenciones

- Nombres en lowerCamelCase; clases en PascalCase; módulos con una responsabilidad.
- El dominio es puro: nada de DOM, `Date.now()` solo en E/S.
- Un cambio de documento = un `store.apply`; los gestos usan `applyTransient`.
- Colores de UI solo desde las variables CSS de `:root`; colores del lienzo solo desde `theme.js`.
- Sin dependencias ni build: si algo requiere una, discutirlo antes.

## 11. Limitaciones conocidas

- Dimensiones y bornes del catálogo son **aproximados**: validar con el fabricante para documentación final. No es una auditoría de normativa.
- Una sola pestaña de edición a la vez (no hay bloqueo entre pestañas ni copias versionadas); guardar `.elcad` para copias independientes.
- El formato `.elcad` de la versión React/Fabric anterior no es intercambiable con este.
