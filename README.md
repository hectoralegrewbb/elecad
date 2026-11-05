# ElCad eléctrico — Layout de gabinetes · 0.4

Documentación: [`docs/GUIA_USUARIO.md`](docs/GUIA_USUARIO.md) (uso) · [`docs/DESARROLLO.md`](docs/DESARROLLO.md) (desarrollo).

Base: `elcad (7).zip`, conservando sus módulos, catálogo de 188 componentes y formato `.elcad`.

## Revisión visual

- Layout acoplado (barra superior, biblioteca, lienzo, propiedades, estado), misma familia visual que ElCad 3D.
- Tema tinta/azul; bornes de anillo y etiquetas con mayor contraste.
- Biblioteca permanente con búsqueda, categorías y miniaturas; paleta `Ctrl K` con navegación por teclado.
- Accesos directos a archivo, exportación, zoom, rotación y duplicado.
- Propiedades siempre visibles (documento sin selección), adaptables a pantallas angostas.
- Nuevo, abrir y cargar ejemplo se pueden deshacer.
- Bobina del contactor separada del conductor de potencia en la vista símbolo.

`npm test` ejecuta las pruebas originales y las regresiones añadidas.
`npm run build` prepara `dist/` para un servidor estático, sin instalar dependencias.

La versión React/Fabric publicada anteriormente usaba otro formato `.elcad`; no es intercambiable con este. Esta revisión mantiene el formato del ZIP que elegiste como base.


JavaScript ES modules + Canvas 2D. Sin build, sin dependencias.

## Ejecutar

```
node serve.mjs        # http://localhost:5173
node tests/modelSmoke.test.mjs
```

(Los módulos ES no cargan desde `file://`: hace falta el servidor, aunque sea el de 25 líneas incluido.)

## Atajos

| Tecla | Acción |
|---|---|
| Ctrl+K | Paleta: componentes y comandos |
| V / W | Seleccionar / Cableado |
| R | Rotar (también en el ghost al colocar) |
| Supr | Eliminar (los cables quedan huérfanos, en naranja punteado) |
| Ctrl+Z / Ctrl+Y | Deshacer / Rehacer |
| Ctrl+C / Ctrl+X / Ctrl+V | Copiar / cortar / pegar (en el cursor; lleva cables internos y cotas; funciona entre pestañas) |
| Ctrl+D | Duplicar (con cables internos) |
| Ctrl+A | Seleccionar todos los componentes |
| Flechas (Shift = ×10) | Mover la selección una grilla |
| Ctrl+S / Ctrl+O | Guardar / abrir `.elcad` |
| F | Ajustar vista |
| Espacio + arrastrar, botón central | Pan |
| Rueda | Zoom |
| Alt (al arrastrar) | Sin snapping |
| Shift + click (al colocar) | Colocar varios |
| Backspace (cableando) | Quitar último waypoint |

## Comandos de la paleta (Ctrl+K)

- **Cableado:** "Numerar cables por nodo" (mismo número para todos los cables de un nodo; deshacible).
- **Cotas:** ancho / alto (1 componente), separación horizontal / vertical (2 componentes).
- **Archivo:** exportar SVG (1:1 en mm), PNG, lista de materiales CSV, lista de cables CSV (con largo por trazado real, sin holgura),
  "Imprimir / guardar como PDF" (vectorial, ajustado a A3 apaisada; cambiable en el diálogo del navegador).
- Los CSV usan `;` como separador y coma decimal (Excel regional argentino).

## Estructura

```
src/core         modelo puro (sin DOM): documento, comandos, router A*, netlist, cotas, snapping
src/data         catálogo de componentes (JSON-like) y documento de ejemplo
src/render       renderer (IRenderer = render(scene) + resize()), tema, dibujo de escena
src/interaction  herramientas (select / wire / place), hit-testing, controlador de eventos
src/io           .elcad (gzip), IndexedDB, File System Access, exportadores SVG / PNG
src/ui           paleta, panel de propiedades, barra de estado, toasts
src/app          composición (main), editor, acciones, atajos
```

## Agregar componentes

