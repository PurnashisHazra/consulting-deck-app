import React, { useRef } from 'react';
import ReactFlow from 'reactflow';

// Compact SmartArt-like flow for section text
export default function SmartArtFlow({ items = [], numberOfNodes, gridHeight }) {
  const reactFlowWrapper = useRef(null);
  // Use provided numberOfNodes and gridHeight, or fallback to items.length and default height
  const nodeCount = numberOfNodes || items.length;
  const height = gridHeight || Math.max(180, nodeCount * 30);
  // Calculate vertical spacing
  const spacing = nodeCount > 1 ? height / (nodeCount*3) : height / 2;
  const nodes = items.map((text, idx) => ({
    id: `node-${idx}`,
    data: { label: text },
    position: { x: 0, y: idx * spacing },
    style: { background: '#e1e6f7ff', color: '#1e293b', border: '2px solid #6366f1', borderRadius: 8, padding: 12, minWidth: 220, boxShadow: '0 2px 8px #e0e7ff' }
  }));
  return (
    <div style={{ width: '100%', height: '100%', minHeight: height, overflow: 'auto' }} ref={reactFlowWrapper}>
      <ReactFlow nodes={nodes} edges={[]} fitView={items.length > 0} style={{ width: '100%', height: '100%' }} proOptions={{ hideAttribution: true }} />
    </div>
  );
}
