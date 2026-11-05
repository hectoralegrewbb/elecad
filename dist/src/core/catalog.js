import { matchScore } from './textSearch.js';

// Definición de componente (unidades en mm, origen arriba-izquierda, rotación 0):
// { id, category, brand, name, width, height, labelPrefix, keywords, blocksRouting, commonNet,
//   terminals: [{ id, x, y, side, net? }], shapes: [primitivas declarativas] }
//
// Definición PARAMÉTRICA (configurable por el usuario en cada instancia):
// { id, ..., parameters: [{ key, label, short, type: 'number'|'select', min, max, options, default }],
//   build(params) => { width, height, terminals, shapes } }
// Los valores elegidos viven en component.props; catalog.resolve(component) devuelve la definición efectiva.

export function normalizeDefinition(definition) {
  const terminals = definition.terminals ?? [];
  return {
    category: 'General',
    brand: '',
    name: definition.id,
    labelPrefix: 'C',
    keywords: [],
    blocksRouting: true,
    commonNet: false,
    shapes: [],
    ...definition,
    terminals,
    terminalMap: new Map(terminals.map((terminal) => [terminal.id, terminal])),
  };
}

function coerceParameter(parameter, value) {
  if (parameter.type === 'text') return String(value ?? '').slice(0, parameter.maxLength ?? 24);
  if (parameter.type === 'select') return parameter.options.includes(String(value)) ? String(value) : parameter.default;
  const number = Math.floor(Number(value));
  if (!Number.isFinite(number)) return parameter.default;
  return Math.min(parameter.max ?? Infinity, Math.max(parameter.min ?? 0, number));
}

export class Catalog {
  constructor(definitions = []) {
    this.definitions = new Map();
    this.resolved = new Map();
    definitions.forEach((definition) => this.register(definition));
  }

  register(definition) {
    if (!definition.id) throw new Error('Definición de catálogo sin id');
    let source = definition;
    if (definition.build) {
      const defaults = Object.fromEntries(definition.parameters.map((parameter) => [parameter.key, parameter.default]));
      source = { ...definition, ...definition.build(defaults) };
    }
    if (!(source.width > 0) || !(source.height > 0)) throw new Error(`Definición inválida: ${definition.id}`);
    const normalized = normalizeDefinition(source);
    normalized.searchText = [normalized.name, normalized.brand, normalized.category, ...normalized.keywords, normalized.id].join(' ');
    this.definitions.set(normalized.id, normalized);
  }

  // Definición base (con los valores por defecto si es paramétrica).
  get(definitionId) {
    const definition = this.definitions.get(definitionId);
    if (!definition) throw new Error(`Componente desconocido en el catálogo: ${definitionId}`);
    return definition;
  }

  has(definitionId) {
    return this.definitions.has(definitionId);
  }

  isParametric(definitionId) {
    return Boolean(this.get(definitionId).build);
  }

  // Valores efectivos de los parámetros de una instancia (props con defaults y límites aplicados).
  getParameterValues(component) {
    const base = this.get(component.defId);
    if (!base.build) return {};
    const props = component.props ?? {};
    return Object.fromEntries(base.parameters.map((parameter) => [parameter.key, coerceParameter(parameter, props[parameter.key] ?? parameter.default)]));
  }

  // Definición EFECTIVA de una instancia: igual a la base salvo que sea paramétrica.
  resolve(component) {
    const base = this.get(component.defId);
    if (!base.build) return base;
    const values = this.getParameterValues(component);
    const key = `${base.id}|${JSON.stringify(values)}`;
    if (!this.resolved.has(key)) {
      this.resolved.set(key, normalizeDefinition({ ...base, ...base.build(values) }));
      if (this.resolved.size > 400) this.resolved.delete(this.resolved.keys().next().value);
    }
    return this.resolved.get(key);
  }

  // Nombre + configuración, para listas de materiales: "PLC configurable [DI 14 · DQ 10 · 24vdc]".
  describe(component) {
    const base = this.get(component.defId);
    if (!base.build) return base.name;
    const values = this.getParameterValues(component);
    const parts = base.parameters
      .filter((parameter) => (parameter.type === 'select' ? true : parameter.type === 'text' ? values[parameter.key] !== '' : values[parameter.key] > 0))
      .map((parameter) =>
        parameter.type === 'select' ? `${parameter.label}: ${values[parameter.key]}` : parameter.type === 'text' ? `${values[parameter.key]}` : `${parameter.short} ${values[parameter.key]}`,
      );
    return parts.length > 0 ? `${base.name} [${parts.join(' · ')}]` : base.name;
  }

  list() {
    return [...this.definitions.values()];
  }

  search(query, limit = 30) {
    return this.list()
      .map((definition) => ({ definition, score: matchScore(definition.searchText, query) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((entry) => entry.definition);
  }
}
