# Verificación 0.3 — 2026-10-29

## Automatizada
`npm test`: 25 grupos originales de dominio, ruteo, portapapeles, parámetros, formato y exportación; regresiones añadidas de historial para nuevo/abrir/ejemplo y bobina del contactor sin superposición con L3.

## Navegador Chrome
- Carga del ejemplo: cinco componentes y siete cables.
- Alternancia Forma/Símbolo, recarga y recuperación local.
- Búsqueda de contactor Siemens 24V con miniatura, inserción y propiedades.
- Deshacer inserción, nuevo documento y restauración del plano anterior mediante Deshacer.
- Descarga PNG completada e inspeccionada visualmente.
- Menús de archivo y exportación, botones de zoom y encuadre.
- Sin desbordamiento horizontal a 360, 768 y 1024 px en harness iframe.

## Límites de verificación
La descarga SVG no produjo evento de descarga en el navegador remoto HTTP; su generación está cubierta por la suite original. No se verificaron diálogo PDF ni dispositivo táctil físico. El sitio publicado requiere la sesión privada del propietario. No se afirma validación industrial ni certificación IEC.

## Integración 0.5 — 2026-11-04

Automatizadas: npm test (25 grupos de modelo; historial nuevo/abrir/ejemplo; regresión de bobina; filtros; carga de fixtures .elcad generados por ambos ZIP originales, reparación sin cambios y round-trip). Build estático y sintaxis de módulos.

Verificación en Chromium: biblioteca plegable, resumen de documento, selección contextual, arrastre y deshacer (X vuelve a 300 mm), duplicar/deshacer/rehacer, conexión por bornes (7 → 8 cables) y deshacer, paleta y Escape, descarga SVG, restauración de sesión al recargar.

Responsive mediante iframe con viewport real: 320×800, 768×800 y 1024×800. A 320 la barra mide 308 px y no desborda; búsqueda sin resultados, limpiar filtros, insertar y abrir propiedades funcionan. A 768 el lienzo conserva 686 px de alto con panel abierto. A 1024 el lienzo mide 792×730 con biblioteca abierta. Escritorio también revisado a 1363×936.

Límites: no se verificó hardware táctil real ni Safari/Firefox; guardado con selector nativo y diálogo de impresión PDF no se ejercitaron en esta revisión. PNG y PDF conservan implementación anterior. No es una certificación eléctrica ni garantía de ausencia de defectos.

## 0.6 — 2026-11-04

Automatizadas: suite anterior completa y editorCorrections.test.mjs. Verifica bloqueo/clic, movimiento, rotación, borrado, alineación, duplicado, undo/redo; orientación SVG, límites de texto, .elcad round-trip, validación de campos, visibilidad de sección y nuevo borne ION.

Chromium: conmutador Sección mm², selección/bloqueo de gabinete y clic posterior sin selección; resumen con desbloqueo individual; inserción de sonda y selección vertical visible en canvas. Barra de rótulos sin desborde a 320, 768 y 1024px mediante iframe.

No verificados en esta revisión: hardware táctil, Safari/Firefox, selector nativo de archivo ni impresión del sistema. Exportación SVG probada por test; PNG/PDF conservan sus pipelines compartidos. No se certifican modelos eléctricos de fabricante.
