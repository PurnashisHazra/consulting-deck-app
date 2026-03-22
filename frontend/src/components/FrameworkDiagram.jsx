import React from "react";
import { ScrollArea, Text } from "@mantine/core";
import { ensureHex } from "../utils/colorUtils";

// FrameworkDiagram renders a subset of “consulting-safe” frameworks from a normalized,
// absolute-positioned SVG layout schema (rects/lines/text/circles/arrows/grids).
// If the framework is not recognized, it falls back to a compact table/list.

const SVG_W = 1000;
const SVG_H = 500;

function hexToRgba(hex, alpha = 1) {
  const h = String(hex || "").trim();
  const m = h.match(/^#([A-Fa-f0-9]{6})$/);
  if (!m) return `rgba(55,65,81,${alpha})`;
  const int = parseInt(m[1], 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function normalizePalette(palette) {
  if (!palette) return [];
  if (Array.isArray(palette)) return palette.map((p) => ensureHex(p)).filter(Boolean);
  return [];
}

function asArray(v) {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map((x) => String(x));
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return [];
    // allow newline-separated bullets
    return s.includes("\n") ? s.split("\n").map((x) => x.trim()).filter(Boolean) : [s];
  }
  if (typeof v === "object") return Object.values(v).flatMap((x) => asArray(x));
  return [String(v)];
}

function getInsensitive(obj, desiredKeys) {
  if (!obj || typeof obj !== "object") return undefined;
  const keyList = desiredKeys.map((k) => String(k).toLowerCase());
  for (const key of Object.keys(obj)) {
    const lk = String(key).toLowerCase();
    if (keyList.includes(lk)) return obj[key];
  }
  // also allow normalized keys (snake_case vs spaces)
  const objNorm = {};
  Object.keys(obj).forEach((k) => {
    objNorm[String(k).toLowerCase().replace(/[\s_-]+/g, "")] = obj[k];
  });
  for (const want of desiredKeys) {
    const w = String(want).toLowerCase().replace(/[\s_-]+/g, "");
    if (Object.prototype.hasOwnProperty.call(objNorm, w)) return objNorm[w];
  }
  return undefined;
}

function sliceWithMoreBadge(items, ideal = 3, max = 5, densityTier = 1) {
  const arr = (items || []).map(String).filter(Boolean);

  // densityTier: 0=compact (show less), 1=normal, 2=roomy (show more)
  const scale = densityTier === 0 ? 0.75 : densityTier === 2 ? 1.15 : 1.0;
  const idealScaled = Math.max(1, Math.round(ideal * scale));
  const maxScaled = Math.max(idealScaled + 1, Math.round(max * scale));

  const shownLimit = Math.min(maxScaled, idealScaled);
  const shown = arr.slice(0, shownLimit);
  const remaining = Math.max(0, arr.length - shown.length);
  return { shown, remaining };
}

function TextBlock({
  x,
  y,
  w,
  h,
  lines,
  fontSize = 16,
  fill = "#0f172a",
  fontWeight = 600,
}) {
  const safeLines = (Array.isArray(lines) ? lines : [String(lines || "")]).filter((l) => l != null && String(l).trim() !== "");
  const finalLines = safeLines.slice(0, 6);
  const lineH = fontSize * 1.1;
  const startY = y + fontSize; // SVG text baseline is at y
  return (
    <text x={x} y={startY} fontSize={fontSize} fill={fill} fontWeight={fontWeight} fontFamily="Inter, Arial, sans-serif">
      {finalLines.map((t, idx) => (
        <tspan key={idx} x={x} dy={idx === 0 ? 0 : lineH}>
          {t}
        </tspan>
      ))}
    </text>
  );
}

function renderTableFallback({ framework, data }) {
  const normalized = data ?? null;
  if (!normalized || (typeof normalized === "object" && !Array.isArray(normalized) && Object.keys(normalized).length === 0)) {
  return (
      <div style={{ padding: 10 }}>
        <Text size="xs" c="dimmed">
          {framework ? `${framework} diagram not available` : "Diagram not available"}
        </Text>
    </div>
  );
}

  if (Array.isArray(normalized)) {
    if (normalized.length === 0) return <Text size="xs" c="dimmed">—</Text>;
    const first = normalized[0];
    if (first && typeof first === "object" && !Array.isArray(first)) {
      const keys = Object.keys(first).slice(0, 6);
      return (
        <div style={{ overflowX: "auto", padding: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>
                {keys.map((k) => (
                  <th key={k} style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: "6px 8px", background: "#f9fafb" }}>
                    {k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
              {normalized.slice(0, 8).map((row, i) => (
                <tr key={i}>
                  {keys.map((k) => {
                    const v = row?.[k];
                    const cell = typeof v === "object" ? JSON.stringify(v).slice(0, 160) : String(v ?? "");
                    return <td key={k} style={{ borderBottom: "1px solid #f3f4f6", padding: "6px 8px" }}>{cell}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    return (
      <div style={{ padding: 8 }}>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
          {normalized.slice(0, 10).map((x, i) => (
            <li key={i} style={{ marginBottom: 4 }}>
              {String(x)}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (typeof normalized === "object") {
    const keys = Object.keys(normalized).slice(0, 14);
    return (
      <div style={{ overflowX: "auto", padding: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <tbody>
            {keys.map((k) => {
              const v = normalized[k];
              const cell = Array.isArray(v) || typeof v === "object" ? JSON.stringify(v).slice(0, 260) : String(v ?? "");
              return (
                <tr key={k}>
                  <td style={{ width: "42%", borderBottom: "1px solid #f3f4f6", padding: "6px 8px", fontWeight: 700, background: "#f9fafb" }}>
                    {k}
                  </td>
                  <td style={{ borderBottom: "1px solid #f3f4f6", padding: "6px 8px" }}>{cell}</td>
            </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return <div style={{ padding: 8, fontSize: 12 }}>{String(normalized)}</div>;
}

function FrameworkSWOT({ data, colors, densityTier = 1 }) {
  const strengths = asArray(getInsensitive(data, ["strengths", "Strengths"]) ?? data?.strengths);
  const weaknesses = asArray(getInsensitive(data, ["weaknesses", "Weaknesses"]) ?? data?.weaknesses);
  const opportunities = asArray(getInsensitive(data, ["opportunities", "Opportunities"]) ?? data?.opportunities);
  const threats = asArray(getInsensitive(data, ["threats", "Threats"]) ?? data?.threats);

  const regions = [
    { key: "Strengths", items: strengths, color: colors[0] },
    { key: "Weaknesses", items: weaknesses, color: colors[1] },
    { key: "Opportunities", items: opportunities, color: colors[2] },
    { key: "Threats", items: threats, color: colors[3] },
  ];

  const pad = 40;
  const gap = 18;
  const cellW = (SVG_W - pad * 2 - gap) / 2;
  const cellH = (SVG_H - pad * 2 - gap) / 2;
  const headerH = 44;

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`} preserveAspectRatio="xMidYMid meet">
      {regions.map((q, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const x = pad + col * (cellW + gap);
        const y = pad + row * (cellH + gap);
        const c = q.color || "#2563eb";
        const bg = hexToRgba(c, 0.10);
        const stroke = hexToRgba(c, 0.75);
        const { shown, remaining } = sliceWithMoreBadge(q.items, 3, 5, densityTier);
        const lines = shown.length ? shown : ["—"];
        if (remaining > 0) lines.push(`+${remaining} more`);

        return (
          <g key={q.key}>
            <rect x={x} y={y} width={cellW} height={cellH} rx={10} ry={10} fill={bg} stroke={stroke} strokeWidth={2} />
            <TextBlock x={x + 18} y={y} w={cellW - 36} h={headerH} lines={[q.key]} fontSize={18} fill="#0f172a" fontWeight={800} />
            <TextBlock x={x + 18} y={y + headerH} w={cellW - 36} h={cellH - headerH - 18} lines={lines} fontSize={14} fill="#0f172a" fontWeight={500} />
          </g>
        );
      })}
    </svg>
  );
}

function FrameworkPESTLE({ data, colors, densityTier = 1 }) {
  // Backend sometimes returns only PEST (4 factors) rather than full PESTLE.
  const base = [
    { key: "Political", v: getInsensitive(data, ["Political", "political"]) },
    { key: "Economic", v: getInsensitive(data, ["Economic", "economic"]) },
    { key: "Social", v: getInsensitive(data, ["Social", "social"]) },
    { key: "Technological", v: getInsensitive(data, ["Technological", "technological"]) },
  ].map((x) => ({ ...x, items: asArray(x.v) }));

  const extras = [
    { key: "Legal", v: getInsensitive(data, ["Legal", "legal"]) },
    { key: "Environmental", v: getInsensitive(data, ["Environmental", "environmental"]) },
  ].map((x) => ({ ...x, items: asArray(x.v) }));

  const factors = [
    ...base,
    ...extras.filter((f) => (f.items || []).filter(Boolean).length > 0),
  ].map((x, i) => ({ ...x, color: colors[i % colors.length] || "#2563eb" }));

  const pad = 34;
  const gapX = 14;
  const gapY = 14;
  const cols = 2;
  const rows = Math.max(1, Math.ceil(factors.length / cols));
  const cellW = (SVG_W - pad * 2 - gapX * (cols - 1)) / cols;
  const cellH = (SVG_H - pad * 2 - gapY * (rows - 1)) / rows;
  const headerH = 38;

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`} preserveAspectRatio="xMidYMid meet">
      {factors.map((f, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const x = pad + col * (cellW + gapX);
        const y = pad + row * (cellH + gapY);
        const bg = hexToRgba(f.color, 0.10);
        const stroke = hexToRgba(f.color, 0.75);
        const { shown, remaining } = sliceWithMoreBadge(f.items, 2, 4, densityTier);
        const lines = shown.length ? shown : ["—"];
        if (remaining > 0) lines.push(`+${remaining} more`);

        return (
          <g key={f.key}>
            <rect x={x} y={y} width={cellW} height={cellH} rx={10} ry={10} fill={bg} stroke={stroke} strokeWidth={2} />
            <TextBlock x={x + 14} y={y} w={cellW - 28} h={headerH} lines={[f.key]} fontSize={16} fill="#0f172a" fontWeight={800} />
            <TextBlock x={x + 14} y={y + headerH} w={cellW - 28} h={cellH - headerH - 10} lines={lines} fontSize={13} fill="#0f172a" fontWeight={500} />
          </g>
        );
      })}
    </svg>
  );
}

function FrameworkPorter5Forces({ data, colors, densityTier = 1 }) {
  const forces = [
    {
      key: "Threat of New Entrants",
      v: getInsensitive(data, [
        "threat_of_new_entrants",
        "new_entrants",
        "Threat of New Entrants",
        "threat_of_new_entry",
        "new_entry",
        "Threat of New Entry",
      ]),
    },
    { key: "Supplier Power", v: getInsensitive(data, ["supplier_power", "Supplier Power"]) },
    { key: "Buyer Power", v: getInsensitive(data, ["buyer_power", "Buyer Power"]) },
    {
      key: "Threat of Substitutes",
      v: getInsensitive(data, [
        "threat_of_substitutes",
        "substitutes",
        "Threat of Substitutes",
        "threat_of_substitution",
        "substitution",
        "Threat of Substitution",
      ]),
    },
    { key: "Competitive Rivalry", v: getInsensitive(data, ["competitive_rivalry", "rivalry", "Competitive Rivalry"]) },
  ].map((x, i) => ({ ...x, items: asArray(x.v), color: colors[i % colors.length] }));

  const industry = String(getInsensitive(data, ["industry", "Industry", "industry_name", "company_industry"]) ?? "Industry").slice(0, 28);

  const centerR = 78;
  const centerX = SVG_W / 2;
  const centerY = SVG_H / 2;

  const boxW = 210;
  const boxH = 86;
  const positions = {
    top: { x: centerX - boxW / 2, y: 38 },
    left: { x: 40, y: centerY - boxH / 2 },
    right: { x: SVG_W - 40 - boxW, y: centerY - boxH / 2 },
    bottom: { x: centerX - boxW / 2, y: SVG_H - 38 - boxH },
  };

  const quadrantOrder = [forces[0], forces[3], forces[1], forces[2], forces[4]]; // top, bottom, left, right, center note
  const forceBoxes = [
    { f: forces[0], pos: positions.top },
    { f: forces[2], pos: positions.right },
    { f: forces[1], pos: positions.left },
    { f: forces[3], pos: positions.bottom },
  ];
  const centerNote = forces[4];

  const drawBox = (f, x, y) => {
    const bg = hexToRgba(f.color, 0.10);
    const stroke = hexToRgba(f.color, 0.75);
    const { shown, remaining } = sliceWithMoreBadge(f.items, 2, 4, densityTier);
    const lines = shown.length ? shown : ["—"];
    if (remaining > 0) lines.push(`+${remaining} more`);
    const headerFont = 14;
    const bodyFont = 12;
    return (
      <g>
        <rect x={x} y={y} width={boxW} height={boxH} rx={12} ry={12} fill={bg} stroke={stroke} strokeWidth={2} />
        <TextBlock x={x + 12} y={y} w={boxW - 24} h={26} lines={[f.key]} fontSize={headerFont} fill="#0f172a" fontWeight={800} />
        <TextBlock x={x + 12} y={y + 24} w={boxW - 24} h={boxH - 24} lines={lines} fontSize={bodyFont} fill="#0f172a" fontWeight={500} />
      </g>
    );
  };

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`} preserveAspectRatio="xMidYMid meet">
      {/* connectors (straight lines) */}
      {[
        { x1: centerX, y1: centerY - centerR, x2: centerX, y2: positions.top.y + 40 },
        { x1: centerX, y1: centerY - centerR, x2: positions.left.x + boxW, y2: centerY - 10 },
        { x1: centerX, y1: centerY - centerR, x2: positions.right.x, y2: centerY - 10 },
        { x1: centerX, y1: centerY + centerR, x2: centerX, y2: positions.bottom.y + 40 },
      ].map((l, i) => (
        <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="rgba(15,23,42,0.35)" strokeWidth={2} />
      ))}

      <circle cx={centerX} cy={centerY} r={centerR} fill={hexToRgba(centerNote.color || colors[4] || "#2563eb", 0.12)} stroke={hexToRgba(centerNote.color || colors[4] || "#2563eb", 0.75)} strokeWidth={2} />

      <TextBlock x={centerX - centerR + 18} y={centerY - 12} w={centerR * 2 - 36} h={60} lines={[industry]} fontSize={18} fill="#0f172a" fontWeight={900} />

      {(() => {
        const { shown, remaining } = sliceWithMoreBadge(centerNote.items, 1, 2, densityTier);
        const lines = shown.length ? shown : ["—"];
        if (remaining > 0) lines.push(`+${remaining} more`);
        return <TextBlock x={centerX - centerR + 18} y={centerY + 22} w={centerR * 2 - 36} h={56} lines={lines} fontSize={14} fill="#0f172a" fontWeight={600} />;
      })()}

      {forceBoxes.map((b) => drawBox(b.f, b.pos.x, b.pos.y))}
    </svg>
  );
}

function FrameworkBCG({ data, colors, densityTier = 1 }) {
  const quadrantKeys = [
    { key: "Stars", idx: 0 },
    { key: "Question Marks", idx: 1 },
    { key: "Cash Cows", idx: 2 },
    { key: "Dogs", idx: 3 },
  ];

  const getQuadrantItems = (name) => {
    if (!data || typeof data !== "object") return [];
    const v = getInsensitive(data, [name, name.toLowerCase().replace(/\s+/g, "_")]);
    // allow { items: [] } shape
    const inner = v && typeof v === "object" && (v.items || v.list) ? (v.items || v.list) : v;
    return asArray(inner);
  };

  const pad = 40;
  const gap = 18;
  const cellW = (SVG_W - pad * 2 - gap) / 2;
  const cellH = (SVG_H - pad * 2 - gap) / 2;
  const headerH = 44;

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`} preserveAspectRatio="xMidYMid meet">
      {quadrantKeys.map((q, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = pad + col * (cellW + gap);
        const y = pad + row * (cellH + gap);
        const c = colors[q.idx % colors.length] || "#2563eb";
        const bg = hexToRgba(c, 0.10);
        const stroke = hexToRgba(c, 0.75);
        const items = getQuadrantItems(q.key);
        const { shown, remaining } = sliceWithMoreBadge(items, 2, 4, densityTier);
        const lines = shown.length ? shown : ["—"];
        if (remaining > 0) lines.push(`+${remaining} more`);

        return (
          <g key={q.key}>
            <rect x={x} y={y} width={cellW} height={cellH} rx={10} ry={10} fill={bg} stroke={stroke} strokeWidth={2} />
            <TextBlock x={x + 18} y={y} w={cellW - 36} h={headerH} lines={[q.key]} fontSize={18} fill="#0f172a" fontWeight={900} />
            <TextBlock x={x + 18} y={y + headerH} w={cellW - 36} h={cellH - headerH - 14} lines={lines} fontSize={14} fill="#0f172a" fontWeight={500} />
          </g>
        );
      })}
      {/* axis labels (PPT-safe text only) */}
      <TextBlock x={pad} y={SVG_H - 26} w={SVG_W - pad * 2} h={20} lines={["Relative Market Share →"]} fontSize={14} fill="#0f172a" fontWeight={700} />
    </svg>
  );
}

function Framework2x2Generic({ data, colors, quadrantOrder, labels, fallbackFill = "#f8fafc", densityTier = 1 }) {
  const pad = 40;
  const gap = 18;
  const cellW = (SVG_W - pad * 2 - gap) / 2;
  const cellH = (SVG_H - pad * 2 - gap) / 2;
  const headerH = 44;

  const getItems = (label) => {
    // Try common container keys first
    const v = getInsensitive(data, [label, label.toLowerCase().replace(/\s+/g, "_")]);
    if (v && typeof v === "object" && (v.items || v.list)) return asArray(v.items || v.list);
    return asArray(v);
  };

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`} preserveAspectRatio="xMidYMid meet">
      {quadrantOrder.map((key, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = pad + col * (cellW + gap);
        const y = pad + row * (cellH + gap);
        const label = labels[key] || key;
        const c = colors[i % colors.length] || "#2563eb";
        const bg = hexToRgba(c, 0.10);
        const stroke = hexToRgba(c, 0.75);
        const items = getItems(label);
        const { shown, remaining } = sliceWithMoreBadge(items, 2, 4, densityTier);
        const lines = shown.length ? shown : ["—"];
        if (remaining > 0) lines.push(`+${remaining} more`);

        return (
          <g key={key}>
            <rect x={x} y={y} width={cellW} height={cellH} rx={10} ry={10} fill={bg} stroke={stroke} strokeWidth={2} />
            <TextBlock x={x + 18} y={y} w={cellW - 36} h={headerH} lines={[label]} fontSize={18} fill="#0f172a" fontWeight={900} />
            <TextBlock x={x + 18} y={y + headerH} w={cellW - 36} h={cellH - headerH - 14} lines={lines} fontSize={14} fill="#0f172a" fontWeight={500} />
          </g>
        );
      })}
    </svg>
  );
}

function FrameworkAnsoff({ data, colors, densityTier = 1 }) {
  // Quadrants: x=existing->new products, y=existing->new markets
  // We'll render classic: top-left Market Penetration, top-right Product Development,
  // bottom-left Market Development, bottom-right Diversification.
  return (
    <Framework2x2Generic
      data={data}
      colors={colors}
      quadrantOrder={["topLeft", "topRight", "bottomLeft", "bottomRight"]}
      densityTier={densityTier}
      labels={{
        topLeft: "Market Penetration",
        topRight: "Product Development",
        bottomLeft: "Market Development",
        bottomRight: "Diversification",
      }}
    />
  );
}

function FrameworkValueChain({ data, colors, densityTier = 1 }) {
  const paletteCycle = colors.length ? colors : ["#2563eb", "#06b6d4", "#8b5cf6", "#f59e0b"];

  // Prefer the backend schema: Primary Activities / Support Activities.
  const primaryV = getInsensitive(data, ["Primary Activities", "primary_activities", "Primary"]);
  const supportV = getInsensitive(data, ["Support Activities", "support_activities", "Support"]);
  const primaryItems = asArray(primaryV);
  const supportItems = asArray(supportV);

  const hasPrimarySupport = primaryItems.length > 0 || supportItems.length > 0;

  if (hasPrimarySupport) {
    const padX = 36;
    const padY = 26;
    const gap = 18;
    const bandH = (SVG_H - padY * 2 - gap) / 2;
    const headerH = 40;

    const bands = [
      { key: "Primary Activities", items: primaryItems, color: paletteCycle[0] },
      { key: "Support Activities", items: supportItems, color: paletteCycle[1] || paletteCycle[0] },
    ];

    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`} preserveAspectRatio="xMidYMid meet">
        {bands.map((b, idx) => {
          const y = padY + idx * (bandH + gap);
          const bg = hexToRgba(b.color, 0.08);
          const stroke = hexToRgba(b.color, 0.70);
          const { shown, remaining } = sliceWithMoreBadge(b.items, 3, 6, densityTier);
          const lines = shown.length ? shown : ["—"];
          if (remaining > 0) lines.push(`+${remaining} more`);

          return (
            <g key={b.key}>
              <rect x={padX} y={y} width={SVG_W - padX * 2} height={bandH} rx={12} ry={12} fill={bg} stroke={stroke} strokeWidth={2} />
              <TextBlock x={padX + 14} y={y + 12} w={SVG_W - padX * 2 - 28} h={headerH} lines={[b.key]} fontSize={16} fill="#0f172a" fontWeight={900} />
              <TextBlock x={padX + 14} y={y + headerH} w={SVG_W - padX * 2 - 28} h={bandH - headerH - 12} lines={lines} fontSize={13} fill="#0f172a" fontWeight={600} />
            </g>
          );
        })}
      </svg>
    );
  }

  // Fallback: classic 6-band activity strip.
  const padX = 26;
  const padY = 22;
  const bandH = (SVG_H - padY * 2) / 6;
  const activities = [
    { key: "Inbound Logistics", v: getInsensitive(data, ["inbound_logistics", "Inbound Logistics"]) },
    { key: "Operations", v: getInsensitive(data, ["operations"]) },
    { key: "Outbound Logistics", v: getInsensitive(data, ["outbound_logistics", "Outbound Logistics"]) },
    { key: "Marketing & Sales", v: getInsensitive(data, ["marketing_sales", "Marketing & Sales"]) },
    { key: "Service", v: getInsensitive(data, ["service"]) },
    { key: "Value Margin", v: getInsensitive(data, ["value_margin", "Value Margin"]) },
  ];

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`} preserveAspectRatio="xMidYMid meet">
      {/* subtle vertical grid */}
      {Array.from({ length: 6 }).map((_, i) => {
        const x = padX + (i * (SVG_W - padX * 2)) / 5;
        return <line key={i} x1={x} y1={padY} x2={x} y2={SVG_H - padY} stroke="rgba(15,23,42,0.06)" strokeWidth={2} />;
      })}

      {activities.map((a, idx) => {
        const y = padY + idx * bandH;
        const c = paletteCycle[idx % paletteCycle.length];
        const bg = hexToRgba(c, 0.08);
        const stroke = hexToRgba(c, 0.70);
        const items = asArray(a.v);
        const { shown, remaining } = sliceWithMoreBadge(items, 1, 2, densityTier);
        const lines = shown.length ? shown : ["—"];
        if (remaining > 0) lines.push(`+${remaining} more`);
        return (
          <g key={a.key}>
            <rect x={padX} y={y + 4} width={SVG_W - padX * 2} height={bandH - 8} rx={10} ry={10} fill={bg} stroke={stroke} strokeWidth={2} />
            <TextBlock x={padX + 14} y={y + 10} w={SVG_W - padX * 2 - 28} h={26} lines={[a.key]} fontSize={16} fill="#0f172a" fontWeight={900} />
            <TextBlock x={padX + 14} y={y + 36} w={SVG_W - padX * 2 - 28} h={bandH - 36} lines={lines} fontSize={13} fill="#0f172a" fontWeight={600} />
          </g>
        );
      })}
    </svg>
  );
}

function FrameworkBalancedScorecard({ data, colors, densityTier = 1 }) {
  const quads = [
    { key: "Financial", v: getInsensitive(data, ["Financial", "financial"]) },
    { key: "Customer", v: getInsensitive(data, ["Customer", "customer"]) },
    {
      key: "Internal Processes",
      v: getInsensitive(data, [
        "Internal Processes",
        "internal_processes",
        "Internal Process",
        "internal_process",
        "internalprocess",
        "internalprocesses",
      ]),
    },
    {
      key: "Learning & Growth",
      v: getInsensitive(data, [
        "Learning & Growth",
        "learning&growth",
        "Learning and Growth",
        "learning_and_growth",
        "Learning & growth",
      ]),
    },
  ];

  const pad = 40;
  const gap = 18;
  const cellW = (SVG_W - pad * 2 - gap) / 2;
  const cellH = (SVG_H - pad * 2 - gap) / 2;
  const headerH = 44;

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`} preserveAspectRatio="xMidYMid meet">
      {quads.map((q, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const x = pad + col * (cellW + gap);
        const y = pad + row * (cellH + gap);
        const c = colors[idx % colors.length] || "#2563eb";
        const bg = hexToRgba(c, 0.10);
        const stroke = hexToRgba(c, 0.75);

        // Support either array bullets, or object with metrics.
        const items = asArray(q.v);
        const { shown, remaining } = sliceWithMoreBadge(items, 2, 4, densityTier);
        const lines = shown.length ? shown : ["—"];
        if (remaining > 0) lines.push(`+${remaining} more`);

        return (
          <g key={q.key}>
            <rect x={x} y={y} width={cellW} height={cellH} rx={10} ry={10} fill={bg} stroke={stroke} strokeWidth={2} />
            <TextBlock x={x + 18} y={y} w={cellW - 36} h={headerH} lines={[q.key]} fontSize={18} fill="#0f172a" fontWeight={900} />
            <TextBlock x={x + 18} y={y + headerH} w={cellW - 36} h={cellH - headerH - 14} lines={lines} fontSize={14} fill="#0f172a" fontWeight={600} />
          </g>
        );
      })}
    </svg>
  );
}

function FrameworkVRIO({ data, colors }) {
  // Render a simple table. We avoid CSS-dependent layout by using SVG rect+text for cells.
  const columns = asArray(getInsensitive(data, ["columns", "Columns"]))?.length
    ? asArray(getInsensitive(data, ["columns", "Columns"]))
    : ["Resource/Capability", "Valuable", "Rare", "Inimitable", "Organized", "Implication"];

  // Determine rows
  // Common shapes:
  // 1) { rows: [{...}], columns: [...] }
  // 2) { matrix: [...] }
  // 3) { "VRIO": { ... } } or object mapping
  let rows = [];
  const maybeRows = getInsensitive(data, ["rows", "Rows", "matrix", "Matrix"]);
  if (Array.isArray(maybeRows)) rows = maybeRows;
  else if (data && typeof data === "object" && !Array.isArray(data)) {
    // Convert object mapping resource -> evaluations into rows.
    const maybeObj = data?.data && typeof data.data === "object" ? data.data : data;
    const keys = Object.keys(maybeObj || {}).filter((k) => !["columns", "rows", "matrix"].includes(k));
    rows = keys.slice(0, 8).map((k) => {
      const v = maybeObj[k];
      if (v && typeof v === "object") return { "Resource/Capability": k, ...v };
      return { "Resource/Capability": k, Valuable: v, Rare: "", Inimitable: "", Organized: "", Implication: "" };
    });
  }

  const maxRows = 8;
  const safeRows = rows.slice(0, maxRows);
  const cellPadX = 8;

  const headerFill = hexToRgba(colors[0] || "#2563eb", 0.12);
  const stroke = "rgba(15,23,42,0.22)";

  const tableX = 26;
  const tableY = 26;
  const tableW = SVG_W - 52;
  const tableH = SVG_H - 52;

  const rowH = 42;
  const headerH = 52;
  const cols = Math.max(3, columns.length);
  const colW = tableW / cols;

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`} preserveAspectRatio="xMidYMid meet">
      {/* header */}
      <rect x={tableX} y={tableY} width={tableW} height={headerH} rx={10} ry={10} fill={headerFill} stroke={stroke} strokeWidth={2} />
      {columns.slice(0, cols).map((c, i) => {
        const x = tableX + i * colW;
        return (
          <g key={c}>
            <line x1={x} y1={tableY} x2={x} y2={tableY + headerH} stroke={stroke} strokeWidth={2} />
            <TextBlock x={x + cellPadX} y={tableY + 10} w={colW - cellPadX} h={headerH} lines={[c]} fontSize={12} fill="#0f172a" fontWeight={900} />
          </g>
        );
      })}

      <line x1={tableX + tableW} y1={tableY} x2={tableX + tableW} y2={tableY + headerH} stroke={stroke} strokeWidth={2} />
      {/* rows */}
      {safeRows.map((r, rowIdx) => {
        const y = tableY + headerH + rowIdx * rowH;
        const fill = rowIdx % 2 === 0 ? "rgba(15,23,42,0.02)" : "rgba(15,23,42,0.00)";
        return (
          <g key={rowIdx}>
            <rect x={tableX} y={y} width={tableW} height={rowH} fill={fill} stroke={stroke} strokeWidth={2} />
            {columns.slice(0, cols).map((c, colIdx) => {
              const x = tableX + colIdx * colW;
              const v = r?.[c] ?? r?.[String(c).toLowerCase()] ?? "";
              const text = typeof v === "object" ? JSON.stringify(v).slice(0, 32) : String(v ?? "");
              return (
                <g key={c}>
                  {colIdx > 0 && <line x1={x} y1={y} x2={x} y2={y + rowH} stroke={stroke} strokeWidth={2} />}
                  <TextBlock x={x + cellPadX} y={y} w={colW - cellPadX} h={rowH} lines={[text]} fontSize={12} fill="#0f172a" fontWeight={600} />
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

function FrameworkPrimitiveCards({ data, colors, densityTier = 1, maxCards = 9 }) {
  // Generic, PPTX-safe “key/value” primitive cards renderer.
  // Uses only SVG rects + text, and aggressively caps density so small sections remain readable.
  const entries = (() => {
    if (data == null) return [];
    if (Array.isArray(data)) {
      return [{ key: "Items", value: data }];
    }
    if (typeof data === "object") {
      return Object.keys(data).map((k) => ({ key: k, value: data[k] }));
    }
    return [{ key: "Value", value: [String(data)] }];
  })();

  const effectiveMaxCards = Math.max(1, Math.min(maxCards, entries.length));
  const shownEntries = entries.slice(0, effectiveMaxCards);
  const remainingEntries = Math.max(0, entries.length - shownEntries.length);

  const cols = shownEntries.length <= 2 ? 1 : shownEntries.length <= 4 ? 2 : 3;
  const rows = Math.max(1, Math.ceil(shownEntries.length / cols));

  const padX = 26;
  const padY = 24;
  const gap = 14;
  const cardW = (SVG_W - padX * 2 - gap * (cols - 1)) / cols;
  const cardH = (SVG_H - padY * 2 - gap * (rows - 1)) / rows;

  const titleFont = densityTier === 0 ? 13 : densityTier === 2 ? 15 : 14;
  const bodyFont = densityTier === 0 ? 11 : densityTier === 2 ? 13 : 12;

  const ideal = densityTier === 0 ? 1 : densityTier === 2 ? 3 : 2;
  const max = densityTier === 0 ? 2 : densityTier === 2 ? 6 : 4;

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`} preserveAspectRatio="xMidYMid meet">
      {shownEntries.map((e, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const x = padX + col * (cardW + gap);
        const y = padY + row * (cardH + gap);

        const c = colors[idx % Math.max(1, colors.length)] || "#2563eb";
        const bg = hexToRgba(c, 0.10);
        const stroke = hexToRgba(c, 0.70);

        const items = asArray(e.value);
        const { shown, remaining } = sliceWithMoreBadge(items, ideal, max, densityTier);
        const lines = shown.length ? shown : ["—"];
        if (remaining > 0) lines.push(`+${remaining} more`);

        const title = String(e.key ?? "Section").slice(0, 26);
        const headerH = Math.min(34, Math.max(24, titleFont * 2.0));
        const bodyH = Math.max(22, cardH - headerH - 10);

        return (
          <g key={`${e.key}-${idx}`}>
            <rect x={x} y={y} width={cardW} height={cardH} rx={10} ry={10} fill={bg} stroke={stroke} strokeWidth={2} />
            <TextBlock x={x + 12} y={y + 8} w={cardW - 24} h={headerH} lines={[title]} fontSize={titleFont} fill="#0f172a" fontWeight={900} />
            <TextBlock x={x + 12} y={y + headerH} w={cardW - 24} h={bodyH} lines={lines} fontSize={bodyFont} fill="#0f172a" fontWeight={600} />
          </g>
        );
      })}

      {remainingEntries > 0 && (
        <text x={padX} y={SVG_H - 10} fontSize={12} fill="#0f172a" fontWeight={800} fontFamily="Inter, Arial, sans-serif">
          +{remainingEntries} more
        </text>
      )}
    </svg>
  );
}

function FrameworkScenarioPlanning({ data, colors, densityTier = 1 }) {
  const pad = 40;
  const gap = 18;
  const cellW = (SVG_W - pad * 2 - gap) / 2;
  const cellH = (SVG_H - pad * 2 - gap) / 2;
  const headerH = 40;

  const candidates = (() => {
    if (data == null) return [];
    if (Array.isArray(data)) return data.map((x, i) => ({ k: `Scenario ${i + 1}`, v: x }));
    if (typeof data === "object") return Object.keys(data).slice(0, 4).map((k) => ({ k, v: data[k] }));
    return [{ k: "Scenario", v: data }];
  })();

  const fixed = new Array(4).fill(null).map((_, i) => candidates[i] || { k: `Scenario ${String.fromCharCode(65 + i)}`, v: [] });

  const ideal = densityTier === 0 ? 1 : densityTier === 2 ? 3 : 2;
  const max = densityTier === 0 ? 2 : densityTier === 2 ? 6 : 4;
  const bodyFont = densityTier === 0 ? 11 : densityTier === 2 ? 13 : 12;

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`} preserveAspectRatio="xMidYMid meet">
      {fixed.map((q, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = pad + col * (cellW + gap);
        const y = pad + row * (cellH + gap);
        const c = colors[i % Math.max(1, colors.length)] || "#2563eb";
        const bg = hexToRgba(c, 0.10);
        const stroke = hexToRgba(c, 0.70);

        const items = asArray(q.v);
        const { shown, remaining } = sliceWithMoreBadge(items, ideal, max, densityTier);
        const lines = shown.length ? shown : ["—"];
        if (remaining > 0) lines.push(`+${remaining} more`);

        const title = String(q.k ?? "Scenario").slice(0, 22);
        const titleFont = densityTier === 0 ? 15 : 16;
        const bodyH = cellH - headerH - 10;
        return (
          <g key={title}>
            <rect x={x} y={y} width={cellW} height={cellH} rx={10} ry={10} fill={bg} stroke={stroke} strokeWidth={2} />
            <TextBlock x={x + 14} y={y + 8} w={cellW - 28} h={headerH} lines={[title]} fontSize={titleFont} fill="#0f172a" fontWeight={900} />
            <TextBlock x={x + 14} y={y + headerH} w={cellW - 28} h={bodyH} lines={lines} fontSize={bodyFont} fill="#0f172a" fontWeight={600} />
          </g>
        );
      })}
    </svg>
  );
}

function FrameworkFunnelSimple({ data, colors, densityTier = 1 }) {
  const stagesByKey = ["Acquisition", "Activation", "Retention", "Revenue", "Referral"];
  const stages = (() => {
    if (data == null) return [];
    if (Array.isArray(data)) return data.slice(0, 5).map((v, i) => ({ name: `Stage ${i + 1}`, v }));
    if (typeof data === "object") {
      const out = stagesByKey.map((k) => {
        const v = data[k] ?? data[k.toLowerCase()] ?? data[k.replace(/\s+/g, "_")];
        return v != null ? { name: k, v } : null;
      }).filter(Boolean);
      if (out.length) return out.slice(0, 5);
      const keys = Object.keys(data).slice(0, 5);
      return keys.map((k) => ({ name: k, v: data[k] }));
    }
    return [{ name: "Stage", v: data }];
  })();

  const topY = 64;
  const bottomY = SVG_H - 34;
  const rectH = (bottomY - topY) / Math.max(1, stages.length);
  const padSide = 78;

  const ideal = densityTier === 0 ? 1 : densityTier === 2 ? 3 : 2;
  const max = densityTier === 0 ? 2 : densityTier === 2 ? 6 : 4;
  const bodyFont = densityTier === 0 ? 11 : densityTier === 2 ? 13 : 12;

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`} preserveAspectRatio="xMidYMid meet">
      {stages.length ? (
        stages.map((s, i) => {
          const t = stages.length <= 1 ? 0 : i / (stages.length - 1);
          const width = (SVG_W - padSide * 2) * (1 - 0.22 * t);
          const x = (SVG_W - width) / 2;
          const y = topY + i * rectH;

          const c = colors[i % Math.max(1, colors.length)] || "#2563eb";
          const bg = hexToRgba(c, 0.10);
          const stroke = hexToRgba(c, 0.70);

          const title = String(s.name ?? `Stage ${i + 1}`).slice(0, 18);
          const items = asArray(s.v);
          const { shown, remaining } = sliceWithMoreBadge(items, ideal, max, densityTier);
          const lines = shown.length ? shown : ["—"];
          if (remaining > 0) lines.push(`+${remaining} more`);

          const headerH = Math.min(26, rectH * 0.35);
          const bodyH = Math.max(18, rectH - headerH - 10);
          return (
            <g key={title}>
              <rect x={x} y={y} width={width} height={rectH - 6} rx={12} ry={12} fill={bg} stroke={stroke} strokeWidth={2} />
              <TextBlock x={x + 12} y={y + 6} w={width - 24} h={headerH} lines={[title]} fontSize={15} fill="#0f172a" fontWeight={900} />
              <TextBlock x={x + 12} y={y + headerH + 2} w={width - 24} h={bodyH} lines={lines} fontSize={bodyFont} fill="#0f172a" fontWeight={600} />
              {i < stages.length - 1 && (
                <line x1={SVG_W / 2} y1={y + rectH - 3} x2={SVG_W / 2} y2={y + rectH + 7} stroke="rgba(15,23,42,0.35)" strokeWidth={2} />
              )}
            </g>
          );
        })
      ) : (
        <text x="50%" y="50%" fontSize={14} fill="#6b7280" fontWeight={700} textAnchor="middle">
          Funnel data not available
        </text>
      )}
    </svg>
  );
}

function FrameworkEmpathyMap({ data, colors, densityTier = 1 }) {
  const zoneKeys = [
    { label: "Think", keys: ["Thinking", "Think", "Cognitive", "Thoughts"] },
    { label: "Feel", keys: ["Feeling", "Feel", "Emotions"] },
    { label: "Say", keys: ["Saying", "Say", "Verbalized", "What they say"] },
    { label: "Do", keys: ["Doing", "Do", "Actions", "What they do"] },
  ];

  const extracted = zoneKeys.map((z, i) => {
    const v =
      getInsensitive(data, z.keys) ??
      getInsensitive(data, [z.label]) ??
      [];
    return { key: z.label, v, color: colors[i % Math.max(1, colors.length)] || "#2563eb" };
  });

  const pad = 40;
  const gap = 18;
  const cellW = (SVG_W - pad * 2 - gap) / 2;
  const cellH = (SVG_H - pad * 2 - gap) / 2;
  const headerH = 36;
  const centerR = 52;

  const ideal = densityTier === 0 ? 1 : densityTier === 2 ? 3 : 2;
  const max = densityTier === 0 ? 2 : densityTier === 2 ? 6 : 4;
  const bodyFont = densityTier === 0 ? 11 : densityTier === 2 ? 13 : 12;

  const centerText = String(getInsensitive(data, ["persona", "user", "customer", "who", "Empathy"]) ?? "Persona").slice(0, 26);

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`} preserveAspectRatio="xMidYMid meet">
      {extracted.map((z, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const x = pad + col * (cellW + gap);
        const y = pad + row * (cellH + gap);
        const bg = hexToRgba(z.color, 0.10);
        const stroke = hexToRgba(z.color, 0.70);
        const items = asArray(z.v);
        const { shown, remaining } = sliceWithMoreBadge(items, ideal, max, densityTier);
        const lines = shown.length ? shown : ["—"];
        if (remaining > 0) lines.push(`+${remaining} more`);
        return (
          <g key={z.key}>
            <rect x={x} y={y} width={cellW} height={cellH} rx={10} ry={10} fill={bg} stroke={stroke} strokeWidth={2} />
            <TextBlock x={x + 14} y={y + 8} w={cellW - 28} h={headerH} lines={[z.key]} fontSize={16} fill="#0f172a" fontWeight={900} />
            <TextBlock x={x + 14} y={y + headerH} w={cellW - 28} h={cellH - headerH - 10} lines={lines} fontSize={bodyFont} fill="#0f172a" fontWeight={600} />
          </g>
        );
      })}
      <circle cx={SVG_W / 2} cy={SVG_H / 2} r={centerR} fill="rgba(15,23,42,0.04)" stroke="rgba(15,23,42,0.20)" strokeWidth={2} />
      <text x={SVG_W / 2} y={SVG_H / 2 + 6} fontSize={16} fill="#0f172a" fontWeight={900} textAnchor="middle" fontFamily="Inter, Arial, sans-serif">
        {centerText}
      </text>
    </svg>
  );
}

function FrameworkOKR({ data, colors, densityTier = 1 }) {
  const objective = String(getInsensitive(data, ["Objective", "objective", "Goal", "goal", "What"]) ?? "Objective");
  const keyResultsRaw = getInsensitive(data, ["Key Results", "key_results", "key results", "KRs", "KR", "keyResult", "keyResultTitle"]) ?? data?.keyResults ?? data?.key_results;
  const keyResults = asArray(keyResultsRaw).slice(0, densityTier === 0 ? 5 : densityTier === 2 ? 9 : 7);

  const pad = 50;
  const boxW = SVG_W - pad * 2;
  const topY = 70;
  const objH = 78;
  const krStartY = topY + objH + 24;
  const krRowH = 44;

  const cardColor = colors[0] || "#2563eb";
  const bg = hexToRgba(cardColor, 0.10);
  const stroke = hexToRgba(cardColor, 0.70);

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`} preserveAspectRatio="xMidYMid meet">
      <rect x={pad} y={topY} width={boxW} height={objH} rx={14} ry={14} fill={bg} stroke={stroke} strokeWidth={2} />
      <TextBlock x={pad + 16} y={topY + 16} w={boxW - 32} h={40} lines={[objective.slice(0, 40)]} fontSize={18} fill="#0f172a" fontWeight={900} />

      {keyResults.length ? (
        keyResults.map((kr, i) => {
          const y = krStartY + i * krRowH;
          const c = colors[(i + 1) % Math.max(1, colors.length)] || cardColor;
          const b = hexToRgba(c, 0.08);
          const s = hexToRgba(c, 0.68);
          return (
            <g key={`${i}-${kr.slice(0, 10)}`}>
              <line x1={SVG_W / 2} y1={topY + objH} x2={SVG_W / 2} y2={y + 8} stroke="rgba(15,23,42,0.22)" strokeWidth={2} />
              <rect x={pad} y={y} width={boxW} height={krRowH - 8} rx={12} ry={12} fill={b} stroke={s} strokeWidth={2} />
              <TextBlock x={pad + 16} y={y + 10} w={boxW - 32} h={30} lines={[kr.slice(0, 62)]} fontSize={14} fill="#0f172a" fontWeight={700} />
            </g>
          );
        })
      ) : (
        <text x={SVG_W / 2} y={SVG_H - 30} fontSize={14} fill="#6b7280" fontWeight={700} textAnchor="middle">
          No key results available
        </text>
      )}
    </svg>
  );
}

function FrameworkTableGrid({ data, colors, densityTier = 1, defaultColumns = [], maxRows = 8 }) {
  const columnsFromData = asArray(getInsensitive(data, ["columns", "Columns"]));
  const columns = columnsFromData.length ? columnsFromData : defaultColumns;

  let rows = [];
  const maybeRows = getInsensitive(data, ["rows", "Rows", "matrix", "Matrix"]);
  if (Array.isArray(maybeRows)) {
    rows = maybeRows.slice(0, maxRows);
  } else if (data && typeof data === "object" && !Array.isArray(data)) {
    const keys = Object.keys(data).filter((k) => !["columns", "rows", "matrix"].includes(String(k).toLowerCase()));
    rows = keys.slice(0, maxRows).map((k) => {
      const v = data[k];
      if (v && typeof v === "object" && !Array.isArray(v)) return { name: k, ...v };
      return { name: k, value: v };
    });
  }

  const safeCols = (columns.length ? columns : ["Category", "Value"]).slice(0, 8);
  const effectiveRows = rows.slice(0, maxRows);
  const tableX = 24;
  const tableY = 24;
  const tableW = SVG_W - 48;
  const headerH = 46;
  const rowH = densityTier === 0 ? 34 : 40;
  const colW = tableW / safeCols.length;
  const stroke = "rgba(15,23,42,0.22)";
  const headerFill = hexToRgba(colors[0] || "#2563eb", 0.12);

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`} preserveAspectRatio="xMidYMid meet">
      <rect x={tableX} y={tableY} width={tableW} height={headerH} rx={10} ry={10} fill={headerFill} stroke={stroke} strokeWidth={2} />
      {safeCols.map((c, i) => {
        const x = tableX + i * colW;
        return (
          <g key={c}>
            <line x1={x} y1={tableY} x2={x} y2={tableY + headerH} stroke={stroke} strokeWidth={2} />
            <TextBlock x={x + 8} y={tableY + 10} w={colW - 10} h={headerH} lines={[String(c).slice(0, 20)]} fontSize={12} fill="#0f172a" fontWeight={900} />
          </g>
        );
      })}
      <line x1={tableX + tableW} y1={tableY} x2={tableX + tableW} y2={tableY + headerH} stroke={stroke} strokeWidth={2} />

      {effectiveRows.map((r, idx) => {
        const y = tableY + headerH + idx * rowH;
        const fill = idx % 2 === 0 ? "rgba(15,23,42,0.02)" : "rgba(15,23,42,0)";
        return (
          <g key={idx}>
            <rect x={tableX} y={y} width={tableW} height={rowH} fill={fill} stroke={stroke} strokeWidth={2} />
            {safeCols.map((c, colIdx) => {
              const x = tableX + colIdx * colW;
              const v = r?.[c] ?? r?.[String(c).toLowerCase()] ?? r?.name ?? r?.value ?? "";
              const t = typeof v === "object" ? JSON.stringify(v).slice(0, 24) : String(v ?? "").slice(0, 26);
              return (
                <g key={`${idx}-${c}`}>
                  {colIdx > 0 && <line x1={x} y1={y} x2={x} y2={y + rowH} stroke={stroke} strokeWidth={2} />}
                  <TextBlock x={x + 8} y={y + 6} w={colW - 10} h={rowH - 8} lines={[t]} fontSize={12} fill="#0f172a" fontWeight={600} />
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

function FrameworkOrgChart({ data, colors }) {
  const root = String(getInsensitive(data, ["root", "Root", "top_executive", "ceo", "head"]) ?? "Top Executive");
  let children = asArray(getInsensitive(data, ["levels", "children", "reports", "teams", "departments"]));
  if (!children.length && data && typeof data === "object") {
    children = Object.keys(data).filter((k) => !["root", "levels"].includes(String(k).toLowerCase())).slice(0, 6);
  }
  if (!children.length) children = ["Function A", "Function B", "Function C"];
  children = children.slice(0, 6);

  const c = colors[0] || "#2563eb";
  const bg = hexToRgba(c, 0.10);
  const stroke = hexToRgba(c, 0.70);

  const rootW = 320;
  const rootH = 64;
  const rootX = (SVG_W - rootW) / 2;
  const rootY = 52;
  const childY = 220;
  const gap = 20;
  const childW = Math.min(180, (SVG_W - 80 - gap * (children.length - 1)) / children.length);
  const totalChildrenW = childW * children.length + gap * (children.length - 1);
  const childStartX = (SVG_W - totalChildrenW) / 2;

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`} preserveAspectRatio="xMidYMid meet">
      <rect x={rootX} y={rootY} width={rootW} height={rootH} rx={12} ry={12} fill={bg} stroke={stroke} strokeWidth={2} />
      <TextBlock x={rootX + 14} y={rootY + 12} w={rootW - 28} h={40} lines={[root.slice(0, 34)]} fontSize={16} fill="#0f172a" fontWeight={900} />

      <line x1={SVG_W / 2} y1={rootY + rootH} x2={SVG_W / 2} y2={childY - 24} stroke="rgba(15,23,42,0.35)" strokeWidth={2} />
      <line x1={childStartX + childW / 2} y1={childY - 24} x2={childStartX + totalChildrenW - childW / 2} y2={childY - 24} stroke="rgba(15,23,42,0.35)" strokeWidth={2} />

      {children.map((name, i) => {
        const x = childStartX + i * (childW + gap);
        const y = childY;
        const cc = colors[(i + 1) % Math.max(1, colors.length)] || c;
        const bb = hexToRgba(cc, 0.08);
        const ss = hexToRgba(cc, 0.68);
        return (
          <g key={`${name}-${i}`}>
            <line x1={x + childW / 2} y1={childY - 24} x2={x + childW / 2} y2={childY} stroke="rgba(15,23,42,0.35)" strokeWidth={2} />
            <rect x={x} y={y} width={childW} height={54} rx={10} ry={10} fill={bb} stroke={ss} strokeWidth={2} />
            <TextBlock x={x + 10} y={y + 12} w={childW - 20} h={34} lines={[String(name).slice(0, 20)]} fontSize={13} fill="#0f172a" fontWeight={700} />
          </g>
        );
      })}
    </svg>
  );
}

function FrameworkFiveWhys({ data, colors }) {
  const problem = String(getInsensitive(data, ["problem_statement", "problem", "start", "issue"]) ?? "Problem statement");
  const whyKeys = ["Why 1", "Why 2", "Why 3", "Why 4", "Why 5"];
  const whys = whyKeys.map((k) => getInsensitive(data, [k, k.toLowerCase().replace(/\s+/g, "_")])).map((v) => String(v ?? "")).filter(Boolean);
  const items = whys.length ? whys : asArray(getInsensitive(data, ["steps", "reasons", "causes"])).slice(0, 5);
  const root = String(getInsensitive(data, ["root_cause", "end", "root cause"]) ?? "Root cause");
  const chain = [problem, ...items, root].slice(0, 7);

  const padX = 34;
  const gap = 14;
  const boxW = (SVG_W - padX * 2 - gap * (chain.length - 1)) / chain.length;
  const y = 190;
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`} preserveAspectRatio="xMidYMid meet">
      {chain.map((cTxt, i) => {
        const x = padX + i * (boxW + gap);
        const c = colors[i % Math.max(1, colors.length)] || "#2563eb";
        const bg = hexToRgba(c, 0.10);
        const stroke = hexToRgba(c, 0.70);
        return (
          <g key={`${i}-${cTxt.slice(0, 8)}`}>
            <rect x={x} y={y} width={boxW} height={92} rx={10} ry={10} fill={bg} stroke={stroke} strokeWidth={2} />
            <TextBlock x={x + 10} y={y + 12} w={boxW - 20} h={72} lines={[String(cTxt).slice(0, 30)]} fontSize={12} fill="#0f172a" fontWeight={700} />
            {i < chain.length - 1 && (
              <line x1={x + boxW} y1={y + 46} x2={x + boxW + gap - 2} y2={y + 46} stroke="rgba(15,23,42,0.35)" strokeWidth={2} />
            )}
          </g>
        );
      })}
    </svg>
  );
}

function FrameworkFishboneSafe({ data, colors, densityTier = 1 }) {
  const categories = ["People", "Process", "Technology", "Environment", "Policy", "Measurement"];
  const source = (data && typeof data === "object" && !Array.isArray(data)) ? data : {};
  const entries = categories.map((k) => ({ key: k, value: source[k] ?? source[k.toLowerCase()] ?? [] }));
  const active = entries.filter((e) => asArray(e.value).length > 0);
  const rows = (active.length ? active : entries.slice(0, 4)).slice(0, densityTier === 0 ? 4 : 6);

  const padX = 34;
  const padY = 30;
  const gap = 14;
  const cardH = (SVG_H - padY * 2 - gap * (rows.length - 1)) / rows.length;
  const cardW = SVG_W - padX * 2;
  const ideal = densityTier === 0 ? 1 : densityTier === 2 ? 3 : 2;
  const max = densityTier === 0 ? 2 : densityTier === 2 ? 6 : 4;
  const bodyFont = densityTier === 0 ? 11 : 12;

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`} preserveAspectRatio="xMidYMid meet">
      {rows.map((r, i) => {
        const y = padY + i * (cardH + gap);
        const c = colors[i % Math.max(1, colors.length)] || "#2563eb";
        const bg = hexToRgba(c, 0.08);
        const stroke = hexToRgba(c, 0.68);
        const { shown, remaining } = sliceWithMoreBadge(asArray(r.value), ideal, max, densityTier);
        const lines = shown.length ? shown : ["—"];
        if (remaining > 0) lines.push(`+${remaining} more`);
        return (
          <g key={r.key}>
            <rect x={padX} y={y} width={cardW} height={cardH} rx={10} ry={10} fill={bg} stroke={stroke} strokeWidth={2} />
            <TextBlock x={padX + 12} y={y + 8} w={cardW - 24} h={28} lines={[r.key]} fontSize={14} fill="#0f172a" fontWeight={900} />
            <TextBlock x={padX + 12} y={y + 32} w={cardW - 24} h={cardH - 36} lines={lines} fontSize={bodyFont} fill="#0f172a" fontWeight={600} />
          </g>
        );
      })}
    </svg>
  );
}

function FrameworkFlowSteps({ data, colors, densityTier = 1, titleKey = "Step" }) {
  const steps = (() => {
    if (Array.isArray(data)) return data.map((x, i) => ({ t: `${titleKey} ${i + 1}`, v: x })).slice(0, 7);
    if (data && typeof data === "object") {
      const nodes = getInsensitive(data, ["nodes", "steps", "activities", "process"]);
      if (Array.isArray(nodes)) return nodes.map((x, i) => ({ t: `${titleKey} ${i + 1}`, v: x })).slice(0, 7);
      const keys = Object.keys(data).slice(0, 7);
      return keys.map((k) => ({ t: k, v: data[k] }));
    }
    return [{ t: `${titleKey} 1`, v: "Start" }, { t: `${titleKey} 2`, v: "Process" }, { t: `${titleKey} 3`, v: "End" }];
  })();

  const padX = 34;
  const gap = 12;
  const boxW = (SVG_W - padX * 2 - gap * (steps.length - 1)) / steps.length;
  const y = 180;
  const bodyFont = densityTier === 0 ? 11 : 12;
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`} preserveAspectRatio="xMidYMid meet">
      {steps.map((s, i) => {
        const x = padX + i * (boxW + gap);
        const c = colors[i % Math.max(1, colors.length)] || "#2563eb";
        const bg = hexToRgba(c, 0.10);
        const stroke = hexToRgba(c, 0.70);
        const lines = asArray(s.v).slice(0, densityTier === 0 ? 1 : 2);
        return (
          <g key={`${s.t}-${i}`}>
            <rect x={x} y={y} width={boxW} height={98} rx={10} ry={10} fill={bg} stroke={stroke} strokeWidth={2} />
            <TextBlock x={x + 10} y={y + 10} w={boxW - 20} h={26} lines={[String(s.t).slice(0, 16)]} fontSize={13} fill="#0f172a" fontWeight={900} />
            <TextBlock x={x + 10} y={y + 34} w={boxW - 20} h={56} lines={lines.length ? lines : ["—"]} fontSize={bodyFont} fill="#0f172a" fontWeight={600} />
            {i < steps.length - 1 && <line x1={x + boxW} y1={y + 49} x2={x + boxW + gap - 2} y2={y + 49} stroke="rgba(15,23,42,0.35)" strokeWidth={2} />}
          </g>
        );
      })}
    </svg>
  );
}

function FrameworkJourneyRows({ data, colors, densityTier = 1 }) {
  const stageValues = (() => {
    const s = getInsensitive(data, ["stages", "columns", "journey_stages"]);
    if (Array.isArray(s) && s.length) return s;
    if (data && typeof data === "object") return Object.keys(data).slice(0, 7);
    return ["Awareness", "Consideration", "Purchase", "Onboarding", "Retention"];
  })().slice(0, 7);

  const rowDefs = ["Actions", "Touchpoints", "Pain Points", "Opportunities"];
  const padX = 28;
  const padY = 24;
  const leftW = 160;
  const gap = 10;
  const tableW = SVG_W - padX * 2 - leftW - gap;
  const colW = tableW / Math.max(1, stageValues.length);
  const rowH = (SVG_H - padY * 2 - 40) / (rowDefs.length + 1);

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`} preserveAspectRatio="xMidYMid meet">
      {/* header row */}
      <rect x={padX + leftW + gap} y={padY} width={tableW} height={rowH} fill="rgba(15,23,42,0.04)" stroke="rgba(15,23,42,0.2)" strokeWidth={2} />
      {stageValues.map((s, i) => {
        const x = padX + leftW + gap + i * colW;
        return (
          <g key={s}>
            {i > 0 && <line x1={x} y1={padY} x2={x} y2={padY + rowH * (rowDefs.length + 1)} stroke="rgba(15,23,42,0.2)" strokeWidth={2} />}
            <TextBlock x={x + 6} y={padY + 8} w={colW - 10} h={rowH - 8} lines={[String(s).slice(0, 14)]} fontSize={12} fill="#0f172a" fontWeight={800} />
          </g>
        );
      })}
      {rowDefs.map((r, ridx) => {
        const y = padY + rowH * (ridx + 1);
        const c = colors[ridx % Math.max(1, colors.length)] || "#2563eb";
        const bg = hexToRgba(c, 0.10);
        return (
          <g key={r}>
            <rect x={padX} y={y} width={leftW} height={rowH} fill={bg} stroke="rgba(15,23,42,0.2)" strokeWidth={2} />
            <TextBlock x={padX + 8} y={y + 8} w={leftW - 14} h={rowH - 8} lines={[r]} fontSize={12} fill="#0f172a" fontWeight={900} />
            <rect x={padX + leftW + gap} y={y} width={tableW} height={rowH} fill="rgba(15,23,42,0)" stroke="rgba(15,23,42,0.2)" strokeWidth={2} />
            {stageValues.map((sv, i) => {
              const x = padX + leftW + gap + i * colW;
              const keyValue = getInsensitive(data, [r, r.toLowerCase().replace(/\s+/g, "_"), sv]);
              const txt = asArray(keyValue).slice(0, densityTier === 0 ? 1 : 2);
              return (
                <TextBlock key={`${r}-${i}`} x={x + 6} y={y + 8} w={colW - 10} h={rowH - 8} lines={txt.length ? txt : ["—"]} fontSize={11} fill="#0f172a" fontWeight={600} />
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

export default function FrameworkDiagram({ framework, frameworkData, palette, renderDensityTier = 1 }) {
  const colors = normalizePalette(palette);
  const fw = String(framework || "").trim();
  const fwLower = fw.toLowerCase();
  const densityTier = typeof renderDensityTier === "number" ? renderDensityTier : 1;

  // Framework classification. If not recognized, we fall back to tables unless it's in the user’s framework list.
  const isInUserFrameworkList = (() => {
    if (!fwLower) return false;
    const patterns = [
      "swot",
      "pestle",
      "pest ",
      "five forces",
      "porter",
      "bcg",
      "mckinsey",
      "growth-share",
      "ansoff",
      "value chain",
      "vrio",
      "balanced scorecard",
      "blue ocean",
      "dupont",
      "economic value added",
      " eva",
      "eva",
      "break-even",
      "break even",
      "sensitivity",
      "monte carlo",
      "scenario planning",
      "cohort",
      "unit economics",
      "ltv:cac",
      "clv",
      "raci",
      "organizational structure",
      "org chart",
      "process flow",
      "sipoc",
      "five whys",
      "fishbone",
      "cpm",
      "pert",
      "value stream mapping",
      "theory of constraints",
      "toc",
      "customer journey",
      "empathy map",
      "kano",
      "jobs-to-be-done",
      "job-to-be-done",
      "product life cycle",
      "innovation adoption",
      "aarrr",
      "heart",
      "north star",
      "okr",
    ];
    return patterns.some((p) => fwLower.includes(p.trim()));
  })();

  const supported = (() => {
    if (!fwLower) return null;
    if (fwLower.includes("swot")) return "swot";
    if (fwLower.includes("pestle") || fwLower.includes("pest ")) return "pestle";
    if (fwLower.includes("five forces")) return "porter";
    if (fwLower.includes("porter") && fwLower.includes("forces")) return "porter";
    if (fwLower.includes("bcg") || fwLower.includes("growth-share")) return "bcg";
    if (fwLower.includes("mckinsey") && fwLower.includes("ge")) return "ge_mckinsey";
    if (fwLower.includes("mckinsey")) return "ge_mckinsey";
    if (fwLower.includes("ansoff")) return "ansoff";
    if (fwLower.includes("value chain")) return "value_chain";
    if (fwLower.includes("vrio")) return "vrio";
    if (fwLower.includes("balanced scorecard")) return "balanced_scorecard";
    if (fwLower.includes("blue ocean")) return "blue_ocean";
    if (fwLower.includes("scenario planning")) return "scenario_planning";
    if (fwLower.includes("aarr") || fwLower.includes("aarrr")) return "funnel";
    if (fwLower.includes("empathy map")) return "empathy";
    if (fwLower.includes("okr")) return "okr";
    if (fwLower.includes("raci")) return "raci";
    if (fwLower.includes("sipoc")) return "sipoc";
    if (fwLower.includes("organizational structure") || fwLower.includes("org chart")) return "org_chart";
    if (fwLower.includes("fishbone")) return "fishbone";
    if (fwLower.includes("5 whys") || fwLower.includes("five whys")) return "five_whys";
    if (fwLower.includes("process flow")) return "process_flow";
    if (fwLower.includes("customer journey")) return "journey";
    if (fwLower.includes("critical path") || fwLower.includes("cpm")) return "cpm";
    if (fwLower.includes("pert")) return "pert";
    if (fwLower.includes("value stream mapping")) return "value_stream";
    if (fwLower.includes("heart")) return "heart";
    if (fwLower.includes("north star")) return "north_star";
    if (fwLower.includes("kano")) return "kano";
    if (fwLower.includes("jobs-to-be-done") || fwLower.includes("job-to-be-done")) return "jtbd";
    if (fwLower.includes("product life cycle")) return "product_lifecycle";
    if (fwLower.includes("innovation adoption")) return "innovation_adoption";
    return null;
  })();

  let content = null;

  // Render supported frameworks using absolute-positioned SVG primitives.
  if (supported) {
    switch (supported) {
      case "swot":
        content = <FrameworkSWOT data={frameworkData} colors={colors} densityTier={densityTier} />;
        break;
      case "pestle":
        content = <FrameworkPESTLE data={frameworkData} colors={colors} densityTier={densityTier} />;
        break;
      case "porter":
        content = (
          <FrameworkPorter5Forces
            data={frameworkData}
            colors={colors.length ? colors : ["#2563eb", "#06b6d4", "#8b5cf6", "#f59e0b", "#10b981"]}
            densityTier={densityTier}
          />
        );
        break;
      case "bcg":
        content = <FrameworkBCG data={frameworkData} colors={colors} densityTier={densityTier} />;
        break;
      case "ansoff":
        content = <FrameworkAnsoff data={frameworkData} colors={colors} densityTier={densityTier} />;
        break;
      case "value_chain":
        content = <FrameworkValueChain data={frameworkData} colors={colors} densityTier={densityTier} />;
        break;
      case "vrio":
        content = <FrameworkVRIO data={frameworkData} colors={colors.length ? colors : ["#2563eb", "#06b6d4", "#8b5cf6"]} />;
        break;
      case "balanced_scorecard":
        content = <FrameworkBalancedScorecard data={frameworkData} colors={colors} densityTier={densityTier} />;
        break;
      case "ge_mckinsey":
        // Not implemented yet as a 3x3 primitive grid; degrade to table until we add it.
        content = renderTableFallback({ framework: fw, data: frameworkData });
        break;
      case "scenario_planning":
        content = <FrameworkScenarioPlanning data={frameworkData} colors={colors} densityTier={densityTier} />;
        break;
      case "funnel":
        content = <FrameworkFunnelSimple data={frameworkData} colors={colors} densityTier={densityTier} />;
        break;
      case "empathy":
        content = <FrameworkEmpathyMap data={frameworkData} colors={colors} densityTier={densityTier} />;
        break;
      case "okr":
        content = <FrameworkOKR data={frameworkData} colors={colors} densityTier={densityTier} />;
        break;
      case "raci":
        content = (
          <FrameworkTableGrid
            data={frameworkData}
            colors={colors}
            densityTier={densityTier}
            defaultColumns={["Activity", "Role 1", "Role 2", "Role 3", "Role 4"]}
            maxRows={10}
          />
        );
        break;
      case "sipoc":
        content = (
          <FrameworkTableGrid
            data={frameworkData}
            colors={colors}
            densityTier={densityTier}
            defaultColumns={["Suppliers", "Inputs", "Process", "Outputs", "Customers"]}
            maxRows={8}
          />
        );
        break;
      case "org_chart":
        content = <FrameworkOrgChart data={frameworkData} colors={colors} />;
        break;
      case "fishbone":
        content = <FrameworkFishboneSafe data={frameworkData} colors={colors} densityTier={densityTier} />;
        break;
      case "five_whys":
        content = <FrameworkFiveWhys data={frameworkData} colors={colors} />;
        break;
      case "process_flow":
        content = <FrameworkFlowSteps data={frameworkData} colors={colors} densityTier={densityTier} titleKey="Step" />;
        break;
      case "journey":
        content = <FrameworkJourneyRows data={frameworkData} colors={colors} densityTier={densityTier} />;
        break;
      case "cpm":
      case "pert":
        content = <FrameworkFlowSteps data={frameworkData} colors={colors} densityTier={densityTier} titleKey="Task" />;
        break;
      case "value_stream":
        content = <FrameworkJourneyRows data={frameworkData} colors={colors} densityTier={densityTier} />;
        break;
      case "heart":
      case "north_star":
      case "kano":
      case "jtbd":
      case "product_lifecycle":
      case "innovation_adoption":
      case "blue_ocean":
        content = <FrameworkPrimitiveCards data={frameworkData} colors={colors} densityTier={densityTier} />;
        break;
      default:
        content = renderTableFallback({ framework: fw, data: frameworkData });
        break;
    }
  } else if (frameworkData) {
    // If it’s in the user-provided framework list, always show a primitive-safe renderer so the slide never degrades to naked JSON.
    if (isInUserFrameworkList) {
      const keysCount =
        frameworkData && typeof frameworkData === "object" && !Array.isArray(frameworkData) ? Object.keys(frameworkData).length : (Array.isArray(frameworkData) ? frameworkData.length : 0);
      const densityFromData = keysCount >= 12 ? 0 : keysCount >= 6 ? 1 : 2;
      const densityFinal = Math.min(densityTier, densityFromData);
      content = <FrameworkPrimitiveCards data={frameworkData} colors={colors} densityTier={densityFinal} />;
    } else {
      content = renderTableFallback({ framework: fw, data: frameworkData });
    }
  } else {
    content = <Text size="xs" c="dimmed">Get Premium to view this!</Text>;
  }

  return (
    <div style={{ width: "100%", height: "100%", maxWidth: "100%", maxHeight: "100%", minHeight: 0, overflow: "hidden" }}>
      {content}
    </div>
  );
}