// Phone numbers: Nigerian numbers may start with 0, 234 or +234. Returns +E.164 or null.
export function normalizePhone(s) {
  let d = String(s || '').replace(/[^\d+]/g, '');
  if (d.startsWith('+')) d = d.slice(1); else if (d.startsWith('0')) d = '234' + d.slice(1); else if (d.length === 10) d = '234' + d;
  return /^\d{11,15}$/.test(d) && (!d.startsWith('234') || d.length === 13) ? '+' + d : null;
}
