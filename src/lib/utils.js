const DAY = 864e5;
export const naira = (n) => '\u20A6' + Number(n || 0).toLocaleString('en-NG');
export const haptic = () => { try { navigator.vibrate && navigator.vibrate(12); } catch {} };
// Nigeria is UTC+1 all year, so days are counted in WAT on the browser and the server alike.
const TZ = 36e5;
export const midnight = (t) => Math.floor((t + TZ) / DAY) * DAY - TZ;

// One cycle = one contribution round. Packing day is the first day of each cycle.
export function cycleInfo(g, now = Date.now()) {
  const f = g.frequencyDays || 1, s = midnight(g.startAt), today = midnight(now);
  const k = Math.max(0, Math.floor((today - s) / (f * DAY)));
  const start = s + k * f * DAY;
  const [h, m] = (g.dueTime || '18:00').split(':').map(Number);
  const due = start + (h * 60 + m) * 60000;
  const order = g.order || [];
  return {
    k, due, late: now > due, isPackingDay: today === start,
    daysToNext: Math.round((start + f * DAY - today) / DAY),
    packerUid: order.length ? order[k % order.length] : null,
  };
}

// Resize and re-encode in the browser so each receipt stays well under Firestore's 1 MiB document limit.
export function compressImage(file, maxSide = 1200) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const r = Math.min(1, maxSide / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      let q = 0.72, out = c.toDataURL('image/jpeg', q);
      while (out.length > 600000 && q > 0.3) { q -= 0.1; out = c.toDataURL('image/jpeg', q); }
      URL.revokeObjectURL(url); resolve(out);
    };
    img.onerror = () => reject(new Error('Could not read image'));
    img.src = url;
  });
}

export async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Square-crop and shrink a group photo so it can live inside the group document.
export function compressSquare(file, size = 256) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const s = Math.min(img.width, img.height), c = document.createElement('canvas');
      c.width = c.height = size;
      c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      URL.revokeObjectURL(url); resolve(c.toDataURL('image/jpeg', 0.75));
    };
    img.onerror = () => reject(new Error('Could not read image'));
    img.src = url;
  });
}
