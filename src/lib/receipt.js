const F = '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif';
const rr = (c, x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
const when = (t) => new Date(t).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
const STATUS = { confirmed: ['Confirmed', '#C8F135', '#0A0A0A'], pending: ['Awaiting confirmation', '#FFF0D1', '#A86400'], rejected: ['Not accepted', '#FDE2E0', '#C0362C'] };

// Draws a shareable receipt image for one contribution. d: { amount, status, group, round, name, count, createdAt, confirmedAt, ref, late }
export function drawReceipt(d) {
  const W = 800, H = 1180, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d'), money = '\u20A6' + Number(d.amount).toLocaleString('en-NG');
  c.fillStyle = '#E9ECEF'; c.fillRect(0, 0, W, H);
  c.fillStyle = '#fff'; rr(c, 40, 40, W - 80, H - 80, 36); c.fill();
  c.save(); rr(c, 40, 40, W - 80, 330, 36); c.clip(); c.fillStyle = '#0A0A0A'; c.fillRect(40, 40, W - 80, 330); c.restore();
  c.strokeStyle = '#D3D6DA'; c.lineWidth = 8; c.beginPath(); c.arc(124, 128, 28, 0, Math.PI * 2); c.stroke();
  c.fillStyle = '#C8F135'; c.beginPath(); c.arc(124, 100, 9, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#fff'; c.font = `700 40px ${F}`; c.textAlign = 'left'; c.fillText('Conmonie', 178, 126);
  c.fillStyle = '#B8BCC2'; c.font = `400 26px ${F}`; c.fillText('Contribution receipt', 178, 162);
  c.fillStyle = '#B8BCC2'; c.font = `400 26px ${F}`; c.fillText('Amount', 92, 250);
  c.fillStyle = '#fff'; c.font = `700 80px ${F}`; c.fillText(money, 88, 330);
  const [label, bg, fg] = STATUS[d.status] || STATUS.pending;
  c.font = `600 26px ${F}`; const w = c.measureText(label).width + 56;
  c.fillStyle = bg; rr(c, 90, 404, w, 54, 27); c.fill(); c.fillStyle = fg; c.fillText(label, 118, 441);
  const rows = [['Group', d.group], ['Round', String(d.round)], ['Contributor', d.name], ['Contributions', d.count + (d.count > 1 ? ' payments' : ' payment')], ['Submitted', when(d.createdAt)]];
  if (d.status === 'confirmed' && d.confirmedAt) rows.push(['Confirmed by admin', when(d.confirmedAt)]);
  if (d.late) rows.push(['Note', 'Paid after the due time']);
  rows.push(['Reference', d.ref]);
  let y = 540;
  for (const [k, v] of rows) {
    c.textAlign = 'left'; c.fillStyle = '#6B7076'; c.font = `400 25px ${F}`; c.fillText(k, 92, y);
    c.textAlign = 'right'; c.fillStyle = '#0A0A0A'; c.font = `600 27px ${F}`;
    let t = String(v); while (c.measureText(t).width > 420 && t.length > 4) t = t.slice(0, -2); c.fillText(t === String(v) ? t : t + '...', W - 92, y);
    c.strokeStyle = '#ECEDEF'; c.lineWidth = 2; c.beginPath(); c.moveTo(92, y + 26); c.lineTo(W - 92, y + 26); c.stroke(); y += 78;
  }
  c.textAlign = 'left'; c.fillStyle = '#6B7076'; c.font = `400 22px ${F}`;
  const note = 'Conmonie does not hold or move money. This receipt records a contribution that was paid directly to the group admin and confirmed in the app.', words = note.split(' ');
  let line = '', yy = H - 190; for (const wd of words) { const t = line ? line + ' ' + wd : wd; if (c.measureText(t).width > W - 190) { c.fillText(line, 92, yy); line = wd; yy += 32; } else line = t; } c.fillText(line, 92, yy);
  return cv;
}
export const blobOf = (cv) => new Promise((res) => cv.toBlob(res, 'image/png'));
// Share as an image where the phone supports it, otherwise download it.
export async function shareOrSave(blob, name, title) {
  const file = new File([blob], name, { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title }); return 'shared'; } catch (e) { if (e && e.name === 'AbortError') return 'cancelled'; } }
  return save(blob, name);
}
export function save(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); return 'saved'; }
