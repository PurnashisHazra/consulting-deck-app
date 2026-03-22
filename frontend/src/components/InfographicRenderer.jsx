import React, { useRef } from 'react';
import ChartRenderer from './ChartRenderer'; // reuse ChartRenderer for heatmap and similar types

// Lightweight infographic renderer that provides simple visualizations for a variety of
// consulting-style infographics. These are intentionally simple fallbacks suitable for
// slide previews and exports; more advanced interactive visuals can be added later.

function Box({ children, color = '#e5e7eb', accent = '#374151', style = {} }) {
  return (
    <div style={{ border: `1px solid ${accent}`, background: color, borderRadius: 6, padding: 8, boxSizing: 'border-box', ...style }}>
      {children}
    </div>
  );
}

export default function InfographicRenderer({ type, data, palette = ['#2563eb', '#06b6d4', '#8b5cf6', '#f59e0b'] }) {
  const t = (type || '').toLowerCase();
  const tCompact = t.replace(/\s+/g, '');
  const containerRef = useRef(null);
  // Renderers for a number of infographic types. These are minimal SVG/HTML fallbacks.
  // SWOT
  if (t.includes('swot')) {
    const sw = data || { strengths: ['—'], weaknesses: ['—'], opportunities: ['—'], threats: ['—'] };
    return (
      <div ref={containerRef} style={{ width: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Box color="#ffffff"><strong>Strengths</strong><ul>{(sw.strengths||[]).map((s,i)=>(<li key={i}>{s}</li>))}</ul></Box>
          <Box color="#ffffff"><strong>Weaknesses</strong><ul>{(sw.weaknesses||[]).map((s,i)=>(<li key={i}>{s}</li>))}</ul></Box>
          <Box color="#ffffff"><strong>Opportunities</strong><ul>{(sw.opportunities||[]).map((s,i)=>(<li key={i}>{s}</li>))}</ul></Box>
          <Box color="#ffffff"><strong>Threats</strong><ul>{(sw.threats||[]).map((s,i)=>(<li key={i}>{s}</li>))}</ul></Box>
        </div>
        <div style={{ marginTop: 8 }} />
      </div>
    );
  }

  // Venn
  if (t.includes('venn')) {
    return (
      <div ref={containerRef} style={{ width: 220 }}>
        <svg width="220" height="140" viewBox="0 0 220 140">
          <circle cx="80" cy="70" r="50" fill="rgba(66,133,244,0.28)" />
          <circle cx="140" cy="70" r="50" fill="rgba(244,180,0,0.28)" />
        </svg>
        <div style={{ marginTop: 8 }} />
      </div>
    );
  }

  // Timeline / Roadmap
  if (t.includes('timeline') || t.includes('roadmap') || t.includes('journey')) {
    const events = (data && data.events) || (Array.isArray(data) ? data : ['Phase 1', 'Phase 2', 'Phase 3']);
    return (
      <div ref={containerRef} style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {events.map((ev, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ width: 12, height: 12, borderRadius: 6, background: palette[i % palette.length], margin: '0 auto' }} />
              <div style={{ fontSize: 12, marginTop: 6 }}>{ev}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 8 }} />
      </div>
    );
  }

  // Sankey (simple two-column arrows)
  if (t.includes('sankey')) {
    const flows = data?.flows || [{ from: 'A', to: 'X', value: 40 }, { from: 'B', to: 'Y', value: 60 }];
    return (
      <div ref={containerRef} style={{ width: '100%' }}>
        <svg width="300" height="140" viewBox="0 0 300 140">
          {flows.map((f, i) => {
            const y = 20 + i * 30;
            const h = Math.max(8, Math.min(20, (f.value || 10) / 5));
            return (
              <g key={i}>
                <rect x={10} y={y} width={60} height={h} fill={palette[i%palette.length]} />
                <rect x={230} y={y} width={60} height={h} fill={palette[(i+1)%palette.length]} />
                <path d={`M70 ${y + h/2} C120 ${y + h/2} 180 ${y + h/2} 230 ${y + h/2}`} stroke={palette[i%palette.length]} strokeWidth={h} fill="none" strokeLinecap="round" />
              </g>
            );
          })}
        </svg>
        <div style={{ marginTop: 8 }} />
      </div>
    );
  }

  // Chord (simple arcs)
  if (t.includes('chord')) {
    const n = 6;
    const r = 60;
    const cx = 80, cy = 80;
    const angles = [...Array(n)].map((_,i)=> (i/n)*Math.PI*2);
    return (
      <div ref={containerRef}>
        <svg width={180} height={180} viewBox={`0 0 180 180`}>
          <g transform={`translate(${cx},${cy})`}>
            {angles.map((a,i)=>(<circle key={i} cx={Math.cos(a)*r} cy={Math.sin(a)*r} r={8} fill={palette[i%palette.length]} />))}
            {angles.map((a,i)=>{
              const j = (i+2)%n; const a2 = angles[j];
              return <path key={i} d={`M ${Math.cos(a)*r} ${Math.sin(a)*r} Q 0 0 ${Math.cos(a2)*r} ${Math.sin(a2)*r}`} stroke="rgba(0,0,0,0.08)" fill="none" />
            })}
          </g>
        </svg>
        <div style={{ marginTop: 8 }} />
      </div>
    );
  }

  // Fishbone (Ishikawa) simple lines
  if (t.includes('fishbone') || t.includes('ishikawa')) {
    const causes = data?.causes || ['People','Process','Technology','Environment'];
    return (
      <div ref={containerRef} style={{ width: '100%' }}>
        <svg width={300} height={140} viewBox="0 0 300 140">
          <path d="M20 70 L230 70" stroke="#999" strokeWidth={4} />
          <polygon points="230,60 260,70 230,80" fill="#777" />
          {causes.map((c,i)=>{
            const y = 30 + i*25;
            return (<g key={i}><path d={`M${50+i*20} ${y} L${200} ${70}`} stroke="#bbb" strokeWidth={3} /><text x={10} y={y+4} fontSize={10}>{c}</text></g>);
          })}
        </svg>
        <div style={{ marginTop: 8 }} />
      </div>
    );
  }

  // Heatmap reuse via ChartRenderer
  if (/heat\s*map/i.test(t) || tCompact.includes('riskheatmap')) {
    const normalizeHeatmap = (d) => {
      if (d && Array.isArray(d.matrix)) return { matrix: d.matrix };
      if (Array.isArray(d) && d.length > 0 && Array.isArray(d[0])) return { matrix: d };
      if (Array.isArray(d)) {
        const nums = d.map((x) => Number(x?.value ?? x ?? 0)).map((n) => (Number.isFinite(n) ? n : 0));
        return { matrix: [nums] };
      }
      if (d && Array.isArray(d.values)) return { matrix: [d.values.map((n) => Number(n) || 0)] };
      return { matrix: [[0]] };
    };
    return (
      <div ref={containerRef}>
        <ChartRenderer type="Heatmap" data={normalizeHeatmap(data)} palette={palette} />
        <div style={{ marginTop: 8 }} />
      </div>
    );
  }

  // Radar / Spider chart
  if (tCompact.includes('radar(spider)chart') || tCompact.includes('radar') || tCompact.includes('spiderchart')) {
    const normalizeRadar = (d) => {
      if (!d) return [];
      if (d.labels && Array.isArray(d.labels) && d.values && Array.isArray(d.values)) {
        return d.labels.map((label, i) => ({ label: String(label), value: Number(d.values[i] ?? 0) }));
      }
      if (Array.isArray(d)) {
        return d.map((x, i) => ({ label: String(x?.label ?? x?.name ?? i + 1), value: Number(x?.value ?? x ?? 0) }));
      }
      return [];
    };
    return (
      <div ref={containerRef}>
        <ChartRenderer type="Radar Chart" data={normalizeRadar(data)} palette={palette} />
        <div style={{ marginTop: 8 }} />
      </div>
    );
  }

  // Stakeholder map (2x2 influence-interest)
  if (tCompact.includes('stakeholdermap') || tCompact.includes('stakeholder')) {
    const items = (data?.stakeholders || data?.items || []).map((s) => {
      if (typeof s === 'string') return { name: s, power: 40, interest: 60 };
      return {
        name: s?.name || s?.label || s?.title || 'Stakeholder',
        power: Number(s?.power ?? s?.influence ?? 40),
        interest: Number(s?.interest ?? s?.y ?? 60),
      };
    });
    const groups = { hh: [], hl: [], lh: [], ll: [] };
    items.forEach((x) => {
      const hp = x.power >= 50;
      const hi = x.interest >= 50;
      if (hp && hi) groups.hh.push(x.name);
      else if (hp && !hi) groups.hl.push(x.name);
      else if (!hp && hi) groups.lh.push(x.name);
      else groups.ll.push(x.name);
    });
    const q = (title, arr, c) => (
      <div style={{ border: `1px solid ${c}`, borderRadius: 8, padding: 8, background: `${c}14`, minHeight: 72 }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{title}</div>
        {arr.length ? <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11 }}>{arr.slice(0, 5).map((v, i) => <li key={i}>{v}</li>)}</ul> : <div style={{ fontSize: 11, color: '#6b7280' }}>—</div>}
      </div>
    );
    return (
      <div ref={containerRef} style={{ width: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {q('High Power / High Interest', groups.hh, palette[0] || '#2563eb')}
          {q('High Power / Low Interest', groups.hl, palette[1] || '#06b6d4')}
          {q('Low Power / High Interest', groups.lh, palette[2] || '#8b5cf6')}
          {q('Low Power / Low Interest', groups.ll, palette[3] || '#f59e0b')}
        </div>
      </div>
    );
  }

  // Ecosystem map (simple radial map)
  if (tCompact.includes('ecosystemmap') || tCompact.includes('ecosystem')) {
    const nodes = (data?.nodes || data?.segments || data?.sets || []).map((n, i) => typeof n === 'string' ? n : (n?.name || n?.label || `Node ${i+1}`));
    const edges = data?.edges || [];
    const width = 320, height = 160, cx = width / 2, cy = height / 2 + 4, r = 52;
    const pos = (i, total) => {
      const a = ((Math.PI * 2) * i) / Math.max(1, total) - Math.PI / 2;
      return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
    };
    return (
      <div ref={containerRef} style={{ width: '100%' }}>
        <svg width="100%" height="140" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
          <circle cx={cx} cy={cy} r={18} fill="#111827" opacity={0.08} />
          <text x={cx} y={cy + 5} textAnchor="middle" fontSize="12" fontWeight="700">Ecosystem</text>
          {edges.map((e, i) => {
            const fi = nodes.findIndex((n) => String(n) === String(e?.from || e?.source));
            const ti = nodes.findIndex((n) => String(n) === String(e?.to || e?.target));
            if (fi < 0 || ti < 0) return null;
            const p1 = pos(fi, nodes.length), p2 = pos(ti, nodes.length);
            return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={palette[i % palette.length]} opacity={0.35} />;
          })}
          {nodes.map((n, i) => {
            const p = pos(i, nodes.length);
            const c = palette[i % palette.length] || '#2563eb';
            return (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r={12} fill={c} opacity={0.2} />
                <circle cx={p.x} cy={p.y} r={6} fill={c} />
                <text x={p.x} y={p.y + 24} textAnchor="middle" fontSize="10">{String(n).slice(0, 14)}</text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  // Matrix / 2x2 grid (includes BCG, Ansoff, 2x2)
  if (t.includes('matrix') || t.includes('bcg') || t.includes('ansoff') || t.includes('2x2')) {
    const labels = data?.labels || [['Top-Left','Top-Right'],['Bottom-Left','Bottom-Right']];
    return (
      <div ref={containerRef} style={{ width: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {labels.flat().map((l,i)=> (<Box key={i} color="#fff" style={{ padding: 8 }}>{l}</Box>))}
        </div>
        <div style={{ marginTop: 8 }} />
      </div>
    );
  }

  // Flowchart (steps + optional decision nodes)
  if (t.includes('flowchart') || t.includes('flow chart') || t.includes('process flow')) {
    const rawSteps = Array.isArray(data?.steps)
      ? data.steps
      : (Array.isArray(data?.nodes) ? data.nodes : (Array.isArray(data) ? data : ['Start', 'Analyze', 'Decide', 'Execute']));
    const steps = rawSteps.slice(0, 6).map((s, i) => {
      if (typeof s === 'string') return { label: s, type: 'process' };
      return {
        label: s?.label || s?.name || s?.title || `Step ${i + 1}`,
        type: String(s?.type || 'process').toLowerCase().includes('decision') ? 'decision' : 'process',
      };
    });
    return (
      <div ref={containerRef} style={{ width: '100%' }}>
        <svg width="100%" height="170" viewBox="0 0 360 170" preserveAspectRatio="xMidYMid meet">
          {steps.map((st, i) => {
            const n = Math.max(1, steps.length);
            const colW = 320 / n;
            const x = 20 + i * colW + 4;
            const y = 48;
            const w = Math.max(44, colW - 10);
            const h = 56;
            const c = palette[i % palette.length] || '#2563eb';
            return (
              <g key={i}>
                {st.type === 'decision' ? (
                  <polygon points={`${x + w / 2},${y} ${x + w},${y + h / 2} ${x + w / 2},${y + h} ${x},${y + h / 2}`} fill={`${c}22`} stroke={c} />
                ) : (
                  <rect x={x} y={y} width={w} height={h} rx={8} ry={8} fill={`${c}20`} stroke={c} />
                )}
                <text x={x + w / 2} y={y + h / 2 + 4} textAnchor="middle" fontSize="10" fontWeight="700" fill="#111827">
                  {String(st.label).slice(0, 16)}
                </text>
                {i < steps.length - 1 && (
                  <>
                    <line x1={x + w + 2} y1={y + h / 2} x2={x + w + Math.max(8, colW - w - 8)} y2={y + h / 2} stroke="#9ca3af" strokeWidth="1.5" />
                    <polygon points={`${x + w + Math.max(8, colW - w - 8)},${y + h / 2} ${x + w + Math.max(8, colW - w - 12)},${y + h / 2 - 3} ${x + w + Math.max(8, colW - w - 12)},${y + h / 2 + 3}`} fill="#9ca3af" />
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  // Impact Diagram Q-A (Question -> Answer branches with impact score/label)
  if (t.includes('impact diagram') || tCompact.includes('impactdiagramqa') || (t.includes('impact') && (t.includes('q-a') || t.includes('qa') || t.includes('question')))) {
    const q = String(data?.question || data?.q || data?.prompt || 'Key Question').slice(0, 64);
    const answersRaw = Array.isArray(data?.answers)
      ? data.answers
      : (Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : [
        { answer: 'Option A', impact: 'High' },
        { answer: 'Option B', impact: 'Medium' },
        { answer: 'Option C', impact: 'Low' },
      ]));
    const answers = answersRaw.slice(0, 4).map((a, i) => {
      if (typeof a === 'string') return { answer: a, impact: i === 0 ? 'High' : i === 1 ? 'Medium' : 'Low' };
      return {
        answer: a?.answer || a?.label || a?.name || `Option ${i + 1}`,
        impact: String(a?.impact || a?.score || a?.priority || 'Medium'),
      };
    });
    return (
      <div ref={containerRef} style={{ width: '100%' }}>
        <svg width="100%" height="180" viewBox="0 0 360 180" preserveAspectRatio="xMidYMid meet">
          <rect x="120" y="10" width="120" height="34" rx="8" fill="#11182712" stroke="#4b5563" />
          <text x="180" y="31" textAnchor="middle" fontSize="11" fontWeight="700" fill="#111827">{q}</text>
          {answers.map((a, i) => {
            const boxW = 132;
            const boxH = 38;
            const x = i % 2 === 0 ? 24 : 204;
            const y = 64 + Math.floor(i / 2) * 52;
            const c = palette[i % palette.length] || '#2563eb';
            return (
              <g key={i}>
                <line x1="180" y1="44" x2={x + boxW / 2} y2={y} stroke="#9ca3af" strokeWidth="1.2" />
                <rect x={x} y={y} width={boxW} height={boxH} rx="8" fill={`${c}18`} stroke={c} />
                <text x={x + 8} y={y + 15} fontSize="10" fontWeight="700" fill="#111827">{String(a.answer).slice(0, 20)}</text>
                <text x={x + 8} y={y + 29} fontSize="9" fill="#374151">Impact: {String(a.impact).slice(0, 16)}</text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  // Treemap / Market Map fallback
  if (t.includes('tree') || t.includes('treemap') || t.includes('market map') || t.includes('market')) {
    const segs = (data && data.segments) || [{ name: 'A', value: 50 }, { name: 'B', value: 30 }, { name: 'C', value: 20 }];
    const total = segs.reduce((s, x) => s + (x.value || 0), 0) || 1;
    return (
      <div ref={containerRef} style={{ display: 'flex', gap: 6 }}>
        {segs.map((s, i) => (
          <div key={i} style={{ flex: (s.value||0)/total, background: palette[i % palette.length], color: '#fff', padding: 8 }}>{s.name}<div style={{ fontSize: 10 }}>{s.value}</div></div>
        ))}
      </div>
    );
  }

  // Generic fallback: render compact table (instead of raw JSON blob)
  const DataTable = ({ d }) => {
    if (d == null) return <div style={{ fontSize: 12, color: '#6b7280' }}>—</div>;
    if (Array.isArray(d)) {
      if (d.length === 0) return <div style={{ fontSize: 12, color: '#6b7280' }}>—</div>;
      const first = d[0];
      if (first && typeof first === 'object' && !Array.isArray(first)) {
        const keys = Object.keys(first).slice(0, 6);
        return (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead><tr>{keys.map((k) => <th key={k} style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: '6px 8px', background: '#f9fafb' }}>{k}</th>)}</tr></thead>
              <tbody>
                {d.slice(0, 8).map((row, i) => (
                  <tr key={i}>{keys.map((k) => <td key={k} style={{ borderBottom: '1px solid #f3f4f6', padding: '6px 8px' }}>{typeof row?.[k] === 'object' ? JSON.stringify(row?.[k]).slice(0, 120) : String(row?.[k] ?? '')}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      return <ul style={{ margin: 0, paddingLeft: 16 }}>{d.slice(0, 10).map((x, i) => <li key={i} style={{ fontSize: 11 }}>{String(x)}</li>)}</ul>;
    }
    if (typeof d === 'object') {
      const keys = Object.keys(d).slice(0, 14);
      return (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <tbody>
              {keys.map((k) => (
                <tr key={k}>
                  <td style={{ width: '40%', borderBottom: '1px solid #f3f4f6', padding: '6px 8px', fontWeight: 700, background: '#f9fafb' }}>{k}</td>
                  <td style={{ borderBottom: '1px solid #f3f4f6', padding: '6px 8px' }}>{typeof d[k] === 'object' ? JSON.stringify(d[k]).slice(0, 200) : String(d[k] ?? '')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    return <div style={{ fontSize: 12 }}>{String(d)}</div>;
  };

  return (
    <div ref={containerRef}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{type}</div>
      <DataTable d={data} />
      <div style={{ marginTop: 8 }} />
    </div>
  );
}
