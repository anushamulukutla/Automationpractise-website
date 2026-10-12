'use strict';

function escapeField(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows, columns) {
  const cols = columns || Object.keys(rows[0] || {});
  const lines = [cols.join(',')];
  for (const row of rows) lines.push(cols.map((c) => escapeField(row[c])).join(','));
  return lines.join('\n') + '\n';
}

/** Minimal RFC 4180 parser: quoted fields, escaped quotes, CRLF/LF. Returns an array of rows. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => !(r.length === 1 && r[0] === ''));
}

/** Parse CSV text into { headers, records } where each record is an object keyed by header. */
function parseCsvObjects(text) {
  const clean = text.replace(/^﻿/, '');
  const rows = parseCsv(clean);
  if (!rows.length) return { headers: [], records: [] };
  const headers = rows.shift().map((h) => h.trim());
  const records = rows.map((r) => Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? '').trim()])));
  return { headers, records };
}

module.exports = { toCsv, parseCsv, parseCsvObjects };
