import { useState, useEffect, useRef } from "react";
import Draggable from "react-draggable";
import FrameworkDiagram from "./FrameworkDiagram";
import ChartRenderer from "./ChartRenderer";
import { getPalette } from '../api';
import SmartArtFlow from "./SmartArtFlow";
import { readableTextOnAlphaBg, ensureHex, readableTextColor, blendWithWhite, rgbToHex } from '../utils/colorUtils';

// Accept setCurrentSlideIndex as a prop for navigation
export default function CanvasSlidePreview({ slides, zoom = 1, currentSlideIndex = 0, setCurrentSlideIndex, optimizedStoryline, onGenerateMockSlides }) {
  // Delete a canvas item by id
  const handleDelete = (id) => {
    setCanvasItems(items => items.filter(item => item.id !== id));
  };

  // Render optimized storyline if present
  const renderOptimizedStoryline = () => {
    if (!optimizedStoryline || !Array.isArray(optimizedStoryline) || optimizedStoryline.length === 0) return null;
    return (
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4 rounded">
        <h3 className="text-lg font-bold text-blue-700 mb-2">Optimized Storyline</h3>
        <ul className="list-disc ml-6 text-blue-900 text-sm">
          {optimizedStoryline.map((point, idx) => (
            <li key={idx}>{point}</li>
          ))}
        </ul>
      </div>
    );
  };

  // Drag logic
  const handleDrag = (e, data, id) => {
    setCanvasItems(items =>
      items.map(item =>
        item.id === id ? { ...item, x: data.x, y: data.y } : item
      )
    );
  };
  // Store canvas state for each slide
  const [slideCanvasState, setSlideCanvasState] = useState({});

  // Full screen toggle state
  const [isFullScreen, setIsFullScreen] = useState(false);
  // Ref to the main canvas container so we can export only this area
  const canvasRef = useRef(null);

  // Helper to generate default canvas items for a slide
  // If slide.layout and slide.sections exist, use them to build items
  // Local fallback palette used when AI palette isn't available
  const LOCAL_PALETTE = [
    { bg: '#f0f9ff', accent: '#2563eb' },
    { bg: '#fff7ed', accent: '#f59e0b' },
    { bg: '#ecfeff', accent: '#06b6d4' },
    { bg: '#fef3f8', accent: '#ec4899' },
    { bg: '#f0fdf4', accent: '#10b981' },
    { bg: '#faf5ff', accent: '#8b5cf6' },
  ];

  const [remotePalette, setRemotePalette] = useState(null);

  // Blend fraction for creating solid pastel backgrounds from accent colors.
  // Can be overridden with environment variable REACT_APP_CARD_BLEND (e.g., 0.08 or 0.18).
  const CARD_BG_BLEND = typeof process !== 'undefined' && process.env && process.env.REACT_APP_CARD_BLEND
    ? Number(process.env.REACT_APP_CARD_BLEND)
    : 0.12;

  useEffect(() => {
    let mounted = true;
    getPalette().then(p => {
      if (!mounted) return;
      if (p && p.colors && Array.isArray(p.colors)) {
        setRemotePalette(p.colors);
      }
    }).catch(() => {
      // ignore, fallback to local PALETTE
    });
    return () => { mounted = false };
  }, []);

  const DEFAULT_COLORS = ["#2563eb", "#06b6d4", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444", "#fb7185"];
  const COLORS = (remotePalette && Array.isArray(remotePalette) && remotePalette.length > 0) ? remotePalette : DEFAULT_COLORS;

  // Derive a card palette (bg + accent) from the remotePalette hex array when possible
  const getCardPalette = () => {
    if (remotePalette && Array.isArray(remotePalette) && remotePalette.length > 0) {
      // map each hex to an object with accent (hex) and bg (hex + alpha suffix)
      return remotePalette.map(c => {
          const raw = String(c || '').trim();
          const ensure = ensureHex(raw);
          const accent = ensure;
          // Create a solid, pastel-like background by blending the accent with white
    const blended = blendWithWhite(ensure, CARD_BG_BLEND); // configurable accent on white
          const bg = rgbToHex(blended);
          return { bg, accent };
        });
    }
    return LOCAL_PALETTE;
  };

  const CARD_PALETTE = getCardPalette();

  const getDefaultCanvasItems = (slide) => {
    if (!slide) return [];
    // Helper: type-specific dummy data
    const dummyFrameworks = {
      "SWOT Analysis": {
        Strengths: ["Strong brand", "Loyal customers"],
        Weaknesses: ["Limited digital presence"],
        Opportunities: ["Growing market"],
        Threats: ["New competitors"]
      },
      "Ansoff Matrix": {
        "Market Penetration": ["Increase marketing efforts"],
        "Market Development": ["Expand to new regions"],
        "Product Development": ["Launch new products"],
        "Diversification": ["Enter new markets"]
      },
      "Porter's Five Forces": {
        "Competitive Rivalry": ["High competition"],
        "Supplier Power": ["Moderate"],
        "Buyer Power": ["High"],
        "Threat of Substitution": ["Low"],
        "Threat of New Entry": ["Medium"]
      }
      // Add more as needed
    };
    const dummyCharts = {
      "Bar Chart": { labels: ["A", "B", "C"], values: [10, 20, 15] },
      "Pie Chart": { labels: ["X", "Y", "Z"], values: [30, 40, 30] },
      "Waterfall Chart": { steps: ["Start", "Add", "Subtract", "End"], values: [100, 50, -30, 120] }
    };
    // fallback to local palette within this function
    const PALETTE = LOCAL_PALETTE;

    if (slide.layout && Array.isArray(slide.sections)) {
      // If any section requests a Gantt chart, render a full-slide Gantt that spans all rows/columns
      const rows = slide.layout.rows || 1;
      const cols = slide.layout.columns || 1;
      const ganttSection = (slide.sections || []).find(sec => (sec.chartType === 'Gantt Chart' || (sec.charts && sec.charts.includes && sec.charts.includes('Gantt Chart')) || (sec.visualization && /gantt/i.test(sec.visualization))));
      if (ganttSection) {
        // Build gantt data by preferring explicit labels/datasets from section.chart_data or section.data
        const s = ganttSection;
        let labels = [];
        let datasets = [];
        if (s.chart_data && s.chart_data.labels) {
          labels = s.chart_data.labels;
        } else if (s.data && s.data.labels) {
          labels = s.data.labels;
        } else if (Array.isArray(s.data) && s.data.length > 0) {
          labels = s.data.map(d => d.label || d.name || `Item ${Math.random().toString(36).slice(2,6)}`);
        }
        // collect datasets from section data if present
        if (s.chart_data && Array.isArray(s.chart_data.datasets)) {
          datasets = s.chart_data.datasets;
        } else if (s.data && s.data.dataset1) {
          // legacy dataset names
          datasets = [];
          if (Array.isArray(s.data.dataset1)) datasets.push({ label: 'A', data: s.data.dataset1, backgroundColor: s.data.colors || COLORS[0] });
          if (Array.isArray(s.data.dataset2)) datasets.push({ label: 'B', data: s.data.dataset2, backgroundColor: s.data.colors || COLORS[1] });
        }
        // fallback: synthesize from slide.data or dummy
        if ((!labels || labels.length === 0) && slide.data && Array.isArray(slide.data)) {
          labels = slide.data.map(d => d.label || d.name || `Item ${Math.random().toString(36).slice(2,6)}`);
        }
        if ((!datasets || datasets.length === 0) && slide.data && Array.isArray(slide.data)) {
          // create a single dataset from numeric values if possible
          datasets = [{ label: 'Series', data: slide.data.map(d => d.value || 0), backgroundColor: COLORS[0] }];
        }
        // If still empty, fallback to dummy
        if (!labels || labels.length === 0) labels = ['A','B','C'];
        if (!datasets || datasets.length === 0) datasets = [{ label: 'Series', data: [10,20,30], backgroundColor: COLORS[0] }];

        return [
          {
            id: `gantt-full`,
            title: slide.title || 'Gantt',
            type: 'chart',
            gridRow: 1,
            gridCol: 1,
            rowSpan: rows,
            colSpan: cols,
            x: 0,
            y: 0,
            width: 1000,
            height: 600,
            data: { labels, datasets },
            chartType: 'Gantt Chart',
            chartData: { labels, datasets },
          }
        ];
      }

  return slide.sections.map((section, idx) => {
        // Content
        let content = section.content;
        const hasCharts = section.charts && section.charts.length > 0;
        const hasFrameworks = section.frameworks && section.frameworks.length > 0;

        // If empty and there are no charts/frameworks, try slide-level fallbacks
        if ((!content || (typeof content === 'string' && content.trim() === '')) && !hasCharts && !hasFrameworks) {
          // prefer slide.content (array or string)
          if (Array.isArray(slide.content) && slide.content.length > 0) {
            // use nth content if available, else first
            content = slide.content[idx] || slide.content[0];
          } else if (typeof slide.content === 'string' && slide.content.trim()) {
            content = slide.content;
          } else if (slide.takeaway) {
            content = slide.takeaway;
          } else {
            // derive from dummy data labels
            const dummy = (slide.data && Array.isArray(slide.data) && slide.data.length > 0) ? slide.data[(idx) % slide.data.length] : null;
            content = (dummy && (dummy.label || dummy.name)) ? `Data point: ${dummy.label || dummy.name}` : `No AI data for this section. Example: ${section.title || 'Section'} content.`;
          }
        }
        // Chart Data
        let chartType = section.chartType || (section.charts && section.charts.length > 0 ? section.charts[0] : null);
        let chartData = null;
        if (chartType && section.chart_data && typeof section.chart_data === 'object') {
          chartData = section.chart_data[chartType];
        }
        // Fallback to dummy if no chartData
        if (chartType && !chartData) {
          chartData = dummyCharts[chartType] || { labels: ["Sample"], values: [1] };
        }
        // Framework Data
        let frameworkData = section.framework_data;
        if (section.frameworks && section.frameworks.length > 0) {
          if (!frameworkData || frameworkData.length === 0) {
            // If expecting array of objects [{framework_name: {...}}]
            frameworkData = section.frameworks.map(fw => ({ [fw]: dummyFrameworks[fw] || { Example: ["Sample data"] } }));
          }
        }
        // Determine how much content to show based on grid area
        const rowSpan = section.rowSpan || 1;
        const colSpan = section.colSpan || 1;
        const area = Math.max(1, rowSpan * colSpan);
        const targetPoints = Math.max(3, area * 2); // aim for at least 3, more for larger slots

        // Build dataForRender as array when appropriate
        let dataForRender = null;
        if (Array.isArray(content)) {
          dataForRender = content.slice();
        } else if (typeof content === 'string') {
          // Split into sentences/lines for bullets
          const parts = content.split(/\n|\.|;|\u2022|\r/).map(s => s.trim()).filter(Boolean);
          if (parts.length >= targetPoints) {
            dataForRender = parts;
          } else {
            // try to augment from slide.content or takeaway or dummy labels
            dataForRender = parts.slice();
            if (Array.isArray(slide.content) && slide.content.length > 0) {
              for (let i = 0; dataForRender.length < targetPoints && i < slide.content.length; i++) {
                const candidate = slide.content[i];
                if (candidate && !dataForRender.includes(candidate)) dataForRender.push(candidate);
              }
            } else if (typeof slide.content === 'string' && slide.content.trim()) {
              const more = slide.content.split(/\n|\.|;|\u2022|\r/).map(s => s.trim()).filter(Boolean);
              for (let m of more) {
                if (dataForRender.length >= targetPoints) break;
                if (!dataForRender.includes(m)) dataForRender.push(m);
              }
            }
            if (dataForRender.length < targetPoints && slide.takeaway) {
              const tparts = slide.takeaway.split(/\n|\.|;|\u2022|\r/).map(s => s.trim()).filter(Boolean);
              for (let t of tparts) {
                if (dataForRender.length >= targetPoints) break;
                if (!dataForRender.includes(t)) dataForRender.push(t);
              }
            }
            // finally fill with dummy labels
            if (dataForRender.length < targetPoints) {
              const dummyList = (slide.data && Array.isArray(slide.data)) ? slide.data : (dummyCharts[slide.visualization] ? [dummyCharts[slide.visualization]] : []);
              let k = 0;
              while (dataForRender.length < targetPoints) {
                const dd = dummyList[k % Math.max(1, dummyList.length)];
                const label = (dd && (dd.label || dd.name)) ? (dd.label || dd.name) : `Point ${k+1}`;
                dataForRender.push(label);
                k++;
                if (k > 20) break; // safety
              }
            }
          }
        } else if (content == null) {
          dataForRender = [];
          // fill from slide.content or takeaway
          if (Array.isArray(slide.content) && slide.content.length > 0) {
            dataForRender = slide.content.slice(0, targetPoints);
          } else if (typeof slide.content === 'string' && slide.content.trim()) {
            dataForRender = slide.content.split(/\n|\.|;|\u2022|\r/).map(s => s.trim()).filter(Boolean).slice(0, targetPoints);
          }
          if (dataForRender.length < targetPoints && slide.takeaway) {
            dataForRender.push(slide.takeaway);
          }
          while (dataForRender.length < targetPoints) {
            dataForRender.push(`No content available.`);
            if (dataForRender.length > 20) break;
          }
        } else {
          dataForRender = [String(content)];
        }

        // If this section actually contains charts or frameworks, prefer leaving data as-is (don't overwhelm charts)
        const finalData = (hasCharts || hasFrameworks) ? content : dataForRender;

        return {
          id: section.id || `section-${idx}`,
          // provide both title and type so renderer shows header correctly
          title: section.title || section.name || `Section ${idx + 1}`,
          type: section.title || 'custom',
          gridRow: section.row,
          gridCol: section.col,
          rowSpan: section.rowSpan || 1,
          colSpan: section.colSpan || 1,
          x: 0,
          y: 0,
          width: 640,
          height: 360,
          data: finalData,
          charts: section.charts || [],
          chartType,
          chartData,
          frameworkData,
          infographics: section.infographics || [],
        };
      });
    }
    // fallback to old layout
    return [
      { id: "chart", type: "chart", gridArea: "topLeft", x: 0, y: 0, width: 640, height: 360, data: slide.chart_data, chartType: slide.visualization, chartData: slide.data || dummyCharts[slide.visualization] || { labels: ["Sample"], values: [1] } },
      { id: "frameworks", type: "frameworks", gridArea: "topRight", x: 0, y: 0, width: 640, height: 360, data: slide.frameworks || [], frameworkData: slide.framework_data || {}, },
      { id: "keyPoints", type: "keyPoints", gridArea: "bottomLeft", x: 0, y: 0, width: 640, height: 360, data: slide.content || ["No AI key points. Example: Key point 1."] },
      { id: "takeaway", type: "takeaway", gridArea: "bottomRight", x: 0, y: 0, width: 640, height: 360, data: { takeaway: slide.takeaway || 'No AI insight. Example: Key insight.', call_to_action: slide.call_to_action || 'No AI next step. Example: Next step.' } },
    ];
  };

  // Get current slide's canvas items, falling back to default if not set
  const currentSlide = slides && slides.length > 0 ? slides[currentSlideIndex] : null;
  const canvasItems = slideCanvasState[currentSlideIndex] || getDefaultCanvasItems(currentSlide);

  // Save changes to canvas state for current slide
  const setCanvasItems = (newItemsOrUpdater) => {
    setSlideCanvasState(prev => {
      const newItems = typeof newItemsOrUpdater === 'function' ? newItemsOrUpdater(canvasItems) : newItemsOrUpdater;
      return { ...prev, [currentSlideIndex]: newItems };
    });
  };

  // Reset canvas state if slides change (e.g., new deck generated)
  useEffect(() => {
    setSlideCanvasState({});
  }, [slides]);

  // Ensure canvas state for current slide is initialized on navigation
  useEffect(() => {
    if (currentSlide && !slideCanvasState.hasOwnProperty(currentSlideIndex)) {
      setSlideCanvasState(prev => ({
        ...prev,
        [currentSlideIndex]: getDefaultCanvasItems(currentSlide)
      }));
    }
  }, [currentSlideIndex, slides]);

  // Helper component to listen for mousemove/up during resize
  function ResizeListener({ id, onResize, onResizeEnd }) {
    useEffect(() => {
      const handleMove = (e) => onResize(e, id);
      const handleUp = (e) => {
        onResizeEnd(e, id);
        window.removeEventListener("mousemove", handleMove);
        window.removeEventListener("mouseup", handleUp);
      };
      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleUp);
      return () => {
        window.removeEventListener("mousemove", handleMove);
        window.removeEventListener("mouseup", handleUp);
      };
    }, [id, onResize, onResizeEnd]);
    return null;
  }
  // Resize logic
  const handleResizeStart = (e, id) => {
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    setCanvasItems(items =>
      items.map(item =>
        item.id === id
          ? { ...item, resizing: true, startX, startY, startWidth: item.width, startHeight: item.height }
          : item
      )
    );
    document.body.style.cursor = "nwse-resize";
  };
  // Throttle resize updates using requestAnimationFrame to avoid layout thrash / ResizeObserver loops
  const resizePendingRef = useRef(null);
  const resizeScheduledRef = useRef(false);

  const flushResize = () => {
    const pending = resizePendingRef.current;
    if (!pending) {
      resizeScheduledRef.current = false;
      return;
    }
    const { id, clientX, clientY } = pending;
    // Apply a single state update based on the last mouse position
    setCanvasItems(items =>
      items.map(item => {
        if (item.id === id && item.resizing) {
          const deltaX = clientX - item.startX;
          const deltaY = clientY - item.startY;
          return {
            ...item,
            width: Math.max(120, item.startWidth + deltaX),
            height: Math.max(80, item.startHeight + deltaY)
          };
        }
        return item;
      })
    );
    // clear pending and allow future scheduling
    resizePendingRef.current = null;
    resizeScheduledRef.current = false;
  };

  const handleResize = (e, id) => {
    // store latest mouse position and schedule RAF if not already
    resizePendingRef.current = { id, clientX: e.clientX, clientY: e.clientY };
    if (!resizeScheduledRef.current) {
      resizeScheduledRef.current = true;
      window.requestAnimationFrame(flushResize);
    }
  };

  const handleResizeEnd = (e, id) => {
    // Ensure final pending resize is flushed synchronously before clearing resizing flag
    if (resizePendingRef.current && resizePendingRef.current.id === id) {
      // apply final
      const pending = resizePendingRef.current;
      setCanvasItems(items =>
        items.map(item => {
          if (item.id === pending.id && item.resizing) {
            const deltaX = pending.clientX - item.startX;
            const deltaY = pending.clientY - item.startY;
            return {
              ...item,
              width: Math.max(120, item.startWidth + deltaX),
              height: Math.max(80, item.startHeight + deltaY),
              resizing: false
            };
          }
          return item;
        })
      );
      resizePendingRef.current = null;
      resizeScheduledRef.current = false;
    } else {
      setCanvasItems(items =>
        items.map(item =>
          item.id === id ? { ...item, resizing: false } : item
        )
      );
    }
    document.body.style.cursor = "default";
  };

  return (
    <>

      {/* Linear Flow Navigation + Generate Mock Slides Button */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentSlideIndex && setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
            disabled={currentSlideIndex === 0}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">Previous</span>
          </button>

          <div className="flex-1 mx-6">
            <div className="flex items-center justify-center space-x-2">
              {slides.map((slide, index) => (
                <div key={slide.slide_number || index} className="flex items-center">
                  <button
                    onClick={() => setCurrentSlideIndex && setCurrentSlideIndex(index)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${index === currentSlideIndex
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    <div className="text-center">
                      <div className="text-xs text-gray-500 mb-1">Slide {slide.slide_number || index + 1}</div>
                      <div className="max-w-32 truncate">{slide.title}</div>
                    </div>
                  </button>
                  {index < slides.length - 1 && (
                    <svg className="w-4 h-4 text-gray-400 mx-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => setCurrentSlideIndex && setCurrentSlideIndex(Math.min(slides.length - 1, currentSlideIndex + 1))}
            disabled={currentSlideIndex === slides.length - 1}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 rounded-lg transition-colors"
          >
            <span className="text-sm font-medium">Next</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Generate Mock Slides Button */}

        </div>
      </div>

      {/* Slide Title */}
      <div className="w-full flex flex-col items-start px-8 mb-2">
        <h2 className="text-3xl font-extrabold text-gray-900 mb-2">{currentSlide?.title}</h2>
        <div className="w-16 h-1 bg-blue-600 mb-2"></div>
      </div>

      {/* Optimized Storyline - always visible above canvas grid */}
      {/* {renderOptimizedStoryline()} */}
      {optimizedStoryline && optimizedStoryline.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Optimized Storyline</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {optimizedStoryline.map((point, index) => (
              <div key={index} className="bg-white border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {index + 1}
                  </div>
                  <p className="text-sm text-gray-700">{point}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Linear Arrow Navigation - full width */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between w-full overflow-x-auto"
        style={isFullScreen ? { position: 'fixed', top: 0, left: 0, width: '100vw', zIndex: 1100 } : { height: '8vh', minHeight: 56, maxHeight: '12vh' }}>
        <div className="flex items-center w-full space-x-2 overflow-x-auto">
          {slides.map((slide, idx) => (
            <div key={slide.slide_number || idx} className="flex items-center">
              <button
                onClick={() => setCurrentSlideIndex(idx)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-w-0 truncate
                    ${idx === currentSlideIndex ? 'bg-blue-600 text-white shadow' : 'bg-gray-100 text-gray-700 hover:bg-blue-100'}`}
                aria-current={idx === currentSlideIndex ? 'true' : undefined}
              >
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-1">Slide {slide.slide_number || idx + 1}</div>
                  <div className="max-w-32 truncate text-sm">{slide.title}</div>
                </div>
              </button>
              {idx < slides.length - 1 && (
                <svg className="w-4 h-4 text-gray-400 mx-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </div>
          ))}
        </div>
        {isFullScreen && (
          <button
            onClick={() => setIsFullScreen(false)}
            className="ml-4 px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 shadow"
            style={{ position: 'absolute', right: 24, top: 12, zIndex: 1200 }}
          >
            Minimize
          </button>
        )}
      </div>
      {/* Canvas Grid - dynamic based on slide.layout */}
      {/*   */}
      <div
        ref={canvasRef}
        style={{
          width: isFullScreen ? "100vw" : "100%",
          // Subtract arrow navigation height (e.g. 56px) in fullscreen
          height: isFullScreen ? "calc(100vh - 10px)" : "82vh",
          minHeight: 0,
          overflow: "hidden",
          display: "grid",
          gridTemplateColumns: currentSlide && currentSlide.layout ? `repeat(${currentSlide.layout.columns}, 1fr)` : "1fr 1fr",
          gridTemplateRows: currentSlide && currentSlide.layout ? `repeat(${currentSlide.layout.rows}, 1fr)` : "1fr 1fr",
          gap: 0, // show space between grid cells
          background: '#ffffff', // opaque only in fullscreen
          position: isFullScreen ? "fixed" : "relative",
          top: isFullScreen ? 56 : undefined,
          left: isFullScreen ? 0 : undefined,
          zIndex: isFullScreen ? 1000 : undefined
        }}
      >

  {console.log("Rendering canvas items:", canvasItems)}
  {canvasItems.map((item, idx) => {
          // If using new layout, use gridRow/gridCol, else fallback to gridArea
          const gridStyle = currentSlide && currentSlide.layout
            ? {
              gridRow: `${item.gridRow} / span ${item.rowSpan || 1}`,
              gridColumn: `${item.gridCol} / span ${item.colSpan || 1}`,
              position: "relative",
              width: "100%",
              height: "100%"
            }
            : { gridArea: item.gridArea, position: "relative", width: "100%", height: "100%" };
          return (
            <div key={item.id} style={{ ...gridStyle, minHeight: 0, height: '100%', overflow: 'auto', maxHeight: '100%' }}>
              <Draggable
                bounds="parent"
                position={{ x: item.x || 0, y: item.y || 0 }}
                onDrag={(e, data) => handleDrag(e, data, item.id)}
              >
                <div
                  className="border rounded shadow p-4 h-full w-full flex flex-col relative group"
                    style={{
                    boxSizing: "border-box",
                    overflow: "hidden",
                    minWidth: 120,
                    minHeight: 80,
                    maxWidth: "100%",
                    maxHeight: "100%",
                    background: CARD_PALETTE[idx % CARD_PALETTE.length].bg,
                    borderLeft: `6px solid ${CARD_PALETTE[idx % CARD_PALETTE.length].accent}`,
                    transition: 'transform 0.12s ease, box-shadow 0.12s ease',
                  }}
                >
                  <button
                    className="absolute top-2 right-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none group-hover:pointer-events-auto"
                    onClick={() => handleDelete(item.id)}
                    aria-label="Delete section"
                  >
                    ✕
                  </button>
                  {/* Resize handle */}
                  <div
                    className="absolute bottom-1 right-1 w-4 h-4 bg-blue-400 rounded cursor-nwse-resize flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none group-hover:pointer-events-auto"
                    style={{ zIndex: 10 }}
                    onMouseDown={e => handleResizeStart(e, item.id)}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12"><polyline points="2,10 10,10 10,2" fill="none" stroke="white" strokeWidth="2" /></svg>
                  </div>
                  {/* Listen for mousemove/mouseup events for resizing */}
                  {item.resizing && (
                    <ResizeListener id={item.id} onResize={handleResize} onResizeEnd={handleResizeEnd} />
                  )}
                  {/* Render section content based on type, fallback to raw content */}
                  {item.type === "chart" && (
                    (() => {
                      // Use section.charts and section.chart_data for each section
                      const chartTypes = Array.isArray(item.charts) ? item.charts : (item.chartType ? [item.chartType] : []);
                      return chartTypes.length > 0 ? (
                        <>
                          <h4 className="font-bold mb-2">Chart</h4>
                          <div className="flex-1 flex items-center justify-center">
                            {chartTypes.map((chartType, idx) => {
                              // Always pass the full chart object for each chart type
                              const chartDataObj = item.chart_data && item.chart_data[chartType];
                              const chartData = chartDataObj || item.chartData || {};
                              return (
                                <ChartRenderer
                                  key={chartType + idx}
                                  type={chartType}
                                  data={chartData}
                                  xAxisTitle={chartData.xAxisTitle}
                                  yAxisTitle={chartData.yAxisTitle}
                                  legend={chartData.legend}
                                  inferences={chartData.inferences}
                                  palette={ (remotePalette && remotePalette.length>0) ? remotePalette : CARD_PALETTE.map(p => p.accent) }
                                />
                              );
                            })}
                          </div>
                        </>
                      ) : null;
                    })()
                  )}
                  {item.type === "frameworks" && (

                    <>
                      <h4 className="font-bold mb-2">Frameworks</h4>
                      <div className="flex-1 overflow-auto">
                        {item.data && item.data.length > 0 ? (
                          // filter out falsy/null framework entries
                          item.data.filter(Boolean).map((fw, idx) => (
                            <div key={idx} className="mb-2">
                              <div className="font-semibold text-xs mb-1">{fw || 'Framework'}</div>
                {
                  (() => {
                    const sectionAccent = (remotePalette && remotePalette.length > 0)
                      ? remotePalette[idx % remotePalette.length]
                      : CARD_PALETTE[idx % CARD_PALETTE.length].accent;
                    const fallbackPalette = (remotePalette && remotePalette.length>0) ? remotePalette : CARD_PALETTE.map(p => p.accent);
                    const paletteForFramework = [sectionAccent, ...fallbackPalette.filter(p => p !== sectionAccent)];
                    return (
                      <FrameworkDiagram
                        framework={fw}
                        frameworkData={item.frameworkData && item.frameworkData[fw] ? item.frameworkData[fw] : undefined}
                        palette={paletteForFramework}
                      />
                    );
                  })()
                }
                            </div>
                          ))
                        ) : (
                          <span className="text-xs text-gray-500">No frameworks</span>
                        )}
                      </div>
                    </>
                  )}
                  {item.type === "keyPoints" && (
                    <>
                      <h4 className="font-bold mb-2">Key Points</h4>
                      <ul className="list-disc ml-4 flex-1 overflow-auto">
                        {Array.isArray(item.data) ? item.data.map((point, i) => (
                          <li key={i} className="text-xs text-gray-700">{point}</li>
                        )) : <li className="text-xs text-gray-700">{item.data}</li>}
                      </ul>
                    </>
                  )}
                  {item.type === "takeaway" && (
                    <div className="grid grid-cols-2 gap-4 h-full w-full">
                        <div className="p-3 overflow-auto" style={{ background: CARD_PALETTE[0].bg, borderLeft: `6px solid ${CARD_PALETTE[0].accent}` }}>
                          <h4 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: readableTextOnAlphaBg(ensureHex(CARD_PALETTE[0].accent), 0.12) }}>Key Insight</h4>
                          <p className="text-sm" style={{ color: readableTextOnAlphaBg(ensureHex(CARD_PALETTE[0].accent), 0.12) }}>{item.data.takeaway}</p>
                        </div>
                        <div className="p-3 overflow-auto" style={{ background: CARD_PALETTE[1].bg, borderLeft: `6px solid ${CARD_PALETTE[1].accent}` }}>
                          <h4 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: readableTextOnAlphaBg(ensureHex(CARD_PALETTE[1].accent), 0.12) }}>Next Steps</h4>
                          <p className="text-sm" style={{ color: readableTextOnAlphaBg(ensureHex(CARD_PALETTE[1].accent), 0.12) }}>{item.data.call_to_action}</p>
                        </div>
                    </div>
                  )}
                  {/* Card format for custom/unknown types and new AI sections */}
                  {!["chart", "frameworks", "keyPoints", "takeaway"].includes(item.type) && (
                    <div className="rounded-xl border border-gray-200 p-4 shadow-sm flex-1 flex flex-col items-start overflow-auto" style={{ background: 'rgba(255,255,255,1)', justifyContent: 'flex-start', minHeight: 0 }}>
                      {/* Section Title */}
                      <div className="mb-4 w-full">
                        <h3 className="text-base font-bold text-gray-800 uppercase tracking-wide mb-3">{item.title || item.type || "SECTION"}</h3>
                        {(() => {
                          if (Array.isArray(item.data)) {
                            // Array: show as SmartArt flowchart
                            return <SmartArtFlow items={item.data} palette={ [ (remotePalette && remotePalette.length>0) ? remotePalette[idx % remotePalette.length] : CARD_PALETTE[idx % CARD_PALETTE.length].accent ] } />;
                          } else if (typeof item.data === 'object' && item.data !== null) {
                            // Object: pretty JSON, no bullet
                            return (
                              <pre className="text-xs text-gray-700 bg-gray-50 rounded p-2 overflow-auto whitespace-pre-wrap">
                                {JSON.stringify(item.data, null, 2)}
                              </pre>
                            );
                          } else if (typeof item.data === 'string') {
                            // String: split into bullets if possible
                            const points = item.data.split(/\n|\r|\u2022|^- /gm).map(s => s.trim()).filter(s => s && s !== '-');
                            if (points.length > 1) {
                              return <SmartArtFlow items={points} palette={ (remotePalette && remotePalette.length>0) ? remotePalette : CARD_PALETTE.map(p=>p.accent) } />;
                            } else {
                              return (
                                <span className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{item.data}</span>
                              );
                            }
                          } else {
                            return null;
                          }
                        })()}
                      </div>
                      {/* Charts: only show if item.chartData exists and is non-empty */}
                      {(() => {
                        let chartsArr = [];
                        if (Array.isArray(item.chartData)) {
                          chartsArr = item.chartData;
                        } else if (item.chartData && typeof item.chartData === 'object') {
                          chartsArr = Object.keys(item.chartData);
                        }
                        if (!item.chartData || chartsArr.length === 0) return null;
                        return (
                          <div className="mt-4">
                            <h4 className="font-bold text-xs text-blue-700 mb-2">Charts</h4>
                            <div className="flex flex-col gap-2">

                              <ChartRenderer type={item.chartType} data={item.chartData} palette={ (remotePalette && remotePalette.length>0) ? remotePalette : CARD_PALETTE.map(p => p.accent) } />
                            </div>
                          </div>
                        );
                      })()}
                      {/* Infographics: show suggested infographics for this section */}
                      {(() => {
                        if (!item.infographics || item.infographics.length === 0) return null;
                        return (
                          <div className="mt-4">
                            <h4 className="font-bold text-xs text-purple-700 mb-2">Suggested Infographics</h4>
                            <div className="flex flex-wrap gap-2">
                              {item.infographics.map((inf, idx) => (
                                <div key={idx} className="bg-purple-50 border-l-4 border-purple-400 p-2 rounded text-xs text-purple-900 font-semibold">
                                  {inf}
                                  {/* Optionally render SmartArtFlow for each infographic type if data available */}
                                  {/* <SmartArtFlow items={item.data} type={inf} /> */}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                      {/* Frameworks: show each framework as heading, data as table */}
                      {(() => {
                        let frameworksArr = [];
                        if (item.frameworkData && typeof item.frameworkData === 'object') {
                          frameworksArr = Object.keys(item.frameworkData);
                        }
                        if (!item.frameworkData || frameworksArr.length === 0) return null;
                        return (
                          <div className="mt-4">
                            <h4 className="font-bold text-xs text-green-700 mb-2">Frameworks</h4>
                            <div className="flex flex-col gap-4">
                              {frameworksArr.map((fw, fwIdx) => {
                                if (!fw) return null;
                                const fwData = (item.frameworkData && (item.frameworkData[fw] || item.frameworkData.find?.(f => f.framework === fw)?.data)) || {};
                                if (!fwData || typeof fwData !== 'object' || Object.keys(fwData).length === 0) return null;

                                // Use the section (card) palette color for this framework table
                                const sectionAccent = (remotePalette && remotePalette.length > 0)
                                  ? remotePalette[idx % remotePalette.length]
                                  : CARD_PALETTE[idx % CARD_PALETTE.length].accent;
                                const sectionAccentHex = ensureHex(sectionAccent);
                                const tableBorder = sectionAccentHex;
                                const thBg = (/^#([A-Fa-f0-9]{6})$/.test(sectionAccentHex)) ? `${sectionAccentHex}20` : '#f3f4f6';
                                const thColor = readableTextColor(sectionAccentHex);
                                const tdBorder = `${sectionAccentHex}10`;

                                // Recursive table renderer
                                function renderTable(data) {
                                  if (!data || typeof data !== 'object') return String(data);
                                  const keys = Object.keys(data);
                                  const rowCount = Array.isArray(data[keys[0]]) ? data[keys[0]].length : 1;
                                  return (
                                    <table className="min-w-full text-xs rounded mb-2" style={{ border: `1px solid ${tableBorder}` }}>
                                      <thead>
                                        <tr>
                                          {keys.map((k, i) => (
                                            <th key={i} className="px-2 py-1 font-semibold" style={{ background: thBg, color: '#111827', borderBottom: `1px solid ${tableBorder}` }}>{k}</th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {[...Array(rowCount)].map((_, rIdx) => (
                                          <tr key={rIdx}>
                                            {keys.map((k, cIdx) => {
                                              let cell = Array.isArray(data[k]) ? data[k][rIdx] : data[k];
                                              if (cell === null || cell === undefined) cell = '';
                                              if (typeof cell === 'object' && cell !== null) {
                                                // If array of objects, render each as table
                                                if (Array.isArray(cell)) {
                                                  return <td key={cIdx} className="px-2 py-1" style={{ borderBottom: `1px solid ${tdBorder}`, color: '#111827' }}>{cell.map((obj, i) => typeof obj === 'object' ? renderTable(obj) : String(obj))}</td>;
                                                }
                                                // If object, render as table
                                                return <td key={cIdx} className="px-2 py-1" style={{ borderBottom: `1px solid ${tdBorder}`, color: '#111827' }}>{renderTable(cell)}</td>;
                                              }
                                              return <td key={cIdx} className="px-2 py-1" style={{ borderBottom: `1px solid ${tdBorder}`, color: '#111827' }}>{String(cell)}</td>;
                                            })}
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  );
                                }
                                return (
                                  <div key={fwIdx} className="p-3 rounded" style={{ background: thBg, borderLeft: `6px solid ${sectionAccentHex}` }}>
                                    <div className="overflow-auto">
                                      {renderTable(fwData)}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </Draggable>
              {/* Black horizontal toolbar below canvas */}

            </div>
          ); // close map return
        })}

      </div>
      <div className="w-full bg-black flex items-center justify-end py-2 px-4" style={{ borderRadius: '0 0 12px 12px' }}>
          <div className="flex items-center mr-auto space-x-2">
            <button
              className="text-white bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded flex items-center gap-2 shadow"
              onClick={() => setCurrentSlideIndex && setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
              disabled={currentSlideIndex === 0}
              aria-label="Previous slide"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              <span className="text-sm">Previous</span>
            </button>

            <button
              className="text-white bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded flex items-center gap-2 shadow"
              onClick={() => setCurrentSlideIndex && setCurrentSlideIndex(Math.min(slides.length - 1, currentSlideIndex + 1))}
              disabled={currentSlideIndex === slides.length - 1}
              aria-label="Next slide"
            >
              <span className="text-sm">Next</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        <button
          className="text-white bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded mr-2 flex items-center gap-2 shadow"
          onClick={async () => {
            // Download only the canvas container as PNG using html2canvas
            try {
              if (!window.html2canvas) {
                await new Promise((resolve, reject) => {
                  const s = document.createElement('script');
                  s.src = 'https://html2canvas.hertzen.com/dist/html2canvas.min.js';
                  s.onload = resolve;
                  s.onerror = reject;
                  document.body.appendChild(s);
                });
              }
              const node = canvasRef.current;
              if (!node) throw new Error('Canvas element not found');
              const canvas = await window.html2canvas(node, { useCORS: true, backgroundColor: null, scale: 2 });
              canvas.toBlob((blob) => {
                if (!blob) return;
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                const filename = `${(currentSlide && currentSlide.title) ? currentSlide.title.replace(/[^a-z0-9-_]/gi, '_') : 'slide'}_slide_${currentSlideIndex + 1}.png`;
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
              }, 'image/png');
            } catch (err) {
              console.error('Failed to export canvas:', err);
              alert('Failed to export slide image. Try again.');
            }
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16v-8m0 8l-4-4m4 4l4-4m-8 8h8a2 2 0 002-2v-4a2 2 0 00-2-2H6a2 2 0 00-2 2v4a2 2 0 002 2z" /></svg>
          Download
        </button>
        <button
          className="text-white bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded flex items-center gap-2 shadow"
          onClick={() => setIsFullScreen(fs => !fs)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h7V2H2v9h2V4zm16 0h-7V2h9v9h-2V4zm0 16h-7v2h9v-9h-2v7zm-16 0h7v2H2v-9h2v7z" /></svg>
          {isFullScreen ? "Minimize" : "Full Screen"}
        </button>
      </div>
    </>
  );
}

// Helper component to listen for mousemove/up during resize
// (kept for completeness, but only defined once)
