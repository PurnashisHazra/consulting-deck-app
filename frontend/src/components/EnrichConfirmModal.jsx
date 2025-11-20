import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../api';

export default function EnrichConfirmModal({ open, initialContent = '', onClose, onDone }) {
  const [local, setLocal] = useState(initialContent || '');
  const [isEnriching, setIsEnriching] = useState(false);
  const [includeCharts, setIncludeCharts] = useState(false);
  const [includeFrameworks, setIncludeFrameworks] = useState(false);
  const [numPoints, setNumPoints] = useState(3);
  const [suggestedCharts, setSuggestedCharts] = useState([]);
  const [suggestedFrameworks, setSuggestedFrameworks] = useState([]);
  const [selectedCharts, setSelectedCharts] = useState([]);
  const [selectedFrameworks, setSelectedFrameworks] = useState([]);

  useEffect(() => {
    setLocal(initialContent || '');
  }, [initialContent]);

  if (!open) return null;

  const enrichWithAI = async () => {
    setIsEnriching(true);
    try {
      const payload = {
        title: '',
        content: String(local || ''),
        num_points: Number(numPoints) || 3,
        include_charts: Boolean(includeCharts),
        include_frameworks: Boolean(includeFrameworks),
      };
      const res = await fetch(`${API_BASE_URL}/enrich_section`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error('Enrich failed');
      const json = await res.json();
      // Primary: bullets
      if (json) {
        if (Array.isArray(json.bullets)) {
          setLocal(json.bullets.join('\n'));
        } else if (json.bullets) {
          setLocal(String(json.bullets));
        } else if (json.enriched) {
          if (Array.isArray(json.enriched)) setLocal(json.enriched.join('\n'));
          else setLocal(String(json.enriched));
        } else if (typeof json === 'string') {
          setLocal(json);
        }

        // Charts
        if (json.charts && Array.isArray(json.charts)) {
          setSuggestedCharts(json.charts);
          // default: select all suggested charts
          setSelectedCharts(json.charts.map((c, i) => i));
        } else {
          setSuggestedCharts([]);
          setSelectedCharts([]);
        }

        // Frameworks
        if (json.frameworks && Array.isArray(json.frameworks)) {
          // Normalize frameworks to objects { name, data? }
          const fw = json.frameworks.map(f => (typeof f === 'string' ? { name: f } : f));
          setSuggestedFrameworks(fw);
          setSelectedFrameworks(fw.map((_, i) => i));
        } else {
          setSuggestedFrameworks([]);
          setSelectedFrameworks([]);
        }
      }
    } catch (err) {
      console.error('Enrich failed', err);
      window.alert('Failed to enrich content.');
    } finally {
      setIsEnriching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <h3 className="text-lg font-semibold mb-4">Develop content</h3>
        <p className="text-sm text-gray-600 mb-3">Edit the content below, then optionally use the AI to expand it. Click Done to replace the section content.</p>
        <div className="mb-4">
          <textarea value={local} onChange={(e) => setLocal(e.target.value)} rows={6} className="w-full p-3 border rounded text-sm" />
        </div>

        <div className="mb-4 flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={includeCharts} onChange={(e) => setIncludeCharts(e.target.checked)} />
            <span>Include charts</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={includeFrameworks} onChange={(e) => setIncludeFrameworks(e.target.checked)} />
            <span>Include frameworks</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <span>Points</span>
            <select value={numPoints} onChange={(e) => setNumPoints(Number(e.target.value))} className="border rounded px-2 py-1 bg-white">
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
              <option value={5}>5</option>
            </select>
          </label>
        </div>
        {/* Suggested charts/frameworks */}
        {suggestedCharts.length > 0 && (
          <div className="mb-4">
            <div className="text-sm font-semibold mb-2">Suggested charts</div>
            <div className="flex gap-2 flex-wrap">
              {suggestedCharts.map((c, i) => (
                <label key={i} className={`border rounded px-2 py-1 flex items-center gap-2 ${selectedCharts.includes(i) ? 'bg-blue-50 border-blue-300' : 'bg-white'}`}>
                  <input type="checkbox" checked={selectedCharts.includes(i)} onChange={(e) => {
                    if (e.target.checked) setSelectedCharts(prev => [...prev, i]);
                    else setSelectedCharts(prev => prev.filter(x => x !== i));
                  }} />
                  <div className="text-sm">{c.type || c.title || `Chart ${i+1}`}</div>
                </label>
              ))}
            </div>
          </div>
        )}

        {suggestedFrameworks.length > 0 && (
          <div className="mb-4">
            <div className="text-sm font-semibold mb-2">Suggested frameworks</div>
            <div className="flex gap-2 flex-wrap">
              {suggestedFrameworks.map((f, i) => (
                <label key={i} className={`border rounded px-2 py-1 flex items-center gap-2 ${selectedFrameworks.includes(i) ? 'bg-blue-50 border-blue-300' : 'bg-white'}`}>
                  <input type="checkbox" checked={selectedFrameworks.includes(i)} onChange={(e) => {
                    if (e.target.checked) setSelectedFrameworks(prev => [...prev, i]);
                    else setSelectedFrameworks(prev => prev.filter(x => x !== i));
                  }} />
                  <div className="text-sm">{f.name || f}</div>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between items-center">
          <div>
            <button className="px-3 py-2 bg-gray-100 rounded mr-2" onClick={() => onClose()}>Cancel</button>
            <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={() => {
              // Build structured result
              const selectedChartObjects = selectedCharts.map(i => suggestedCharts[i]).filter(Boolean);
              const selectedFrameworkObjects = selectedFrameworks.map(i => suggestedFrameworks[i]).filter(Boolean);
              onDone({ text: local, bullets: local.split('\n').map(s => s.trim()).filter(Boolean), charts: selectedChartObjects, frameworks: selectedFrameworkObjects });
            }}>Done</button>
          </div>
          <div>
            <button className="px-3 py-2 bg-white border rounded text-sm" onClick={enrichWithAI} disabled={isEnriching}>{isEnriching ? 'Enriching...' : 'Enrich with AI'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
