// "Imprimir / PDF": el SVG vectorial se imprime desde un iframe oculto; el diálogo del navegador
// permite "Guardar como PDF" sin librerías. Sale ajustado a la hoja (A3 apaisada por defecto, editable en el diálogo).
export function printSvg(svgMarkup, title) {
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.append(frame);

  const printDocument = frame.contentDocument;
  printDocument.open();
  printDocument.write(
    '<!doctype html><html><head><meta charset="utf-8">' +
      '<style>@page{size:A3 landscape;margin:10mm}html,body{margin:0}svg{display:block;width:100%;height:auto;max-height:275mm}</style>' +
      `</head><body>${svgMarkup}</body></html>`,
  );
  printDocument.close();
  printDocument.title = title;

  frame.contentWindow.focus();
  frame.contentWindow.print();
  setTimeout(() => frame.remove(), 60000);
}
