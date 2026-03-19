import { useState, useEffect, useRef } from "react";
import Draggable from "react-draggable";
import FrameworkDiagram from "./FrameworkDiagram";
import ChartRenderer from "./ChartRenderer";
import { getPalette } from '../api';
import SmartArtFlow from "./SmartArtFlow";
import { readableTextOnAlphaBg, ensureHex, readableTextColor, blendWithWhite, rgbToHex } from '../utils/colorUtils';
import EnrichConfirmModal from './EnrichConfirmModal';
import { parseListItems } from '../utils/parseList';
import { ENABLE_INLINE_EDITING } from '../config';

export default function CanvasSlidePreview({ slides, zoom = 1, currentSlideIndex = 0, setCurrentSlideIndex, optimizedStoryline, onGenerateMockSlides }) {
    const [slideCanvasState, setSlideCanvasState] = useState({});
    const [editingMap, setEditingMap] = useState({});
    const [editingValues, setEditingValues] = useState({});
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [clickPosition, setClickPosition] = useState({ x: 100, y: 100 });
    const [selectedPalette, setSelectedPalette] = useState('consulting');
    const [showPaletteSelector, setShowPaletteSelector] = useState(false);
    const [borderWidth, setBorderWidth] = useState(3);
    const [canvasBackgroundColor, setCanvasBackgroundColor] = useState('#e5e7eb');
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [activeEditId, setActiveEditId] = useState(null);
    const canvasRef = useRef(null);

    // Professional consulting color palettes
    const COLOR_PALETTES = {
        default: [
            { bg: '#e5e7eb', accent: '#374151' }, // Gray
            { bg: '#d1fae5', accent: '#059669' }, // Emerald
            { bg: '#fed7aa', accent: '#ea580c' }, // Orange
            { bg: '#dbeafe', accent: '#2563eb' }, // Blue
        ],
        business: [
            { bg: '#e5e7eb', accent: '#1f2937' }, // Dark gray
            { bg: '#d1fae5', accent: '#10b981' }, // Green
            { bg: '#fed7aa', accent: '#f59e0b' }, // Amber
            { bg: '#dbeafe', accent: '#3b82f6' }, // Blue
        ],
        finance: [
            { bg: '#dbeafe', accent: '#1e40af' }, // Navy blue
            { bg: '#d1fae5', accent: '#047857' }, // Forest green
            { bg: '#e5e7eb', accent: '#374151' }, // Slate
            { bg: '#fef3c7', accent: '#d97706' }, // Gold
        ],
        technology: [
            { bg: '#e0e7ff', accent: '#4f46e5' }, // Indigo
            { bg: '#ccfbf1', accent: '#0d9488' }, // Teal
            { bg: '#e5e7eb', accent: '#6b7280' }, // Cool gray
            { bg: '#fce7f3', accent: '#db2777' }, // Pink
        ],
        healthcare: [
            { bg: '#dbeafe', accent: '#2563eb' }, // Medical blue
            { bg: '#d1fae5', accent: '#059669' }, // Health green
            { bg: '#e5e7eb', accent: '#475569' }, // Neutral gray
            { bg: '#f3e8ff', accent: '#9333ea' }, // Purple
        ],
        consulting: [
            { bg: '#e5e7eb', accent: '#334155' }, // Professional gray
            { bg: '#d1f4f0', accent: '#0f766e' }, // Consulting teal
            { bg: '#fed7aa', accent: '#c2410c' }, // Warm orange
            { bg: '#e0e7ff', accent: '#4338ca' }, // Deep indigo
        ],
    };

    const LOCAL_PALETTE = COLOR_PALETTES[selectedPalette] || COLOR_PALETTES.consulting;

    const [remotePalette, setRemotePalette] = useState(null);
    const [isEnriching, setIsEnriching] = useState({});
    const [enrichModal, setEnrichModal] = useState({ open: false, itemId: null, bullets: [] });

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
        }).catch(() => { });
        return () => { mounted = false };
    }, []);

    const DEFAULT_COLORS = ["#2563eb", "#06b6d4", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444", "#fb7185"];
    const COLORS = (remotePalette && Array.isArray(remotePalette) && remotePalette.length > 0) ? remotePalette : DEFAULT_COLORS;

    const getCardPalette = () => {
        if (remotePalette && Array.isArray(remotePalette) && remotePalette.length > 0) {
            return remotePalette.map(c => {
                const raw = String(c || '').trim();
                const ensure = ensureHex(raw);
                const accent = ensure;
                // Create very light background (90% blend with white)
                const blended = blendWithWhite(ensure, 0.15);
                const bg = rgbToHex(blended);
                return { bg, accent };
            });
        }
        return LOCAL_PALETTE;
    };

    const CARD_PALETTE = getCardPalette();

    // Update canvas background when palette changes
    useEffect(() => {
        if (CARD_PALETTE && CARD_PALETTE[0]) {
            setCanvasBackgroundColor(CARD_PALETTE[0].bg);
        }
    }, [selectedPalette]);

    // Canvas dimensions - match image proportions
    const CANVAS_WIDTH = 1400;
    const CANVAS_HEIGHT = 750;
    const PADDING = 15;
    const GAP = 15;

    // Generate beautifully arranged canvas items from backend layout
    const getDefaultCanvasItems = (slide) => {
        if (!slide) return [];

        console.log('Slide data:', slide);
        const layout = slide.layout || { rows: 2, columns: 2 };
        const sections = slide.sections || [];
        console.log('Sections:', sections);

        if (!sections || sections.length === 0) {
            // Fallback: create default 2x2 layout
            return createFallbackLayout(slide);
        }

        // Calculate cell dimensions based on layout
        const rows = layout.rows || 2;
        const cols = layout.columns || 2;

        const availableWidth = CANVAS_WIDTH - (PADDING * 2) - (GAP * (cols - 1));
        const availableHeight = CANVAS_HEIGHT - (PADDING * 2) - (GAP * (rows - 1));

        const cellWidth = availableWidth / cols;
        const cellHeight = availableHeight / rows;

        return sections.map((section, idx) => {
            // Get section position (1-indexed from backend, convert to 0-indexed)
            const row = (section.row || 1) - 1;
            const col = (section.col || 1) - 1;
            const rowSpan = section.rowSpan || 1;
            const colSpan = section.colSpan || 1;

            // Calculate position and size
            const x = PADDING + (col * (cellWidth + GAP));
            const y = PADDING + (row * (cellHeight + GAP));
            const width = (cellWidth * colSpan) + (GAP * (colSpan - 1));
            const height = (cellHeight * rowSpan) + (GAP * (rowSpan - 1));

            // Determine item type based on content
            let itemType = 'custom';
            if (section.charts && section.charts.length > 0) {
                itemType = 'chart';
            } else if (section.frameworks && section.frameworks.length > 0) {
                itemType = 'framework';
            }

            // Process content
            let contentData = section.content;
            if (typeof contentData === 'string') {
                contentData = parseListItems(contentData);
            } else if (!Array.isArray(contentData)) {
                contentData = [String(contentData || '')];
            }

            const item = {
                id: section.id || `section-${idx}`,
                title: section.title || section.name || `Section ${idx + 1}`,
                type: itemType,
                x,
                y,
                width,
                height,
                zIndex: idx,
                data: contentData,
                charts: section.charts || [],
                chartType: section.charts?.[0] || null,
                chartData: section.chart_data || {}, // This is an object like { "Bar Chart": { labels, values, ... } }
                frameworks: section.frameworks || [],
                frameworkData: section.framework_data || [], // This is an array like [{ "SWOT": {...} }, ...]
                infographics: section.infographics || [],
            };

            console.log(`Section ${idx}:`, {
                title: item.title,
                type: itemType,
                hasCharts: item.charts.length > 0,
                chartData: item.chartData,
                hasFrameworks: item.frameworks.length > 0,
                frameworkData: item.frameworkData
            });

            return item;
        });
    };

    const createFallbackLayout = (slide) => {
        // Create default 2x2 grid layout
        const availableWidth = CANVAS_WIDTH - (PADDING * 2) - GAP;
        const availableHeight = CANVAS_HEIGHT - (PADDING * 2) - GAP;
        const cellWidth = availableWidth / 2;
        const cellHeight = availableHeight / 2;

        return [
            {
                id: "chart",
                title: "Chart",
                type: "chart",
                x: PADDING,
                y: PADDING,
                width: cellWidth,
                height: cellHeight,
                zIndex: 0,
                chartType: slide.visualization,
                chartData: slide.data || {},
                data: [],
            },
            {
                id: "frameworks",
                title: "Frameworks",
                type: "framework",
                x: PADDING + cellWidth + GAP,
                y: PADDING,
                width: cellWidth,
                height: cellHeight,
                zIndex: 1,
                frameworks: slide.frameworks || [],
                frameworkData: slide.framework_data || [],
                data: slide.frameworks || [],
            },
            {
                id: "keyPoints",
                title: "Key Points",
                type: "keyPoints",
                x: PADDING,
                y: PADDING + cellHeight + GAP,
                width: cellWidth,
                height: cellHeight,
                zIndex: 2,
                data: Array.isArray(slide.content) ? slide.content : parseListItems(slide.content || ''),
            },
            {
                id: "takeaway",
                title: "Insights",
                type: "takeaway",
                x: PADDING + cellWidth + GAP,
                y: PADDING + cellHeight + GAP,
                width: cellWidth,
                height: cellHeight,
                zIndex: 3,
                data: {
                    takeaway: slide.takeaway || '',
                    call_to_action: slide.call_to_action || ''
                },
            },
        ];
    };

    const currentSlide = slides && slides.length > 0 ? slides[currentSlideIndex] : null;
    const canvasItems = slideCanvasState[currentSlideIndex] || getDefaultCanvasItems(currentSlide);

    const setCanvasItems = (newItemsOrUpdater) => {
        setSlideCanvasState(prev => {
            const newItems = typeof newItemsOrUpdater === 'function' ? newItemsOrUpdater(canvasItems) : newItemsOrUpdater;
            return { ...prev, [currentSlideIndex]: newItems };
        });
    };

    const handleDrag = (e, data, id) => {
        setCanvasItems(items =>
            items.map(item =>
                item.id === id ? { ...item, x: data.x, y: data.y } : item
            )
        );
    };

    const handleResizeStart = (e, id) => {
        e.stopPropagation();
        const item = canvasItems.find(it => it.id === id);
        if (!item) return;

        const startX = e.clientX;
        const startY = e.clientY;
        setCanvasItems(items =>
            items.map(it =>
                it.id === id
                    ? { ...it, resizing: true, startX, startY, startWidth: it.width, startHeight: it.height }
                    : it
            )
        );
        document.body.style.cursor = "nwse-resize";
    };

    const handleResize = (e, id) => {
        const item = canvasItems.find(it => it.id === id && it.resizing);
        if (!item) return;
        const dx = e.clientX - item.startX;
        const dy = e.clientY - item.startY;
        setCanvasItems(items =>
            items.map(it =>
                it.id === id
                    ? { ...it, width: Math.max(200, item.startWidth + dx), height: Math.max(150, item.startHeight + dy) }
                    : it
            )
        );
    };

    const handleResizeEnd = (e, id) => {
        setCanvasItems(items =>
            items.map(it => it.id === id ? { ...it, resizing: false } : it)
        );
        document.body.style.cursor = "default";
    };

    const handleDelete = (id) => {
        setCanvasItems(items => items.filter(item => item.id !== id));
    };

    const bringToFront = (id) => {
        const maxZ = Math.max(...canvasItems.map(it => it.zIndex || 0), 0);
        setCanvasItems(items =>
            items.map(it => it.id === id ? { ...it, zIndex: maxZ + 1 } : it)
        );
    };

    const sendToBack = (id) => {
        const minZ = Math.min(...canvasItems.map(it => it.zIndex || 0), 0);
        setCanvasItems(items =>
            items.map(it => it.id === id ? { ...it, zIndex: minZ - 1 } : it)
        );
    };

    const addNewItem = (type = 'custom') => {
        const newItem = {
            id: `item-${Date.now()}`,
            title: 'New Section',
            type: type,
            x: clickPosition.x,
            y: clickPosition.y,
            width: 400,
            height: 300,
            zIndex: Math.max(...canvasItems.map(it => it.zIndex || 0), 0) + 1,
            data: ['New content point'],
        };
        setCanvasItems(items => [...items, newItem]);
    };

    const handleCanvasClick = (e) => {
        if (e.target === canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            setClickPosition({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            });
        }
    };

    const enrichSection = async (itemId, numPoints = 3) => {
        const item = canvasItems.find(it => it.id === itemId);
        if (!item) return;
        const initial = Array.isArray(item.data) ? item.data.join('\n') : String(item.data || '');
        setEnrichModal({ open: true, itemId, initialContent: initial });
    };

    const applyEnrichedContent = (itemId, newContent) => {
        if (itemId == null) return;
        const parsed = newContent.split('\n').map(s => s.trim()).filter(Boolean);
        const final = parsed.length > 1 ? parsed : (parsed[0] || newContent);
        setCanvasItems(items => items.map(it => it.id === itemId ? { ...it, data: final } : it));
        setEnrichModal({ open: false, itemId: null, initialContent: '' });
    };

    // PowerPoint-style inline editing - edit directly without HTML inputs
    const handleContentEdit = (id, field, value) => {
        setCanvasItems(items =>
            items.map(it => {
                if (it.id === id) {
                    if (field === 'title') {
                        return { ...it, title: value };
                    } else if (field === 'data') {
                        return { ...it, data: value };
                    } else if (field === 'takeaway') {
                        return { ...it, data: { ...it.data, takeaway: value } };
                    } else if (field === 'call_to_action') {
                        return { ...it, data: { ...it.data, call_to_action: value } };
                    }
                }
                return it;
            })
        );
    };

    const handleListItemEdit = (id, index, value) => {
        setCanvasItems(items =>
            items.map(it => {
                if (it.id === id && Array.isArray(it.data)) {
                    const newData = [...it.data];
                    newData[index] = value;
                    return { ...it, data: newData };
                }
                return it;
            })
        );
    };

    const addListItem = (id) => {
        setCanvasItems(items =>
            items.map(it => {
                if (it.id === id) {
                    const newData = Array.isArray(it.data) ? [...it.data, 'New point'] : [String(it.data || ''), 'New point'];
                    return { ...it, data: newData };
                }
                return it;
            })
        );
    };

    const deleteListItem = (id, index) => {
        setCanvasItems(items =>
            items.map(it => {
                if (it.id === id && Array.isArray(it.data)) {
                    const newData = it.data.filter((_, i) => i !== index);
                    return { ...it, data: newData };
                }
                return it;
            })
        );
    };

    useEffect(() => {
        setSlideCanvasState({});
    }, [slides]);

    useEffect(() => {
        if (currentSlide && !slideCanvasState.hasOwnProperty(currentSlideIndex)) {
            setSlideCanvasState(prev => ({
                ...prev,
                [currentSlideIndex]: getDefaultCanvasItems(currentSlide)
            }));
        }
    }, [currentSlideIndex, slides]);

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

    if (!currentSlide) {
        return (
            <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
                <p className="text-gray-500">No slides available</p>
            </div>
        );
    }

    return (
        <>
            {renderOptimizedStoryline()}

            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">{currentSlide.title}</h2>
                    <p className="text-sm text-gray-600">Slide {currentSlideIndex + 1} of {slides.length}</p>
                </div>

                {/* Design Controls */}
                <div className="flex items-center gap-3">
                    {/* Border Width Selector */}
                    <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg">
                        <span className="text-xs font-medium text-gray-700">Border:</span>
                        <select
                            value={borderWidth}
                            onChange={(e) => setBorderWidth(Number(e.target.value))}
                            className="text-sm border-none bg-transparent outline-none cursor-pointer"
                        >
                            <option value={1}>1px</option>
                            <option value={2}>2px</option>
                            <option value={3}>3px</option>
                            <option value={4}>4px</option>
                            <option value={5}>5px</option>
                        </select>
                    </div>

                    {/* Background Color Picker */}
                    <div className="relative">
                        <button
                            onClick={() => setShowColorPicker(!showColorPicker)}
                            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                        >
                            <div style={{ width: 20, height: 20, background: canvasBackgroundColor, borderRadius: 4, border: '1px solid #ccc' }} />
                            <span className="text-xs font-medium text-gray-700">Background</span>
                        </button>

                        {showColorPicker && (
                            <div className="absolute right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-3">
                                <div className="text-xs font-semibold text-gray-700 mb-2">Canvas Background</div>
                                <input
                                    type="color"
                                    value={canvasBackgroundColor}
                                    onChange={(e) => setCanvasBackgroundColor(e.target.value)}
                                    className="w-full h-10 cursor-pointer"
                                />
                                <div className="mt-2 grid grid-cols-4 gap-2">
                                    {['#ffffff', '#f5f5f4', '#e5e7eb', '#d1fae5', '#dbeafe', '#fef3c7', '#fce7f3', '#e0e7ff'].map(color => (
                                        <button
                                            key={color}
                                            onClick={() => setCanvasBackgroundColor(color)}
                                            style={{ width: 32, height: 32, background: color, borderRadius: 6, border: '2px solid #ddd' }}
                                            className="hover:scale-110 transition-transform"
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Palette Selector */}
                    <div className="relative">
                        <button
                            onClick={() => setShowPaletteSelector(!showPaletteSelector)}
                            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                        >
                            <div className="flex gap-1">
                                {CARD_PALETTE.slice(0, 4).map((c, i) => (
                                    <div key={i} style={{ width: 14, height: 14, background: c.accent, borderRadius: 3 }} />
                                ))}
                            </div>
                            <span className="text-xs font-medium text-gray-700">Palette</span>
                        </button>

                        {showPaletteSelector && (
                            <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-3">
                                <div className="text-xs font-semibold text-gray-700 mb-2 uppercase">Color Theme</div>
                                {Object.entries(COLOR_PALETTES).map(([key, palette]) => (
                                    <button
                                        key={key}
                                        onClick={() => {
                                            setSelectedPalette(key);
                                            setShowPaletteSelector(false);
                                        }}
                                        className={`w-full flex items-center justify-between p-2 rounded hover:bg-gray-50 transition ${selectedPalette === key ? 'bg-blue-50 border border-blue-200' : ''
                                            }`}
                                    >
                                        <span className="text-sm font-medium capitalize">{key}</span>
                                        <div className="flex gap-1">
                                            {palette.map((c, i) => (
                                                <div key={i} style={{ width: 12, height: 12, background: c.accent, borderRadius: 3 }} />
                                            ))}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Canvas Container */}
            <div
                ref={canvasRef}
                onClick={handleCanvasClick}
                style={{
                    width: isFullScreen ? "100vw" : "100%",
                    maxWidth: isFullScreen ? "none" : `${CANVAS_WIDTH}px`,
                    height: isFullScreen ? "100vh" : `${CANVAS_HEIGHT}px`,
                    background: canvasBackgroundColor,
                    position: isFullScreen ? "fixed" : "relative",
                    top: isFullScreen ? 0 : undefined,
                    left: isFullScreen ? 0 : undefined,
                    overflow: "hidden",
                    border: "1px solid #d6d3d1",
                    borderRadius: isFullScreen ? 0 : "8px 8px 0 0",
                    zIndex: isFullScreen ? 9999 : undefined,
                    margin: "0 auto",
                    boxSizing: "border-box",
                }}
            >
                {/* Canvas Items */}
                {canvasItems.map((item, idx) => (
                    <Draggable
                        key={item.id}
                        bounds="parent"
                        position={{ x: item.x || 0, y: item.y || 0 }}
                        onDrag={(e, data) => handleDrag(e, data, item.id)}
                        onStart={() => bringToFront(item.id)}
                    >
                        <div
                            style={{
                                position: "absolute",
                                width: item.width,
                                height: item.height,
                                background: "#ffffff",
                                border: `${borderWidth}px dashed ${CARD_PALETTE[idx % CARD_PALETTE.length].accent}`,
                                borderRadius: 12,
                                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                                overflow: "hidden",
                                display: "flex",
                                flexDirection: "column",
                                cursor: "move",
                                zIndex: item.zIndex || 0,
                                boxSizing: "border-box",
                            }}
                            className="group"
                        >
                            {/* Toolbar */}
                            <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none group-hover:pointer-events-auto" style={{ zIndex: 20 }}>
                                {item.type === "custom" && Array.isArray(item.data) && (
                                    <button className="text-xs text-green-700 bg-white px-2 py-1 rounded shadow hover:bg-green-50" onClick={() => addListItem(item.id)} title="Add point">+</button>
                                )}
                                <button className="text-xs text-blue-700 bg-white px-2 py-1 rounded shadow hover:bg-blue-50" onClick={() => bringToFront(item.id)} title="Bring to front">↑</button>
                                <button className="text-xs text-blue-700 bg-white px-2 py-1 rounded shadow hover:bg-blue-50" onClick={() => sendToBack(item.id)} title="Send to back">↓</button>
                                <button className="text-xs text-red-600 bg-white px-2 py-1 rounded shadow hover:bg-red-50" onClick={() => handleDelete(item.id)}>🗑</button>
                            </div>

                            {/* Resize Handle */}
                            <div
                                className="absolute bottom-2 right-2 w-5 h-5 bg-blue-500 rounded cursor-nwse-resize flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none group-hover:pointer-events-auto"
                                style={{ zIndex: 20 }}
                                onMouseDown={e => handleResizeStart(e, item.id)}
                            >
                                <span className="text-white text-xs">⇲</span>
                            </div>

                            {item.resizing && (
                                <ResizeListener id={item.id} onResize={handleResize} onResizeEnd={handleResizeEnd} />
                            )}

                            {/* Content Area */}
                            <div className="flex-1 overflow-auto p-4" style={{ fontSize: '0.875rem' }}>
                                {/* Editable Title - PowerPoint style */}
                                <h4
                                    contentEditable={true}
                                    suppressContentEditableWarning={true}
                                    onBlur={(e) => handleContentEdit(item.id, 'title', e.target.textContent)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            e.target.blur();
                                        }
                                    }}
                                    className="font-bold mb-2 uppercase tracking-wide outline-none focus:ring-2 focus:ring-blue-300 rounded px-1"
                                    style={{
                                        fontSize: '0.95rem',
                                        lineHeight: '1.3',
                                        color: CARD_PALETTE[idx % CARD_PALETTE.length].accent
                                    }}
                                >{item.title || 'Section'}</h4>

                                {(
                                    <>
                                        {/* Chart Type */}
                                        {item.type === "chart" && item.chartType && (
                                            <div className="flex-1 flex items-center justify-center" style={{ minHeight: 0, maxHeight: '100%' }}>
                                                <div style={{ width: '100%', height: '100%', maxHeight: item.height - 100 }}>
                                                    {(() => {
                                                        // Extract chart data from the chartData object
                                                        // Backend structure: section.chart_data = { "Bar Chart": { labels, values, xAxisTitle, ... } }
                                                        let chartDataForType = item.chartData;
                                                        if (item.chartData && typeof item.chartData === 'object' && item.chartType) {
                                                            chartDataForType = item.chartData[item.chartType] || item.chartData;
                                                        }
                                                        return (
                                                            <ChartRenderer
                                                                type={item.chartType}
                                                                data={chartDataForType || {}}
                                                                xAxisTitle={chartDataForType?.xAxisTitle}
                                                                yAxisTitle={chartDataForType?.yAxisTitle}
                                                                legend={chartDataForType?.legend}
                                                                inferences={chartDataForType?.inferences}
                                                                palette={remotePalette || CARD_PALETTE.map(p => p.accent)}
                                                            />
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        )}

                                        {/* Framework Type */}
                                        {item.type === "framework" && item.frameworks && item.frameworks.length > 0 && (
                                            <div className="flex-1 overflow-auto" style={{ minHeight: 0 }}>
                                                {item.frameworks.filter(Boolean).map((fw, fwidx) => {
                                                    // Extract framework data from frameworkData array
                                                    let fwData = null;
                                                    if (Array.isArray(item.frameworkData)) {
                                                        const found = item.frameworkData.find(fd => fd && fd[fw]);
                                                        fwData = found ? found[fw] : null;
                                                    } else if (item.frameworkData && typeof item.frameworkData === 'object') {
                                                        fwData = item.frameworkData[fw];
                                                    }

                                                    return (
                                                        <div key={fwidx} className="mb-2" style={{ maxHeight: item.height - 100 }}>
                                                            <div className="font-semibold mb-1 text-gray-700" style={{ fontSize: '0.7rem' }}>{fw}</div>
                                                            <div style={{ fontSize: '0.7rem' }}>
                                                                <FrameworkDiagram
                                                                    framework={fw}
                                                                    frameworkData={fwData}
                                                                    palette={remotePalette || CARD_PALETTE.map(p => p.accent)}
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Key Points Type */}
                                        {item.type === "keyPoints" && (
                                            <ul className="list-none ml-0 flex-1 overflow-auto">
                                                {Array.isArray(item.data) && item.data.map((point, i) => (
                                                    <li key={i} className="text-gray-800 mb-2 pl-3 group/item relative" style={{
                                                        fontSize: '0.8rem',
                                                        lineHeight: '1.4',
                                                        borderLeft: `4px solid ${CARD_PALETTE[i % CARD_PALETTE.length].accent}`,
                                                        paddingLeft: '0.75rem'
                                                    }}>
                                                        <span
                                                            contentEditable={true}
                                                            suppressContentEditableWarning={true}
                                                            onBlur={(e) => handleListItemEdit(item.id, i, e.target.textContent)}
                                                            className="outline-none focus:ring-2 focus:ring-blue-300 rounded px-1"
                                                        >{point}</span>
                                                        <button
                                                            className="absolute right-0 top-0 text-xs text-red-500 opacity-0 group-hover/item:opacity-100 transition-opacity"
                                                            onClick={() => deleteListItem(item.id, i)}
                                                        >×</button>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}

                                        {/* Takeaway Type */}
                                        {item.type === "takeaway" && (
                                            <div className="flex flex-col gap-2 h-full overflow-auto">
                                                <div className="p-2 overflow-auto" style={{ borderLeft: `4px solid ${CARD_PALETTE[0].accent}` }}>
                                                    <h5 className="font-semibold uppercase tracking-wide mb-1" style={{ color: CARD_PALETTE[0].accent, fontSize: '0.65rem' }}>Key Insight</h5>
                                                    <p
                                                        contentEditable={true}
                                                        suppressContentEditableWarning={true}
                                                        onBlur={(e) => handleContentEdit(item.id, 'takeaway', e.target.textContent)}
                                                        className="text-gray-800 outline-none focus:ring-2 focus:ring-blue-300 rounded px-1"
                                                        style={{ fontSize: '0.75rem', lineHeight: '1.4' }}
                                                    >{item.data?.takeaway || ''}</p>
                                                </div>
                                                <div className="p-2 overflow-auto" style={{ borderLeft: `4px solid ${CARD_PALETTE[1].accent}` }}>
                                                    <h5 className="font-semibold uppercase tracking-wide mb-1" style={{ color: CARD_PALETTE[1].accent, fontSize: '0.65rem' }}>Next Steps</h5>
                                                    <p
                                                        contentEditable={true}
                                                        suppressContentEditableWarning={true}
                                                        onBlur={(e) => handleContentEdit(item.id, 'call_to_action', e.target.textContent)}
                                                        className="text-gray-800 outline-none focus:ring-2 focus:ring-blue-300 rounded px-1"
                                                        style={{ fontSize: '0.75rem', lineHeight: '1.4' }}
                                                    >{item.data?.call_to_action || ''}</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Custom/Generic Content */}
                                        {item.type === "custom" && (
                                            <div className="flex-1 overflow-auto" style={{ minHeight: 0 }}>
                                                {/* Render Charts */}
                                                {item.charts && item.charts.length > 0 && (
                                                    <div className="mb-2" style={{ maxHeight: item.height - 120 }}>
                                                        {item.charts.map((chartType, cidx) => {
                                                            // Backend structure: section.chart_data = { "Bar Chart": { labels, values, ... } }
                                                            let chartDataObj = {};
                                                            if (item.chartData && typeof item.chartData === 'object') {
                                                                chartDataObj = item.chartData[chartType] || item.chartData;
                                                            }
                                                            return (
                                                                <div key={cidx} className="mb-2" style={{ fontSize: '0.7rem' }}>
                                                                    <ChartRenderer
                                                                        type={chartType}
                                                                        data={chartDataObj}
                                                                        xAxisTitle={chartDataObj?.xAxisTitle}
                                                                        yAxisTitle={chartDataObj?.yAxisTitle}
                                                                        legend={chartDataObj?.legend}
                                                                        inferences={chartDataObj?.inferences}
                                                                        palette={remotePalette || CARD_PALETTE.map(p => p.accent)}
                                                                    />
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {/* Render Frameworks */}
                                                {item.frameworks && item.frameworks.length > 0 && (
                                                    <div className="mb-2" style={{ maxHeight: item.height - 120 }}>
                                                        {item.frameworks.filter(Boolean).map((fw, fwidx) => {
                                                            let fwData = null;
                                                            if (Array.isArray(item.frameworkData)) {
                                                                const found = item.frameworkData.find(fd => fd && fd[fw]);
                                                                fwData = found ? found[fw] : null;
                                                            } else if (item.frameworkData && typeof item.frameworkData === 'object') {
                                                                fwData = item.frameworkData[fw];
                                                            }

                                                            return (
                                                                <div key={fwidx} className="mb-2">
                                                                    <div className="font-semibold mb-1 text-gray-700" style={{ fontSize: '0.7rem' }}>{fw}</div>
                                                                    <div style={{ fontSize: '0.7rem' }}>
                                                                        <FrameworkDiagram
                                                                            framework={fw}
                                                                            frameworkData={fwData}
                                                                            palette={remotePalette || CARD_PALETTE.map(p => p.accent)}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {/* Render Text Content */}
                                                {item.data && (
                                                    <div className="text-gray-800" style={{ fontSize: '0.8rem', lineHeight: '1.4' }}>
                                                        {Array.isArray(item.data) ? (
                                                            <ul className="list-none ml-0">
                                                                {item.data.map((point, i) => (
                                                                    <li key={i} className="mb-2 pl-3 group/item relative" style={{
                                                                        borderLeft: `4px solid ${CARD_PALETTE[i % CARD_PALETTE.length].accent}`,
                                                                        paddingLeft: '0.75rem'
                                                                    }}>
                                                                        <span
                                                                            contentEditable={true}
                                                                            suppressContentEditableWarning={true}
                                                                            onBlur={(e) => handleListItemEdit(item.id, i, e.target.textContent)}
                                                                            className="outline-none focus:ring-2 focus:ring-blue-300 rounded px-1"
                                                                        >{point}</span>
                                                                        <button
                                                                            className="absolute right-0 top-0 text-xs text-red-500 opacity-0 group-hover/item:opacity-100 transition-opacity"
                                                                            onClick={() => deleteListItem(item.id, i)}
                                                                        >×</button>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        ) : (
                                                            <p
                                                                contentEditable={true}
                                                                suppressContentEditableWarning={true}
                                                                onBlur={(e) => handleContentEdit(item.id, 'data', e.target.textContent)}
                                                                className="whitespace-pre-line outline-none focus:ring-2 focus:ring-blue-300 rounded px-1"
                                                                style={{ fontSize: '0.8rem', lineHeight: '1.4' }}
                                                            >{String(item.data || '')}</p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </Draggable>
                ))}

                {/* Floating Add Button */}
                <button
                    className="absolute bottom-8 left-8 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center text-2xl font-bold transition-transform hover:scale-110"
                    onClick={() => addNewItem('custom')}
                    title="Add new section"
                    style={{ zIndex: 1000 }}
                >
                    +
                </button>
            </div>

            {/* Bottom Toolbar */}
            <div className="w-full bg-black flex items-center justify-between py-3 px-4" style={{ borderRadius: '0 0 12px 12px' }}>
                <div className="flex items-center space-x-2">
                    <button
                        className="text-white bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded flex items-center gap-2 shadow transition"
                        onClick={() => setCurrentSlideIndex && setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
                        disabled={currentSlideIndex === 0}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        <span className="text-sm">Previous</span>
                    </button>

                    <button
                        className="text-white bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded flex items-center gap-2 shadow transition"
                        onClick={() => setCurrentSlideIndex && setCurrentSlideIndex(Math.min(slides.length - 1, currentSlideIndex + 1))}
                        disabled={currentSlideIndex === slides.length - 1}
                    >
                        <span className="text-sm">Next</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                </div>

                <div className="flex items-center space-x-2">
                    <button
                        className="text-white bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded flex items-center gap-2 shadow transition"
                        onClick={async () => {
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
                                const canvas = await window.html2canvas(node, { useCORS: true, backgroundColor: '#ffffff', scale: 2 });
                                canvas.toBlob((blob) => {
                                    if (!blob) return;
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    const filename = `${(currentSlide?.title || 'slide').replace(/[^a-z0-9-_]/gi, '_')}_${currentSlideIndex + 1}.png`;
                                    a.href = url;
                                    a.download = filename;
                                    document.body.appendChild(a);
                                    a.click();
                                    a.remove();
                                    URL.revokeObjectURL(url);
                                }, 'image/png');
                            } catch (err) {
                                console.error('Failed to export canvas:', err);
                                alert('Failed to export slide. Try again.');
                            }
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        <span className="text-sm">Download PNG</span>
                    </button>

                    <button
                        className="text-white bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded flex items-center gap-2 shadow transition"
                        onClick={() => setIsFullScreen(fs => !fs)}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            {isFullScreen ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                            )}
                        </svg>
                        <span className="text-sm">{isFullScreen ? "Exit Fullscreen" : "Fullscreen"}</span>
                    </button>
                </div>
            </div>

            <EnrichConfirmModal
                open={enrichModal.open}
                initialContent={enrichModal.initialContent}
                onClose={() => setEnrichModal({ open: false, itemId: null, initialContent: '' })}
                onDone={(content) => applyEnrichedContent(enrichModal.itemId, content)}
            />
        </>
    );
}
