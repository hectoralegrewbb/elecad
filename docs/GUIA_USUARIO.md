# ElCad eléctrico — Guía de uso

Editor para armar el **layout de gabinetes** y esquemas eléctricos de planta, con cableado, cotas, lista de materiales y plano imprimible. Funciona en el navegador y **guarda todo en tu equipo** (nada se envía a ningún servidor).

## 1. La pantalla

- **Barra superior**: nombre del documento (menú Archivo), deshacer/rehacer, herramientas **Seleccionar / Cablear**, vista **Forma / Símbolo**, **Comandos** (`Ctrl K`), **Guardar** y **Exportar**.
- **Biblioteca** (izquierda): los 188 componentes. Buscá por nombre, marca o tipo, filtrá por categoría y hacé clic para colocar.
- **Lienzo** (centro): tu plano. Abajo a la derecha el zoom; abajo a la izquierda las acciones de la selección.
- **Propiedades** (derecha): sin selección muestra el **documento**; con un elemento seleccionado, sus datos editables.
- **Barra de estado**: herramienta, zoom, posición del cursor en mm, cantidad de componentes y cables, y el estado del autoguardado.

## 2. Primer plano en 5 pasos

1. **Cargá un gabinete**: en la biblioteca buscá «gabinete» y hacé clic en el tamaño que necesitás; después clic en el lienzo.
2. **Colocá componentes**: buscá «disyuntor», «contactor», «variador»… clic en la biblioteca y clic en el lienzo. Con `Shift` al hacer clic podés colocar varios seguidos. `R` rota el componente antes de soltarlo. `Esc` cancela.
3. **Cableá**: tecla `W` (o botón **Cablear**), clic en un borne, clic en el borne destino. Los cables buscan solos un camino ortogonal evitando equipos. Para forzar el recorrido, hacé clic en puntos intermedios antes de llegar al destino.
4. **Rotulá y numerá**: elegí un cable y completá **Etiqueta**, **Color**, **Calibre** y **Fase / función** (la fase sugiere el color: L1 marrón, L2 negro, L3 rojo, N celeste, PE verde-amarillo, 24V azul…). Para numerar todo: `Ctrl K` → «Numerar cables por nodo».
5. **Exportá**: botón **Exportar** (SVG, PNG, PDF, lista de materiales, lista de cables).

## 3. Trabajar con componentes

- **Mover**: arrastrá. Se alinea con bordes/centros de otros componentes (guías magenta) y con la grilla. `Alt` mientras arrastrás desactiva el imán.
- **Flechas** mueven la selección una grilla (`Shift` = ×10).
- **Rotar**: `R`. **Duplicar**: `Ctrl D` (lleva los cables internos). **Copiar/Cortar/Pegar**: `Ctrl C/X/V` (pega en el cursor; funciona entre pestañas).
- **Seleccionar varios**: arrastrar un recuadro, `Shift`+clic o `Ctrl A`. Con 2 o más, `Ctrl K` → «Alinear…».
- **Propiedades del componente**: etiqueta (KM1, Q1…), posición, rotación. Los equipos configurables (PLC con E/S, barras, etc.) tienen una sección **Configuración** donde cambiás cantidad de entradas, puntos, tipos.
- **Eliminar**: `Supr`. Los cables conectados quedan **huérfanos** (naranja punteado) para que no pierdas el trazado: reconectalos o borralos.

## 4. Cables

| Dato | Para qué |
|---|---|
| Color | Identificación visual; en pantalla se aclara para verse sobre fondo oscuro, en papel sale en su color real |
| Calibre (mm²) | Entra en la lista de cables; el panel muestra Ø conductor y Ø exterior aproximado |
| Fase / función | L1, L2, L3, N, PE, 24V, 0V, ETH, PB, RS485, CAN. Cambia el color según convención |
| Etiqueta | Texto que viaja sobre el cable |

Arrastrá un tramo (■) o el rótulo para moverlos. **Volver a auto-ruteo** descarta los puntos manuales.

## 5. Vistas

- **Forma**: el equipo como se ve en el gabinete (para el layout físico).
- **Símbolo**: símbolos eléctricos (para esquemas).

