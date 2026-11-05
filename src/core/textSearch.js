// Devuelve 0 si algún token de la consulta no aparece; si no, un puntaje (mayor = mejor).
export function matchScore(haystack, query) {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return 1;
  const text = haystack.toLowerCase();
  let score = 0;
  for (const token of tokens) {
    const index = text.indexOf(token);
    if (index === -1) return 0;
    score += 1 / (1 + index);
  }
  return score + 0.001;
}
