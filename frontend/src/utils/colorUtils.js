// Color utilities: convert hex to rgb, compute luminance, and pick readable text color (black/white)
export function hexToRgb(hex) {
  if (!hex) return null;
  try {
    let h = String(hex).trim();
    // strip alpha if present (#rrggbbaa)
    if (h.length === 9) h = h.slice(0, 7);
    if (h.startsWith('#')) h = h.slice(1);
    if (h.length === 3) {
      // expand shorthand #abc -> #aabbcc
      h = h.split('').map(c => c + c).join('');
    }
    const intVal = parseInt(h, 16);
    if (isNaN(intVal) || h.length !== 6) return null;
    const r = (intVal >> 16) & 255;
    const g = (intVal >> 8) & 255;
    const b = intVal & 255;
    return { r, g, b };
  } catch (e) {
    return null;
  }
}

export function relativeLuminance({ r, g, b }) {
  // convert sRGB to linear
  const srgb = [r, g, b].map(v => v / 255).map(c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

export function readableTextColor(hex, dark = '#111827', light = '#ffffff') {
  const rgb = hexToRgb(hex);
  if (!rgb) return dark;
  const L = relativeLuminance(rgb);
  // WCAG suggests contrast ratio threshold; approximate choice using luminance
  // If background is light (L > 0.5) use dark text, else light text
  return L > 0.5 ? dark : light;
}

export function ensureHex(hex) {
  if (!hex) return '#000000';
  let h = String(hex).trim();
  if (!h.startsWith('#')) h = '#' + h;
  return h;
}

export function blendWithWhite(hex, alphaFraction) {
  // hex should be like '#rrggbb' or 'rrggbb'
  const rgb = hexToRgb(hex);
  if (!rgb) return { r: 255, g: 255, b: 255 };
  const a = Math.max(0, Math.min(1, Number(alphaFraction) || 0));
  // resulting = a * color + (1-a) * white
  const r = Math.round(a * rgb.r + (1 - a) * 255);
  const g = Math.round(a * rgb.g + (1 - a) * 255);
  const b = Math.round(a * rgb.b + (1 - a) * 255);
  return { r, g, b };
}

export function rgbToHex({ r, g, b }) {
  const hr = (n) => ('0' + Math.max(0, Math.min(255, n)).toString(16)).slice(-2);
  return `#${hr(r)}${hr(g)}${hr(b)}`;
}

export function readableTextOnAlphaBg(accentHex, alphaFraction = 0.12, dark = '#111827', light = '#ffffff') {
  const blended = blendWithWhite(accentHex, alphaFraction);
  const L = relativeLuminance(blended);
  // use a slightly higher threshold to prefer dark text on borderline
  return L > 0.55 ? dark : light;
}
