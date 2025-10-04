import React from "react";

// Simple SVG diagrams for common frameworks
function SWOTDiagram() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 320 80" preserveAspectRatio="none" style={{display: 'block'}}>
      <rect x="0" y="0" width="80" height="80" fill="#e0e7ff" />
      <rect x="80" y="0" width="80" height="80" fill="#f0fdf4" />
      <rect x="160" y="0" width="80" height="80" fill="#fee2e2" />
      <rect x="240" y="0" width="80" height="80" fill="#fef9c3" />
      <text x="40" y="45" textAnchor="middle" fontSize="18" fill="#3730a3">S</text>
      <text x="120" y="45" textAnchor="middle" fontSize="18" fill="#047857">W</text>
      <text x="200" y="45" textAnchor="middle" fontSize="18" fill="#b91c1c">O</text>
      <text x="280" y="45" textAnchor="middle" fontSize="18" fill="#ca8a04">T</text>
    </svg>
  );
}

function BCGMatrixDiagram() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 320 80" preserveAspectRatio="none" style={{display: 'block'}}>
      <rect x="0" y="0" width="160" height="40" fill="#e0e7ff" />
      <rect x="160" y="0" width="160" height="40" fill="#f0fdf4" />
      <rect x="0" y="40" width="160" height="40" fill="#fee2e2" />
      <rect x="160" y="40" width="160" height="40" fill="#fef9c3" />
      <text x="80" y="25" textAnchor="middle" fontSize="14" fill="#3730a3">Stars</text>
      <text x="240" y="25" textAnchor="middle" fontSize="14" fill="#047857">Question Marks</text>
      <text x="80" y="65" textAnchor="middle" fontSize="14" fill="#b91c1c">Cash Cows</text>
      <text x="240" y="65" textAnchor="middle" fontSize="14" fill="#ca8a04">Dogs</text>
    </svg>
  );
}

function PlaceholderDiagram({ name }) {
  return (
    <div className="flex items-center justify-center w-full h-full min-h-[80px] text-xs text-gray-400 border border-dashed border-gray-300 rounded">
      {name} diagram coming soon
    </div>
  );
}

export default function FrameworkDiagram({ framework, frameworkData }) {
  const renderValue = (val) => {
    if (Array.isArray(val)) {
      return (
        <ul className="list-disc list-inside">
          {val.map((item, i) => (
            <li key={i}>{renderValue(item)}</li>
          ))}
        </ul>
      );
    } else if (val && typeof val === "object") {
      const cleanVal = JSON.parse(
        JSON.stringify(val, (key, value) => ((value === null || value === "null") ? "" : value))
      );
      return (
        <pre className="whitespace-pre-wrap break-words text-xs bg-gray-50 p-1 rounded border">
          {JSON.stringify(cleanVal, null, 2)}
        </pre>
      );
    } else {
      return val?.toString?.() ?? "";
    }
  };

  return (
    <div className="overflow-x-auto h-full flex items-center justify-center">
      {(frameworkData && Object.keys(frameworkData).length > 0 )? (
        <table className="min-w-[200px] w-full border border-gray-300 rounded text-xs">
          <thead>
            <tr>
              {Object.keys(frameworkData).map((key) => (
                <th
                  key={key}
                  className="bg-gray-100 border px-2 py-1 text-gray-700 font-semibold"
                >
                  {key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {Object.values(frameworkData).map((val, idx) => (
                <td key={idx} className="border px-2 py-1 text-gray-600 align-top">
                  {renderValue(val)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      ) : (
        <p className="text-gray-500 italic">Get Premium to view this!</p>
      )}
    </div>
  );
}