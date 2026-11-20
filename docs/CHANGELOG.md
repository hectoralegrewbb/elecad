# Bitácora
## 0.7.0 — 2026-11-18
Catálogo ampliado, cableado más legible e interfaz más suave.

- **Variadores**: nuevos archivos `catalogDrives.js` (todos los variadores, ids existentes intactos) con Schneider Altivar ATV12/212/320 mono/340/610/930, Siemens G120X FSB/FSC, ABB ACS355/580 R3/880, Danfoss FC 302/280/102, WEG CFW300/CFW11, Yaskawa V1000/GA500, Delta VFD-EL/MS300, Mitsubishi FR-D720S/FR-E820 y Allen-Bradley PowerFlex 525. La altura se ajusta sola a la cantidad de bornes de control. Bornes simplificados: verificar con el manual.
- **Filtros activos de armónicos (APF)**: `catalogHarmonics.js` con Schneider EasyLogic APF 50/100/150 A (medidas de la hoja de datos) y un APF genérico con ancho/alto configurables para otras marcas. Símbolo propio.
- **Bobinas y toroides** (`catalogMagnetics.js`): bobina/reactor monofásico, reactor trifásico, bobina toroidal, choke toroidal de modo común y TI toroidal, para armar filtros LC y la medición de los APF.
- **Cajas chicas** (`catalogSmallEnclosures.js`): cajas de paso 100×100 a 200×200, gabinetes chicos hasta 300×400, gabinete a medida y botonera de 1 a 6 agujeros Ø22,5.
- **Cableado**: el router A* penaliza cruces (`crossPenalty`) y separa carriles paralelos 2 celdas (`nearRadius`). En una escena de 50 cables: cables pegados 2330 → 145 mm, cruces 58 → 46. Esquinas redondeadas (también en SVG), puntos de unión donde varios cables comparten un extremo y resaltado temporal del nodo bajo el puntero (el resto se atenúa).
- **UI/UX 0.7**: esquinas redondeadas en equipos y selección, halo en bornes, paneles flotantes translúcidos, botones y campos con transiciones cortas, scrollbars finas, paneles laterales que se deslizan.
- Prueba nueva `catalogAdditions.test.mjs`; la prueba de puentes ahora fuerza un cruce porque el router evita los innecesarios.

## 0.4.0 — 2026-10-29
Rediseño visual y de interacción alineado con ElCad 3D.

- Layout acoplado: barra superior, **biblioteca** permanente (búsqueda + categoría + miniaturas), **propiedades** siempre visibles (documento sin selección) y barra de estado.
- Paleta tinta/azul (`#14181f` / `#4da3ff`) en interfaz y lienzo; el color de cada cable no cambia.
- Estado vacío utilitario; atajos y resumen del documento en Propiedades.
- Nuevos módulos `libraryPanel`, `libraryFilter`, `componentThumbnail`; `Workbench` pasa a recibir `topbar` y `stage`.
- Prueba nueva `libraryFilter.test.mjs`. Documentación: `DESARROLLO.md` y `GUIA_USUARIO.md`.

## 0.2.0 — 2026-10-27
Autorización: «Avanza con todas las fases, testea y dejalo al 100% funcional».
- Documento JSON validado, Zustand/Immer, historial, grafo de bornes y cables huérfanos.
- Catálogo, inserción, arrastre, snapping, edición contextual, cotas y texto.
- A* ortogonal con obstáculos, puentes y avisos de rutas imposibles.
- Dexie con autoguardado cada dos segundos, diez copias de recuperación y bloqueo entre pestañas.
- Guardar/abrir .elcad comprimido, PDF vectorial, PNG y WebP.
- Paleta de comandos, atajos y adaptación móvil.
- 20 pruebas automáticas y QA interactiva; detalle y límites en TEST_REPORT.md.

## 0.1.0 — 2026-10-27
- Lienzo Fabric.js con cuadrícula, zoom anclado, paneo y reset.
- Shell responsive, guía de controles y estados de error.

## 0.3.0 — 2026-10-29
Base elegida explícitamente: ZIP del usuario. Se conservan sus 188 componentes, formato y módulos JavaScript/Canvas. Se sustituye la rama de interfaz React/Fabric por esa base aprobada.

- Controles flotantes de archivo, edición, Forma/Símbolo, zoom y selección.
- Paleta con miniaturas, filtros y estados accesibles.
- Tema carbón/salvia, bornes de anillo, etiquetas y cuadrícula de puntos.
- Propiedades con cierre y adaptación de ancho.
- Nuevo/abrir/ejemplo reversibles en el historial.
- Corrección gráfica de la bobina del contactor superpuesta a L3.
- Pruebas y documentación actualizadas a la arquitectura elegida.

## 0.5.0 — 2026-11-04 — Integración aprobada

- Base elcad-electrico: biblioteca de 188 componentes, búsqueda y categorías.
- Biblioteca plegable, propiedades contextuales y resumen de documento bajo demanda.
- Barra compacta y paneles superpuestos hasta 960 px; sin apilado que reduzca el lienzo.
- Apertura contextual diferida hasta pointerup/pointercancel para no alterar el arrastre.
- Cámara conserva centro y escala al redimensionar el lienzo.
- Contraste de cuerpos y bornes tomado de elcad-pulido; colores funcionales de cables conservados.
- CTA para limpiar filtros, cierres accesibles, foco y movimiento reducido.
- Cambios de aplicación: styles.css, src/ui/workbench.js, libraryPanel.js, propertiesPanel.js, src/app/main.js, src/render/theme.js. Metadatos, documentación y pruebas actualizados. Firmas públicas existentes preservadas.
- Pendiente heredado: bloqueo de autoguardado entre pestañas, cuotas y archivos hostiles; no incluidos en esta integración visual.

## 0.6.0 — 2026-11-04 — Correcciones aprobadas

Orientación de etiqueta, bornes y texto interior; límites de exportación incluyen etiquetas. Controles visibles para número/función/sección. Bloqueo de gabinete con exclusión de clic, marco y seleccionar todo; guardas de movimiento, rotación, borrado, alineación y duplicado. Desbloqueo desde documento. Tema industrial neutro. Sonda genérica de ionización (189 definiciones).

Archivos: styles.css; src/app/appCommands.js, editorActions.js; src/core/align.js, commands.js, documentState.js, sceneBounds.js, nuevo textLayout.js; src/data/catalogSensors.js; src/interaction/hitTesting.js, selectTool.js; src/io/svgExporter.js; src/render/drawComponents.js, theme.js; src/ui/propertiesPanel.js, workbench.js; package.json; tests/editorCorrections.test.mjs y documentación.

Pendientes: Emerson Unidrive y sensores específicos sin referencia. Se mantiene pendiente heredado de concurrencia de autoguardado entre pestañas/iframes; usar una sola instancia de edición. No se implementó bloqueo de persistencia como cambio incidental.

## Plano unifilar

- Editor de potencia con símbolos, puertos, barras, conexiones ortogonales, derivaciones y propiedades de circuito.
- Láminas A4/A3 verticales y apaisadas con cajetín, SVG e impresión vectorial.
- Guardado `.elcad` versionado y recuperación local por editor. Se conservan la apertura y las exportaciones de gabinetes.
