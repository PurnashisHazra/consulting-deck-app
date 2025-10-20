import React from "react";
import { readableTextColor, ensureHex, readableTextOnAlphaBg } from '../utils/colorUtils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import { Bar as ChartJSBar, Line as ChartJSLine, Pie as ChartJSPie, Doughnut as ChartJSDoughnut, Radar as ChartJSRadar, PolarArea as ChartJSPolarArea, Bubble as ChartJSBubble, Scatter as ChartJSScatter } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, RadarController, PolarAreaController, BubbleController, ScatterController, Tooltip as ChartJSTooltip, Legend as ChartJSLegend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, RadarController, PolarAreaController, BubbleController, ScatterController, ChartJSTooltip, ChartJSLegend);

const dummyData = {
  "Bar Chart": [
    { label: "A", value: 100 },
    { label: "B", value: 80 },
    { label: "C", value: 120 },
  ],
  "Line Chart": [
    { label: "A", value: 100 },
    { label: "B", value: 80 },
    { label: "C", value: 120 },
  ],
  "Pie Chart": [
    { label: "A", value: 100 },
    { label: "B", value: 80 },
    { label: "C", value: 120 },
  ],
  "Radar Chart": { labels: ["A", "B", "C"], values: [65, 59, 90] },
  "Polar Area Chart": { labels: ["A", "B", "C"], values: [11, 16, 7] },
  "Bubble Chart": { labels: ["A", "B", "C"], datasets: [{ label: "Bubbles", data: [{ x: 10, y: 20, r: 10 }, { x: 15, y: 10, r: 15 }, { x: 7, y: 25, r: 7 }] }] },
  "Scatter Plot": { labels: ["A", "B", "C"], datasets: [{ label: "Scatter", data: [{ x: 10, y: 20 }, { x: 15, y: 10 }, { x: 7, y: 25 }] }] },
  "Doughnut Chart": { labels: ["A", "B", "C"], values: [30, 40, 30] },
  "Waterfall Chart": {
    steps: ["Start", "Add", "Subtract", "End"],
    values: [100, 50, -30, 120]
  },
  "Gantt Chart": {
    labels: ["Task 1", "Task 2", "Task 3", "Task 4"],
    dataset1: [50, 150, 300, 400],
    dataset2: [100, 100, 200, 200],
    colors: ['red', 'green', 'blue', 'yellow']
  },
};

