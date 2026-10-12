'use strict';
/**
 * Upload and download endpoints.
 *   POST   /api/upload            multipart, field "files" (1..10 files). Optional ?delay=ms (max 10000)
 *   GET    /api/uploads           list uploaded files
 *   DELETE /api/uploads/:id       remove one
 *   GET    /api/download/:kind    pdf | csv | image
 *   GET    /api/download/delayed?ms=3000&kind=pdf
 * Rules: max 2 MB, allowed types pdf / png / csv, file content must match the extension, no empty files.
 */
const express = require('express');
const multer = require('multer');
const { state, nextId } = require('../state');
const { PNG, CSV, buildPdf } = require('../files');

const router = express.Router();
const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = { pdf: 'application/pdf', png: 'image/png', csv: 'text/csv' };

// Multer's own limit is higher than ours so we can report per-file errors instead of aborting the request.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024, files: 10 } });

function validate(file) {
  const ext = (file.originalname.split('.').pop() || '').toLowerCase();
  if (!file.size) return { status: 400, code: 'empty_file', error: 'File is empty' };
  if (!ALLOWED[ext]) return { status: 415, code: 'invalid_type', error: `Type ".${ext}" is not allowed. Allowed: pdf, png, csv` };
  if (file.size > MAX_BYTES) return { status: 413, code: 'too_large', error: 'File exceeds the 2 MB limit' };
  const head = file.buffer.subarray(0, 8);
  if (ext === 'pdf' && !head.toString('latin1').startsWith('%PDF')) return { status: 415, code: 'content_mismatch', error: 'File content is not a PDF' };
  if (ext === 'png' && !head.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { status: 415, code: 'content_mismatch', error: 'File content is not a PNG' };
  return null;
}

router.post('/upload', (req, res) => {
  upload.array('files', 10)(req, res, (err) => {
    if (err) {
      const tooMany = err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE';
      return res.status(tooMany ? 400 : 413).json({ error: tooMany ? 'Upload 1 to 10 files in the "files" field' : err.message });
    }
    const files = req.files || [];
    if (!files.length) return res.status(400).json({ error: 'No files received. Send multipart form data with the field "files"', code: 'no_files' });

    const respond = () => {
      const results = files.map((f) => {
        const problem = validate(f);
        if (problem) return { name: f.originalname, ok: false, status: problem.status, code: problem.code, error: problem.error };
        const record = { id: nextId('uploads'), name: f.originalname, size: f.size, type: f.originalname.split('.').pop().toLowerCase(), uploadedAt: new Date().toISOString() };
        state.uploads.push(record);
        return { name: f.originalname, ok: true, ...record };
      });
      const saved = results.filter((r) => r.ok).length;
      const status = saved ? 201 : results[0].status;
      res.status(status).json({ saved, failed: results.length - saved, results });
    };
    const delay = Math.min(Math.max(Number(req.query.delay) || 0, 0), 10000);
    delay ? setTimeout(respond, delay) : respond();
  });
});

router.get('/uploads', (req, res) => res.json({ data: state.uploads, total: state.uploads.length }));

router.delete('/uploads/:id', (req, res) => {
  const i = state.uploads.findIndex((u) => u.id === Number(req.params.id));
  if (i < 0) return res.status(404).json({ error: 'Upload not found' });
  state.uploads.splice(i, 1);
  res.status(204).end();
});

function sendFile(res, kind) {
  if (kind === 'pdf') return res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="sample.pdf"' }).send(buildPdf('QA Practice App sample PDF'));
  if (kind === 'csv') return res.set({ 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="sample.csv"' }).send(CSV);
  if (kind === 'image') return res.set({ 'Content-Type': 'image/png', 'Content-Disposition': 'attachment; filename="sample.png"' }).send(PNG);
  return res.status(404).json({ error: 'kind must be pdf, csv or image' });
}

router.get('/download/delayed', (req, res) => {
  const ms = Math.min(Math.max(Number(req.query.ms) || 3000, 0), 15000);
  setTimeout(() => sendFile(res, req.query.kind || 'pdf'), ms);
});
router.get('/download/:kind', (req, res) => sendFile(res, req.params.kind));

module.exports = router;
