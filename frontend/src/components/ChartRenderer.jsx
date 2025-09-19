import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  LineChart, Line,
  AreaChart, Area,
  PieChart, Pie, Cell,
  ScatterChart, Scatter, ZAxis,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  RadialBarChart, RadialBar,
  Treemap,
  FunnelChart, Funnel, LabelList,
  ComposedChart
} from "recharts";

const nameMap = {
  "Bar Chart": "Bar Chart",
  "Horizontal Bar Chart": "Horizontal Bar Chart",
  "Grouped Bar Chart": "Bar Chart",
  "Stacked Bar Chart": "Bar Chart",
  "100% Stacked Bar Chart": "Bar Chart",
  "Line Chart": "Line Chart",
  "Multi-series Line Chart": "Line Chart",
  "Area Chart": "Area Chart",
  "Stacked Area Chart": "Area Chart",
  "Streamgraph": "Area Chart",
  "Pie Chart": "Pie Chart",
  "Donut Chart": "Donut Chart",
  "Waterfall Chart": "Waterfall Chart",
  "Funnel Chart": "Funnel Chart",
  "Sankey Diagram": "Composed Chart",
  "Alluvial Diagram": "Composed Chart",
  "Treemap": "Treemap",
  "Sunburst Chart": "Treemap",
  "Radar Chart": "Radar Chart",
  "Scatter Plot": "Scatter Plot",
  "Bubble Chart": "Scatter Plot",
  "Hexbin Plot": "Scatter Plot",
  "Histogram": "Bar Chart",
  "Box Plot": "Bar Chart",
  "Violin Plot": "Area Chart",
  "Heatmap": "Treemap",
  "Calendar Heatmap": "Treemap",
  "Gantt Chart": "Bar Chart",
  "Annotated Timeline": "Line Chart",
  "Pareto Chart": "Composed Chart",
  "Parallel Coordinates": "Radar Chart",
  "Geo Choropleth Map": "Treemap",
  "Proportional Symbol Map": "Scatter Plot",
  "Flow Map": "Composed Chart",
  "Cartogram": "Treemap",
  "Ternary Plot": "Radar Chart",
  "Waffle Chart": "Treemap",
  "Bullet Chart": "Bar Chart",
  "KPI Tile": "Bar Chart",
  "Tornado Chart": "Bar Chart",
  "Decision Matrix (Weighted Scoring)": "Treemap",
  "Risk Heat Map": "Treemap",
  "Chord Diagram": "Composed Chart",
  "Chord (weighted)": "Composed Chart",
  "Cohort Retention Heatmap": "Treemap",
  "Retention Curve": "Line Chart",
  "Network Graph": "Scatter Plot"
};

export default function ChartRenderer({ type, data }) {
  if (!data || data.length === 0) return <p>[No data]</p>;

  const normalized = nameMap[type] || type;

  switch(normalized){
    case "Bar Chart":
      return (
        <BarChart width={300} height={220} data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="value" fill="#4F46E5" />
        </BarChart>
      );

    case "Line Chart":
      return (
        <LineChart width={300} height={220} data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="value" stroke="#16A34A" />
        </LineChart>
      );

    case "Area Chart":
      return (
        <AreaChart width={300} height={220} data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Area type="monotone" dataKey="value" stroke="#2563EB" fill="#93C5FD" />
        </AreaChart>
      );

    case "Pie Chart":
    case "Donut Chart":
      return (
        <PieChart width={300} height={220}>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius={type === "Donut Chart" ? 50 : 0}
            outerRadius={80}
            label
          >
            {data.map((_, i) => (
              <Cell key={i} fill={["#E11D48", "#3B82F6", "#10B981", "#F59E0B"][i % 4]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      );

    case "Scatter Plot":
    case "Scatter Chart":
      return (
        <ScatterChart width={300} height={220}>
          <CartesianGrid />
          <XAxis dataKey="x" name="x" />
          <YAxis dataKey="y" name="y" />
          <ZAxis dataKey="z" range={[60, 400]} name="z" />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} />
          <Legend />
          <Scatter name="Series" data={data} fill="#2563EB" />
        </ScatterChart>
      );

    case "Radar Chart":
      return (
        <RadarChart outerRadius={80} width={300} height={220} data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="label" />
          <PolarRadiusAxis />
          <Radar name="Series" dataKey="value" stroke="#2563EB" fill="#93C5FD" fillOpacity={0.6} />
          <Legend />
        </RadarChart>
      );

    case "Radial Bar Chart":
      return (
        <RadialBarChart width={300} height={220} innerRadius="20%" outerRadius="90%" data={data}>
          <RadialBar minAngle={15} label background clockWise dataKey="value" fill="#3B82F6" />
          <Legend />
        </RadialBarChart>
      );

    case "Treemap":
    case "Treemap Chart":
      return (
        <Treemap width={300} height={220} data={data} dataKey="value" nameKey="label" stroke="#fff" fill="#60A5FA" />
      );

    case "Funnel Chart":
      return (
        <FunnelChart width={300} height={220}>
          <Tooltip />
          <Funnel dataKey="value" data={data} isAnimationActive>
            <LabelList position="right" fill="#111827" stroke="none" dataKey="label" />
          </Funnel>
        </FunnelChart>
      );

    case "Composed Chart":
    case "Combo Chart":
      return (
        <ComposedChart width={300} height={220} data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Area type="monotone" dataKey="value" fill="#93C5FD" stroke="#2563EB" />
          <Bar dataKey="value" barSize={20} fill="#3B82F6" />
          <Line type="monotone" dataKey="value" stroke="#16A34A" />
        </ComposedChart>
      );

    case "Waterfall Chart":
      // Approximation using colored bars
      return (
        <BarChart width={300} height={220} data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="value" fill="#10B981" />
        </BarChart>
      );

    case "Horizontal Bar Chart":
      return (
        <BarChart width={300} height={220} data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis dataKey="label" type="category" />
          <Tooltip />
          <Legend />
          <Bar dataKey="value" fill="#4F46E5" />
        </BarChart>
      );

    default:
      return <p>[Visualization: {type}]</p>;
  }
}
