import { buildNetlist } from './netlist.js';
import { conductorDiameter, outerDiameters } from './wireStandards.js';

const csvSeparator = ';';

// Excel en configuración regional argentina usa coma decimal y ';' como separador de lista.
const decimal = (value) => String(Math.round(value * 10) / 10).replace('.', ',');

function pathLength(points) {
  let length = 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    length += Math.hypot(points[index + 1].x - points[index].x, points[index + 1].y - points[index].y);
  }
  return length;
}

// Lista de materiales: una fila por tipo de componente, con cantidad y referencias (Q1, KM1…).
export function buildBom(state, catalog) {
  const groups = new Map();
  Object.values(state.components).forEach((component) => {
    const definition = catalog.resolve(component);
    // Los paramétricos se agrupan por configuración: dos PLC con distinta E/S son ítems distintos.
    const description = catalog.describe(component);
    const key = `${definition.id}|${description}`;
    if (!groups.has(key)) groups.set(key, { definition, description, labels: [] });
    groups.get(key).labels.push(component.label);
  });
  return [...groups.values()]
    .sort((a, b) => a.definition.category.localeCompare(b.definition.category) || a.definition.name.localeCompare(b.definition.name))
    .map(({ definition, description, labels }) => ({
      cantidad: labels.length,
      marca: definition.brand,
      descripcion: description,
      categoria: definition.category,
      referencias: labels.join(', '),
      codigo: definition.id,
    }));
}

export const bomColumns = [
  { key: 'cantidad', title: 'Cantidad' },
  { key: 'marca', title: 'Marca' },
  { key: 'descripcion', title: 'Descripción' },
  { key: 'categoria', title: 'Categoría' },
  { key: 'referencias', title: 'Referencias' },
  { key: 'codigo', title: 'Código interno' },
];

// Lista de cables con largo según el trazado real (sin holgura ni terminales).
export function buildWireList(state, catalog, routeService) {
  const netlist = buildNetlist(state, catalog);
  const describe = (endpoint) => {
    if (endpoint.componentId === undefined) return 'LIBRE';
    const component = state.components[endpoint.componentId];
    return component ? `${component.label}:${endpoint.terminalId}` : '?';
  };
  return Object.values(state.wires).map((wire) => ({
    numero: wire.label,
    nodo: netlist.netIdByWire.get(wire.id) ?? '',
    origen: describe(wire.from),
    destino: describe(wire.to),
    color: wire.color,
    calibre: String(wire.gauge).replace('.', ','),
    diametro: decimal(conductorDiameter(wire.gauge)),
    diametroExterior: outerDiameters[String(wire.gauge)] !== undefined ? decimal(outerDiameters[String(wire.gauge)]) : '',
    fase: wire.phase,
    largo: decimal(pathLength(routeService.getPath(wire, state))),
    estado: netlist.orphanWireIds.includes(wire.id) ? 'Huérfano' : 'Conectado',
  }));
}

export const wireListColumns = [
  { key: 'numero', title: 'Nº' },
  { key: 'nodo', title: 'Nodo' },
  { key: 'origen', title: 'Origen' },
  { key: 'destino', title: 'Destino' },
  { key: 'color', title: 'Color' },
  { key: 'calibre', title: 'Calibre (mm²)' },
  { key: 'diametro', title: 'Ø conductor (mm)' },
  { key: 'diametroExterior', title: 'Ø exterior aprox. (mm)' },
  { key: 'fase', title: 'Fase / función' },
  { key: 'largo', title: 'Largo (mm)' },
  { key: 'estado', title: 'Estado' },
];

const escapeCell = (value) => {
  const text = String(value ?? '');
  return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

// El BOM inicial (﻿) hace que Excel abra el CSV en UTF-8 y respete tildes.
export function toCsv(rows, columns) {
  const lines = [
    columns.map((column) => escapeCell(column.title)).join(csvSeparator),
    ...rows.map((row) => columns.map((column) => escapeCell(row[column.key])).join(csvSeparator)),
  ];
  return `﻿${lines.join('\r\n')}\r\n`;
}
