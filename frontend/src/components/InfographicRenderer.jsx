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
  if (t.includes('heatmap') || t.includes('risk heatmap')) {
    return (
      <div ref={containerRef}>
        <ChartRenderer type="Heatmap" data={data?.matrix || data} palette={palette} />
        <div style={{ marginTop: 8 }} />
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

  // Generic fallback: title + bullets or JSON
  return (
    <div ref={containerRef}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{type}</div>
      {data && (Array.isArray(data) ? (
        <ul>{data.map((d,i)=>(<li key={i}>{String(d)}</li>))}</ul>
      ) : typeof data === 'object' ? (
        <pre style={{ fontSize: 11, whiteSpace: 'pre-wrap' }}>{JSON.stringify(data, null, 2)}</pre>
      ) : (
        <div>{String(data)}</div>
      ))}
        <div style={{ marginTop: 8 }} />
    </div>
  );
}
