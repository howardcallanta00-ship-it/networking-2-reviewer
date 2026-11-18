// Minimal MHTML (Chrome "Save as single file") reader.
// Returns { html, url, resources: Map<Content-Location, { type, buf }> }.
import { readFileSync } from 'node:fs';

const HEX = new Int8Array(256).fill(-1);
for (let i = 0; i < 10; i++) HEX[48 + i] = i;
for (let i = 0; i < 6; i++) { HEX[65 + i] = 10 + i; HEX[97 + i] = 10 + i; }

function decodeQP(src) {
  // src: Buffer (latin1 bytes)
  const out = Buffer.allocUnsafe(src.length);
  let o = 0;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === 61) { // '='
      const a = src[i + 1], b = src[i + 2];
      if (a === 13 && b === 10) { i += 2; continue; }
      if (a === 10) { i += 1; continue; }
      const h = HEX[a], l = HEX[b];
      if (h >= 0 && l >= 0) { out[o++] = h * 16 + l; i += 2; continue; }
    }
    out[o++] = c;
  }
  return out.subarray(0, o);
}

export function readMhtml(path) {
  const file = readFileSync(path);
  const raw = file.toString('latin1');
  const m = raw.match(/boundary="([^"]+)"/);
  if (!m) throw new Error('No MIME boundary in ' + path);
  const sep = '--' + m[1];
  let html = null, url = null;
  const resources = new Map();
  let pos = raw.indexOf(sep);
  while (pos >= 0) {
    const start = pos + sep.length;
    const next = raw.indexOf(sep, start);
    const end = next < 0 ? raw.length : next;
    const part = raw.slice(start, end);
    pos = next;
    const hdrEnd = part.search(/\r?\n\r?\n/);
    if (hdrEnd < 0) continue;
    const head = part.slice(0, hdrEnd);
    const bodyStart = start + hdrEnd + (part.slice(hdrEnd, hdrEnd + 4) === '\r\n\r\n' ? 4 : 2);
    const type = (head.match(/Content-Type:\s*([^\s;]+)/i) || [])[1] || '';
    const enc = (head.match(/Content-Transfer-Encoding:\s*(\S+)/i) || [])[1] || '';
    const loc = (head.match(/Content-Location:\s*(\S+)/i) || [])[1] || '';
    const bodyBuf = file.subarray(bodyStart, end);
    let buf;
    if (/base64/i.test(enc)) buf = Buffer.from(bodyBuf.toString('latin1').replace(/\s+/g, ''), 'base64');
    else if (/quoted-printable/i.test(enc)) buf = decodeQP(bodyBuf);
    else buf = bodyBuf;
    if (type === 'text/html' && html === null) { html = buf.toString('utf8'); url = loc; }
    else if (!resources.has(loc)) resources.set(loc, { type, buf });
  }
  return { html, url, resources };
}
