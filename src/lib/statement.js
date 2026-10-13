// Reads a bank statement the way a person would: it finds the account holder, address and date wherever the bank put them,
// whether as "Label: value", a label with the value on the next line, or a header row with the values underneath.
const MONTHS = /^(jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|june?|july?|aug(ust)?|sep(t(ember)?)?|oct(ober)?|nov(ember)?|dec(ember)?)$/i;
const MON = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
const norm = (s) => String(s).toUpperCase().replace(/[^A-Z ]/g, ' ').split(/\s+/).filter((t) => t.length > 1);

export function nameMatches(a, b) {
  const x = norm(a), y = norm(b);
  if (x.length < 2 || y.length < 2) return false;
  const [s, l] = x.length <= y.length ? [x, y] : [y, x], hit = s.filter((t) => l.includes(t)).length;
  return hit >= 2 && hit / s.length >= 0.66;
}

// ---- layout: text items with positions -> rows ----
// items: [{ str, x, y }]. Each row keeps its text and where every piece started, so columns can be matched later.
export function rowsFromItems(items) {
  const its = items.filter((i) => i.str && i.str.trim()).sort((a, b) => b.y - a.y || a.x - b.x), rows = [];
  for (const it of its) { const last = rows[rows.length - 1]; if (last && Math.abs(last.y - it.y) <= 3) last.items.push(it); else rows.push({ y: it.y, items: [it] }); }
  return rows.map((r) => {
    const items = r.items.sort((a, b) => a.x - b.x); let text = ''; const map = [];
    for (const it of items) { if (text) text += ' '; map.push({ s: text.length, x: Math.round(it.x) }); text += it.str.trim(); }
    return { y: Math.round(r.y), text, map };
  });
}
const itemsOf = (row) => row.map.map((m, i) => { const e = i + 1 < row.map.length ? row.map[i + 1].s - 1 : row.text.length; return { x: m.x, str: row.text.slice(m.s, e) }; });
const xAt = (row, idx) => { let x = row.map.length ? row.map[0].x : 0; for (const m of row.map) { if (m.s <= idx) x = m.x; else break; } return x; };

// ---- labels the banks use ----
const LAB = {
  name: /\b(?:(?:account|acct|a\/c)\.?\s*(?:name|holder(?:\s*name)?|title|owner)|customer\s*name|full\s*name|name\s+of\s+(?:account\s*)?(?:holder|customer)|statement\s+for|prepared\s+for|name)\b/gi,
  addr: /\b(?:(?:customer|residential|home|contact|mailing|postal|permanent|house|street)\s*)?address\b/gi,
  date: /\b(?:statement\s*date|date\s*(?:generated|printed|issued|of\s*statement)|(?:generated|printed|issued)(?:\s*(?:on|date|at))?|print\s*date|as\s*(?:at|of)|(?:statement\s*)?period|date)\b/gi,
  other: /\b(?:(?:account|acct|a\/c)\.?\s*(?:no|number|num|type|status|currency|class)|nuban|currency|branch(?:\s*name|\s*code)?|sort\s*code|(?:opening|closing|available|ledger|book)\s*balance|total\s*(?:debit|credit)s?|bvn|e-?mail|phone|mobile|tel|cif|customer\s*(?:id|no|number)|tier|product|iban|swift|bank\s*name|reference|ref)\b/gi,
};
function labelsIn(row) {
  const all = [];
  for (const k of Object.keys(LAB)) for (const m of row.text.matchAll(LAB[k])) {
    const before = row.text.slice(Math.max(0, m.index - 14), m.index).toLowerCase();
    if (k === 'name' && m[0].toLowerCase() === 'name' && /(bank|branch|beneficiary|merchant|product|file|sender|receiver|payee|company|business|trade)\s*$/.test(before)) continue;
    if (k === 'addr' && /(email|e-mail|ip|web|branch|bank|office)\s*$/.test(before)) continue;
    all.push({ k, s: m.index, e: m.index + m[0].length });
  }
  all.sort((a, b) => a.s - b.s || (b.e - b.s) - (a.e - a.s));
  const out = [];
  for (const l of all) { if (out.length && l.s < out[out.length - 1].e) continue; out.push({ ...l, x: xAt(row, l.s) }); }
  return out;
}
// The transaction table starts at a row with column titles such as "Date ... Debit ... Credit" (the header block is everything above it).
const TBL = /\bdate\b.*\b(debit|credit|narration|description|particulars|remarks)\b|\b(debit|credit)\b.*\b(debit|credit)\b/i;
function headerEnd(rows) { for (let i = 0; i < rows.length && i < 60; i++) if (TBL.test(rows[i].text)) return Math.max(i, 3); return Math.min(rows.length, 30); }

