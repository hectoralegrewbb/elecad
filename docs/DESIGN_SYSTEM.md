# Diseño 0.4

Misma familia visual que **ElCad 3D**: tinta oscura, un solo azul de acento, paneles acoplados, controles densos con etiqueta. Prioriza trabajar largo rato sin cansar la vista y encontrar cada cosa en el mismo lugar.

## Tokens (`:root` en `styles.css`)

| Token | Valor | Uso |
|---|---|---|
| `--bg` | `#14181f` | fondo del lienzo y de los campos |
| `--panel` / `--panel2` | `#1b212b` / `#222a36` | paneles / controles |
| `--line` | `#2d3646` | bordes y divisores |
| `--text` / `--muted` | `#e6ebf3` / `#8c98ad` | texto / secundario |
| `--accent` | `#4da3ff` | selección, herramienta activa, títulos de sección |
| `--danger` / `--ok` / `--warn` | `#ff6b6b` / `#5fd38d` / `#ffb020` | eliminar / guardado / advertencias |

El lienzo toma sus colores de `render/theme.js` (`darkTheme`), alineados con estos tokens. **El color de cada cable es función eléctrica** y no se reinterpreta como estilo.

## Layout

Barra superior (44 px) · biblioteca (272 px) · lienzo · propiedades (272 px) · estado (26 px). Zoom y acciones de selección flotan sobre el lienzo. El estado vacío es utilitario: dice qué hacer y ofrece buscar o cargar el ejemplo.

## Reglas

- Una acción primaria por vista (azul sólido); el resto, botones neutros con borde.
- Los iconos acompañan texto en herramientas principales; solo icono en acciones secundarias (con `title` y `aria-label`).
- Estados con más de color: `aria-pressed`, foco visible 2 px azul, deshabilitado a 35 %.
- Campos con etiqueta visible; unidades en la etiqueta (`Centro X (mm)`).
- Animación corta y solo sin `prefers-reduced-motion`.
- Responsive: ≤1100 px paneles de 232 px; ≤780 px apilado (lienzo arriba).

### 0.5 — Paneles adaptables
Acento azul sobre gris oscuro, componentes #2a302c con contornos #b8c4b5 y bornes #c6dfa4. Paneles acoplados en escritorio y superpuestos hasta 960 px. Barra en dos filas en modo compacto. Acciones de selección se separan verticalmente del zoom. Interacciones de color 160 ms; prefers-reduced-motion desactiva transiciones.

### 0.6 industrial
Fondo #1c222b, componentes #293340, borde #aebbc9, bornes #83b9dd. Radio 3px. Barra principal + barra RÓTULOS; botones con aria-pressed para distinguir estado. Altura total 78px escritorio / 122px compacto.
