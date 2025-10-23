import { useState, useEffect } from "react";

export default function SlideForm({ onSubmit, isLoading }) {
  const [problem, setProblem] = useState("");
  const [storyline, setStoryline] = useState("");
  const [numSlides, setNumSlides] = useState(3);
  
  const SUGGESTED_TAGS = [
    'Problem Statement', 'Market Size', 'Customer Segments', 'Key Insight', 'Recommendation',
    'Roadmap', 'Financials', 'KPIs', 'Risks', 'Next Steps', 'Timeline', 'Growth Drivers'
  ];

  const addTagToStoryline = (tag) => {
    const lines = storyline.split('\n').map(s => s.trim()).filter(Boolean);
    if (lines.includes(tag)) {
      // toggle: remove
      const next = lines.filter(l => l !== tag);
      setStoryline(next.join('\n'));
      return;
    }
    const next = lines.concat([tag]).join('\n');
    setStoryline(next);
  };

  const isTagSelected = (tag) => {
    const lines = storyline.split('\n').map(s => s.trim()).filter(Boolean);
    return lines.includes(tag);
  };
  
  // Editable pill state
  const [editIndex, setEditIndex] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [customTag, setCustomTag] = useState('');

  const getLines = () => storyline.split('\n').map(s => s.trim()).filter(Boolean);

  const removeTagAt = (idx) => {
    const lines = getLines();
    lines.splice(idx, 1);
    setStoryline(lines.join('\n'));
  };

  const startEdit = (idx) => {
    const lines = getLines();
    setEditIndex(idx);
    setEditValue(lines[idx] || '');
  };

  const finishEdit = () => {
    if (editIndex === null) return;
    const lines = getLines();
    const val = (editValue || '').trim();
    if (!val) {
      // remove
      lines.splice(editIndex, 1);
    } else {
      lines[editIndex] = val;
      // dedupe while preserving order
      const seen = new Set();
      const dedup = [];
      for (const l of lines) {
        const t = l.trim();
        if (!t) continue;
        if (!seen.has(t)) { seen.add(t); dedup.push(t); }
      }
      setStoryline(dedup.join('\n'));
      setEditIndex(null);
      setEditValue('');
      return;
    }
    setStoryline(lines.join('\n'));
    setEditIndex(null);
    setEditValue('');
  };

  const handleCustomTagKey = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const t = (customTag || '').trim();
      if (t) {
        addTagToStoryline(t);
        setCustomTag('');
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // expose current form state so parent can read it for enrichment
    if (typeof window !== 'undefined') {
      window._latestSlideForm = {
        problem_statement: problem,
        storyline: storyline.split("\n").map(s=>s.trim()).filter(Boolean),
        num_slides: parseInt(numSlides),
        data: {
          Region: ["APAC", "EMEA", "NA"],
          Revenue: [100, 200, 300]
        }
      };
    }
    onSubmit({
      problem_statement: problem,
      storyline: storyline.split("\n").map(s=>s.trim()).filter(Boolean),
      num_slides: parseInt(numSlides),
      data: {
        Region: ["APAC", "EMEA", "NA"],
        Revenue: [100, 200, 300]
      }
    });
  };

  // Allow external code (the enrichment modal) to apply an enriched problem directly into this form
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const applier = (text) => {
      if (typeof text === 'string') setProblem(text);
    };
    window._applyEnrichedProblem = applier;
    return () => {
      try { delete window._applyEnrichedProblem; } catch (e) {}
    };
  }, []);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto">
      {/* Problem Statement */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Problem Statement
        </label>
        <textarea 
          value={problem} 
          onChange={(e)=>setProblem(e.target.value)} 
          placeholder="Describe the business problem or challenge..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
          rows={4}
          required
        />
      </div>

      {/* Storyline */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Slide Topics / Storyline</label>
        <div className="mt-2 flex flex-wrap gap-2 items-center">
          {SUGGESTED_TAGS.map(tag => (
            <button
              type="button"
              key={tag}
              onClick={() => addTagToStoryline(tag)}
              className={`px-3 py-1 rounded-full text-sm border focus:outline-none transition-colors ${isTagSelected(tag) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-200'}`}>
              {tag}
            </button>
          ))}
          <div className="flex items-center border border-dashed rounded-md px-2 py-1">
            <input
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              onKeyDown={handleCustomTagKey}
              placeholder="Add tag..."
              className="text-sm px-1 py-0.5 outline-none"
            />
            <button
              type="button"
              onClick={() => { const t = (customTag||'').trim(); if (t) { addTagToStoryline(t); setCustomTag(''); } }}
              className="ml-2 text-sm text-gray-600 hover:text-gray-900"
            >Add</button>
          </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {getLines().map((line, idx) => (
            <div key={`${line}-${idx}`} className="flex items-center space-x-2 bg-gray-100 px-3 py-1 rounded-full text-sm">
              {editIndex === idx ? (
                <input
                  autoFocus
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={finishEdit}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); finishEdit(); } if (e.key === 'Escape') { setEditIndex(null); setEditValue(''); } }}
                  className="text-sm px-1 py-0.5 bg-white rounded"
                />
              ) : (
                <button type="button" onDoubleClick={() => startEdit(idx)} className="text-sm text-gray-800">
                  {line}
                </button>
              )}
              <div className="flex items-center space-x-1">
                <button type="button" title="Edit" onClick={() => startEdit(idx)} className="text-xs text-gray-500 hover:text-gray-700">Edit</button>
                <button type="button" title="Remove" onClick={() => removeTagAt(idx)} className="text-xs text-red-500 hover:text-red-700">×</button>
              </div>
            </div>
          ))}
        </div>

        <textarea
          value={storyline}
          onChange={(e) => setStoryline(e.target.value)}
          rows={4}
          className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
          placeholder="Opportunity / Solution Overview&#10;Recommended Actions&#10;Financial Projections"
        />
      </div>
      </div>

      {/* Number of Slides */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Number of Slides
        </label>
        <input 
          type="number" 
          min="1" 
          max="20"
          value={numSlides} 
          onChange={(e)=>setNumSlides(e.target.value)} 
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          required
        />
      </div>

      {/* Submit Button */}
      <button 
        type="submit"
        disabled={isLoading || !problem.trim() || !storyline.trim()}
        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-700 hover:to-blue-800 focus:ring-4 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
      >
        {isLoading ? (
          <div className="flex items-center justify-center space-x-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Generating Slides...</span>
          </div>
        ) : (
          "Generate Slides"
        )}
      </button>
    </form>
  );
}
