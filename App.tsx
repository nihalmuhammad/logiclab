import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LEVELS, GATE_COLORS, GATE_ICONS } from './constants';
import { NodeType, GateType, NodeData, Wire, ValidationResult } from './types';
import { BitCharacter } from './components/BitCharacter';
import { WireLayer } from './components/WireLayer';
import { getHintFromBit } from './services/geminiService';

// Helper to create unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

const App: React.FC = () => {
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [wires, setWires] = useState<Wire[]>([]);
  
  // Interaction State
  const [wireStartNode, setWireStartNode] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  
  // Game State
  const [bitMessage, setBitMessage] = useState("Hi! I'm Bit. Let's build some logic!");
  const [bitEmotion, setBitEmotion] = useState<'idle' | 'happy' | 'thinking' | 'celebrate'>('idle');
  const [isSimulating, setIsSimulating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  
  const boardRef = useRef<HTMLDivElement>(null);

  const currentLevel = LEVELS[currentLevelIndex];

  // Initialize Level
  useEffect(() => {
    loadLevel(currentLevelIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLevelIndex]);

  const loadLevel = (index: number) => {
    const level = LEVELS[index];
    const newNodes: NodeData[] = [];
    const startY = 150;
    const gapY = 140;

    // Create Input Nodes
    level.inputs.forEach((label, i) => {
      newNodes.push({
        id: `input-${i}`,
        type: NodeType.INPUT,
        label: label,
        x: 100,
        y: startY + (i * gapY),
        value: false,
        inputs: []
      });
    });

    // Create Output Node
    newNodes.push({
      id: 'output-main',
      type: NodeType.OUTPUT,
      label: 'LAMP',
      x: 850,
      y: startY + ((level.inputs.length - 1) * gapY) / 2, // Center vertically
      value: false,
      inputs: []
    });

    setNodes(newNodes);
    setWires([]);
    setValidationResult(null);
    setBitMessage(level.description);
    setBitEmotion('idle');
  };

  // Simulation Engine
  const simulate = useCallback(() => {
    const newNodes = [...nodes];
    let changed = true;
    let iterations = 0;

    while (changed && iterations < 20) {
      changed = false;
      iterations++;

      newNodes.forEach(node => {
        if (node.type === NodeType.INPUT) return;

        const inputValues: boolean[] = [];
        const nodeWires = wires.filter(w => w.to === node.id);
        
        // Mapping for specific input indexes (A vs B)
        const inputA = nodeWires.find(w => w.toInputIndex === 0);
        const inputB = nodeWires.find(w => w.toInputIndex === 1);

        const valA = inputA ? newNodes.find(n => n.id === inputA.from)?.value : false;
        const valB = inputB ? newNodes.find(n => n.id === inputB.from)?.value : false;

        let newValue = false;

        if (node.type === NodeType.OUTPUT) {
          newValue = valA || false;
        } else if (node.type === NodeType.GATE) {
          if (node.gateType === GateType.AND) {
             // AND requires both connected and ON
             newValue = (valA === true) && (valB === true);
          } else if (node.gateType === GateType.OR) {
            newValue = (valA === true) || (valB === true);
          } else if (node.gateType === GateType.NOT) {
            newValue = !valA;
          }
        }

        if (node.value !== newValue) {
          node.value = newValue;
          changed = true;
        }
      });
    }
    
    return newNodes;
  }, [nodes, wires]);

  // Run simulation on changes
  useEffect(() => {
    if (isSimulating) return;
    const updatedNodes = simulate();
    // Simple check to avoid infinite loops if objects change reference but not value
    const hasChanges = JSON.stringify(updatedNodes.map(n => n.value)) !== JSON.stringify(nodes.map(n => n.value));
    if (hasChanges) {
        setNodes(updatedNodes);
    }
  }, [wires, nodes, isSimulating, simulate]);

  const checkSolution = async () => {
    setIsSimulating(true);
    setBitEmotion('thinking');
    setBitMessage("Testing all the switches...");

    const inputs = nodes.filter(n => n.type === NodeType.INPUT);
    const combinations = 1 << inputs.length;
    let allPassed = true;

    for (let i = 0; i < combinations; i++) {
      const currentInputValues = inputs.map((_, idx) => Boolean((i >> idx) & 1));
      
      // Update node states for this test case
      const testNodes = nodes.map(n => {
         if (n.type === NodeType.INPUT) {
            const idx = parseInt(n.id.split('-')[1]);
            return { ...n, value: currentInputValues[idx] };
         }
         return n;
      });

      // Local Simulation
      let simNodes = JSON.parse(JSON.stringify(testNodes));
      let changed = true;
      let it = 0;
      while(changed && it < 20) {
        changed = false;
        it++;
        simNodes.forEach((node: NodeData) => {
           if (node.type === NodeType.INPUT) return;
           
           const nodeWires = wires.filter(w => w.to === node.id);
           const inputA = nodeWires.find(w => w.toInputIndex === 0);
           const inputB = nodeWires.find(w => w.toInputIndex === 1);
           const valA = inputA ? simNodes.find((n: NodeData) => n.id === inputA.from)?.value : false;
           const valB = inputB ? simNodes.find((n: NodeData) => n.id === inputB.from)?.value : false;

           let val = false;
           if (node.type === NodeType.OUTPUT) val = valA || false;
           else if (node.gateType === GateType.AND) val = (valA === true) && (valB === true);
           else if (node.gateType === GateType.OR) val = (valA === true) || (valB === true);
           else if (node.gateType === GateType.NOT) val = !valA;
           
           if (node.value !== val) {
             node.value = val;
             changed = true;
           }
        });
      }

      const outputNode = simNodes.find((n: NodeData) => n.type === NodeType.OUTPUT);
      const expected = currentLevel.goal(currentInputValues);
      
      if (outputNode.value !== expected) {
        allPassed = false;
        setNodes(simNodes); // Show failure state
        break;
      }
      
      setNodes(simNodes);
      await new Promise(r => setTimeout(r, 400)); // Slower for kids to see
    }

    setIsSimulating(false);

    if (allPassed) {
      setValidationResult({ success: true, message: "Correct!" });
      setBitMessage("YAY! The circuit works perfectly! 🌟");
      setBitEmotion('celebrate');
    } else {
      setValidationResult({ success: false, message: "Try again!" });
      setBitMessage("Uh oh! The light is not working yet. Try moving the wires!");
      setBitEmotion('idle');
    }
  };

  // --- Interaction Handlers ---

  const handleSidebarDragStart = (e: React.DragEvent, type: GateType) => {
    e.dataTransfer.setData('gateType', type);
  };

  const handleBoardDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const gateType = e.dataTransfer.getData('gateType') as GateType;
    if (!gateType) return;
    
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newNode: NodeData = {
      id: generateId(),
      type: NodeType.GATE,
      gateType,
      label: gateType,
      x,
      y,
      value: false,
      inputs: []
    };
    setNodes([...nodes, newNode]);
  };

  const handleBoardDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation(); // Prevent triggering board clicks
    const node = nodes.find(n => n.id === nodeId);
    if (!node || !boardRef.current) return;

    const rect = boardRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Store the offset from the node center so it doesn't snap to center
    setDragOffset({
      x: mouseX - node.x,
      y: mouseY - node.y
    });
    setDraggingNodeId(nodeId);
  };

  const handleBoardMouseMove = (e: React.MouseEvent) => {
     if (!boardRef.current) return;
     
     const rect = boardRef.current.getBoundingClientRect();
     const x = e.clientX - rect.left;
     const y = e.clientY - rect.top;

     // Handle Node Dragging
     if (draggingNodeId) {
       setNodes(prev => prev.map(n => {
         if (n.id === draggingNodeId) {
           return { ...n, x: x - dragOffset.x, y: y - dragOffset.y };
         }
         return n;
       }));
     }
     
     // Handle Wire Drawing Preview
     if (wireStartNode) {
         setMousePos({ x, y });
     }
  };

  const handleBoardMouseUp = () => {
    setDraggingNodeId(null);
  };

  const handleInputToggle = (id: string) => {
    setNodes(nodes.map(n => n.id === id ? { ...n, value: !n.value } : n));
  };

  const handlePortClick = (nodeId: string, isInput: boolean, inputIndex: number = 0) => {
    if (!isInput) {
      setWireStartNode(nodeId);
    } else {
      if (wireStartNode) {
        if (wireStartNode === nodeId) {
            setWireStartNode(null); 
            return;
        }
        // Prevent duplicate wires or circular connections if you want stricter logic
        const newWires = wires.filter(w => !(w.to === nodeId && w.toInputIndex === inputIndex));
        
        setWires([...newWires, {
          id: generateId(),
          from: wireStartNode,
          to: nodeId,
          toInputIndex: inputIndex
        }]);
        setWireStartNode(null);
      }
    }
  };

  const deleteNode = (id: string) => {
     const node = nodes.find(n => n.id === id);
     if (node?.type === NodeType.INPUT || node?.type === NodeType.OUTPUT) return;
     setNodes(nodes.filter(n => n.id !== id));
     setWires(wires.filter(w => w.from !== id && w.to !== id));
  };

  const deleteWire = (id: string) => {
    setWires(prev => prev.filter(w => w.id !== id));
  };

  const askHint = async () => {
      setBitEmotion('thinking');
      setBitMessage("Let me think...");
      const inputs = nodes.filter(n => n.type === NodeType.INPUT).map(n => n.value);
      const hint = await getHintFromBit(currentLevel, nodes, wires, inputs);
      setBitMessage(hint);
      setBitEmotion('happy');
  };

  const tempWireStartPos = wireStartNode ? (() => {
      const n = nodes.find(nd => nd.id === wireStartNode);
      return n ? { x: n.x + 60, y: n.y } : null; // Adjusted for toy width
  })() : null;

  return (
    <div className="flex flex-col h-screen bg-toy-bg text-white font-sans selection:bg-toy-accent selection:text-white">
      
      {/* Header */}
      <header className="h-20 flex items-center justify-between px-6 bg-toy-panel z-10 shadow-toy relative select-none">
        <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-toy-accent rounded-xl flex items-center justify-center shadow-inner border-2 border-white/20">
                <span className="text-2xl">⚡</span>
            </div>
            <h1 className="text-3xl font-black tracking-wider text-white drop-shadow-md">LOGIC LAB</h1>
        </div>
        
        <div className="flex items-center space-x-6">
           <div className="px-4 py-2 bg-black/20 rounded-xl border border-white/10">
             <span className="text-toy-blue font-bold uppercase text-sm tracking-widest">{currentLevel.title}</span>
           </div>
           <button 
             onClick={checkSolution}
             className="bg-toy-green hover:bg-green-400 text-slate-900 font-black py-3 px-8 rounded-xl shadow-toy active:shadow-toy-pressed active:translate-y-1 transition-all flex items-center gap-2 text-lg border-b-4 border-green-600"
           >
             <span>▶</span> TEST IT!
           </button>
           {validationResult?.success && currentLevelIndex < LEVELS.length - 1 && (
             <button
                onClick={() => setCurrentLevelIndex(prev => prev + 1)}
                className="bg-toy-yellow hover:bg-yellow-300 text-black font-black py-3 px-6 rounded-xl shadow-toy active:shadow-toy-pressed active:translate-y-1 animate-bounce border-b-4 border-yellow-600"
             >
                NEXT LEVEL &rarr;
             </button>
           )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Sidebar Toolbox */}
        <aside className="w-28 bg-toy-panel border-r-4 border-black/10 flex flex-col items-center py-8 space-y-8 z-10 shadow-xl select-none">
          <div className="text-sm font-black text-white/60 uppercase tracking-widest">Toolbox</div>
          {currentLevel.gatesAvailable.map(gate => (
            <div
              key={gate}
              draggable
              onDragStart={(e) => handleSidebarDragStart(e, gate)}
              className={`w-20 h-20 ${GATE_COLORS[gate]} rounded-2xl shadow-toy border-b-4 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing transform hover:scale-110 transition-all group`}
            >
              <span className="text-lg font-black text-white/90 tracking-widest">{GATE_ICONS[gate]}</span>
              <span className="text-[10px] text-white/60 mt-1 uppercase font-bold group-hover:text-white">Drag Me</span>
            </div>
          ))}
        </aside>

        {/* Main Circuit Board */}
        <main 
            ref={boardRef}
            className="flex-1 relative overflow-hidden bg-[radial-gradient(#4c1d95_3px,transparent_3px)] [background-size:40px_40px] cursor-crosshair"
            onDrop={handleBoardDrop}
            onDragOver={handleBoardDragOver}
            onMouseMove={handleBoardMouseMove}
            onMouseUp={handleBoardMouseUp}
            onMouseLeave={handleBoardMouseUp}
            onClick={() => { if (wireStartNode) setWireStartNode(null); }}
        >
           {/* Mission Box */}
           <div className="absolute top-6 left-6 right-6 md:right-auto bg-white/10 backdrop-blur-md p-6 rounded-2xl border-2 border-white/20 max-w-md pointer-events-none select-none z-0">
               <h3 className="text-toy-accent font-black text-lg mb-2 uppercase">Mission:</h3>
               <p className="text-xl font-medium text-white leading-relaxed">{currentLevel.goalDescription}</p>
           </div>

           <WireLayer 
              wires={wires} 
              nodes={nodes} 
              tempWireStart={tempWireStartPos} 
              mousePos={mousePos} 
              onDeleteWire={deleteWire} 
            />

           {nodes.map(node => (
             <div
               key={node.id}
               style={{ left: node.x, top: node.y }}
               className={`absolute w-24 h-24 flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 z-10`}
             >
               {/* Input Ports (Sockets) */}
               {(node.type === NodeType.GATE || node.type === NodeType.OUTPUT) && (
                   <div className="absolute -left-8 top-0 bottom-0 flex flex-col justify-center space-y-8 pointer-events-auto">
                       {(node.gateType !== GateType.NOT || node.type === NodeType.OUTPUT) && (
                            // Input A
                           <div 
                             onClick={(e) => { e.stopPropagation(); handlePortClick(node.id, true, 0); }}
                             className={`w-10 h-10 rounded-full border-4 border-slate-300 bg-slate-800 hover:bg-toy-yellow hover:scale-110 cursor-pointer transition-all shadow-lg flex items-center justify-center ${((node.type === NodeType.GATE && node.gateType === GateType.NOT)) ? 'hidden' : ''}`}
                             title="Connect"
                           >
                             <div className="w-2 h-2 bg-black/50 rounded-full"></div>
                           </div>
                       )}
                       {(node.type === NodeType.GATE && node.gateType !== GateType.NOT) && (
                            // Input B
                            <div 
                                onClick={(e) => { e.stopPropagation(); handlePortClick(node.id, true, 1); }}
                                className="w-10 h-10 rounded-full border-4 border-slate-300 bg-slate-800 hover:bg-toy-yellow hover:scale-110 cursor-pointer transition-all shadow-lg flex items-center justify-center"
                                title="Connect"
                            >
                              <div className="w-2 h-2 bg-black/50 rounded-full"></div>
                            </div>
                       )}
                       {((node.type === NodeType.GATE && node.gateType === GateType.NOT)) && (
                           // Single Input for NOT
                            <div 
                                onClick={(e) => { e.stopPropagation(); handlePortClick(node.id, true, 0); }}
                                className="absolute top-1/2 -translate-y-1/2 -left-1 w-10 h-10 rounded-full border-4 border-slate-300 bg-slate-800 hover:bg-toy-yellow hover:scale-110 cursor-pointer transition-all shadow-lg flex items-center justify-center"
                                title="Connect"
                            >
                              <div className="w-2 h-2 bg-black/50 rounded-full"></div>
                            </div>
                       )}
                   </div>
               )}

               {/* Component Body (Draggable) */}
               <div 
                   className={`
                     relative flex items-center justify-center transition-all duration-100 select-none cursor-move active:scale-105
                     ${node.type === NodeType.INPUT ? 'w-24 h-32' : 'w-24 h-24'}
                   `}
                   onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
               >
                   {/* SWITCH */}
                   {node.type === NodeType.INPUT && (
                       <div 
                         className={`relative w-20 h-32 rounded-2xl border-4 ${node.value ? 'bg-green-600 border-green-400' : 'bg-slate-700 border-slate-500'} shadow-toy transition-colors flex flex-col items-center py-4`}
                       >
                           <span className="text-xs font-black text-white/50 mb-2">SWITCH</span>
                           <span className="font-black text-2xl mb-2">{node.label}</span>
                           {/* Toggle Handle (Clickable independently) */}
                           <div 
                             onClick={(e) => { e.stopPropagation(); handleInputToggle(node.id); }}
                             className={`w-8 h-16 bg-black/30 rounded-full p-1 relative transition-all cursor-pointer hover:bg-black/40`}
                           >
                                <div className={`w-6 h-6 rounded-full shadow-md absolute left-1 transition-all duration-300 ${node.value ? 'top-1 bg-green-300 shadow-[0_0_10px_#4ade80]' : 'bottom-1 bg-slate-400'}`}></div>
                           </div>
                       </div>
                   )}

                   {/* LOGIC GATE */}
                   {node.type === NodeType.GATE && (
                       <div className={`w-28 h-24 rounded-3xl ${GATE_COLORS[node.gateType!]} shadow-toy border-b-8 flex items-center justify-center relative`}>
                            <span className="text-2xl font-black text-white tracking-widest pointer-events-none">{GATE_ICONS[node.gateType!]}</span>
                            {/* Delete Button */}
                           <button 
                             onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
                             className="absolute -top-3 -right-3 w-8 h-8 bg-red-500 hover:bg-red-400 text-white rounded-full font-bold flex items-center justify-center shadow-md scale-0 group-hover:scale-100 transition-transform cursor-pointer"
                           >
                               ✕
                           </button>
                       </div>
                   )}

                   {/* OUTPUT LAMP */}
                   {node.type === NodeType.OUTPUT && (
                       <div className="flex flex-col items-center">
                            <div className={`w-24 h-24 rounded-full border-4 flex items-center justify-center transition-all duration-500 ${node.value ? 'bg-yellow-300 border-yellow-100 shadow-[0_0_60px_rgba(253,224,71,0.8)] scale-110' : 'bg-slate-800 border-slate-600'}`}>
                                <span className="text-4xl pointer-events-none">{node.value ? '💡' : '⚫'}</span>
                            </div>
                            <div className="mt-2 px-3 py-1 bg-black/30 rounded-full text-xs font-bold text-white/70">
                                LIGHT
                            </div>
                       </div>
                   )}
               </div>

               {/* Output Port (Socket) */}
               {(node.type === NodeType.INPUT || node.type === NodeType.GATE) && (
                   <div 
                     onClick={(e) => { e.stopPropagation(); handlePortClick(node.id, false); }}
                     className={`absolute -right-8 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full border-4 border-slate-300 ${wireStartNode === node.id ? 'bg-toy-accent scale-125 shadow-[0_0_15px_#f472b6]' : 'bg-slate-800'} hover:bg-toy-yellow hover:scale-110 cursor-pointer transition-all shadow-lg z-20 flex items-center justify-center pointer-events-auto`}
                     title="Connect"
                   >
                      <div className="w-2 h-2 bg-black/50 rounded-full"></div>
                   </div>
               )}
             </div>
           ))}
        </main>

        {/* Bit Character */}
        <BitCharacter 
           message={bitMessage} 
           emotion={bitEmotion} 
           loading={bitEmotion === 'thinking'} 
           onAskHint={askHint}
        />

      </div>
    </div>
  );
};

export default App;