// Values written under a label (stacked layout) or under a column header.
function below(rows, ri, x0, x1, maxRows) {
  const parts = [];
  for (let rj = ri + 1; rj < Math.min(rows.length, ri + 1 + maxRows); rj++) {
    const r = rows[rj];
    if (labelsIn(r).some((l) => l.x >= x0 - 14 && l.x < x1 - 6)) break;
    const t = itemsOf(r).filter((it) => it.x >= x0 - 14 && it.x < x1 - 6).map((it) => it.str).join(' ').trim();
    if (!t) break; parts.push(t);
  }
  return parts;
}
function candidates(rows, kind, hb) {
  const out = [];
  for (let ri = 0; ri < hb && ri < rows.length; ri++) {
    const row = rows[ri], ls = labelsIn(row);
    ls.forEach((l, i) => {
      if (l.k !== kind) return;
      const next = ls[i + 1], xr = next ? next.x : Infinity;
      const same = row.text.slice(l.e, next ? next.s : undefined).replace(/^[\s:\-–—.|]+/, '').replace(/[\s|]+$/, '');
      if (same) {
        let v = same;
        if (kind === 'addr') { const vx = xAt(row, row.text.indexOf(same, l.e)); v = [same, ...below(rows, ri, vx, xr, 2)].join(', '); }
        out.push(v);
      } else {
        const parts = below(rows, ri, l.x, xr, kind === 'addr' ? 3 : 1);
        if (parts.length) out.push(parts.join(', '));
      }
    });
  }
  return out;
}

// ---- address without a label: look for street / area words in the header ----
const CUE = /\b(?:street|st\.?|road|rd\.?|avenue|ave\.?|close|crescent|estate|lane|way|drive|dr\.?|layout|phase|junction|off|opp\.?|opposite|behind|beside|along|plot|block|flat|house|quarters|barracks|market|expressway|highway|village|town|lga|lagos|abuja|fct|ogun|oyo|ibadan|osun|ondo|ekiti|kwara|kogi|kano|kaduna|rivers|port\s*harcourt|delta|edo|benin|enugu|anambra|imo|abia|akwa\s*ibom|cross\s*river|bayelsa|plateau|jos|benue|nasarawa|niger|sokoto|zamfara|katsina|bauchi|gombe|adamawa|taraba|yobe|borno|kebbi|jigawa|ebonyi|nigeria)\b/i;
function guessAddress(head) {
  let best = -1, bi = -1;
  head.forEach((r, i) => {
    if (labelsIn(r).some((l) => l.k !== 'addr')) return;
    if ((r.text.match(/\d{8,}/g) || []).length) return;
    const t = r.text; if (t.length < 8 || t.length > 110 || !CUE.test(t)) return;
    const sc = (/\d/.test(t) ? 2 : 0) + (t.split(/\s+/).length >= 3 ? 1 : 0) + (/,/.test(t) ? 1 : 0);
    if (sc > best) { best = sc; bi = i; }
  });
  if (bi < 0) return '';
  const parts = [head[bi].text], n = head[bi + 1];
  if (n && CUE.test(n.text) && n.text.length < 80 && !labelsIn(n).length && !/\d{8,}/.test(n.text)) parts.push(n.text);
  return parts.join(', ');
}

