import { migrateState } from '../core/documentState.js';
import { validateUnifilar } from '../unifilar/model.js';

const formatName = 'elcad';
const unifilarFormatName = 'elcad-unifilar';
const formatVersion = 1;

// .elcad = JSON comprimido con gzip nativo (CompressionStream), sin dependencias.
export async function serializeDocument(state, { kind } = {}) {
  const unifilar = kind === 'unifilar';
  const payload = JSON.stringify({
    format: unifilar ? unifilarFormatName : formatName,
    version: formatVersion,
    savedAt: new Date().toISOString(),
    state: unifilar ? validateUnifilar(state) : state,
  });
  const stream = new Blob([payload]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Response(stream, { headers: { 'Content-Type': 'application/octet-stream' } }).blob();
}

export async function readDocument(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const isGzip = bytes[0] === 0x1f && bytes[1] === 0x8b;
  const text = isGzip
    ? await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text()
    : new TextDecoder().decode(bytes);
  const payload = JSON.parse(text);
  if (payload?.format === unifilarFormatName) {
    if (payload.version !== formatVersion) throw new Error('Versión de unifilar no compatible.');
    return { kind: 'unifilar', state: validateUnifilar(payload.state) };
  }
  if (payload?.format !== formatName || !payload.state) throw new Error('El archivo no es un documento ElCad válido.');
  return { kind: 'layout', state: migrateState(payload.state) };
}

export async function parseDocument(blob) {
  return (await readDocument(blob)).state;
}
