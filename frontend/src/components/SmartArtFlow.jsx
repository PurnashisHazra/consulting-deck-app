import React from 'react';
import { parseListItems } from '../utils/parseList';

// Simple SmartArt: render items as stacked boxes with bullet lists when appropriate.
export default function SmartArtFlow({ items = [], numberOfNodes, gridHeight, palette }) {
  const nodeCount = numberOfNodes || items.length;
  const minHeight = gridHeight || Math.max(120, nodeCount * 48);

  const nodePalette = Array.isArray(palette) && palette.length > 0 ? palette : ['#6366f1'];

  const normalizeItem = (text) => {
    if (text === null || text === undefined) return '';
    if (typeof text === 'string') return text;
    if (typeof text === 'number' || typeof text === 'boolean') return String(text);
    if (Array.isArray(text)) return text; // return arrays for bullet lists
    if (typeof text === 'object') {
      try { return JSON.stringify(text); } catch (e) { return String(text); }
    }
    return String(text);
  };

  return (
    <div style={{ width: '100%' }}>
      <div style={{ minHeight: minHeight }} className="flex flex-col gap-3">
        {items.map((raw, idx) => {
          const accent = nodePalette[idx % nodePalette.length];
          const bg = (/^#([A-Fa-f0-9]{6})$/.test(String(accent))) ? `${accent}10` : `${accent}`;
          const accentHex = String(accent);
          const item = normalizeItem(raw);

          return (
            <div key={idx} className="rounded-lg p-3" style={{ background: bg, borderLeft: `6px solid ${accentHex}` }}>
              {Array.isArray(item) ? (
                <ul className="list-disc pl-5 text-sm" style={{ color: '#111827' }}>
                  {item.map((it, i) => (
                    <li key={i}>{String(it)}</li>
                  ))}
                </ul>
              ) : (
                // Split long strings into bullet-like lines if multiple sentences or newlines
                (() => {
                  if (typeof item === 'string') {
                    const parts = parseListItems(item);
                    if (parts.length > 1) {
                      return (
                        <ul className="list-disc pl-5 text-sm" style={{ color: '#111827' }}>
                          {parts.map((p, i) => <li key={i}>{p}</li>)}
                        </ul>
                      );
                    }
                  }
                  return <div className="text-sm" style={{ color: '#111827' }}>{String(item)}</div>;
                })()
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
