// Orden de dibujo y de hit-test: los contenedores (gabinete, riel, canaleta: blocksRouting = false)
// siempre quedan debajo de los equipos, sin importar en qué orden se colocaron.
// Dentro de cada grupo se respeta el orden de inserción.
export function orderedComponents(state, catalog) {
  const all = Object.values(state.components);
  const containers = all.filter((component) => !catalog.resolve(component).blocksRouting);
  const devices = all.filter((component) => catalog.resolve(component).blocksRouting);
  return [...containers, ...devices];
}
