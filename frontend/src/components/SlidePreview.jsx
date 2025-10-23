import { useState, useEffect } from "react";
import ChartRenderer from "./ChartRenderer";
import { getPalette } from '../api';
import { readableTextOnAlphaBg, ensureHex } from '../utils/colorUtils';

export default function SlidePreview({ slides, isLoading, zoom = 1, optimizedStoryline }) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [palette, setPalette] = useState(null);

  const LOCAL_PALETTE = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6'];

  const getCardPalette = () => {
    const src = (palette && Array.isArray(palette) && palette.length > 0) ? palette : LOCAL_PALETTE;
    return src.map(c => {
      const clean = String(c || '').trim();
      const accent = clean;
      const bg = (/^#([A-Fa-f0-9]{6})$/.test(clean)) ? `${clean}20` : `${clean}`;
      return { accent, bg };
    });
  };

  const CARD_PALETTE = getCardPalette();

  useEffect(() => {
    let mounted = true;
    getPalette().then(p => {
      if (!mounted) return;
      if (p && p.colors && Array.isArray(p.colors)) setPalette(p.colors);
    }).catch(() => {});
    return () => { mounted = false };
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-gray-600 border-t-[var(--gold-400)] rounded-full animate-spin mb-4"></div>
        <p className="text-[var(--muted)] font-medium">Generating your slides...</p>
      </div>
    );
  }

  if (!slides || slides.length === 0) {
    return (
      <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-700 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-[var(--text)] mb-2">No slides yet</h3>
        <p className="text-[var(--muted)]">Fill out the form and click "Generate Slides" to create your presentation</p>
      </div>
    );
  }

  const currentSlide = slides[currentSlideIndex];

  return (
    <div className="space-y-8">
      <div className="max-w-[1280px] mx-auto w-full space-y-4">
      {/* Storyline Overview */}
      {optimizedStoryline && optimizedStoryline.length > 0 && (
        <div className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Optimized Storyline</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {optimizedStoryline.map((point, index) => (
              <div key={index} className="card p-4">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-[var(--gold-400)] text-slate-900 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {index + 1}
                  </div>
                  <p className="text-sm text-[var(--muted)]">{point}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

  {/* Linear Flow Navigation */}
  <div className="p-6 text-white">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
            disabled={currentSlideIndex === 0}
            className="flex items-center space-x-2 px-4 py-2 bg-transparent text-white hover:bg-gray-800/40 disabled:opacity-50 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">Previous</span>
          </button>

          <div className="flex-1 px-6">
            <div className="flex items-center justify-between w-full">
              {slides.map((slide, index) => (
                <div key={slide.slide_number} className="flex-1 flex items-center justify-center">
                  <button
                    onClick={() => setCurrentSlideIndex(index)}
                    className={`w-full min-w-[120px] mx-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      index === currentSlideIndex
                        ? 'bg-[var(--gold-400)] text-slate-900'
                        : 'bg-transparent text-white hover:bg-gray-700/40'
                    }`}
                  >
                    <div className="text-center truncate">{slide.title}</div>
                  </button>
                  {index < slides.length - 1 && (
                    <svg className="w-4 h-4 text-[var(--muted)] mx-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => setCurrentSlideIndex(Math.min(slides.length - 1, currentSlideIndex + 1))}
            disabled={currentSlideIndex === slides.length - 1}
            className="flex items-center space-x-2 px-4 py-2 bg-transparent text-white hover:bg-gray-800/40 disabled:opacity-50 rounded-lg transition-colors"
          >
            <span className="text-sm font-medium">Next</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

    </div>

    {/* Current Slide */}
      <div
        className="bg-[var(--surface)] border border-gray-700 shadow-lg mx-auto origin-top"
        style={{ width: 1280 * zoom, height: 720 * zoom }}
      >
        {/* Top Navigation Bar */}
        <div className="bg-gray-900 text-white px-6 py-3 flex items-center justify-between border-b border-gray-700">
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold">Next Gen Consulting</h1>
              <p className="text-xs text-gray-300">Confidential and Proprietary</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium">Slide {currentSlide.slide_number}</span>
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          </div>
        </div>

        {/* Slide Content */}
        <div className="p-6 h-full flex flex-col">
          {/* Title Section */}
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-[var(--text)] mb-2">{currentSlide.title}</h2>
            <div className="w-16 h-1 bg-[var(--gold-400)]"></div>
          </div>

          {/* Main Content Grid */}
          <div className="flex-1 grid grid-cols-12 gap-6">
            {/* Left Column - Chart and Analysis */}
            <div className="col-span-8 space-y-4">
              {/* Chart Section */}
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 h-64">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-[var(--text)] uppercase tracking-wide">Analysis</h3>
                  <span className="text-xs text-[var(--muted)] bg-gray-700/40 px-2 py-1 rounded">{currentSlide.visualization}</span>
                </div>
                <div className="h-48 flex items-center justify-center">
                  {currentSlide.chart_image ? (
                    <img src={currentSlide.chart_image} alt={currentSlide.visualization} className="max-h-48 w-full object-contain rounded" />
                  ) : (
                    <ChartRenderer type={currentSlide.visualization} data={currentSlide.data} palette={palette} />
                  )}
                </div>
              </div>

              {/* Key Insights */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3" style={{ background: CARD_PALETTE[0].bg, borderLeft: `6px solid ${CARD_PALETTE[0].accent}` }}>
                  <h4 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: readableTextOnAlphaBg(ensureHex(CARD_PALETTE[0].accent), 0.12) }}>Key Insight</h4>
                  <p className="text-sm" style={{ color: readableTextOnAlphaBg(ensureHex(CARD_PALETTE[0].accent), 0.12) }}>{currentSlide.takeaway}</p>
                </div>
                <div className="p-3" style={{ background: CARD_PALETTE[1].bg, borderLeft: `6px solid ${CARD_PALETTE[1].accent}` }}>
                  <h4 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: readableTextOnAlphaBg(ensureHex(CARD_PALETTE[1].accent), 0.12) }}>Next Steps</h4>
                  <p className="text-sm" style={{ color: readableTextOnAlphaBg(ensureHex(CARD_PALETTE[1].accent), 0.12) }}>{currentSlide.call_to_action}</p>
                </div>
              </div>
            </div>

            {/* Right Column - Details and Frameworks */}
            <div className="col-span-4 space-y-4">
              {/* Key Points */}
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-[var(--text)] uppercase tracking-wide mb-3">Key Points</h3>
                <ul className="space-y-2">
                  {currentSlide.content.map((point, i) => (
                    <li key={i} className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: CARD_PALETTE[0].accent }}></div>
                      <span className="text-xs text-[var(--muted)] leading-relaxed">{point}</span>
                    </li>
                  ))}
            </ul>
              </div>

              {/* Frameworks */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-3">Frameworks</h3>
                {currentSlide.frameworks && currentSlide.frameworks.length > 0 ? (
                  <div className="space-y-3">
                    {currentSlide.frameworks.map((framework, idx) => (
                      <div key={idx} className="bg-gray-800 border border-gray-700 rounded p-2">
                        <div className="flex items-center space-x-2 mb-1">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: palette && palette[0] ? palette[0] : '#2563eb' }}></div>
                              <span className="text-xs font-semibold text-[var(--text)]">{framework}</span>
                        </div>
                            <p className="text-xs text-[var(--muted)] ml-4">
                          {framework === "SWOT Analysis" && "Strengths, Weaknesses, Opportunities, Threats"}
                          {framework === "Porter's Five Forces" && "Competitive rivalry, Supplier power, Buyer power, Threat of substitution, Threat of new entry"}
                          {framework === "BCG Matrix" && "Stars, Cash Cows, Question Marks, Dogs"}
                          {framework === "Value Chain Analysis" && "Primary and support activities analysis"}
                          {framework === "PEST Analysis" && "Political, Economic, Social, Technological factors"}
                          {framework === "Ansoff Matrix" && "Market penetration, Market development, Product development, Diversification"}
                          {framework === "McKinsey 7S" && "Strategy, Structure, Systems, Shared values, Style, Staff, Skills"}
                          {framework === "Balanced Scorecard" && "Financial, Customer, Internal processes, Learning & growth"}
                          {!["SWOT Analysis", "Porter's Five Forces", "BCG Matrix", "Value Chain Analysis", "PEST Analysis", "Ansoff Matrix", "McKinsey 7S", "Balanced Scorecard"].includes(framework) && "Strategic analysis framework"}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 italic">No frameworks suggested</p>
                )}
              </div>

              {/* Executive Summary */}
              {currentSlide.executive_summary && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-amber-800 uppercase tracking-wide mb-2">Executive Summary</h3>
                  <p className="text-xs text-amber-900">{currentSlide.executive_summary}</p>
                </div>
              )}

              {/* Detailed Analysis */}
              {currentSlide.detailed_analysis && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-blue-800 uppercase tracking-wide mb-2">Detailed Analysis</h3>
                  <p className="text-xs text-blue-900">{currentSlide.detailed_analysis}</p>
                </div>
              )}

              {/* Methodology */}
              {currentSlide.methodology && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-green-800 uppercase tracking-wide mb-2">Methodology</h3>
                  <p className="text-xs text-green-900">{currentSlide.methodology}</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center text-xs text-gray-500">
              <span>© Next Gen Consulting. All rights reserved.</span>
              <span>Confidential and Proprietary</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