// ---- dates in any common bank format ----
export function datesIn(text) {
  const out = [], yr = (y) => (y < 100 ? 2000 + y : y), add = (y, m, d) => { const t = Date.UTC(yr(y), m, d); if (!isNaN(t) && m >= 0 && m < 12 && d >= 1 && d <= 31) out.push(t); };
  for (const m of text.matchAll(/\b(\d{1,2})(?:st|nd|rd|th)?[\s\-\/.,]*([A-Za-z]{3,9})\.?[\s\-\/.,]*(\d{2}|\d{4})\b/g)) if (MONTHS.test(m[2])) add(+m[3], MON[m[2].slice(0, 3).toLowerCase()], +m[1]);
  for (const m of text.matchAll(/\b([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/g)) if (MONTHS.test(m[1])) add(+m[3], MON[m[1].slice(0, 3).toLowerCase()], +m[2]);
  for (const m of text.matchAll(/\b(\d{4})[\-\/.](\d{1,2})[\-\/.](\d{1,2})\b/g)) add(+m[1], +m[2] - 1, +m[3]);
  for (const m of text.matchAll(/\b(\d{1,2})[\-\/.](\d{1,2})[\-\/.](\d{2}|\d{4})\b/g)) { const a = +m[1], b = +m[2]; add(+m[3], (b > 12 ? a : b) - 1, b > 12 ? b : a); }
  return out;
}
const PREF = /(generated|printed|print\s*date|statement\s*date|as\s*(?:at|of)|issued|period|\bto\b|date\s*of\s*statement)/i;
function pickDate(rows, hb, now) {
  const ok = (t) => t <= now + 864e5 && t > Date.UTC(2005, 0, 1), pref = [], any = [];
  const scan = (list, strict) => list.forEach((r, i) => {
    const ds = datesIn(r.text).filter(ok); if (!ds.length) return;
    const labelled = PREF.test(r.text) || (i > 0 && !datesIn(list[i - 1].text).length && PREF.test(list[i - 1].text));
    ds.forEach((t) => { any.push(t); if (labelled) pref.push(t); });
  });
  scan(rows.slice(0, hb));
  if (!any.length) scan(rows.slice(0, 40));
  const t = pref.length ? Math.max(...pref) : any.length ? Math.max(...any) : null;
  return t ? { date: new Date(t).toISOString().slice(0, 10), ageDays: Math.round((now - t) / 864e5) } : { date: '', ageDays: null };
}

// ---- main entry ----
export function parseStatement(rows, opts = {}) {
  const now = opts.now || Date.now(), exp = opts.expectedName || '', hb = headerEnd(rows), head = rows.slice(0, hb);
  const clean = (v) => v.replace(/[:|]/g, ' ').replace(/\s{2,}/g, ' ').trim();
  const looksName = (v) => /^[A-Za-z][A-Za-z .'\-]{2,60}$/.test(v) && v.split(/\s+/).length >= 2 && !/\b(bank|plc|limited|ltd|statement|account|balance|date)\b/i.test(v);
  const names = candidates(rows, 'name', hb).map(clean).filter(looksName);
  let name = '', nameFound = false;
  if (exp) {
    const hit = names.find((v) => nameMatches(v, exp));
    if (hit) { name = hit; nameFound = true; }
    else { const row = head.find((r) => nameMatches(r.text, exp)); if (row) { name = row.text.slice(0, 100); nameFound = true; } }
  }
  if (!name) name = names[0] || '';
  let address = candidates(rows, 'addr', hb).map((v) => clean(v).replace(/(,\s*)+/g, ', ')).find((v) => v.length >= 8 && /[A-Za-z]/.test(v)) || '', addressGuess = false;
  if (!address) { address = guessAddress(head); addressGuess = !!address; }
  return { name, nameFound, address, addressGuess, ...pickDate(rows, hb, now) };
}

// Reads only the first page of a PDF statement in the browser. The rest of the statement never leaves the phone.
export async function readStatement(file) {
  if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) return { isPdf: false };
  const mod = await import('pdfjs-dist/legacy/build/pdf'), pdfjs = mod.default && mod.default.getDocument ? mod.default : mod;
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const info = ((await doc.getMetadata().catch(() => null)) || {}).info || {};
  const page = await doc.getPage(1), tc = await page.getTextContent();
  const rows = rowsFromItems(tc.items.map((it) => ({ str: it.str, x: it.transform[4], y: it.transform[5] }))).slice(0, 90);
  const vp = page.getViewport({ scale: 1.3 }), c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
  await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
  let q = 0.6, img = c.toDataURL('image/jpeg', q);
  while (img.length > 600000 && q > 0.25) { q -= 0.1; img = c.toDataURL('image/jpeg', q); }
  return { isPdf: true, rows, producer: String(info.Producer || ''), creator: String(info.Creator || ''), page: img };
}