El cambio es reversible y no modifica el contenido.

## 6. Cotas

Con componentes seleccionados, `Ctrl K` → **Cotas**: ancho/alto (un componente) o separación horizontal/vertical (dos). Las cotas quedan **ligadas** a los componentes: se actualizan solas al moverlos. Su separación se ajusta en Propiedades.

## 7. Rótulo del plano

En Propiedades (sin selección) → **Rótulo del plano…** o `Ctrl K` → «Rótulo del plano»: proyecto, plano, revisión, fecha y autor. Sale en el PDF, PNG y SVG.

## 8. Guardar y exportar

- **Autoguardado**: automático en tu navegador (barra de estado: «Autoguardado ✓»). Al volver a abrir, se restaura tu sesión.
- **Guardar** (`Ctrl S`): descarga un archivo **.elcad**. Es tu copia de seguridad y lo que compartís. **Abrir** (`Ctrl O`) lo recupera.
- **SVG**: vectorial a escala 1:1 en mm.
- **PNG**: imagen.
- **Imprimir / PDF**: vectorial, ajustado a A3 apaisada (cambiable en el diálogo del navegador).
- **Lista de materiales (CSV)** y **Lista de cables (CSV)**: con `;` como separador y coma decimal, para abrir directo en Excel. El largo de cable sale del trazado real, **sin holgura**: sumá lo que corresponda por punta y por curvas.

## 9. Atajos

| Tecla | Acción |
|---|---|
| `Ctrl K` | Comandos y componentes |
| `V` / `W` | Seleccionar / Cablear |
| `R` | Rotar |
| `Supr` | Eliminar |
| `Ctrl Z` / `Ctrl Y` | Deshacer / Rehacer |
| `Ctrl C / X / V` | Copiar / Cortar / Pegar |
| `Ctrl D` | Duplicar |
| `Ctrl A` | Seleccionar todos los componentes |
| Flechas (`Shift` ×10) | Mover una grilla |
| `Ctrl S` / `Ctrl O` | Guardar / Abrir |
| `F` | Encuadrar el plano |
| `Espacio` + arrastrar, botón central | Mover la vista |
| Rueda | Zoom |
| `Alt` al arrastrar | Sin imán |
| `Backspace` (cableando) | Quitar el último punto |

## 10. Buenas prácticas y límites

- **Verificá contra la hoja de datos**: dimensiones y bornes del catálogo son aproximados. Antes de pedir o fabricar algo con el plano, validalo con el fabricante.
- **Guardá el `.elcad`** al terminar una sesión: el autoguardado vive en ese navegador y puede perderse si se borran los datos del sitio.
- **Una sola pestaña** de edición a la vez.
- No reemplaza una verificación de normativa eléctrica.

## 11. Problemas frecuentes

| Síntoma | Qué hacer |
|---|---|
| Un cable no encuentra camino | Mové algún equipo o agregá puntos intermedios; aparece un aviso si es imposible |
| Cables en naranja punteado | Quedaron huérfanos: reconectalos a un borne o eliminalos |
| No aparece mi sesión anterior | Abrí el `.elcad` guardado; el autoguardado es por navegador |
| La biblioteca no encuentra algo | Probá con la marca, el tipo o «Todas» en categoría; `Ctrl K` busca también comandos |

### Paneles de la versión unificada
Biblioteca abre/cierra el catálogo. Propiedades abre la selección actual o el resumen del documento si no hay selección. Cada panel tiene cierre × y permite Escape desde sus controles. En móvil, abrir uno cierra el otro y elegir un componente libera el lienzo.

### Texto y bloqueo
Seleccioná una pieza y elegí Texto etiqueta → vertical para regletas densas. Texto bornes controla la lectura de identificadores y Texto interior la leyenda interna. Las preferencias se guardan en el plano.
Para ocultar mm², apagá Sección mm² en RÓTULOS. Para quitar todo el texto de los cables, apagá también Número y Función. El calibre eléctrico no cambia.
Para fijar el tablero: seleccioná gabinete y presioná Bloquear gabinete. Menú del nombre del documento → Desbloquear gabinetes lo libera sin seleccionarlo.