Editar `src/data/defaultCatalog.js`. Unidades en mm; medidas múltiplos de 10 y bornes múltiplos de 5
para que caigan sobre la grilla de 5 mm. Las dimensiones actuales son APROXIMADAS: verificar contra hoja de datos.

## Componentes configurables

- `generic.plc.configurable` y `generic.io.configurable`: se define cuántas DI, DQ, AI, AQ, RTD (2/3/4 hilos), TC y qué comunicación tiene (Ethernet, PROFIBUS, RS485, RS232, CAN). Seleccionar el componente → panel "Configuración".
- Las CPU S7-1200 (1211C…1217C) y los módulos SM/CM vienen con la E/S real de cada modelo (verificar contra hoja de datos).
- Barras (N, PE, 0V, +24V, L1-L3) y regletas son paramétricas; sus bornes forman un solo nodo eléctrico.
- Entradas/salidas de potencia (acometida, bajada a motor, 24 V) están en la categoría "Potencia".
- Si al reducir un parámetro desaparecen bornes con cables, esos cables quedan huérfanos (extremo libre).

## Ruteo

Los cables se rutean en conjunto: primero los manuales, luego los automáticos en orden de creación. Ningún cable corre sobre la línea de otro; solo se cruzan en perpendicular (el tramo horizontal salta con un arco). Si no hay camino libre, se solapa como último recurso.

## Legibilidad del cableado

- Al conectar, el cable toma color, función y calibre según el borne (L1 marrón, L2 negro, L3 rojo, N celeste, PE verde-amarillo, 24 V azul, 0 V gris; potencia 2,5 mm², control 1 mm²). Tabla en `core/wireStandards.js`; se puede cambiar en el panel de propiedades.
- El grosor del trazo depende del calibre; la tierra se dibuja con franja amarilla.
- Los carriles paralelos se separan (≥ 10 mm cuando hay lugar).
- Al seleccionar un cable se resalta todo su nodo eléctrico y se atenúa el resto.
- Las etiquetas de cables y componentes tienen halo y no se pisan con los cables.

## Catálogo (188 componentes)

Configurables: termomagnética (polos/curva/corriente), PLC y módulo de E/S, SSR 1F/3F, controlador de temperatura PID, ventilador de gabinete, termostato, resistencia calefactora, transmisor 4-20 mA, RTD, termocupla, transformadores 1F/3F, fuente CC, barras y regletas.
Fijos: contactores, guardamotores, relés térmicos, SPD, monitor de fases, analizador de red, temporizadores (ON/OFF/multifunción/Y-Δ), relés de interfaz, switches Ethernet, variadores (G120C/V20/ATV/CFW/FC51/genéricos con bornes de control), motores, pulsadores, selectores, paros de emergencia, relé de seguridad, columna de señalización, sensores, final de carrera, encoder, celda de carga.

## Edición del cableado y del plano

- **Mover cables a mano:** seleccioná un cable y arrastrá un tramo (manija ■ en su punto medio): se mueve por la grilla (Alt = libre) y el cable pasa a trazado manual. "Volver a auto-ruteo" en el panel, o Ctrl+K → "Cables: volver a auto-ruteo…" (sobre los seleccionados, o todos).
- **Rótulos de cable:** se ubican solos en el tramo más despejado (sin cruzar otros cables, rótulos ni componentes). Se pueden arrastrar; "Restablecer posición del rótulo" en el panel. Muestran número · función · sección (ej. `1 · L1 · 2,5 mm²`); Ctrl+K → "Rótulos de cable: mostrar / ocultar número | función | sección".
- **Sección y diámetro:** en el rótulo, en el panel (Ø conductor y Ø exterior aproximado, tipo H07V-K) y en la lista de cables CSV.
- **Rótulo del plano (cajetín):** Ctrl+K → "Rótulo del plano…". Empresa, título, proyecto, cliente, N° de plano, hoja, revisión, dibujó, revisó, fecha y escala. Se dibuja bajo el esquema y sale en PDF / PNG / SVG.
- **Alinear / distribuir:** Ctrl+K → "Alinear…" (izquierda, centros, derecha, arriba, abajo; distribuir H/V con 3 o más componentes).
- El PDF / SVG ahora incluye los rótulos de los cables y usa el grosor según calibre.


