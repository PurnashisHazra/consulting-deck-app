import { useState, useEffect, useLayoutEffect, useRef } from "react";
import Draggable from "react-draggable";
import FrameworkDiagram from "./FrameworkDiagram";
import ChartRenderer from "./ChartRenderer";
import InfographicRenderer from "./InfographicRenderer";
import { getPalette, generateFrameworkData } from '../api';
import SmartArtFlow from "./SmartArtFlow";
import { readableTextOnAlphaBg, ensureHex, readableTextColor, blendWithWhite, rgbToHex } from '../utils/colorUtils';
import EnrichConfirmModal from './EnrichConfirmModal';
import { parseListItems } from '../utils/parseList';
import { ENABLE_INLINE_EDITING } from '../config';
import { Card, Text } from "@mantine/core";

export default function CanvasSlidePreview({
    slides,
    zoom = 1,
    currentSlideIndex = 0,
    setCurrentSlideIndex,
    optimizedStoryline,
    onGenerateMockSlides,
    /** Called after layout when parent needs to hide a loading overlay (e.g. saved deck open). */
    onCanvasReady,
    /** Increment when a new deck is loaded — shows animated arrow toward Download PPTX. */
    deckPptxHintKey = 0,
}) {
    const [slideCanvasState, setSlideCanvasState] = useState({});
    const [editingMap, setEditingMap] = useState({});
    const [editingValues, setEditingValues] = useState({});
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [clickPosition, setClickPosition] = useState({ x: 100, y: 100 });
    const [selectedPalette, setSelectedPalette] = useState('consulting');
    const [showPaletteSelector, setShowPaletteSelector] = useState(false);
    const [borderWidth, setBorderWidth] = useState(0);
    const [canvasBackgroundColor, setCanvasBackgroundColor] = useState('#ffffff');
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [activeEditId, setActiveEditId] = useState(null);
    const canvasRef = useRef(null);
    const pptxDownloadBtnRef = useRef(null);
    const [pptxSpotlightActive, setPptxSpotlightActive] = useState(false);
    const [pptxBtnLayout, setPptxBtnLayout] = useState(null);

    useLayoutEffect(() => {
        if (!deckPptxHintKey || !slides?.length) return;
        setPptxSpotlightActive(true);
    }, [deckPptxHintKey, slides?.length]);

    useEffect(() => {
        if (!deckPptxHintKey || !slides?.length) return;
        const t = window.setTimeout(() => {
            setPptxSpotlightActive(false);
            setPptxBtnLayout(null);
        }, 12000);
        return () => clearTimeout(t);
    }, [deckPptxHintKey, slides?.length]);

    useLayoutEffect(() => {
        if (!pptxSpotlightActive) {
            setPptxBtnLayout(null);
            return;
        }
        const measure = () => {
            const el = pptxDownloadBtnRef.current;
            if (!el) return;
            const r = el.getBoundingClientRect();
            setPptxBtnLayout({
                cx: r.left + r.width / 2,
                endTop: Math.max(0, r.top - 24),
            });
        };
        measure();
        const raf = requestAnimationFrame(() => measure());
        const onResize = () => measure();
        window.addEventListener("resize", onResize);
        window.addEventListener("scroll", onResize, true);
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener("resize", onResize);
            window.removeEventListener("scroll", onResize, true);
        };
    }, [pptxSpotlightActive, slides, currentSlideIndex, isFullScreen]);
    const [measuredSize, setMeasuredSize] = useState({ width: 1280, height: 720 });
    const autoLayoutAppliedRef = useRef(new Set());
    const [frameworkDataOverrides, setFrameworkDataOverrides] = useState({});
    const frameworkFetchRequestedRef = useRef(new Set());
    const frameworkFetchAttemptsRef = useRef(new Map());

    const normalizeFrameworkKey = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
    const isMissingFrameworkPayload = (payload) => {
        if (payload == null) return true;
        if (Array.isArray(payload)) return payload.length === 0;
        if (typeof payload === 'object') return Object.keys(payload).length === 0;
        return String(payload).trim().length === 0;
    };
    const getFrameworkPayloadSignals = (payload) => {
        let nodeCount = 0;
        let textChars = 0;
        let listItems = 0;
        const walk = (v) => {
            if (v == null) return;
            if (Array.isArray(v)) {
                listItems += v.length;
                v.forEach(walk);
                return;
            }
            if (typeof v === "object") {
                const keys = Object.keys(v);
                nodeCount += keys.length;
                keys.forEach((k) => walk(v[k]));
                return;
            }
            const s = String(v).trim();
            if (!s) return;
            textChars += s.length;
            nodeCount += 1;
        };
        walk(payload);
        return { nodeCount, textChars, listItems };
    };
    const isIncompleteFrameworkPayload = (payload) => {
        if (isMissingFrameworkPayload(payload)) return true;
        const { nodeCount, textChars, listItems } = getFrameworkPayloadSignals(payload);
        // Guardrail: reject thin payloads that usually render as blank/near-blank cards.
        return (nodeCount < 3) || (textChars < 24 && listItems < 2);
    };
    const findFrameworkPayload = (frameworkData, frameworkName) => {
        if (!frameworkData) return null;
        const fw = String(frameworkName || "");
        if (!fw.trim()) return null;
        const fwNorm = normalizeFrameworkKey(fw);

        if (Array.isArray(frameworkData)) {
            for (const entry of frameworkData) {
                if (!entry || typeof entry !== "object") continue;
                if (Object.prototype.hasOwnProperty.call(entry, fw)) return entry[fw];
                const keys = Object.keys(entry);
                for (const k of keys) {
                    if (normalizeFrameworkKey(k) === fwNorm) return entry[k];
                }
            }
            return null;
        }
        if (typeof frameworkData === "object") {
            if (Object.prototype.hasOwnProperty.call(frameworkData, fw)) return frameworkData[fw];
            const keys = Object.keys(frameworkData);
            for (const k of keys) {
                if (normalizeFrameworkKey(k) === fwNorm) return frameworkData[k];
            }
        }
        return null;
    };
    const normalizeFrameworkBundle = (frameworksInput, frameworkDataInput) => {
        const names = [];
        const mergedData = {};
        const pushName = (n) => {
            const s = String(n || "").trim();
            if (!s) return;
            if (!names.includes(s)) names.push(s);
        };
        const mergeKV = (k, v) => {
            const key = String(k || "").trim();
            if (!key) return;
            pushName(key);
            mergedData[key] = v;
        };

        const absorb = (src) => {
            if (!src) return;
            if (Array.isArray(src)) {
                src.forEach((entry) => {
                    if (typeof entry === "string") {
                        pushName(entry);
                        return;
                    }
                    if (entry && typeof entry === "object") {
                        Object.keys(entry).forEach((k) => mergeKV(k, entry[k]));
                    }
                });
                return;
            }
            if (typeof src === "object") {
                Object.keys(src).forEach((k) => mergeKV(k, src[k]));
                return;
            }
            if (typeof src === "string") pushName(src);
        };

        absorb(frameworksInput);
        absorb(frameworkDataInput);
        return { names, mergedData };
    };
    const resolveFrameworkPayload = (frameworkName, ...sources) => {
        for (const src of sources) {
            if (isMissingFrameworkPayload(src)) continue;
            const byName = findFrameworkPayload(src, frameworkName);
            if (!isMissingFrameworkPayload(byName)) return byName;
            if (src && typeof src === "object" && src.framework_data) {
                const nested = findFrameworkPayload(src.framework_data, frameworkName);
                if (!isMissingFrameworkPayload(nested)) return nested;
            }
            if (src && typeof src === "object" && src.frameworks) {
                const nestedFromFrameworks = findFrameworkPayload(src.frameworks, frameworkName);
                if (!isMissingFrameworkPayload(nestedFromFrameworks)) return nestedFromFrameworks;
            }
            return src;
        }
        return null;
    };

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

    const getPptxInstance = async () => {
        if (typeof window === 'undefined') return null;
        if (window.PptxGenJS) return new window.PptxGenJS();
        await new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/pptxgenjs@4.0.1/dist/pptxgen.bundle.js';
            s.async = true;
            s.onload = () => resolve();
            s.onerror = (e) => reject(e);
            document.body.appendChild(s);
        });
        return window.PptxGenJS ? new window.PptxGenJS() : null;
    };

    const exportDeckToPptx = async () => {
        setPptxSpotlightActive(false);
        setPptxBtnLayout(null);
        try {
            if (!slides || slides.length === 0) {
                alert('No slides to export.');
                return;
            }
            const pptx = await getPptxInstance();
            if (!pptx) {
                alert('Unable to load PPTX generator.');
                return;
            }
            // Match on-canvas 16:9 geometry for pixel-accurate placement
            pptx.layout = "LAYOUT_WIDE";
            const SLIDE_W_IN = 13.333;
            const SLIDE_H_IN = 7.5;
            const pxToInX = (px) => (Number(px) || 0) * (SLIDE_W_IN / CANVAS_WIDTH);
            const pxToInY = (px) => (Number(px) || 0) * (SLIDE_H_IN / CANVAS_HEIGHT);

            const getExportCanvasItems = (slide, idx) => {
                const existing = slideCanvasState[idx];
                if (Array.isArray(existing) && existing.length > 0) return existing.map((x) => ({ ...x }));
                // Fallback to deterministic default + post layout so export matches preview intent
                const base = removeRepetitiveItems(getDefaultCanvasItems(slide)).map((x) => ({ ...x }));
                return applyAestheticPostLayout(base, slide);
            };
            const toTextLines = (item) => {
                if (Array.isArray(item?.data)) return item.data.map((x) => `• ${String(x)}`);
                if (item?.data && typeof item.data === "object") {
                    return Object.values(item.data).flat().map((x) => `• ${String(x)}`);
                }
                if (typeof item?.data === "string" && item.data.trim()) return item.data.split("\n");
                return [];
            };
            const getFwItems = (obj, keys) => {
                if (!obj || typeof obj !== "object") return [];
                for (const k of keys) {
                    if (Object.prototype.hasOwnProperty.call(obj, k)) {
                        const v = obj[k];
                        if (Array.isArray(v)) return v.map((x) => String(x));
                        if (v != null) return [String(v)];
                    }
                }
                return [];
            };
            const drawFrameworkAsPptx = (ps, frameworkName, fwData, box) => {
                const fw = String(frameworkName || "").toLowerCase();
                const x = box.x, y = box.y, w = box.w, h = box.h;
                const gap = 0.08;

                if (fw.includes("swot")) {
                    const qW = (w - gap) / 2;
                    const qH = (h - gap) / 2;
                    const quads = [
                        { t: "Strengths", items: getFwItems(fwData, ["Strengths", "strengths"]), xx: x, yy: y },
                        { t: "Weaknesses", items: getFwItems(fwData, ["Weaknesses", "weaknesses"]), xx: x + qW + gap, yy: y },
                        { t: "Opportunities", items: getFwItems(fwData, ["Opportunities", "opportunities"]), xx: x, yy: y + qH + gap },
                        { t: "Threats", items: getFwItems(fwData, ["Threats", "threats"]), xx: x + qW + gap, yy: y + qH + gap }
                    ];
                    quads.forEach((q) => {
                        ps.addShape(pptx.ShapeType.roundRect, {
                            x: q.xx, y: q.yy, w: qW, h: qH,
                            fill: { color: "F8FAFC" },
                            line: { color: "94A3B8", pt: 1 }
                        });
                        ps.addText(q.t, { x: q.xx + 0.05, y: q.yy + 0.04, w: qW - 0.1, h: 0.18, fontSize: 10, bold: true, color: "0F172A" });
                        ps.addText((q.items.length ? q.items : ["—"]).slice(0, 4).map((v) => `• ${v}`).join("\n"), {
                            x: q.xx + 0.05, y: q.yy + 0.24, w: qW - 0.1, h: qH - 0.28, fontSize: 8, color: "0F172A", valign: "top"
                        });
                    });
                    return true;
                }

                if (fw.includes("pest")) {
                    const cols = 2;
                    const rows = 3;
                    const cellW = (w - gap * (cols - 1)) / cols;
                    const cellH = (h - gap * (rows - 1)) / rows;
                    const factors = [
                        { t: "Political", items: getFwItems(fwData, ["Political", "political"]) },
                        { t: "Economic", items: getFwItems(fwData, ["Economic", "economic"]) },
                        { t: "Social", items: getFwItems(fwData, ["Social", "social"]) },
                        { t: "Technological", items: getFwItems(fwData, ["Technological", "technological"]) },
                        { t: "Legal", items: getFwItems(fwData, ["Legal", "legal"]) },
                        { t: "Environmental", items: getFwItems(fwData, ["Environmental", "environmental"]) }
                    ];
                    factors.forEach((f, i) => {
                        const r = Math.floor(i / cols);
                        const c = i % cols;
                        const xx = x + c * (cellW + gap);
                        const yy = y + r * (cellH + gap);
                        ps.addShape(pptx.ShapeType.roundRect, {
                            x: xx, y: yy, w: cellW, h: cellH,
                            fill: { color: "F8FAFC" },
                            line: { color: "94A3B8", pt: 1 }
                        });
                        ps.addText(f.t, { x: xx + 0.05, y: yy + 0.04, w: cellW - 0.1, h: 0.16, fontSize: 9, bold: true, color: "0F172A" });
                        ps.addText((f.items.length ? f.items : ["—"]).slice(0, 2).join("\n"), {
                            x: xx + 0.05, y: yy + 0.21, w: cellW - 0.1, h: cellH - 0.24, fontSize: 8, color: "334155", valign: "top"
                        });
                    });
                    return true;
                }

                // Generic fallback: key/value framework table in the same diagram box.
                if (fwData && typeof fwData === "object") {
                    const keys = Object.keys(fwData).slice(0, 8);
                    const rows = keys.map((k) => [k, Array.isArray(fwData[k]) ? fwData[k].slice(0, 2).join("; ") : String(fwData[k] ?? "")]);
                    if (rows.length > 0) {
                        ps.addTable(rows, {
                            x, y, w, h,
                            border: { type: "solid", color: "CBD5E1", pt: 1 },
                            fontSize: 8,
                            color: "0F172A",
                            fill: "FFFFFF"
                        });
                        return true;
                    }
                }
                return false;
            };
            const exportZoneOverlays = (ps, slide) => {
                const slideDesign = slide?.slide_design?.zones ? slide.slide_design : slide?.slide_design?.slide;
                const zoneContents = slide?.zone_contents || {};
                if (!slideDesign?.zones) return;
                const zones = slideDesign.zones;
                if (zones.title && zoneContents.title) {
                    const zx = pxToInX(zones.title.x);
                    const zy = pxToInY(zones.title.y);
                    const zw = pxToInX(zones.title.w);
                    const zh = pxToInY(zones.title.h);
                    ps.addText(String(zoneContents.title), {
                        x: zx, y: zy, w: zw, h: Math.max(0.35, zh * 0.55),
                        fontSize: 22, bold: true, color: "111827"
                    });
                    const sub = String(zoneContents.insight_strip || zoneContents.subtitle || "").trim();
                    if (sub) {
                        ps.addShape(pptx.ShapeType.line, {
                            x: zx + 0.02, y: zy + Math.max(0.34, zh * 0.5), w: Math.max(0.2, zw - 0.04), h: 0,
                            line: { color: "E5E7EB", pt: 1 }
                        });
                        ps.addText(sub, {
                            x: zx, y: zy + Math.max(0.36, zh * 0.52), w: zw, h: Math.max(0.2, zh * 0.35),
                            fontSize: 12, bold: true, color: "334155"
                        });
                    }
                }
                if (zones.footer && zoneContents.footer) {
                    ps.addText(String(zoneContents.footer), {
                        x: pxToInX(zones.footer.x), y: pxToInY(zones.footer.y),
                        w: pxToInX(zones.footer.w), h: pxToInY(zones.footer.h),
                        fontSize: 9, color: "6B7280"
                    });
                }
            };

            if (optimizedStoryline && optimizedStoryline.length > 0) {
                const ov = pptx.addSlide();
                ov.addText('Deck Overview', { x: 0.5, y: 0.4, w: 9, h: 0.6, fontSize: 28, bold: true });
                ov.addText(
                    optimizedStoryline.map((x, i) => `${i + 1}. ${x}`).join('\n'),
                    { x: 0.7, y: 1.2, w: 8.8, h: 4.8, fontSize: 16, bullet: true }
                );
            }

            slides.forEach((slide, idx) => {
                const ps = pptx.addSlide();
                ps.background = { color: (canvasBackgroundColor || "#ffffff").replace("#", "") };
                exportZoneOverlays(ps, slide);
                const items = getExportCanvasItems(slide, idx);

                items.forEach((item, iCard) => {
                    const x = pxToInX(item.x);
                    const y = pxToInY(item.y);
                    const w = pxToInX(item.width);
                    const h = pxToInY(item.height);
                    const accentHex = (CARD_PALETTE[iCard % CARD_PALETTE.length]?.accent || "#334155").replace("#", "");

                    ps.addShape(pptx.ShapeType.roundRect, {
                        x, y, w, h,
                        rectRadius: 0.05,
                        fill: { color: "FFFFFF" },
                        line: { color: accentHex, pt: Math.max(0.5, Number(borderWidth) || 0) }
                    });

                    const type = inferItemType(item);
                    const hasHeader = !item.hideCardHeader && type !== "framework";
                    const headerH = hasHeader ? 0.28 : 0;
                    if (hasHeader) {
                        ps.addText(String(item.title || "Section"), {
                            x: x + 0.08, y: y + 0.05, w: Math.max(0.2, w - 0.16), h: 0.22,
                            fontSize: 11, bold: true, color: accentHex
                        });
                    }

                    if (type === "chart") {
                        const chartType = getChartTypesForItem(item)[0];
                        let payload = item.chartData;
                        if (payload && chartType && typeof payload === "object") payload = payload[chartType] || payload;
                        const labels = Array.isArray(payload?.labels) ? payload.labels : [];
                        const values = Array.isArray(payload?.values) ? payload.values.map((v) => Number(v)) : [];
                        if (chartType && labels.length && values.length && labels.length === values.length) {
                            const series = [{ name: payload?.legend || chartType || "Series", labels, values }];
                            const t = String(chartType).toLowerCase();
                            const pptType = t.includes("line")
                                ? pptx.ChartType.line
                                : (t.includes("pie") || t.includes("donut") || t.includes("doughnut") ? pptx.ChartType.pie : pptx.ChartType.bar);
                            ps.addChart(pptType, series, {
                                x: x + 0.08, y: y + headerH + 0.04, w: Math.max(0.4, w - 0.16), h: Math.max(0.5, h - headerH - 0.12),
                                showLegend: true
                            });
                        } else {
                            ps.addText("Chart data unavailable", { x: x + 0.1, y: y + headerH + 0.06, w: w - 0.2, h: h - headerH - 0.12, fontSize: 10, color: "6B7280" });
                        }
                        return;
                    }

                    const lines = toTextLines(item);
                    if (type === "framework") {
                        const fwNames = Array.isArray(item.frameworks) ? item.frameworks.map((f) => (typeof f === "string" ? f : Object.keys(f || {})[0])).filter(Boolean) : [];
                        const fwName = fwNames[0] || "Framework";
                        const fwData = item.frameworkData && typeof item.frameworkData === "object"
                            ? (item.frameworkData[fwName] || Object.values(item.frameworkData)[0])
                            : null;
                        const drew = drawFrameworkAsPptx(ps, fwName, fwData, {
                            x: x + 0.06, y: y + 0.06, w: Math.max(0.3, w - 0.12), h: Math.max(0.3, h - 0.12)
                        });
                        if (!drew) {
                            const fwTitle = `Framework: ${fwName}`;
                            ps.addText(fwTitle, { x: x + 0.08, y: y + 0.06, w: Math.max(0.4, w - 0.16), h: 0.22, fontSize: 11, bold: true, color: accentHex });
                            const fwText = fwData ? JSON.stringify(fwData).slice(0, 800) : (lines.join("\n") || "—");
                            ps.addText(fwText, { x: x + 0.08, y: y + 0.30, w: Math.max(0.4, w - 0.16), h: Math.max(0.4, h - 0.36), fontSize: 9, color: "0F172A", valign: "top" });
                        }
                        return;
                    }

                    ps.addText(lines.join("\n") || "—", {
                        x: x + 0.08, y: y + headerH + 0.04, w: Math.max(0.3, w - 0.16), h: Math.max(0.3, h - headerH - 0.1),
                        fontSize: 10, color: "111827", valign: "top"
                    });
                });
            });

            await pptx.writeFile({ fileName: `PitchMate_Deck_${new Date().toISOString().slice(0, 10)}.pptx` });
        } catch (err) {
            console.error('Failed to export PPTX', err);
            alert('Failed to export PPTX. Try again.');
        }
    };

    // Keep user-selected/default canvas background stable; do not auto-override on palette change.

    // Track actual rendered canvas size so absolute AI coordinates scale correctly in fullscreen.
    useEffect(() => {
        const node = canvasRef.current;
        if (!node || typeof ResizeObserver === "undefined") return;

        const update = () => {
            try {
                const rect = node.getBoundingClientRect();
                setMeasuredSize({ width: rect.width || CANVAS_WIDTH, height: rect.height || CANVAS_HEIGHT });
            } catch (e) {
                // ignore
            }
        };

        update();
        const ro = new ResizeObserver(() => update());
        ro.observe(node);
        return () => {
            try {
                ro.disconnect();
            } catch (e) {
                // ignore
            }
        };
    }, [isFullScreen]);

    // Canvas dimensions - 16:9 (PPT-like)
    const CANVAS_WIDTH = 1280;
    const CANVAS_HEIGHT = 720;
    const absScaleX = (measuredSize.width || CANVAS_WIDTH) / CANVAS_WIDTH;
    const absScaleY = (measuredSize.height || CANVAS_HEIGHT) / CANVAS_HEIGHT;
    const PADDING = 15;
    const GAP = 15;

    const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
    const hasUsableObjectData = (v) => {
        if (!v || typeof v !== "object") return false;
        if (Array.isArray(v)) return v.length > 0;
        return Object.keys(v).length > 0;
    };
    const getContentFlags = (item) => {
        const chartList = Array.isArray(item?.charts) ? item.charts.filter(Boolean) : [];
        const frameworkList = Array.isArray(item?.frameworks) ? item.frameworks.filter(Boolean) : [];
        const infographicList = Array.isArray(item?.infographics) ? item.infographics.filter(Boolean) : [];
        const hasChart = (
            item?.type === "chart" ||
            chartList.length > 0 ||
            Boolean(item?.chartType) ||
            hasUsableObjectData(item?.chartData)
        );
        const hasFramework = (
            item?.type === "framework" ||
            frameworkList.length > 0 ||
            hasUsableObjectData(item?.frameworkData)
        );
        const hasInfographic = infographicList.length > 0;
        return { hasChart, hasFramework, hasInfographic };
    };
    const inferItemType = (item) => {
        const flags = getContentFlags(item);
        if (flags.hasChart) return "chart";
        if (flags.hasFramework) return "framework";
        if (flags.hasInfographic) return "infographic";
        return "text";
    };
    const getChartTypesForItem = (item) => {
        const arr = Array.isArray(item?.charts) ? item.charts.filter(Boolean) : [];
        if (arr.length > 0) return arr;
        if (item?.chartType) return [item.chartType];
        if (item?.chartData && typeof item.chartData === "object" && !Array.isArray(item.chartData)) {
            const keys = Object.keys(item.chartData).filter(Boolean);
            if (keys.length > 0) return [keys[0]];
        }
        return [];
    };
    const normalizeTopic = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const tokenize = (s) => normalizeTopic(s).split(/\s+/).filter((t) => t.length > 2);
    const jaccard = (a, b) => {
        const sa = new Set(tokenize(a));
        const sb = new Set(tokenize(b));
        if (!sa.size && !sb.size) return 1;
        let inter = 0;
        sa.forEach((x) => { if (sb.has(x)) inter += 1; });
        const uni = new Set([...sa, ...sb]).size || 1;
        return inter / uni;
    };
    const getItemText = (item) => {
        const title = String(item?.title || "");
        const data = item?.data;
        let body = "";
        if (Array.isArray(data)) body = data.map((x) => String(x || "")).join(" ");
        else if (data && typeof data === "object") body = Object.values(data).flat().map((x) => String(x || "")).join(" ");
        else body = String(data || "");
        const frameworks = Array.isArray(item?.frameworks) ? item.frameworks.join(" ") : "";
        return `${title} ${frameworks} ${body}`.trim();
    };
    const getRichness = (item) => {
        const text = getItemText(item);
        const chartBonus = (Array.isArray(item?.charts) && item.charts.length > 0) ? 80 : 0;
        const frameworkBonus = (Array.isArray(item?.frameworks) && item.frameworks.length > 0) ? 50 : 0;
        return text.length + chartBonus + frameworkBonus;
    };
    const startsWithOverlap = (a, b, minLen = 42) => {
        const sa = String(a || "").toLowerCase().trim();
        const sb = String(b || "").toLowerCase().trim();
        if (!sa || !sb) return false;
        const pa = sa.slice(0, minLen);
        const pb = sb.slice(0, minLen);
        return pa.length >= minLen && pb.length >= minLen && (pa === pb);
    };
    const bulletOverlapRatio = (aItem, bItem) => {
        const toBullets = (it) => {
            if (Array.isArray(it?.data)) return it.data.map((x) => normalizeTopic(String(x || ""))).filter(Boolean);
            if (typeof it?.data === "string") return parseListItems(it.data).map((x) => normalizeTopic(x)).filter(Boolean);
            return [];
        };
        const a = toBullets(aItem);
        const b = toBullets(bItem);
        if (!a.length || !b.length) return 0;
        const sa = new Set(a);
        const sb = new Set(b);
        let inter = 0;
        sa.forEach((x) => { if (sb.has(x)) inter += 1; });
        return inter / Math.max(1, Math.min(sa.size, sb.size));
    };
    const removeRepetitiveItems = (items) => {
        if (!Array.isArray(items) || items.length <= 1) return items;
        const kept = [];
        for (const it of items) {
            const topic = normalizeTopic(it?.title || "");
            const text = getItemText(it);
            let duplicateIdx = -1;
            for (let i = 0; i < kept.length; i++) {
                const k = kept[i];
                const kTopic = normalizeTopic(k?.title || "");
                const topicSame = topic && kTopic && (topic === kTopic || topic.includes(kTopic) || kTopic.includes(topic));
                const contentVerySimilar = jaccard(text, getItemText(k)) >= 0.64;
                const bulletVerySimilar = bulletOverlapRatio(it, k) >= 0.6;
                const prefixNearDuplicate = startsWithOverlap(text, getItemText(k), 48);
                const frameworkCollision =
                    Array.isArray(it?.frameworks) &&
                    Array.isArray(k?.frameworks) &&
                    it.frameworks.some((fw) => k.frameworks.some((kfw) => normalizeFrameworkKey(fw) === normalizeFrameworkKey(kfw)));
                const chartCollision =
                    Array.isArray(it?.charts) &&
                    Array.isArray(k?.charts) &&
                    it.charts.some((ch) => k.charts.some((kch) => normalizeTopic(ch) === normalizeTopic(kch)));
                if (topicSame || contentVerySimilar || bulletVerySimilar || prefixNearDuplicate || frameworkCollision || chartCollision) {
                    duplicateIdx = i;
                    break;
                }
            }
            if (duplicateIdx === -1) {
                kept.push(it);
        } else {
                // Keep richer section when duplicates collide.
                if (getRichness(it) > getRichness(kept[duplicateIdx])) {
                    kept[duplicateIdx] = it;
                }
            }
        }
        return kept;
    };

    const applyAestheticPostLayout = (items, slideCtx = null) => {
        if (!Array.isArray(items) || items.length === 0) return items;
        const next = items.map((it, i) => ({ ...it, zIndex: typeof it.zIndex === "number" ? it.zIndex : i }));

        // Consulting-style canvas geometry (McKinsey/BCG-esque discipline)
        const OUTER = 28;
        const GUTTER = 16;
        const zoneBody = slideCtx?.slide_design?.zones?.body || slideCtx?.slide_design?.slide?.zones?.body || null;
        const bodyX = Number.isFinite(zoneBody?.x) ? zoneBody.x : OUTER;
        const bodyY = Number.isFinite(zoneBody?.y) ? zoneBody.y : 110;
        const bodyW = Number.isFinite(zoneBody?.w) ? zoneBody.w : (CANVAS_WIDTH - (OUTER * 2));
        const bodyH = Number.isFinite(zoneBody?.h) ? zoneBody.h : (CANVAS_HEIGHT - bodyY - OUTER);
        const MIN_W = 220;
        const MIN_H = 140;

        const byType = {
            chart: next.filter((it) => inferItemType(it) === "chart"),
            framework: next.filter((it) => inferItemType(it) === "framework"),
            text: next.filter((it) => inferItemType(it) === "text"),
        };
        const hasAbsolute = next.some((it) => Number.isFinite(it?.x) && Number.isFinite(it?.y) && Number.isFinite(it?.width) && Number.isFinite(it?.height));

        const placeGrid = (arr, cols, rows) => {
            const cellW = (bodyW - GUTTER * (cols - 1)) / cols;
            const cellH = (bodyH - GUTTER * (rows - 1)) / rows;
            arr.forEach((it, idx) => {
                const r = Math.floor(idx / cols);
                const c = idx % cols;
                it.x = bodyX + c * (cellW + GUTTER);
                it.y = bodyY + r * (cellH + GUTTER);
                it.width = cellW;
                it.height = cellH;
            });
        };
        const placePacked = (arr) => {
            const n = arr.length;
            if (n <= 0) return;
            if (n === 1) {
                arr[0].x = bodyX; arr[0].y = bodyY; arr[0].width = bodyW; arr[0].height = bodyH;
                return;
            }
            if (n === 2) {
                const hasHero = arr.some((it) => inferItemType(it) === "chart" || inferItemType(it) === "framework");
                const leftW = hasHero ? Math.round(bodyW * 0.62) : Math.round(bodyW * 0.5 - GUTTER / 2);
                const rightW = bodyW - leftW - GUTTER;
                arr[0].x = bodyX; arr[0].y = bodyY; arr[0].width = leftW; arr[0].height = bodyH;
                arr[1].x = bodyX + leftW + GUTTER; arr[1].y = bodyY; arr[1].width = rightW; arr[1].height = bodyH;
                return;
            }
            if (n === 3) {
                // Common consulting composition: one hero on top, two support cards below
                const topH = Math.round(bodyH * 0.56);
                arr[0].x = bodyX; arr[0].y = bodyY; arr[0].width = bodyW; arr[0].height = topH;
                const lowerH = bodyH - topH - GUTTER;
                const lowerW = (bodyW - GUTTER) / 2;
                arr[1].x = bodyX; arr[1].y = bodyY + topH + GUTTER; arr[1].width = lowerW; arr[1].height = lowerH;
                arr[2].x = bodyX + lowerW + GUTTER; arr[2].y = bodyY + topH + GUTTER; arr[2].width = lowerW; arr[2].height = lowerH;
                return;
            }
            if (n === 4) {
                placeGrid(arr, 2, 2);
                return;
            }
            const cols = 2;
            const rows = Math.max(1, Math.ceil(n / cols));
            placeGrid(arr, cols, rows);
        };
        const applyGentleInset = (arr) => {
            // Fine-tune by resizing each section slightly to create breathing room.
            const inset = 6;
            arr.forEach((it) => {
                const w = Number(it.width) || MIN_W;
                const h = Number(it.height) || MIN_H;
                if (w <= inset * 2 || h <= inset * 2) return;
                it.x = (Number(it.x) || bodyX) + inset;
                it.y = (Number(it.y) || bodyY) + inset;
                it.width = w - inset * 2;
                it.height = h - inset * 2;
            });
        };
        const estimateTextMetrics = (it) => {
            const title = String(it?.title || "").trim();
            const lines = [];
            if (title) lines.push(title);
            if (Array.isArray(it?.data)) {
                it.data.forEach((d) => lines.push(String(d?.text || d || "").trim()));
            } else if (typeof it?.data === "string") {
                String(it.data).split(/\n+/).forEach((ln) => lines.push(ln.trim()));
            } else if (it?.data && typeof it?.data === "object") {
                Object.values(it.data).forEach((v) => lines.push(String(v || "").trim()));
            }
            const clean = lines.filter(Boolean);
            const longest = clean.reduce((m, ln) => Math.max(m, ln.length), 0);
            const lineCount = Math.max(1, clean.length);
            return { longest, lineCount };
        };
        const tightenTextOnlyCards = (arr) => {
            const charPx = 7.1;
            const linePx = 20;
            arr.forEach((it) => {
                const hasCharts = Array.isArray(it?.charts) && it.charts.length > 0;
                const hasFrameworks = Array.isArray(it?.frameworks) && it.frameworks.length > 0;
                const hasInfographics = Array.isArray(it?.infographics) && it.infographics.length > 0;
                if (hasCharts || hasFrameworks || hasInfographics) return;

                const { longest, lineCount } = estimateTextMetrics(it);
                const maxTextW = clamp(Math.round(longest * charPx) + 60, 150, bodyW);
                const maxTextH = clamp(Math.round(lineCount * linePx) + 56, 78, bodyH);
                const oldW = Number(it.width) || maxTextW;
                const oldH = Number(it.height) || maxTextH;
                const newW = Math.min(oldW, maxTextW);
                const newH = Math.min(oldH, maxTextH);
                it.x = (Number(it.x) || bodyX) + Math.round((oldW - newW) / 2);
                it.y = (Number(it.y) || bodyY) + Math.round((oldH - newH) / 2);
                it.width = newW;
                it.height = newH;
            });
        };
        const frameworkRatioGuess = (name) => {
            const k = String(name || "").toLowerCase();
            if (k.includes("value chain") || k.includes("sipoc") || k.includes("journey") || k.includes("stream")) return 1.45;
            if (k.includes("fishbone") || k.includes("flow") || k.includes("process")) return 1.35;
            if (k.includes("swot") || k.includes("ansoff") || k.includes("bcg") || k.includes("matrix") || k.includes("pest")) return 1;
            if (k.includes("org") || k.includes("hierarchy")) return 1.18;
            return 1.28;
        };
        const fitBox = (maxW, maxH, ratio) => {
            const safeW = Math.max(80, Number(maxW) || 0);
            const safeH = Math.max(80, Number(maxH) || 0);
            const byH = safeH * ratio;
            const byW = safeW / ratio;
            if (byH <= safeW) return { width: byH, height: safeH };
            return { width: safeW, height: byW };
        };
        const normalizeFrameworkCardDimensions = (arr) => {
            arr.forEach((it) => {
                const hasFrameworks = Array.isArray(it?.frameworks) && it.frameworks.length > 0;
                if (!hasFrameworks) return;

                const oldW = Number(it.width) || MIN_W;
                const oldH = Number(it.height) || MIN_H;
                const fwCount = Math.max(1, it.frameworks.length);
                const ratio = frameworkRatioGuess(it.frameworks[0]); // desired section ratio (W/H), intentionally taller than before

                // Estimate actual framework visual area within current card.
                const contentW = Math.max(120, oldW - 18);
                const contentH = Math.max(120, oldH - 18);
                const perSlotH = Math.max(100, Math.floor(contentH / fwCount));
                const fitted = fitBox(contentW, Math.max(88, perSlotH - 16), ratio);

                // Base: card is ~10% larger than fitted framework visual (+ minimal chrome).
                const baseW = Math.round((fitted.width * 1.3) + 18);
                const baseHPer = Math.round((fitted.height * 1.3) + 20);
                const baseH = Math.round((baseHPer * fwCount) + 22);

                // Slide-relative guardrails: reduce width and increase height for readability.
                const maxWBySlide = Math.round(bodyW * 0.58);
                const minHBySlide = Math.round(bodyH * (fwCount > 1 ? 0.30 : 0.38));
                const maxHBySlide = Math.round(bodyH * (fwCount > 1 ? 0.86 : 0.92));

                // Preserve area while steering towards target ratio.
                const area = Math.max(MIN_W * MIN_H, baseW * baseH);
                let targetW = Math.sqrt(area * ratio);
                let targetH = area / Math.max(1, targetW);

                targetW = Math.min(targetW, maxWBySlide);
                targetH = Math.max(targetH, minHBySlide);
                targetH = Math.min(targetH, maxHBySlide);

                // Final clamp (allow smaller width than old card, but keep visual minimums)
                const newW = clamp(Math.round(targetW), MIN_W, bodyW);
                const newH = clamp(Math.round(targetH), MIN_H, bodyH);
                it.x = (Number(it.x) || bodyX) + Math.round((oldW - newW) / 2);
                it.y = (Number(it.y) || bodyY) + Math.round((oldH - newH) / 2);
                it.width = newW;
                it.height = newH;
            });
        };
        const getCoverage = (arr) => {
            if (!Array.isArray(arr) || arr.length === 0) return 0;
            const totalArea = CANVAS_WIDTH * CANVAS_HEIGHT;
            const used = arr.reduce((acc, it) => {
                const w = Math.max(0, Number(it?.width) || 0);
                const h = Math.max(0, Number(it?.height) || 0);
                return acc + (w * h);
            }, 0);
            return used / Math.max(1, totalArea);
        };
        const collectFillerLines = () => {
            const lines = [];
            const add = (v) => {
                if (!v) return;
                if (Array.isArray(v)) v.forEach(add);
                else {
                    const s = String(v).trim();
                    if (s) lines.push(s);
                }
            };
            add(slideCtx?.takeaway);
            add(slideCtx?.call_to_action);
            add(slideCtx?.content);
            if (Array.isArray(slideCtx?.sections)) {
                slideCtx.sections.forEach((s) => add(s?.content));
            }
            const uniq = [];
            const seen = new Set();
            lines.forEach((ln) => {
                const k = ln.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
                if (!k || seen.has(k)) return;
                seen.add(k);
                uniq.push(ln);
            });
            return uniq.slice(0, 4);
        };
        const pickCoverageCardTitle = (arr, lines) => {
            const existingTitles = new Set((arr || []).map((it) => String(it?.title || "").toLowerCase().trim()).filter(Boolean));
            const sectionTitles = Array.isArray(slideCtx?.sections)
                ? slideCtx.sections.map((s) => String(s?.title || s?.name || "").trim()).filter(Boolean)
                : [];
            const firstUnusedSectionTitle = sectionTitles.find((t) => !existingTitles.has(t.toLowerCase()));
            if (firstUnusedSectionTitle) return firstUnusedSectionTitle;
            if (Array.isArray(lines) && lines.length > 0) {
                const fromLine = String(lines[0] || "").trim();
                if (fromLine) return fromLine.slice(0, 56);
            }
            if (slideCtx?.title) return `${String(slideCtx.title).slice(0, 42)} - Highlights`;
            return "Highlights";
        };
        const addCoverageContentCardIfNeeded = (arr) => {
            const current = getCoverage(arr);
            if (current >= 0.7) return;
            const lines = collectFillerLines();
            if (!lines.length) return;
            const dynamicTitle = pickCoverageCardTitle(arr, lines);
            const id = `coverage-fill-${Date.now()}-${arr.length}`;
            arr.push({
                id,
                type: "custom",
                title: dynamicTitle,
                data: lines,
                x: bodyX + Math.max(0, bodyW - Math.floor(bodyW * 0.42)),
                y: bodyY + Math.max(0, bodyH - Math.floor(bodyH * 0.3)),
                width: Math.floor(bodyW * 0.42),
                height: Math.floor(bodyH * 0.3),
                zIndex: 999,
            });
        };
        const maybeDensifyExistingCards = (arr) => {
            arr.forEach((it) => {
                const hasVisual =
                    (Array.isArray(it?.charts) && it.charts.length > 0) ||
                    (Array.isArray(it?.frameworks) && it.frameworks.length > 0) ||
                    (Array.isArray(it?.infographics) && it.infographics.length > 0);
                if (hasVisual) return;
                if (typeof it?.data === "string" && it.data.trim()) {
                    const bullets = parseListItems(it.data);
                    if (bullets.length >= 2) it.data = bullets.slice(0, 6);
                }
                const nextScale = Math.min(1.15, Math.max(1, Number(it.fontScale) || 1) + 0.08);
                it.fontScale = nextScale;
            });
        };
        const addGeneratedCardsIfSparse = (arr, target = 0.8) => {
            const current = getCoverage(arr);
            if (current >= target) return;
            if (!Array.isArray(arr) || arr.length >= 5) return;
            const filler = collectFillerLines();
            if (!filler.length) return;

            // Add a compact chart card synthesized from available bullets.
            if (arr.length <= 2) {
                const labels = filler.slice(0, 5).map((x, i) => String(x).slice(0, 22) || `Point ${i + 1}`);
                const values = labels.map((_, i) => Math.max(10, 30 + (i * 12)));
                arr.push({
                    id: `auto-chart-${Date.now()}-${arr.length}`,
                    type: "chart",
                    title: "Generated Trend",
                    chartType: "Bar Chart",
                    charts: ["Bar Chart"],
                    chartData: {
                        "Bar Chart": {
                            labels,
                            values,
                            xAxisTitle: "Drivers",
                            yAxisTitle: "Relative Impact",
                            legend: "Generated",
                            inferences: ["Auto-generated visual from slide content"]
                        }
                    },
                    data: [],
                    x: bodyX,
                    y: bodyY,
                    width: Math.floor(bodyW * 0.46),
                    height: Math.floor(bodyH * 0.42),
                    zIndex: 980
                });
            }

            // Add a flowchart infographic card when slide is still sparse.
            if (arr.length <= 3) {
                arr.push({
                    id: `auto-flow-${Date.now()}-${arr.length}`,
                    type: "custom",
                    title: "Process Flow",
                    infographics: [{ name: "Flowchart", data: { steps: filler.slice(0, 5) } }],
                    data: filler.slice(0, 3),
                    x: bodyX + Math.floor(bodyW * 0.5),
                    y: bodyY + Math.floor(bodyH * 0.05),
                    width: Math.floor(bodyW * 0.45),
                    height: Math.floor(bodyH * 0.36),
                    zIndex: 981
                });
            }
        };
        const enforceCoverage = (arr, target = 0.7) => {
            if (!Array.isArray(arr) || arr.length === 0) return;
            maybeDensifyExistingCards(arr);
            addGeneratedCardsIfSparse(arr, target);
            let coverage = getCoverage(arr);
            if (coverage >= target) return;

            for (let pass = 0; pass < 5 && coverage < target; pass++) {
                const scale = clamp(Math.sqrt(target / Math.max(coverage, 0.01)) * 0.95, 1.04, 1.26);
                arr.forEach((it) => {
                    const hasFrameworks = Array.isArray(it?.frameworks) && it.frameworks.length > 0;
                    // Keep framework cards at their tuned dimensions; grow other cards first.
                    if (hasFrameworks) return;
                    const oldW = Number(it.width) || MIN_W;
                    const oldH = Number(it.height) || MIN_H;
                    const newW = Math.min(bodyW, Math.round(oldW * scale));
                    const newH = Math.min(bodyH, Math.round(oldH * scale));
                    it.x = (Number(it.x) || bodyX) - Math.round((newW - oldW) / 2);
                    it.y = (Number(it.y) || bodyY) - Math.round((newH - oldH) / 2);
                    it.width = newW;
                    it.height = newH;
                });
                clampItems(arr);
                resolveOverlaps(arr);
                clampItems(arr);
                coverage = getCoverage(arr);
            }

            if (coverage < target) {
                addCoverageContentCardIfNeeded(arr);
                placePacked(arr);
                clampItems(arr);
                resolveOverlaps(arr);
                clampItems(arr);
            }
        };

        const clampItems = (arr) => {
            arr.forEach((it) => {
                const hasCharts = Array.isArray(it?.charts) && it.charts.length > 0;
                const hasFrameworks = Array.isArray(it?.frameworks) && it.frameworks.length > 0;
                const hasInfographics = Array.isArray(it?.infographics) && it.infographics.length > 0;
                const minW = (hasCharts || hasFrameworks || hasInfographics) ? MIN_W : 150;
                const minH = (hasCharts || hasFrameworks || hasInfographics) ? MIN_H : 78;
                it.width = clamp(Number(it.width) || minW, minW, bodyW);
                it.height = clamp(Number(it.height) || minH, minH, bodyH);
                it.x = clamp(Number(it.x) || bodyX, bodyX, bodyX + bodyW - it.width);
                it.y = clamp(Number(it.y) || bodyY, bodyY, bodyY + bodyH - it.height);
            });
        };

        const isAnyOverlap = (arr) => {
            for (let i = 0; i < arr.length; i++) {
                for (let j = i + 1; j < arr.length; j++) {
                    const a = arr[i], b = arr[j];
                    if (
                        a.x < b.x + b.width &&
                        a.x + a.width > b.x &&
                        a.y < b.y + b.height &&
                        a.y + a.height > b.y
                    ) return true;
                }
            }
            return false;
        };
        const hasOutOfBounds = (arr) => arr.some((it) => (
            (it.x < bodyX) ||
            (it.y < bodyY) ||
            (it.x + it.width > bodyX + bodyW) ||
            (it.y + it.height > bodyY + bodyH)
        ));

        // Resolve overlaps deterministically by nudging down/right; fallback to compact grid if still colliding.
        const resolveOverlaps = (arr) => {
            const overlaps = (a, b) =>
                a.x < b.x + b.width &&
                a.x + a.width > b.x &&
                a.y < b.y + b.height &&
                a.y + a.height > b.y;
            let changed = false;
            for (let pass = 0; pass < 8; pass++) {
                let moved = false;
                for (let i = 0; i < arr.length; i++) {
                    for (let j = i + 1; j < arr.length; j++) {
                        const a = arr[i];
                        const b = arr[j];
                        if (!overlaps(a, b)) continue;
                        moved = true;
                        changed = true;
                        // Prefer moving the lower-priority one (higher index)
                        const target = (a.zIndex || 0) <= (b.zIndex || 0) ? b : a;
                        target.y += 12;
                        if (target.y + target.height > bodyY + bodyH) {
                            target.y = bodyY;
                            target.x += 12;
                        }
                        target.x = clamp(target.x, bodyX, bodyX + bodyW - target.width);
                        target.y = clamp(target.y, bodyY, bodyY + bodyH - target.height);
                    }
                }
                if (!moved) break;
            }
            if (changed) {
                // Final fallback if still dense: compact 2-col grid
                const stillOverlap = (() => {
                    for (let i = 0; i < arr.length; i++) {
                        for (let j = i + 1; j < arr.length; j++) {
                            if (
                                arr[i].x < arr[j].x + arr[j].width &&
                                arr[i].x + arr[i].width > arr[j].x &&
                                arr[i].y < arr[j].y + arr[j].height &&
                                arr[i].y + arr[i].height > arr[j].y
                            ) return true;
                        }
                    }
                    return false;
                })();
                if (stillOverlap) {
                    const cols = arr.length >= 3 ? 2 : 1;
                    const rows = Math.max(1, Math.ceil(arr.length / cols));
                    placeGrid(arr, cols, rows);
                }
            }
        };

        // If AI absolute placement is clearly broken (overlap/out-of-bounds), ignore it and re-pack.
        if (hasAbsolute) {
            clampItems(next);
            const brokenAbsolute = isAnyOverlap(next) || hasOutOfBounds(next);
            const usedArea = next.reduce((acc, it) => acc + (Math.max(0, Number(it.width) || 0) * Math.max(0, Number(it.height) || 0)), 0);
            const coverage = usedArea / Math.max(1, bodyW * bodyH);
            const minY = Math.min(...next.map((it) => Number(it.y) || bodyY));
            const maxY = Math.max(...next.map((it) => (Number(it.y) || bodyY) + (Number(it.height) || MIN_H)));
            const verticalUsage = (maxY - minY) / Math.max(1, bodyH);
            const underUtilized = coverage < 0.56 || verticalUsage < 0.62;
            if (brokenAbsolute || underUtilized) {
                placePacked(next);
            }
        }
        // Archetype A: Hero visual + insight rail (classic consulting slide).
        else if (byType.chart.length === 1 && next.length >= 2) {
            const hero = byType.chart[0];
            const support = next.filter((x) => x !== hero);
            const heroW = Math.round(bodyW * 0.66);
            const railW = bodyW - heroW - GUTTER;
            hero.x = bodyX; hero.y = bodyY; hero.width = heroW; hero.height = bodyH;
            const eachH = Math.max(MIN_H, Math.floor((bodyH - GUTTER * (support.length - 1)) / Math.max(1, support.length)));
            support.forEach((it, idx) => {
                it.x = bodyX + heroW + GUTTER;
                it.y = bodyY + idx * (eachH + GUTTER);
                it.width = railW;
                it.height = eachH;
            });
        }
        // Archetype B: One framework/table + interpretation rail.
        else if (byType.framework.length === 1 && next.length >= 2) {
            const main = byType.framework[0];
            const side = next.filter((x) => x !== main);
            const mainW = Math.round(bodyW * 0.62);
            const sideW = bodyW - mainW - GUTTER;
            main.x = bodyX; main.y = bodyY; main.width = mainW; main.height = bodyH;
            const eachH = Math.max(MIN_H, Math.floor((bodyH - GUTTER * (side.length - 1)) / Math.max(1, side.length)));
            side.forEach((it, idx) => {
                it.x = bodyX + mainW + GUTTER;
                it.y = bodyY + idx * (eachH + GUTTER);
                it.width = sideW;
                it.height = eachH;
            });
        }
        // Archetype C: 2-up narrative split.
        else if (next.length === 2) {
            const leftW = Math.round(bodyW * 0.64);
            const rightW = bodyW - leftW - GUTTER;
            next[0].x = bodyX; next[0].y = bodyY; next[0].width = leftW; next[0].height = bodyH;
            next[1].x = bodyX + leftW + GUTTER; next[1].y = bodyY; next[1].width = rightW; next[1].height = bodyH;
        }
        // Archetype D: 2x2 board (3-4 components).
        else if (next.length >= 3 && next.length <= 4) {
            placeGrid(next, 2, 2);
        }
        // Archetype E: generic stacked sections (5+ or single text blocks).
        else {
            const eachH = Math.max(MIN_H, Math.floor((bodyH - GUTTER * (next.length - 1)) / Math.max(1, next.length)));
            next.forEach((it, i) => {
                it.x = bodyX;
                it.y = bodyY + i * (eachH + GUTTER);
                it.width = bodyW;
                it.height = eachH;
            });
        }

        // Final sanitation: clamp + overlap resolution.
        clampItems(next);
        tightenTextOnlyCards(next);
        normalizeFrameworkCardDimensions(next);
        resolveOverlaps(next);
        applyGentleInset(next);
        clampItems(next);
        enforceCoverage(next, 0.8);
        clampItems(next);
        // Final one-time cleanup: remove duplicates that may be introduced by auto-fill/restructure.
        const finalDeduped = removeRepetitiveItems(next);
        if (finalDeduped.length !== next.length) {
            const normalized = finalDeduped.map((it, i) => ({ ...it, zIndex: typeof it.zIndex === "number" ? it.zIndex : i }));
            placePacked(normalized);
            clampItems(normalized);
            resolveOverlaps(normalized);
            clampItems(normalized);
            return normalized;
        }
        return next;
    };

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

        const scaleX = (measuredSize.width || CANVAS_WIDTH) / CANVAS_WIDTH;
        const scaleY = (measuredSize.height || CANVAS_HEIGHT) / CANVAS_HEIGHT;

        return sections.map((section, idx) => {
            const hasAbsoluteBox =
                typeof section?.x === "number" &&
                typeof section?.y === "number" &&
                typeof section?.w === "number" &&
                typeof section?.h === "number";

            // Get section position (1-indexed from backend, convert to 0-indexed)
            const row = (section.row || 1) - 1;
            const col = (section.col || 1) - 1;
            const rowSpan = section.rowSpan || 1;
            const colSpan = section.colSpan || 1;

            // Calculate position and size (absolute AI coords take precedence)
            const x = hasAbsoluteBox ? (section.x * scaleX) : (PADDING + (col * (cellWidth + GAP)));
            const y = hasAbsoluteBox ? (section.y * scaleY) : (PADDING + (row * (cellHeight + GAP)));
            const width = hasAbsoluteBox ? (section.w * scaleX) : ((cellWidth * colSpan) + (GAP * (colSpan - 1)));
            const height = hasAbsoluteBox ? (section.h * scaleY) : ((cellHeight * rowSpan) + (GAP * (rowSpan - 1)));

            // Determine item type based on content
            const normalizedFramework = normalizeFrameworkBundle(section?.frameworks, section?.framework_data);
            const sectionHasChart = (
                (Array.isArray(section?.charts) && section.charts.length > 0) ||
                Boolean(section?.chartType) ||
                hasUsableObjectData(section?.chart_data)
            );
            const sectionHasFramework = (
                normalizedFramework.names.length > 0 ||
                hasUsableObjectData(normalizedFramework.mergedData)
            );
            const sectionHasInfographic = Array.isArray(section?.infographics) && section.infographics.length > 0;
            let itemType = 'custom';
            if (sectionHasChart) itemType = 'chart';
            else if (sectionHasFramework) itemType = 'framework';
            else if (sectionHasInfographic) itemType = 'custom';

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
                zone: section.zone || null,
                hideCardHeader: Boolean(
                    section.hideCardHeader ||
                    (section.zone && ["title", "subtitle", "footer", "insight_strip", "insight-strip"].includes(section.zone))
                ),
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
                frameworks: normalizedFramework.names,
                frameworkData: normalizedFramework.mergedData, // normalized to { frameworkName: frameworkData, ... }
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
    const slideDesign = currentSlide?.slide_design?.zones ? currentSlide.slide_design : currentSlide?.slide_design?.slide;
    const zoneContents = currentSlide?.zone_contents || null;
    const baseCanvasItems = slideCanvasState[currentSlideIndex] || getDefaultCanvasItems(currentSlide);
    const normalizeInlineText = (v) => String(v || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
    const getInlineItemText = (it) => {
        const parts = [];
        if (it?.title) parts.push(String(it.title));
        if (Array.isArray(it?.data)) parts.push(it.data.map((d) => (typeof d === "string" ? d : d?.text || "")).join(" "));
        else if (typeof it?.data === "string") parts.push(it.data);
        return parts.join(" ").replace(/\s+/g, " ").trim();
    };
    const zoneSubtitle = typeof zoneContents?.subtitle === "string" ? zoneContents.subtitle.trim() : "";
    const promotedInsightStrip = typeof zoneContents?.insight_strip === "string" ? zoneContents.insight_strip.trim() : "";
    const headerSubheading = promotedInsightStrip || zoneSubtitle;
    let promotedSubtitle = zoneSubtitle;
    let canvasItems = baseCanvasItems;

    // If subtitle is absent, promote one short narrative card into subtitle under title.
    if (!promotedSubtitle) {
        const candidate = (baseCanvasItems || []).find((it) => {
            const itemType = inferItemType(it);
            if (itemType === "chart" || itemType === "framework") return false;
            const txt = getInlineItemText(it);
            return txt.length >= 16 && txt.length <= 170;
        });
        if (candidate) {
            promotedSubtitle = getInlineItemText(candidate);
            canvasItems = baseCanvasItems.filter((it) => it.id !== candidate.id);
        }
    } else {
        // If subtitle already exists, suppress duplicate narrative card with same text.
        const subNorm = normalizeInlineText(promotedSubtitle);
        canvasItems = baseCanvasItems.filter((it) => {
            const itNorm = normalizeInlineText(getInlineItemText(it));
            return !(subNorm && itNorm && (itNorm.includes(subNorm) || subNorm.includes(itNorm)));
        });
    }
    const firstFrameworkOwnerByNorm = (() => {
        const map = {};
        (canvasItems || []).forEach((it) => {
            const list = Array.isArray(it?.frameworks) ? it.frameworks.filter(Boolean) : [];
            list.forEach((fw) => {
                const norm = normalizeFrameworkKey(fw);
                if (!norm) return;
                if (!map[norm]) map[norm] = { ownerId: it.id, label: String(fw) };
            });
        });
        return map;
    })();
    const isEmphasisLine = (point) => {
        const s = String(point || "").replace(/^[-•\d\.\)\s]+/, "").trim().toLowerCase();
        return s.startsWith("key drivers") || s.startsWith("competitive landscape");
    };
    const scaledBodyRem = (item, base = 0.8) => {
        const factor = Math.max(1, Number(item?.fontScale) || 1);
        return `${Math.min(0.92, base * factor)}rem`; // keep body font below heading size
    };
    const toNormKey = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
    const FRAMEWORK_RATIO_BY_KEY = {
        swotanalysis: 1.55,
        pestleanalysis: 1.45,
        portersfiveforces: 1.35,
        bcggrowthsharematrix: 1.5,
        gemckinseymatrix: 1.5,
        ansoffmatrix: 1.5,
        valuechainanalysis: 1.8,
        vrioframework: 1.7,
        balancedscorecard: 1.55,
        racimatrix: 1.8,
        sipocdiagram: 1.85,
        organizationalstructurechart: 1.45,
        fishbonediagram: 1.9,
        processflowdiagram: 1.75,
        customerjourneymap: 1.9,
        cpm: 1.6,
        pertchart: 1.6,
        valuestreammapping: 1.9,
    };
    const INFOGRAPHIC_RATIO_BY_KEY = {
        ecosystemmap: 1.85,
        stakeholdermap: 1.7,
        radarspiderchart: 1.25,
        radarchart: 1.25,
        heatmap: 1.45,
        timeline: 1.9,
        customerjourneymap: 1.9,
        venn: 1.35,
        sankey: 2.0,
    };
    const getVisualAspectRatio = (kind, name) => {
        const key = toNormKey(name);
        const dict = kind === "framework" ? FRAMEWORK_RATIO_BY_KEY : INFOGRAPHIC_RATIO_BY_KEY;
        if (dict[key]) return dict[key];
        // fallback: find any partial key match
        const matchKey = Object.keys(dict).find((k) => key.includes(k) || k.includes(key));
        if (matchKey) return dict[matchKey];
        return kind === "framework" ? 1.6 : 1.5;
    };
    const getFittedVisualBox = (maxW, maxH, ratio) => {
        const safeW = Math.max(80, Number(maxW) || 0);
        const safeH = Math.max(80, Number(maxH) || 0);
        const targetWByH = safeH * ratio;
        const targetHByW = safeW / ratio;
        let width = safeW;
        let height = safeH;
        if (targetWByH <= safeW) {
            width = targetWByH;
            height = safeH;
        } else {
            width = safeW;
            height = targetHByW;
        }
        return {
            width: Math.max(80, Math.floor(width)),
            height: Math.max(80, Math.floor(height)),
        };
    };
    const getFrameworkVisualBox = (item, frameworkName, frameworkData, frameworkCount = 1) => {
        const ratio = getVisualAspectRatio("framework", frameworkName);
        const totalAvailH = Math.max(120, item.height - 46);
        const slotH = Math.max(110, Math.floor(totalAvailH / Math.max(1, frameworkCount)));
        const density = getFrameworkPayloadSignals(frameworkData);
        const densityBoost = density.nodeCount >= 18 ? 1.08 : (density.nodeCount <= 6 ? 0.9 : 1.0);
        const visualH = Math.max(92, Math.floor((slotH - 20) * densityBoost));
        const fitted = getFittedVisualBox(item.width - 18, visualH, ratio);
        return { slotH, fitted };
    };
    const getRenderableFrameworksForItem = (item) => {
        const list = Array.isArray(item?.frameworks) ? item.frameworks.filter(Boolean) : [];
        const seen = new Set();
        const out = [];
        list.forEach((fw) => {
            const norm = normalizeFrameworkKey(fw);
            if (!norm || seen.has(norm)) return;
            seen.add(norm);
            const owner = firstFrameworkOwnerByNorm[norm];
            if (owner && owner.ownerId !== item.id) return;
            out.push(owner?.label || fw);
        });
        return out;
    };

    // Auto-fetch missing framework payloads for current slide items.
    useEffect(() => {
        if (!currentSlide || !Array.isArray(canvasItems) || canvasItems.length === 0) return;
        const token = localStorage.getItem('token') || null;
        const problemStatement = localStorage.getItem('lastProblemStatement') || '';
        const MAX_FRAMEWORK_FETCH_ATTEMPTS = 2;

        const tasks = [];
        canvasItems.forEach((item) => {
            const frameworks = getRenderableFrameworksForItem(item);
            if (!frameworks.length) return;
            frameworks.forEach((fw) => {
                const cacheKey = `${currentSlideIndex}::${item.id}::${fw}`;
                if (frameworkFetchRequestedRef.current.has(cacheKey)) return; // in-flight only

                const existing = findFrameworkPayload(item.frameworkData, fw);
                const override = frameworkDataOverrides[cacheKey];
                const effective = resolveFrameworkPayload(fw, override, existing, item.frameworkData);
                if (!isIncompleteFrameworkPayload(effective)) return;
                const attempts = frameworkFetchAttemptsRef.current.get(cacheKey) || 0;
                if (attempts >= MAX_FRAMEWORK_FETCH_ATTEMPTS) return;

                frameworkFetchRequestedRef.current.add(cacheKey);
                frameworkFetchAttemptsRef.current.set(cacheKey, attempts + 1);
                tasks.push({ cacheKey, fw, item });
            });
        });

        if (!tasks.length) return;

        let cancelled = false;
        (async () => {
            for (const t of tasks) {
                try {
                    const res = await generateFrameworkData({
                        framework_name: t.fw,
                        slide_title: currentSlide?.title || '',
                        section_title: t.item?.title || '',
                        section_content: t.item?.data || t.item?.content || '',
                        problem_statement: problemStatement,
                    }, token);
                    const generatedRaw = res?.framework_data || res?.frameworks || {};
                    const generated = normalizeFrameworkBundle([{ [t.fw]: generatedRaw }], generatedRaw).mergedData;
                    if (!cancelled && !isIncompleteFrameworkPayload(resolveFrameworkPayload(t.fw, generated))) {
                        setFrameworkDataOverrides(prev => ({ ...prev, [t.cacheKey]: generated }));
                    }
            } catch (e) {
                    // keep requested flag to avoid repeated failing requests in render loop
                } finally {
                    frameworkFetchRequestedRef.current.delete(t.cacheKey);
                }
            }
        })();

        return () => { cancelled = true; };
    }, [canvasItems, currentSlide, currentSlideIndex, frameworkDataOverrides]);

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
        autoLayoutAppliedRef.current = new Set();
    }, [slides]);

    useEffect(() => {
        if (!onCanvasReady) return;
        if (!slides || slides.length === 0) {
            onCanvasReady();
            return;
        }
        const t = window.setTimeout(() => {
            onCanvasReady();
        }, 140);
        return () => clearTimeout(t);
    }, [slides, onCanvasReady]);

    useEffect(() => {
        if (currentSlide && !slideCanvasState.hasOwnProperty(currentSlideIndex)) {
            const initial = removeRepetitiveItems(getDefaultCanvasItems(currentSlide));
            setSlideCanvasState(prev => ({
                ...prev,
                [currentSlideIndex]: initial
            }));
        }
    }, [currentSlideIndex, slides]);

    // One-time post-first-render aesthetic arrangement per slide.
    useEffect(() => {
        if (!currentSlide) return;
        if (!slideCanvasState.hasOwnProperty(currentSlideIndex)) return;
        const key = String(currentSlideIndex);
        if (autoLayoutAppliedRef.current.has(key)) return;
        const existing = slideCanvasState[currentSlideIndex];
        if (!Array.isArray(existing) || existing.length === 0) return;
        const adjusted = applyAestheticPostLayout(existing, currentSlide);
        autoLayoutAppliedRef.current.add(key);
        setSlideCanvasState(prev => ({ ...prev, [currentSlideIndex]: adjusted }));
    }, [currentSlideIndex, currentSlide, slideCanvasState]);

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
                    // Reserve space for the bottom toolbar while fullscreen
                    height: isFullScreen ? "calc(100vh - 64px)" : `${CANVAS_HEIGHT}px`,
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
                        <Card
                            shadow="sm"
                            radius="lg"
                            padding={0}
                            withBorder
                style={{
                    position: "absolute",
                                width: item.width,
                                height: item.height,
                                background: "#ffffff",
                                border: `${borderWidth}px solid ${CARD_PALETTE[idx % CARD_PALETTE.length].accent}`,
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
                            <div
                                className="flex-1 overflow-auto"
                                style={{
                                    fontSize: '0.875rem',
                                    padding: (inferItemType(item) !== "text") ? 0 : 16,
                                }}
                            >
                                {/* Editable Title - PowerPoint style */}
                                {!item.hideCardHeader && inferItemType(item) !== "framework" && (
                                    <Text
                                        component="h4"
                                        fw={700}
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
                                    >
                                        {item.title || 'Section'}
                                    </Text>
                                )}

                                {(
                                    <>
                                        {/* Chart Type */}
                                        {inferItemType(item) === "chart" && getChartTypesForItem(item).length > 0 && (
                                            <div className="flex-1 flex items-center justify-center" style={{ minHeight: 0, maxHeight: '100%' }}>
                                                <div style={{ width: '100%', height: Math.max(80, item.height - 100), maxHeight: item.height - 100, overflow: 'hidden' }}>
                                                    {getChartTypesForItem(item).map((chartType, cidx) => {
                                                        let chartDataForType = item.chartData;
                                                        if (item.chartData && typeof item.chartData === 'object') {
                                                            chartDataForType = item.chartData[chartType] || item.chartData;
                                                        }
                                                        return (
                                                            <div key={`${chartType}-${cidx}`} className="mb-2" style={{ fontSize: '0.7rem' }}>
                                                            <ChartRenderer
                                                                type={chartType}
                                                                data={chartDataForType || {}}
                                                                xAxisTitle={chartDataForType?.xAxisTitle}
                                                                yAxisTitle={chartDataForType?.yAxisTitle}
                                                                legend={chartDataForType?.legend}
                                                                inferences={chartDataForType?.inferences}
                                                                palette={remotePalette || CARD_PALETTE.map(p => p.accent)}
                                                            />
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Framework Type */}
                                        {inferItemType(item) === "framework" && getRenderableFrameworksForItem(item).length > 0 && (
                                            <div className="flex-1 overflow-hidden" style={{ minHeight: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                                                {getRenderableFrameworksForItem(item).map((fw, fwidx, allFrameworks) => {
                                                    const cacheKey = `${currentSlideIndex}::${item.id}::${fw}`;
                                                    const fwData = resolveFrameworkPayload(
                                                        fw,
                                                        frameworkDataOverrides[cacheKey],
                                                        item.frameworkData,
                                                        findFrameworkPayload(item.frameworkData, fw)
                                                    );
                                                    return (
                                                        <div key={fwidx} style={{ flex: 1, minHeight: 0, width: '100%', overflow: 'hidden' }}>
                                                            <div style={{ fontSize: '0.7rem', width: '100%', height: '100%', minHeight: 0, overflow: 'hidden' }}>
                                                                <div style={{ width: '100%', height: '100%', maxWidth: '100%', maxHeight: '100%', overflow: 'hidden' }}>
                                                                <FrameworkDiagram
                                                                    framework={fw}
                                                                    frameworkData={fwData}
                                                                    palette={remotePalette || CARD_PALETTE.map(p => p.accent)}
                                                                    renderDensityTier={item.height < 220 ? 0 : item.height < 320 ? 1 : 2}
                                                                />
                                                                </div>
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
                                                        fontSize: scaledBodyRem(item, 0.8),
                                                        lineHeight: '1.4',
                                                        borderLeft: `4px solid ${CARD_PALETTE[i % CARD_PALETTE.length].accent}`,
                                                        paddingLeft: '0.75rem'
                                                    }}>
                                                        <span
                                                            contentEditable={true}
                                                            suppressContentEditableWarning={true}
                                                            onBlur={(e) => handleListItemEdit(item.id, i, e.target.textContent)}
                                                            className="outline-none focus:ring-2 focus:ring-blue-300 rounded px-1"
                                                            style={{ fontWeight: isEmphasisLine(point) ? 700 : 400 }}
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
                                                        style={{ fontSize: scaledBodyRem(item, 0.75), lineHeight: '1.4' }}
                                                    >{item.data?.takeaway || ''}</p>
                                                </div>
                                                <div className="p-2 overflow-auto" style={{ borderLeft: `4px solid ${CARD_PALETTE[1].accent}` }}>
                                                    <h5 className="font-semibold uppercase tracking-wide mb-1" style={{ color: CARD_PALETTE[1].accent, fontSize: '0.65rem' }}>Next Steps</h5>
                                                    <p
                                                        contentEditable={true}
                                                        suppressContentEditableWarning={true}
                                                        onBlur={(e) => handleContentEdit(item.id, 'call_to_action', e.target.textContent)}
                                                        className="text-gray-800 outline-none focus:ring-2 focus:ring-blue-300 rounded px-1"
                                                        style={{ fontSize: scaledBodyRem(item, 0.75), lineHeight: '1.4' }}
                                                    >{item.data?.call_to_action || ''}</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Custom/Generic Content */}
                                        {item.type === "custom" && (
                                            <div className="flex-1 overflow-auto" style={{ minHeight: 0 }}>
                                                {/* Render Charts */}
                                                {getChartTypesForItem(item).length > 0 && (
                                                    <div style={{ width: '100%', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                                        {getChartTypesForItem(item).map((chartType, cidx) => {
                                                            // Backend structure: section.chart_data = { "Bar Chart": { labels, values, ... } }
                                                            let chartDataObj = {};
                                                            if (item.chartData && typeof item.chartData === 'object') {
                                                                chartDataObj = item.chartData[chartType] || item.chartData;
                                                            }
                                                            return (
                                                                <div key={cidx} style={{ fontSize: '0.7rem', width: '100%', flex: 1, minHeight: 0 }}>
                                                                    <ChartRenderer
                                                                        type={chartType}
                                                                        data={chartDataObj}
                                                                        xAxisTitle={chartDataObj?.xAxisTitle}
                                                                        yAxisTitle={chartDataObj?.yAxisTitle}
                                                                        legend={chartDataObj?.legend}
                                                                        inferences={chartDataObj?.inferences}
                                                                        palette={remotePalette || CARD_PALETTE.map(p => p.accent)}
                                                                        height={"100%"}
                                                                    />
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {/* Render Frameworks */}
                                                {item.frameworks && item.frameworks.length > 0 && (
                                                    <div style={{ width: '100%', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                                        {getRenderableFrameworksForItem(item).map((fw, fwidx, allFrameworks) => {
                                                            const cacheKey = `${currentSlideIndex}::${item.id}::${fw}`;
                                                            const fwData = resolveFrameworkPayload(
                                                                fw,
                                                                frameworkDataOverrides[cacheKey],
                                                                item.frameworkData,
                                                                findFrameworkPayload(item.frameworkData, fw)
                                                            );

                                                            return (
                                                                <div key={fwidx} style={{ flex: 1, minHeight: 0, width: '100%', overflow: 'hidden' }}>
                                                                    <div style={{ fontSize: '0.7rem', width: '100%', height: '100%', minHeight: 0, overflow: 'hidden' }}>
                                                                        <div style={{ width: '100%', height: '100%', maxWidth: '100%', maxHeight: '100%', overflow: 'hidden' }}>
                                                                        <FrameworkDiagram
                                                                            framework={fw}
                                                                            frameworkData={fwData}
                                                                            palette={remotePalette || CARD_PALETTE.map(p => p.accent)}
                                                                            renderDensityTier={item.height < 220 ? 0 : item.height < 320 ? 1 : 2}
                                                                        />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {/* Render Infographics */}
                                                {item.infographics && item.infographics.length > 0 && (
                                                    <div className="mb-2" style={{ overflow: 'hidden' }}>
                                                        {item.infographics.map((ig, iidx) => {
                                                            const name = typeof ig === 'string' ? ig : (ig?.name || `Infographic ${iidx + 1}`);
                                                            const data = (ig && typeof ig === 'object') ? (ig.data || ig.payload || {}) : {};
                                                            const igBox = getFittedVisualBox(item.width - 44, Math.max(90, item.height - 150), getVisualAspectRatio("infographic", name));
                                                            return (
                                                                <div key={iidx} className="mb-2" style={{ height: Math.max(100, igBox.height + 20), overflow: 'hidden' }}>
                                                                    <div className="font-semibold mb-1 text-gray-700" style={{ fontSize: '0.7rem' }}>{name}</div>
                                                                    <div style={{ width: '100%', height: 'calc(100% - 18px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                        <div style={{ width: igBox.width, height: igBox.height, maxWidth: '100%', maxHeight: '100%' }}>
                                                                            <InfographicRenderer
                                                                                type={name}
                                                                                data={data}
                                                                                palette={remotePalette || CARD_PALETTE.map(p => p.accent)}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {/* Render Text Content */}
                                                {item.data && (
                                                    <div className="text-gray-800" style={{ fontSize: scaledBodyRem(item, 0.8), lineHeight: '1.4' }}>
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
                                                                            style={{ fontWeight: isEmphasisLine(point) ? 700 : 400 }}
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
                                                                style={{ fontSize: scaledBodyRem(item, 0.8), lineHeight: '1.4' }}
                                                            >{String(item.data || '')}</p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </Card>
                    </Draggable>
                ))}

                {/* Zone overlays (header/subtitle/footer/insight strip) */}
                {slideDesign?.zones && zoneContents && (
                    <>
                        {slideDesign.zones.title && zoneContents.title && (
                            <div
                                style={{
                                    position: "absolute",
                                    left: slideDesign.zones.title.x * absScaleX,
                                    top: slideDesign.zones.title.y * absScaleY,
                                    width: slideDesign.zones.title.w * absScaleX,
                                    height: slideDesign.zones.title.h * absScaleY,
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "flex-start",
                                    justifyContent: "center",
                                    padding: promotedSubtitle ? "6px 12px" : "0 12px",
                                    zIndex: 1000,
                                    pointerEvents: "none",
                                    overflow: "hidden",
                                }}
                            >
                                <div
                                    style={{
                                        fontSize: "24px",
                                        fontWeight: 900,
                                        color: "#111827",
                                        lineHeight: 1.15,
                                        width: "100%",
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                    }}
                                >
                                    {zoneContents.title}
                                </div>
                                {headerSubheading && (
                                    <div
                                        style={{
                                            width: "100%",
                                            height: 1,
                                            background: "#e5e7eb",
                                            marginTop: 6,
                                            marginBottom: 6,
                                        }}
                                    />
                                )}
                                {headerSubheading && (
                                    <div
                                        style={{
                                            fontSize: "13px",
                                            fontWeight: 700,
                                            color: "#334155",
                                            width: "100%",
                                            whiteSpace: "nowrap",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                        }}
                                    >
                                        {headerSubheading}
                                    </div>
                                )}
                            </div>
                        )}
                        {slideDesign.zones.footer && zoneContents.footer && (
                            <div
                                style={{
                                    position: "absolute",
                                    left: slideDesign.zones.footer.x * absScaleX,
                                    top: slideDesign.zones.footer.y * absScaleY,
                                    width: slideDesign.zones.footer.w * absScaleX,
                                    height: slideDesign.zones.footer.h * absScaleY,
                                    display: "flex",
                                    alignItems: "center",
                                    padding: "0 12px",
                                    zIndex: 1000,
                                    pointerEvents: "none",
                                    fontSize: "9.5px",
                                    fontWeight: 600,
                                    color: "#6b7280",
                                    overflow: "hidden",
                                    whiteSpace: "nowrap",
                                    textOverflow: "ellipsis",
                                }}
                            >
                                {zoneContents.footer}
                            </div>
                        )}
                    </>
                )}

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
            <div
                className="w-full bg-black flex items-center justify-between py-3 px-4"
                style={{
                    borderRadius: isFullScreen ? 0 : '0 0 12px 12px',
                    position: isFullScreen ? 'fixed' : 'relative',
                    left: isFullScreen ? 0 : undefined,
                    bottom: isFullScreen ? 0 : undefined,
                    width: isFullScreen ? '100vw' : '100%',
                    zIndex: isFullScreen ? 10000 : undefined,
                }}
            >
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
                        ref={pptxDownloadBtnRef}
                        type="button"
                        className={`text-white bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded flex items-center gap-2 shadow transition ${
                            pptxSpotlightActive
                                ? "relative z-[99999] ring-2 ring-amber-400 ring-offset-2 ring-offset-black shadow-[0_0_28px_rgba(251,191,36,0.95)]"
                                : ""
                        }`}
                        onClick={exportDeckToPptx}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h16v12H5l-1 4V4z" />
                        </svg>
                        <span className="text-sm">Download PPTX</span>
                    </button>

                    <button
                        className="text-white bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded flex items-center gap-2 shadow transition"
                        onClick={() => setIsFullScreen(fs => !fs)}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            {isFullScreen ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18V6h12v12H6z" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                            )}
                        </svg>
                        <span className="text-sm">{isFullScreen ? "Minimize" : "Fullscreen"}</span>
                    </button>
                </div>
            </div>

            <EnrichConfirmModal
                open={enrichModal.open}
                initialContent={enrichModal.initialContent}
                onClose={() => setEnrichModal({ open: false, itemId: null, initialContent: '' })}
                onDone={(content) => applyEnrichedContent(enrichModal.itemId, content)}
            />

            {pptxSpotlightActive && pptxBtnLayout && (
                <>
                    <style>{`
                        @keyframes pitchmate-pptx-arrow-run {
                            0% { top: min(10vh, 96px); opacity: 0; }
                            8% { opacity: 0.55; }
                            88% { top: var(--pptx-arrow-end); opacity: 0.5; }
                            100% { top: var(--pptx-arrow-end); opacity: 0; }
                        }
                    `}</style>
                    <div
                        className="fixed inset-0 pointer-events-none z-[99998] overflow-hidden"
                        aria-hidden
                    >
                        <div
                            className="absolute flex w-20 justify-center"
                            style={{
                                left: pptxBtnLayout.cx,
                                transform: "translateX(-50%)",
                                "--pptx-arrow-end": `${pptxBtnLayout.endTop}px`,
                                animation: "pitchmate-pptx-arrow-run 2.4s ease-in-out 1 forwards",
                            }}
                        >
                            <svg
                                width="64"
                                height="64"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                className="text-slate-300"
                                style={{ filter: "drop-shadow(0 1px 4px rgba(148,163,184,0.35))" }}
                            >
                                <path
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 4v14M8 14l4 4 4-4"
                                />
                            </svg>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
