import React, { useState } from 'react';
import { API_BASE_URL } from '../api';

export default function ProblemEnrichModal({ open, initialProblem, onClose }) {
  if (!open) return null;

  const QUESTIONS = [
    'What is the primary outcome you want from solving this problem?',
    'Who is the main stakeholder or audience impacted?',
    'What constraints, risks or assumptions should we consider?',
    'What timeline or deadlines apply?',
    'Which KPIs or metrics define success?',
    'Any important context, existing data, or prior initiatives we should know?'
  ];

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(Array(QUESTIONS.length).fill(''));
  const [finalizing, setFinalizing] = useState(false);
  const [enrichedResult, setEnrichedResult] = useState(null);
  const [loadingEnrich, setLoadingEnrich] = useState(false);

  const handleAnswerChange = (v) => {
    const next = answers.slice();
    next[step] = v;
    setAnswers(next);
  };

  const handleNext = () => {
    if (step < QUESTIONS.length - 1) setStep(step + 1);
  };
  const handlePrev = () => {
    if (step > 0) setStep(step - 1);
  };

  const buildEnriched = () => {
    const lines = [];
    lines.push(initialProblem.trim());
    lines.push('\n-- Enriched details from user --');
    QUESTIONS.forEach((q, i) => {
      const a = answers[i] && answers[i].trim() ? answers[i].trim() : '(no answer)';
      lines.push(`${q} ${a}`);
    });
    return lines.join('\n\n');
  };

  const callEnrichAPI = async () => {
    setLoadingEnrich(true);
    try {
  const res = await fetch(`${API_BASE_URL}/enrich_problem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem: initialProblem, answers }),
      });
      const json = await res.json();
      setEnrichedResult(json);
    } catch (e) {
      setEnrichedResult({ error: String(e) });
    } finally {
      setLoadingEnrich(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl mx-4">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold">Enrich Problem Statement</h3>
          <button className="text-gray-600" onClick={() => onClose(null)}>Close</button>
        </div>
        <div className="p-4" style={{ maxHeight: '60vh', overflow: 'auto' }}>
          <div className="mb-4">
            <strong>Original problem:</strong>
            <div className="mt-2 p-3 bg-gray-50 rounded text-sm whitespace-pre-wrap">{initialProblem}</div>
          </div>

          <div className="mb-4">
            <div className="font-medium mb-2">Question {step+1} of {QUESTIONS.length}</div>
            <div className="mb-2 text-sm text-gray-700">{QUESTIONS[step]}</div>
            <textarea value={answers[step]} onChange={(e) => handleAnswerChange(e.target.value)} className="w-full border rounded p-2" rows={4} />
            <div className="mt-2 flex items-center justify-between">
              <div className="space-x-2">
                <button onClick={handlePrev} disabled={step===0} className="px-3 py-1 rounded bg-gray-100 disabled:opacity-50">Previous</button>
                <button onClick={handleNext} disabled={step===QUESTIONS.length-1} className="px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-50">Next</button>
              </div>
              <div className="text-sm text-gray-500">You can skip questions if not applicable.</div>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between">
              <div className="font-medium mb-2">Preview enriched problem</div>
              <div>
                <button onClick={callEnrichAPI} disabled={loadingEnrich} className="px-3 py-1 rounded bg-indigo-600 text-white">
                  {loadingEnrich ? 'Generating...' : 'Suggest Enrichment'}
                </button>
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded text-sm whitespace-pre-wrap">{enrichedResult && enrichedResult.enriched ? enrichedResult.enriched : buildEnriched()}</div>
            {enrichedResult && (
              <div className="mt-3 text-sm text-gray-700">
                <div className="font-semibold">Extracted Data</div>
                {enrichedResult.data && enrichedResult.data.length > 0 ? (
                  <ul className="list-disc pl-6">{enrichedResult.data.map((d, i) => (<li key={i}>{d.label ? `${d.label}: ${d.value ?? ''}` : JSON.stringify(d)}</li>))}</ul>
                ) : (<div className="text-gray-500">No data extracted</div>)}
                <div className="font-semibold mt-2">Sources</div>
                {enrichedResult.sources && enrichedResult.sources.length > 0 ? (
                  <ul className="list-disc pl-6">{enrichedResult.sources.map((s, i) => (<li key={i}><a className="text-blue-600" href={s} target="_blank" rel="noreferrer">{s}</a></li>))}</ul>
                ) : (<div className="text-gray-500">No sources provided</div>)}
              </div>
            )}
          </div>
        </div>
        <div className="p-4 border-t flex items-center justify-end space-x-2">
          <button onClick={() => onClose(null)} className="px-4 py-2 rounded border">Cancel</button>
          <button onClick={() => {
            // prefer API enriched result if available
            const chosen = (enrichedResult && enrichedResult.enriched) ? enrichedResult.enriched : buildEnriched();
            // apply to slide form if handler exists
            try {
              if (typeof window !== 'undefined' && typeof window._applyEnrichedProblem === 'function') {
                window._applyEnrichedProblem(chosen);
              }
            } catch (e) {
              // ignore
            }
            setFinalizing(true);
            onClose(chosen);
          }} className="px-4 py-2 rounded bg-blue-600 text-white">Use Enriched & Generate</button>
        </div>
      </div>
    </div>
  );
}
