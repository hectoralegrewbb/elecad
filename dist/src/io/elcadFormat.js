import { migrateState } from '../core/documentState.js';

const formatName = 'elcad';
const formatVersion = 1;

// .elcad = JSON comprimido con gzip nativo (CompressionStream), sin dependencias.
export async function serializeDocument(state) {
  const payload = JSON.stringify({ format: formatName, version: formatVersion, savedAt: new Date().toISOString(), state });
  const stream = new Blob([payload]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Response(stream, { headers: { 'Content-Type': 'application/octet-stream' } }).blob();
}

export async function parseDocument(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const isGzip = bytes[0] === 0x1f && bytes[1] === 0x8b;
  const text = isGzip
    ? await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text()
    : new TextDecoder().decode(bytes);
  const payload = JSON.parse(text);
  if (payload.format !== formatName || !payload.state) throw new Error('El archivo no es un documento ElCad válido.');
  return migrateState(payload.state);
}
