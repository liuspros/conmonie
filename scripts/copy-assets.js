// Copies the free face-recognition models and the PDF worker from node_modules into public/ on every install.
const fs = require('fs'), path = require('path');
const cp = (from, to) => { try { fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to); } catch (e) { console.warn('copy skipped:', from); } };
const m = 'node_modules/@vladmandic/face-api/model/';
['tiny_face_detector_model', 'face_landmark_68_tiny_model', 'face_recognition_model'].forEach((n) => ['-weights_manifest.json', '.bin'].forEach((x) => cp(m + n + x, 'public/models/' + n + x)));
cp('node_modules/pdfjs-dist/legacy/build/pdf.worker.min.js', 'public/pdf.worker.min.js');
