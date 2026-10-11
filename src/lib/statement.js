const MON = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const norm = (s) => String(s).toUpperCase().replace(/[^A-Z ]/g, ' ').split(/\s+/).filter((t) => t.length > 1);

export function nameMatches(a, b) {
  const x = norm(a), y = norm(b);
  if (x.length < 2 || y.length < 2) return false;
  const [s, l] = x.length <= y.length ? [x, y] : [y, x], hit = s.filter((t) => l.includes(t)).length;
  return hit >= 2 && hit / s.length >= 0.66;
}

// Pure text parsing: finds the account holder, address and the newest date on the statement's first page.
export function parseStatement(lines, now = Date.now()) {
  let name = '', address = '';
  for (let i = 0; i < lines.length; i++) {
    const L = lines[i];
    let m = !name && L.match(/(?:account\s*name|customer\s*name|account\s*holder|name)\s*[:\-]\s*(.+)/i);
    if (m) name = m[1].split(/\s{2,}| (?=account\s*(?:no|number))/i)[0].trim();
    m = !address && L.match(/address\s*[:\-]\s*(.*)/i);
    if (m) {
      address = m[1].trim();
      for (let j = i + 1; j <= i + 2 && lines[j]; j++) { if (/^[A-Za-z ]{2,25}\s*:/.test(lines[j])) break; address += ' ' + lines[j]; }
      address = address.trim();
    }
  }
  const dates = [];
  for (const L of lines) {
    for (const m of L.matchAll(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})\b/g)) dates.push(Date.UTC(+m[3], +m[2] - 1, +m[1]));
    for (const m of L.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)) dates.push(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    for (const m of L.matchAll(/\b(\d{1,2})[\s\-]([A-Za-z]{3})[a-z]*[\s\-,]*(\d{4})\b/g)) { const k = MON.indexOf(m[2].toLowerCase()); if (k >= 0) dates.push(Date.UTC(+m[3], k, +m[1])); }
  }
  const valid = dates.filter((t) => t <= now + 864e5 && !isNaN(t)), newest = valid.length ? Math.max(...valid) : null;
  return { name, address, date: newest ? new Date(newest).toISOString().slice(0, 10) : '', ageDays: newest ? Math.round((now - newest) / 864e5) : null };
}

// Reads only the first page of a PDF statement in the browser. The rest of the statement never leaves the phone.
export async function readStatement(file) {
  if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) return { isPdf: false };
  const mod = await import('pdfjs-dist/legacy/build/pdf'), pdfjs = mod.default && mod.default.getDocument ? mod.default : mod;
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const info = ((await doc.getMetadata().catch(() => null)) || {}).info || {};
  const page = await doc.getPage(1), tc = await page.getTextContent(), rows = new Map();
  for (const it of tc.items) { if (!it.str || !it.str.trim()) continue; const y = Math.round(it.transform[5] / 3); if (!rows.has(y)) rows.set(y, []); rows.get(y).push(it); }
  const lines = [...rows.entries()].sort((a, b) => b[0] - a[0]).map(([, r]) => r.sort((a, b) => a.transform[4] - b.transform[4]).map((i) => i.str).join(' ').replace(/\s+/g, ' ').trim()).slice(0, 60);
  const vp = page.getViewport({ scale: 1.3 }), c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
  await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
  let q = 0.6, img = c.toDataURL('image/jpeg', q);
  while (img.length > 600000 && q > 0.25) { q -= 0.1; img = c.toDataURL('image/jpeg', q); }
  return { isPdf: true, lines, producer: String(info.Producer || ''), creator: String(info.Creator || ''), page: img };
}
