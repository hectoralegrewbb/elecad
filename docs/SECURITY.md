# Persistencia y alcance

El documento se procesa en el navegador. IndexedDB usa la base original `elcad`, almacén `documents`, registro `autosave`. Las etiquetas se insertan como texto y el exportador SVG escapa texto XML. No hay envío de planos a un servidor.

Se preserva el archivo gzip del ZIP. No se migra el formato distinto de la antigua versión React/Fabric ni se borra su IndexedDB `elcad-local-v1`.

Nuevo y abrir son reversibles durante la sesión. Autoguardado original con debounce de 1,5 segundos; no incluye bloqueo entre pestañas ni copias versionadas. Usar una sola pestaña de edición y guardar archivos .elcad para copias independientes.

Dimensiones y bornes de catálogo son aproximados y requieren validación con fabricante para documentación final. Esta revisión es un pulido del editor, no una auditoría de normativa eléctrica o de archivos de origen desconocido.

### Datos de interfaz 0.5
Visibilidad de paneles, gesto y panel de documento abierto viven solo en RAM dentro de Workbench, leídos por sus handlers de interfaz. Se eliminan al cerrar o recargar. No se incorporan al archivo ni a IndexedDB. No se modifica autenticación, red ni persistencia.

### Datos 0.6
Orientaciones y locked se guardan en RAM, autoguardado IndexedDB y archivos .elcad exportados. Los leen renderer/exportadores y comandos/selección respectivamente. Persisten con el documento; se revierten desde propiedades o desbloqueo y se eliminan al eliminar ese componente tras desbloquearlo. Las opciones de rótulos siguen en meta.display. No se agrega envío de datos, autenticación ni servidor.
