import React, { useState, useRef, useImperativeHandle } from 'react';

// Minimal, robust CSV parser supporting quoted fields and commas/newlines inside quotes.
function parseCSV(text) {
  const rows = [];
  let cur = '';
  let row = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        // escaped quote
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      row.push(cur);
      cur = '';
      continue;
    }
    if ((ch === '\n' || ch === '\r') && !inQuotes) {
      // handle CRLF
      if (ch === '\r' && text[i + 1] === '\n') {
        i++;
      }
      row.push(cur);
      rows.push(row);
      row = [];
      cur = '';
      continue;
    }
    cur += ch;
  }
  // last value
  if (cur !== '' || inQuotes || row.length > 0) {
    row.push(cur);
    rows.push(row);
  }
  return rows;
}

const TableUploader = React.forwardRef(function TableUploader({ onData, hideInput = false, showList = true }, ref) {
  const [previews, setPreviews] = useState([]); // array of { rows, data, meta }
  const inputRef = useRef(null);
  useImperativeHandle(ref, () => ({
    openFileDialog: () => { if (inputRef.current) inputRef.current.click(); }
  }));
  const [error, setError] = useState('');

  const parseSingleFile = async (file) => {
    setError('');
    try {
      const name = (file.name || '').toLowerCase();
      let rows = [];
      let fileType = 'csv';
      // If xlsx and library available, parse as excel
      if ((name.endsWith('.xlsx') || name.endsWith('.xls')) && typeof window !== 'undefined') {
          try {
          // dynamic require to avoid bundling issues when not installed
          // eslint-disable-next-line global-require
          const XLSX = require('xlsx');
          const arrayBuffer = await file.arrayBuffer();
          const workbook = XLSX.read(arrayBuffer, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[firstSheetName];
          const json = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
          rows = json;
          fileType = 'excel';
        } catch (ex) {
          // fallback to CSV parsing if xlsx import failed
          const text = await file.text();
          rows = parseCSV(text);
          fileType = 'csv';
        }
      } else {
        const text = await file.text();
        rows = parseCSV(text);
        fileType = 'csv';
      }
      // normalize: treat first row as header if values are unique-ish
      let data = {};
      if (rows.length === 0) {
        setError('Empty file');
        return;
      }
      const first = rows[0];
      const isHeader = first.every((c) => typeof c === 'string' && c.trim() !== '');
      if (isHeader && rows.length > 1) {
        const headers = first.map(h => h.trim());
        // build columns
        headers.forEach(h => { data[h] = []; });
        for (let r = 1; r < rows.length; r++) {
          const row = rows[r];
          for (let c = 0; c < headers.length; c++) {
            data[headers[c]].push((row[c] || '').trim());
          }
        }
      } else {
        // fallback: create columns Col 1..N
        const maxCols = Math.max(...rows.map(r => r.length));
        for (let c = 0; c < maxCols; c++) data[`Col ${c + 1}`] = [];
        for (let r = 0; r < rows.length; r++) {
          for (let c = 0; c < maxCols; c++) {
            data[`Col ${c + 1}`].push(((rows[r] || [])[c] || '').trim());
          }
        }
      }

      const meta = { filename: file.name, fileType };
      return { rows, data, meta };
    } catch (e) {
      setError(String(e.message || e));
      return null;
    }
  };

  const handleInput = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const results = [];
    for (const f of files) {
      // parse sequentially to avoid memory spikes
      // eslint-disable-next-line no-await-in-loop
      const parsed = await parseSingleFile(f);
      if (parsed) results.push(parsed);
    }
    if (results.length === 0) return;
    // Merge into previews (append)
  setPreviews((prev) => {
      const next = prev.concat(results);
      // After updating previews, also update global injection and notify parent
      try {
        if (typeof window !== 'undefined') {
          window._latestSlideForm = window._latestSlideForm || {};
          const table_data = {};
          const table_sources = [];
          for (const p of next) {
            const fname = p.meta.filename || `table_${Object.keys(table_data).length + 1}`;
            // ensure unique key
            let key = fname;
            let idx = 1;
            while (Object.prototype.hasOwnProperty.call(table_data, key)) {
              key = `${fname}(${idx++})`;
            }
            table_data[key] = p.data;
            table_sources.push(p.meta || { filename: fname, fileType: p.meta.fileType || 'csv' });
          }
          window._latestSlideForm.table_data = table_data;
          window._latestSlideForm.table_sources = table_sources;
          // backward-compat: set data to first table
          const firstKey = Object.keys(table_data)[0];
          if (firstKey) window._latestSlideForm.data = table_data[firstKey];
        }
      } catch (err) {
        // ignore
      }
  if (typeof onData === 'function') {
        try {
          const table_data = {};
          const table_sources = [];
          for (const p of next) {
            const fname = p.meta.filename || `table_${Object.keys(table_data).length + 1}`;
            let key = fname;
            let idx = 1;
            while (Object.prototype.hasOwnProperty.call(table_data, key)) {
              key = `${fname}(${idx++})`;
            }
            table_data[key] = p.data;
            table_sources.push(p.meta || { filename: fname, fileType: p.meta.fileType || 'csv' });
          }
          onData({ table_data, table_sources });
        } catch (err) {
          // ignore
        }
      }
      return next;
    });
  };

  const removePreview = (filename) => {
    setPreviews((prev) => {
      const next = prev.filter(p => p.meta.filename !== filename);
      try {
        if (typeof window !== 'undefined') {
          window._latestSlideForm = window._latestSlideForm || {};
          const table_data = {};
          const table_sources = [];
          for (const p of next) {
            const fname = p.meta.filename;
            table_data[fname] = p.data;
            table_sources.push(p.meta);
          }
          window._latestSlideForm.table_data = table_data;
          window._latestSlideForm.table_sources = table_sources;
          const firstKey = Object.keys(table_data)[0];
          if (firstKey) window._latestSlideForm.data = table_data[firstKey];
        }
      } catch (err) {
        // ignore
      }
      if (typeof onData === 'function') {
        const table_data = {};
        const table_sources = [];
        for (const p of next) {
          const fname = p.meta.filename;
          table_data[fname] = p.data;
          table_sources.push(p.meta);
        }
        onData({ table_data, table_sources });
      }
      return next;
    });
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-400">Upload Data (CSV / Excel) — select one or more files</label>
      <div className="flex items-center gap-3">
        <input ref={inputRef} type="file" multiple accept="text/csv,text/plain,.csv,.xlsx,.xls" onChange={handleInput} className={hideInput ? 'hidden' : ''} />
      </div>

      {error && <div className="text-red-500 text-sm">{error}</div>}

      {showList && previews.length > 0 && (
        <div className="mt-2">
          <div className="text-xs text-gray-600">Uploaded files</div>
          <div className="flex flex-wrap gap-2 mt-1">
            {previews.map((preview, idx) => (
              <div key={idx} className="flex items-center space-x-2 bg-gray-100 px-2 py-1 rounded text-xs">
                <span className="font-medium">{preview.meta.filename}</span>
                <span className="text-gray-500">({preview.meta.fileType})</span>
                <button type="button" onClick={() => removePreview(preview.meta.filename)} className="text-xs text-red-500">Remove</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
    });

    export default TableUploader;
