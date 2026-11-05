# Arquitectura 0.4

Detalle completo en `DESARROLLO.md`.

Base aprobada por el usuario: `elcad (7).zip`. Se conserva JavaScript ES modules + Canvas 2D, sin dependencias. Esta elección sustituye la implementación React/Fabric previa, que sigue disponible en el historial Git.

- `core`: documento inmutable, comandos, historial, geometría, A*, netlist, cotas y reportes. Sin DOM.
- `data`: catálogo original de 188 definiciones, dispositivos configurables y símbolos declarativos.
- `render`: Canvas, cámara, escena, temas y overlays. No muta el documento.
- `interaction`: selección, inserción, cableado y eventos de puntero.
- `io`: formato gzip, IndexedDB, acceso a archivos, SVG/PNG e impresión vectorial.
- `ui`: `Workbench` (barra superior), biblioteca, propiedades, paleta, cajetín y estado.
- `app`: composición y acciones. `DocumentService.loadState` ahora utiliza una transacción deshacible; la restauración inicial continúa sin agregar historial.

Se mantienen las APIs existentes. `CommandPalette` acepta opcionalmente `catalog` para miniaturas; `open(query, filter)` mantiene compatibilidad con `open()`.

Build: copia estática a dist. No se publican tests ni documentos de desarrollo. PDF utiliza el diálogo de impresión del navegador, igual que la base del usuario.

### Interfaz unificada
Sin migración de stack: JavaScript ES modules y Canvas2D. Las dimensiones de paneles pertenecen a CSS; su visibilidad pertenece a Workbench. La apertura contextual espera el final del gesto del canvas. El esquema de documento y la compresión gzip siguen idénticos.

### 0.6
Nuevos campos opcionales de componente: labelOrientation, terminalOrientation, bodyTextOrientation y locked. Orientaciones horizontal/vertical; locked booleano. Validación en updateComponent y migrateState. Se conservan firmas existentes, esquema v1 y IDs del catálogo. El cuerpo de texto sin orientación explícita conserva su comportamiento previo de rotación; elegir orientación la independiza de la pieza.
