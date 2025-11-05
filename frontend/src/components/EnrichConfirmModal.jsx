import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../api';

export default function EnrichConfirmModal({ open, initialContent = '', onClose, onDone }) {
  const [local, setLocal] = useState(initialContent || '');
  const [isEnriching, setIsEnriching] = useState(false);

  useEffect(() => {
    setLocal(initialContent || '');
  }, [initialContent]);

  if (!open) return null;

  const enrichWithAI = async () => {
    setIsEnriching(true);
    try {
      const payload = { title: '', content: String(local || ''), num_points: 3 };
      const res = await fetch(`${API_BASE_URL}/enrich_section`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error('Enrich failed');
      const json = await res.json();
      if (json && Array.isArray(json.bullets)) {
        setLocal(json.bullets.join('\n'));
      } else if (json && json.bullets) {
        // if bullets is string
        setLocal(String(json.bullets));
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
        <div className="flex justify-between items-center">
          <div>
            <button className="px-3 py-2 bg-gray-100 rounded mr-2" onClick={() => onClose()}>Cancel</button>
            <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={() => onDone(local)}>Done</button>
          </div>
          <div>
            <button className="px-3 py-2 bg-white border rounded text-sm" onClick={enrichWithAI} disabled={isEnriching}>{isEnriching ? 'Enriching...' : 'Enrich with AI'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
