import React from 'react';
import { Wire, NodeData } from '../types';

interface WireLayerProps {
  wires: Wire[];
  nodes: NodeData[];
  tempWireStart?: { x: number; y: number } | null;
  mousePos?: { x: number; y: number } | null;
  onDeleteWire?: (id: string) => void;
}

export const WireLayer: React.FC<WireLayerProps> = ({ wires, nodes, tempWireStart, mousePos, onDeleteWire }) => {
  
  const getNodePos = (nodeId: string, isInput: boolean, inputIndex: number = 0) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };

    // Offset values adjusted for the larger toy-like visual components
    // Center of node is node.x, node.y
    
    // If connecting TO an input of a gate
    if (isInput) {
       // Spread input pins vertically if there are 2
       const yOffset = node.type === 'GATE' && node.gateType !== 'NOT' 
          ? (inputIndex === 0 ? -20 : 20) 
          : 0;
       // Input ports are at -left-8 roughly 65px from center
       return { x: node.x - 65, y: node.y + yOffset }; 
    }
    
    // If connecting FROM an output
    // Output ports are at -right-8 roughly 65px from center
    return { x: node.x + 65, y: node.y };
  };

  const getPath = (x1: number, y1: number, x2: number, y2: number) => {
    const dist = Math.abs(x2 - x1);
    // Make the curve looser for a "tube" look
    const cp1x = x1 + Math.max(dist * 0.5, 50);
    const cp2x = x2 - Math.max(dist * 0.5, 50);
    return `M ${x1} ${y1} C ${cp1x} ${y1} ${cp2x} ${y2} ${x2} ${y2}`;
  };

  return (
    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 overflow-visible">
      <defs>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      
      {wires.map(wire => {
        const startNode = nodes.find(n => n.id === wire.from);
        const endNode = nodes.find(n => n.id === wire.to);
        
        if (!startNode || !endNode) return null;

        const start = getNodePos(wire.from, false);
        const end = getNodePos(wire.to, true, wire.toInputIndex);
        const isActive = startNode.value; // If source is on, wire is on

        return (
          <g key={wire.id} className="group">
            {/* Hit Area for Deletion (Transparent but clickable) */}
            <path
              d={getPath(start.x, start.y, end.x, end.y)}
              stroke="transparent"
              strokeWidth="24"
              fill="none"
              className="cursor-pointer pointer-events-auto"
              onDoubleClick={(e) => {
                e.stopPropagation();
                onDeleteWire?.(wire.id);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDeleteWire?.(wire.id);
              }}
            >
              <title>Double-click or Right-click to remove wire</title>
            </path>

            {/* Outer Glow/Shadow + Hover Effect */}
            <path
              d={getPath(start.x, start.y, end.x, end.y)}
              stroke={isActive ? '#fbbf24' : '#1e1b4b'}
              strokeWidth="14"
              fill="none"
              className="opacity-40 transition-all duration-300 group-hover:opacity-80 group-hover:stroke-red-400"
              filter={isActive ? "url(#glow)" : ""}
            />
            {/* Core Wire */}
            <path
              d={getPath(start.x, start.y, end.x, end.y)}
              stroke={isActive ? '#fde047' : '#4b5563'}
              strokeWidth="8"
              strokeLinecap="round"
              fill="none"
              className="transition-colors duration-300 ease-in-out pointer-events-none"
            />
          </g>
        );
      })}

      {/* Temporary wire while dragging */}
      {tempWireStart && mousePos && (
        <path
          d={getPath(tempWireStart.x, tempWireStart.y, mousePos.x, mousePos.y)}
          stroke="#f472b6"
          strokeWidth="8"
          strokeDasharray="15,15"
          strokeLinecap="round"
          fill="none"
          className="opacity-80 animate-pulse"
        />
      )}
    </svg>
  );
};