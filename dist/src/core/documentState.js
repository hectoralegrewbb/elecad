export const documentVersion = 1;

export function createEmptyState() {
  return {
    meta: { name: 'Sin título', units: 'mm', gridSize: 5, version: documentVersion },
    components: {},
    wires: {},
    dimensions: {},
  };
}

// Rellena campos faltantes de un documento cargado (versiones viejas o archivos editados a mano).
export function migrateState(raw) {
  const base = createEmptyState();
  return {
    meta: { ...base.meta, ...(raw.meta ?? {}), version: documentVersion },
    components: Object.fromEntries(Object.entries(raw.components ?? {}).map(([id, component]) => {
      const clean = { ...component };
      for (const key of ['labelOrientation', 'terminalOrientation', 'bodyTextOrientation']) {
        if (key in clean && !['horizontal', 'vertical'].includes(clean[key])) delete clean[key];
      }
      if ('locked' in clean && typeof clean.locked !== 'boolean') delete clean.locked;
      return [id, clean];
    })),
    wires: raw.wires ?? {},
    dimensions: raw.dimensions ?? {},
  };
}

export const isComponentId = (id) => id.startsWith('cmp_');
export const isWireId = (id) => id.startsWith('wir_');
export const isDimensionId = (id) => id.startsWith('dim_');
