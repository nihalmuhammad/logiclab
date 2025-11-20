export enum NodeType {
  INPUT = 'INPUT',
  GATE = 'GATE',
  OUTPUT = 'OUTPUT',
}

export enum GateType {
  AND = 'AND',
  OR = 'OR',
  NOT = 'NOT',
}

export interface NodeData {
  id: string;
  type: NodeType;
  gateType?: GateType;
  label: string;
  x: number;
  y: number;
  value: boolean; // Current simulation state
  inputs: string[]; // IDs of nodes connected to inputs
}

export interface Wire {
  id: string;
  from: string;
  to: string;
  toInputIndex: number; // 0 or 1 (for A or B input)
}

export interface LevelConfig {
  id: number;
  title: string;
  description: string;
  inputs: string[]; // Labels for inputs
  gatesAvailable: GateType[]; // Inventory
  goal: (inputs: boolean[]) => boolean; // The truth table function
  goalDescription: string; // Text description of goal
}

export interface ValidationResult {
  success: boolean;
  message: string;
  failedCase?: { inputs: boolean[]; expected: boolean; actual: boolean };
}