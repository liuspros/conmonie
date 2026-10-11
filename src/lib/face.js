// Free, on-device face tools (no paid verification service). Models load from /models, copied from the npm package at install.
let fa = null;
export async function loadFace() {
  if (fa) return fa;
  const m = await import('@vladmandic/face-api'), f = m.default && m.default.nets ? m.default : m;
  await f.tf.ready();
  await Promise.all([f.nets.tinyFaceDetector.loadFromUri('/models'), f.nets.faceLandmark68TinyNet.loadFromUri('/models'), f.nets.faceRecognitionNet.loadFromUri('/models')]);
  return (fa = f);
}
export const detect = (f, el, size = 320) => f.detectSingleFace(el, new f.TinyFaceDetectorOptions({ inputSize: size, scoreThreshold: 0.3 })).withFaceLandmarks(true).withFaceDescriptor();
export const dist = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
// Eye aspect ratio from the 68 landmarks: it drops sharply when the eyes close.
export function earOf(p) { const e = (i) => (d(p[i + 1], p[i + 5]) + d(p[i + 2], p[i + 4])) / (2 * d(p[i], p[i + 3])); return (e(36) + e(42)) / 2; }
// Where the nose sits between the jaw edges: about 0.5 when facing the camera, towards 0 or 1 when the head turns.
export const yawRatio = (p) => (p[30].x - p[0].x) / (p[16].x - p[0].x);