## v6 — Símbolos, HMI, redes, bloque genérico y fuentes

- **Vista forma / símbolo eléctrico**: botones *Forma / Símbolo* de la barra, atajo `S` o Ctrl+K → "Vista: alternar…". En vista símbolo cada componente se dibuja con su símbolo IEC (contactores, interruptores, relés térmicos, motores, transformadores, fuentes, variadores, pulsadores, lámparas, sensores, RTD, barras, etc.) y el contorno físico queda tenue y punteado. El modo se guarda en el documento y también aplica a SVG/PNG/PDF. Los equipos sin símbolo propio (PLC, módulos, HMI, switches) siguen como bloque. Símbolos en `src/data/symbolLibrary.js` (tabla `rules` por id).
- **HMI** (`catalogNetwork.js`): KTP400/700/900/1200 Basic, TP700/TP1500 Comfort, Weintek MT8071iP, Delta DOP-107, Schneider HMIST6 y HMI configurable.
- **Redes**: ET 200S/MP, SCALANCE XR/SC, gateways PROFINET↔PROFIBUS / Modbus RTU / CANopen, equipo PROFINET IO configurable, conector PROFIBUS. Los cables entre puertos `eth*`, `pb*`, `rs485*`, `can*` se crean con función ETH (verde) / PB (violeta) / RS485 (gris) / CAN (blanco) y sin calibre de potencia.
- **Sensores de temperatura**: transmisor de cabezal Pt100→4-20 mA, NTC/PTC, digital 1-Wire, termostato bimetálico, pirómetro IR (se suman a RTD, termocupla y transmisor existentes).
- **Bloque genérico** (`generic.block`): nombre libre, alimentación de entrada (24 V CC / 230 V CA / 400 V CA 3F), salida de alimentación (24 V CC / 230 V CA), DI/DQ/AI/AQ, Ethernet, RS485 y bornes genéricos extra.
- **Fuentes de tensión** ideales: `generic.source.dc` (5–110 V CC, 1–4 salidas) y `generic.source.ac` (24–400 V CA, 1F/3F).
- Dimensiones y símbolos son aproximados: verificar con hojas de datos.

## Versión unificada 0.5.0

Integra la biblioteca con búsqueda y categorías de elcad-electrico y el lienzo contextual de elcad-pulido. Conserva los 188 componentes y el motor original de Canvas2D / JavaScript modular, sin nuevas dependencias.

Ejecutar `npm start` y abrir la dirección indicada en la terminal. No abrir index.html con file://: usa módulos ES. `npm test` ejecuta las pruebas; `npm run build` genera dist para un servidor estático. Node.js 20 o superior recomendado.

Biblioteca y Propiedades se abren desde la barra superior. En escritorio, seleccionar muestra propiedades después de soltar el puntero. Sin selección, Propiedades muestra el resumen del documento. A 960 px o menos los paneles se superponen al lienzo; elegir un componente cierra la biblioteca para colocarlo. Las preferencias de paneles se reinician al recargar.

Ver docs/TEST_REPORT.md para alcance probado y límites.

## 0.6.0 — Correcciones de edición

- Propiedades del componente: Texto etiqueta / Texto bornes / Texto interior, horizontal o vertical. La etiqueta vertical conserva tamaño legible, en lugar de achicarse según el ancho del borne.
- Barra RÓTULOS: Número, Función y Sección mm². Son opciones independientes, guardadas por documento y respetadas por los exportadores.
- Seleccionar gabinete → Bloquear gabinete. Para desbloquear: menú del nombre del documento → Desbloquear gabinetes, o resumen de documento → Desbloquear GAB1. El bloqueo no afecta al trabajo sobre los componentes internos.
- Tema grafito/azul con componentes neutros y barra de vista separada.
- Biblioteca: buscar ionización, varilla o electrodo. La sonda nueva es un símbolo genérico con dimensiones de representación, no un modelo de fabricante. Pt100, termocuplas y otros sensores térmicos existentes se conservan.
- Pendiente: referencias concretas Emerson Unidrive y sensores adicionales solicitados; se necesitan modelo/manual para bornes y dimensiones exactos.

Iniciar con npm start; ejecutar npm test y npm run build.