const DEFAULT_COLORS = ["#2563eb", "#06b6d4", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444", "#fb7185"];
// Top-level alias for legacy helpers that referenced COLORS
const COLORS = DEFAULT_COLORS;

function normalizePalette(p) {
  if (!p) return DEFAULT_COLORS;
  if (Array.isArray(p) && p.length > 0) return p.map(x => String(x).trim());
  return DEFAULT_COLORS;
}

function normalizeChartData(type, data) {
  if (!data) return dummyData[type] || dummyData["Bar Chart"];
  if (Array.isArray(data)) return data;
  if (data.labels && data.values && Array.isArray(data.labels) && Array.isArray(data.values)) {
    return data.labels.map((label, idx) => ({ label, value: data.values[idx] }));
  }
  if (data.steps && data.values) {
    return data.steps.map((step, idx) => ({ label: step, value: data.values[idx] }));
  }
  if (data.x && data.y) {
    return data.x.map((x, idx) => ({ label: x, value: data.y[idx] }));
  }
  if (data.segments && Array.isArray(data.segments)) {
    return data.segments.map((seg) => ({ label: seg.name || seg.label, value: seg.value }));
  }
  return dummyData[type] || dummyData["Bar Chart"];
}

// Chart.js supported types mapping
const chartjsTypeMap = {
  "Bar Chart": "bar",
  "Line Chart": "line",
  "Pie Chart": "pie",
  "Doughnut Chart": "doughnut",
  "Radar Chart": "radar",
  "Polar Area Chart": "polarArea",
  "Bubble Chart": "bubble",
  "Scatter Plot": "scatter",
  "Waterfall Chart": "bar", // Use floating bars
  "Gantt Chart": "bar", // Use stacked horizontal bar
  "Stacked Bar Chart": "bar",
};

function getChartJSComponent(type) {
  switch (type) {
    case "Bar Chart": return ChartJSBar;
    case "Line Chart": return ChartJSLine;
    case "Pie Chart": return ChartJSPie;
    case "Doughnut Chart": return ChartJSDoughnut;
    case "Radar Chart": return ChartJSRadar;
    case "Polar Area Chart": return ChartJSPolarArea;
    case "Bubble Chart": return ChartJSBubble;
    case "Scatter Plot": return ChartJSScatter;
    case "Waterfall Chart": return ChartJSBar;
    case "Gantt Chart": return ChartJSBar;
    case "Stacked Bar Chart": return ChartJSBar;
    default: return null;
  }
}

function getChartJSData(type, data) {
  // Convert normalized data to Chart.js format
  if (["Bar Chart", "Line Chart"].includes(type)) {
    const arr = normalizeChartData(type, data);
    return {
      labels: arr.map(d => d.label),
      datasets: [{
        label: type,
        data: arr.map(d => d.value),
        backgroundColor: '#4169e1',
        borderColor: '#4169e1',
        borderWidth: 2,
        fill: type === "Line Chart"
      }]
    };
  }
  if (type === "Gantt Chart") {
    // Use stacked horizontal bar chart for Gantt
    // Example dummy data if not provided
    let labels = (data && data.labels && Array.isArray(data.labels)) ? data.labels : ["1", "2", "3", "4"];
    let dataset1 = (data && data.dataset1 && Array.isArray(data.dataset1)) ? data.dataset1 : [50, 150, 300, 400];
    let dataset2 = (data && data.dataset2 && Array.isArray(data.dataset2)) ? data.dataset2 : [100, 100, 200, 200];
    let colors = (data && data.colors && Array.isArray(data.colors)) ? data.colors : ['red', 'green', 'blue', 'yellow'];
    return {
      labels,
      datasets: [
        {
          data: dataset1,
          backgroundColor: "rgba(63,103,126,0)",
          hoverBackgroundColor: "rgba(50,90,100,0)"
        },
        {
          data: dataset2,
          backgroundColor: colors,
        }
      ]
    };
  }
  if (/stack/i.test(type)) {
    // Build stacked vertical bar chart
    const labels = (data && (data.labels || data.x || data.categories)) ? (data.labels || data.x || data.categories) : (Array.isArray(data) ? data.map(d => d.label) : ["A", "B", "C"]);
    let datasets = [];
    // If user provided Chart.js-style datasets, use them
    if (data && Array.isArray(data.datasets) && data.datasets.length > 0) {
      datasets = data.datasets.map((ds, i) => ({
        ...ds,
        backgroundColor: ds.backgroundColor || COLORS[i % COLORS.length],
        borderColor: ds.borderColor || ds.backgroundColor || COLORS[i % COLORS.length],
      }));
    } else if (data && Array.isArray(data.series) && data.series.length > 0) {
      // Support { labels: [...], series: [{ name, values: [...] }, ...] }
      datasets = data.series.map((s, i) => ({
        label: s.name || `Series ${i + 1}`,
        data: s.values || [],
        backgroundColor: (s.color || COLORS[i % COLORS.length]),
      }));
    } else if (data && Array.isArray(data.values) && Array.isArray(data.values[0])) {
      // Support values as array of arrays: [[s1...], [s2...]] where each inner is a dataset per label
      datasets = data.values.map((vals, i) => ({ label: `Series ${i + 1}`, data: vals, backgroundColor: COLORS[i % COLORS.length] }));
    } else if (Array.isArray(data)) {
      // single series fallback
      datasets = [{ label: type, data: data.map(d => d.value), backgroundColor: COLORS[0] }];
    } else if (data && data.labels && data.values && Array.isArray(data.values[0]) ) {
      // labels + values as array of arrays
      datasets = data.values.map((vals, i) => ({ label: `Series ${i + 1}`, data: vals, backgroundColor: COLORS[i % COLORS.length] }));
    } else if (data && data.labels && data.datasets) {
      datasets = data.datasets.map((ds, i) => ({ ...ds, backgroundColor: ds.backgroundColor || COLORS[i % COLORS.length] }));
    } else {
      // Try to create two series by splitting values if possible
      const arr = normalizeChartData("Bar Chart", data);
      if (arr && arr.length > 0) {
        datasets = [{ label: "Series 1", data: arr.map(d => d.value), backgroundColor: COLORS[0] }];
      }
    }
    return { labels, datasets };
  }
  if (type === "Waterfall Chart") {
    // Proper waterfall formatting: compute base (starting y) and height for each bar
    const values = Array.isArray(data?.values) ? data.values : (Array.isArray(data) ? data.map(d => d.value || 0) : [100, 50, -30, 120]);
    const labels = Array.isArray(data?.steps) ? data.steps : (Array.isArray(data?.labels) ? data.labels : values.map((_, i) => `Step ${i+1}`));
    // Build cumulative baseline and bar heights
    let cumulative = 0;
    const bases = [];
    const heights = [];
    const bg = [];
    for (let i = 0; i < values.length; i++) {
      const v = Number(values[i]) || 0;
      // if positive, bar starts at cumulative and height is v
      // if negative, bar starts at cumulative + v and height is Math.abs(v)
      if (v >= 0) {
        bases.push(cumulative);
        heights.push(v);
        bg.push('#10B981'); // green for positive
        cumulative += v;
      } else {
        bases.push(cumulative + v);
        heights.push(Math.abs(v));
        bg.push('#EF4444'); // red for negative
        cumulative += v;
      }
    }

    // Chart.js floating bars are implemented by datasets with 'data' objects {x: label, y: value} when using bar
    // We'll create two stacked datasets: one invisible base (transparent), then visible heights
    return {
      labels,
      datasets: [
        {
          label: 'base',
          data: bases,
          backgroundColor: 'rgba(0,0,0,0)',
          stack: 'waterfall'
        },
        {
          label: 'change',
          data: heights,
          backgroundColor: bg,
          stack: 'waterfall'
        }
      ]
    };
  }
  if (["Pie Chart", "Doughnut Chart", "Radar Chart", "Polar Area Chart"].includes(type)) {
    const arr = normalizeChartData(type, data);
    return {
      labels: arr.map(d => d.label),
      datasets: [{
        label: type,
        data: arr.map(d => d.value),
        backgroundColor: COLORS,
      }]
    };
  }
  if (type === "Bubble Chart" && data && data.datasets) {
    return data;
  }
  if (type === "Scatter Plot" && data && data.datasets) {
    return data;
  }
  return {};
}


export default function ChartRenderer({
  type,
  data,
  xAxisTitle,
  yAxisTitle,
  legend,
  inferences,
  palette // optional array of hex strings
}) {
  const COLORS = normalizePalette(palette);
  const getColor = (i) => COLORS[i % COLORS.length];
  const meta = {
    xAxisTitle: xAxisTitle || data?.xAxisTitle || "Not available",
    yAxisTitle: yAxisTitle || data?.yAxisTitle || "Not available",
    legend: legend || data?.legend || "Not available",
    inferences: inferences || data?.inferences || [],
  };
  const plotData = normalizeChartData(type, data);
  // Supported by Recharts
  const rechartsTypes = ["Bar Chart", "Line Chart", "Pie Chart"];
  // Supported by Chart.js
  const chartjsTypes = Object.keys(chartjsTypeMap);
  // Render logic
  let chartContent = null;
  if (rechartsTypes.includes(type)) {
    chartContent = (
      type === "Bar Chart" ? (
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={Array.isArray(plotData) && plotData.length > 0 ? plotData : dummyData["Bar Chart"]} margin={{ top: 30, right: 40, left: 50, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              label={{ value: meta.xAxisTitle, position: "insideBottom", offset: -10, style: { fontSize: 13, fontWeight: 600, fill: '#444' } }}
              tick={{ fontSize: 12, angle: -25, dx: -5, dy: 10, textAnchor: 'end', fill: '#444', fontWeight: 500 }}
              interval={0}
              height={60}
            />
            <YAxis
              label={{ value: meta.yAxisTitle, angle: -90, position: "insideLeft", style: { fontSize: 13, fontWeight: 600, fill: '#444' } }}
              tick={{ fontSize: 12, fill: '#444', fontWeight: 500 }}
            />
            <Tooltip wrapperStyle={{ fontSize: 13, fontFamily: 'Inter, Arial, sans-serif' }} />
            <Legend wrapperStyle={{ fontSize: 13, fontWeight: 600, color: '#4169e1' }} />
            <Bar dataKey="value" barSize={32}>
              {(Array.isArray(plotData) ? plotData : dummyData["Bar Chart"]).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(index)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : type === "Line Chart" ? (
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={plotData} margin={{ top: 30, right: 40, left: 50, bottom: 40 }}>
            <XAxis
              dataKey="label"
              label={{ value: meta.xAxisTitle, position: "insideBottom", offset: -10, style: { fontSize: 13, fontWeight: 600, fill: '#444' } }}
              tick={{ fontSize: 12, angle: -25, dx: -5, dy: 10, textAnchor: 'end', fill: '#444', fontWeight: 500 }}
              interval={0}
              height={60}
            />
            <YAxis
              label={{ value: meta.yAxisTitle, angle: -90, position: "insideLeft", style: { fontSize: 13, fontWeight: 600, fill: '#444' } }}
              tick={{ fontSize: 12, fill: '#444', fontWeight: 500 }}
            />
            <Tooltip wrapperStyle={{ fontSize: 13, fontFamily: 'Inter, Arial, sans-serif' }} />
            <Legend wrapperStyle={{ fontSize: 13, fontWeight: 600, color: '#4169e1' }} />
            <Line type="monotone" dataKey="value" stroke={getColor(0)} strokeWidth={3} dot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      ) : type === "Pie Chart" ? (
        <ResponsiveContainer width="100%" height={250}>
          <PieChart margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
            <Pie
              data={plotData}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              outerRadius={80}
              fill="#4169e1"
              label={({ name }) => name}
              labelStyle={{ fontSize: 12, fontWeight: 500, fill: '#444' }}
            >
              {plotData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(index)} />
              ))}
            </Pie>
            <Tooltip wrapperStyle={{ fontSize: 13, fontFamily: 'Inter, Arial, sans-serif' }} />
            <Legend wrapperStyle={{ fontSize: 13, fontWeight: 600, color: '#4169e1' }} />
          </PieChart>
        </ResponsiveContainer>
      ) : null
    );
  } else if (type === "Gantt Chart") {
    // Chart.js stacked horizontal bar
    const ChartJSComponent = getChartJSComponent(type);
    const chartJSData = getChartJSData(type, data);
    // apply palette to chartJSData datasets if not already set
    if (chartJSData && Array.isArray(chartJSData.datasets)) {
      chartJSData.datasets = chartJSData.datasets.map((ds, i) => ({
        ...ds,
        backgroundColor: ds.backgroundColor || getColor(i),
        borderColor: ds.borderColor || ds.backgroundColor || getColor(i),
      }));
    }
    chartContent = (
      <div style={{ width: 250, height: 250 }}>
        <ChartJSComponent
          data={chartJSData}
          options={{
            indexAxis: 'y',
            responsive: true,
            plugins: { legend: { display: false }, title: { display: true, text: type } },
            scales: {
              x: { stacked: true },
              y: { stacked: true }
            },
            barPercentage: 0.7,
          }}
        />
      </div>
    );
  } else if (type === "Waterfall Chart") {
    // Chart.js floating bars
    const ChartJSComponent = getChartJSComponent(type);
    const chartJSData = getChartJSData(type, data);
    if (chartJSData && Array.isArray(chartJSData.datasets)) {
      chartJSData.datasets = chartJSData.datasets.map((ds, i) => ({
        ...ds,
        backgroundColor: ds.backgroundColor || getColor(i),
      }));
    }
    chartContent = (
      <div style={{ width: '100%', height: 250 }}>
        <ChartJSComponent
          data={chartJSData}
          options={{
            responsive: true,
            plugins: { legend: { display: true }, title: { display: true, text: type } },
            scales: {
              x: { stacked: false },
              y: { stacked: false }
            },
            barPercentage: 0.7,
          }}
        />
      </div>
    );
  } else if (chartjsTypes.includes(type)) {
    // Chart.js fallback
    const ChartJSComponent = getChartJSComponent(type);
    const chartJSData = getChartJSData(type, data);
    if (chartJSData && Array.isArray(chartJSData.datasets)) {
      chartJSData.datasets = chartJSData.datasets.map((ds, i) => ({
        ...ds,
        backgroundColor: ds.backgroundColor || getColor(i),
        borderColor: ds.borderColor || getColor(i),
      }));
    }
    // detect stacked types
    const isStacked = /stack/i.test(type) || type === "Gantt Chart";
    const chartOptions = {
      responsive: true,
      plugins: { legend: { display: true }, title: { display: true, text: type } },
      scales: {
        x: { stacked: isStacked },
        y: { stacked: isStacked }
      }
    };
    chartContent = ChartJSComponent ? (
      <div style={{ width: '100%', height: 250 }}>
        <ChartJSComponent data={chartJSData} options={chartOptions} />
      </div>
    ) : null;
  } else {
    chartContent = <div>No chart renderer for type: {type}</div>;
  }

  return (
    <div className="w-full h-auto flex flex-col" style={{ fontFamily: 'Inter, Arial, sans-serif' }}>
      {/* Chart and metadata side by side, chart stretched */}
      <div className="w-full flex flex-col items-stretch">
        <div className="w-full">
          {chartContent}
        </div>
        {/* Metadata (X/Y/Legend) - can be shown above chart if needed, but omitted for minimalism */}
      </div>
      {/* Inferences below chart, styled like the provided image */}
      {meta.inferences && meta.inferences.length > 0 && (
        <div className="mt-4">
          <div className="font-bold text-gray-900 text-base mb-1">Inferences:</div>

          {meta.inferences.map((inference, idx) => {
            const paletteForCards = COLORS.slice(0, 6);
            const colorHex = paletteForCards[idx % paletteForCards.length];
            const bg = (/^#([A-Fa-f0-9]{6})$/.test(String(colorHex))) ? `${colorHex}1A` : `${colorHex}`;
            const readable = readableTextOnAlphaBg(ensureHex(colorHex), 0.12);
            return (
              <div key={idx} className={`mb-4 flex items-start rounded p-3`} style={{ minHeight: '60px', borderLeft: `4px solid ${colorHex}`, background: bg, color: readable }}>
                <div>
                  <div className="text-sm">{inference}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
