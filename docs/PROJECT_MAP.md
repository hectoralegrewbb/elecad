# Mapa del proyecto

- `index.html`: estructura (barra superior, biblioteca, lienzo, propiedades, estado).
- `styles.css`: tokens y estilos únicos (breakpoints 1100 / 780 px).
- `src/ui/workbench.js`: barra superior y controles flotantes del lienzo; delegan en acciones y servicios.
- `src/ui/libraryPanel.js`, `libraryFilter.js`, `componentThumbnail.js`: biblioteca, filtrado puro y miniaturas.
- `src/ui/commandPalette.js`: búsqueda universal de componentes y comandos.
- `src/ui/propertiesPanel.js`: documento, componente, cable, cota, multi-selección.
- `src/render/*`: cámara, escena, temas (`theme.js`), dibujo.
- `src/data/*`: catálogo de 231 componentes, símbolos, ejemplo.
- `src/io/*`: formato `.elcad`, autoguardado, SVG/PNG/impresión.
- `src/app/main.js`: composición. `documentService.js`: abrir/nuevo/ejemplo reversibles.
- `tests/modelSmoke.test.mjs`, `documentService.test.mjs`, `libraryFilter.test.mjs`; `tests/responsive.html` (manual).
- `serve.mjs`: servidor local. `scripts/build.mjs`: copia a `dist/`.
- `docs/DESARROLLO.md` (desarrollo) y `docs/GUIA_USUARIO.md` (uso).

### Integración 0.5
Workbench consume las APIs públicas de Editor, selección, acciones, documentos y registro. Gestiona visibilidad en RAM. LibraryPanel y PropertiesPanel emiten el evento DOM `panelclose`; no conocen el layout. main.js conserva el centro de Viewport al cambiar tamaño de CanvasRenderer. Core, data, interaction e io no cambian.

### 0.6
core/textLayout.js exporta textAngle y componentLabelLayout; consume geometría pública y lo consumen Canvas, SVG y sceneBounds. El bloqueo se aplica en comandos/selección; UI solo invoca comandos. Los exportadores de imagen y PDF reutilizan las rutas existentes.

### Plano unifilar

- `src/unifilar/model.js` define el documento de potencia, sus símbolos, circuitos y operaciones puras.
- `src/unifilar/sheet.js` compone la lámina en SVG a partir del modelo y usa las APIs de cajetín y simbología existentes. Exporta geometría, rutas y diagnósticos.
- `src/unifilar/workspace.js` monta el editor, consume el historial público de `DocumentStore` y delega archivo, impresión y autoguardado en `src/io/`.
- `src/app/main.js` conecta ambos editores y dirige la apertura de archivos según el tipo devuelto por `readDocument`.
