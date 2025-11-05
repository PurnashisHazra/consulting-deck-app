// Lightweight parser to split text into list items while preserving numbered prefixes
export function parseListItems(text) {
  if (!text && text !== 0) return [];
  if (Array.isArray(text)) return text.map(String);
  let s = String(text).replace(/\r/g, '\n').trim();

  // If the text contains numbered entries like "1. ... 2. ..." (possibly on one line),
  // capture each numbered block including its number and following text until the next number.
  if (/\d+\.\s/.test(s)) {
    const re = /\d+\.\s*[\s\S]*?(?=\d+\.\s|$)/g;
    const matches = s.match(re);
    if (matches && matches.length) return matches.map(m => m.trim().replace(/[\s\n]+$/,''));
  }

  // Merge lines where a lone number like "1." sits on its own line followed by text on next line
  const lines = s.split('\n').map(l => l.trim()).filter(Boolean);
  const merged = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\d+\.?$/.test(line) && i + 1 < lines.length) {
      merged.push(line.replace(/\.$/, '') + '. ' + lines[i+1]);
      i++; // skip next
    } else {
      merged.push(line);
    }
  }

  // If merged lines look like a numbered list, return them
  if (merged.some(l => /^\d+\.\s/.test(l))) return merged;

  // Otherwise split by newlines or bullets/semicolons. Do NOT split on periods here to preserve sentences.
  const parts = s.split(/\n|;|\u2022/).map(p => p.trim()).filter(Boolean);
  return parts;
}

export default parseListItems;
