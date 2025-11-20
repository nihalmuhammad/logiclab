import { GateType, LevelConfig } from './types';

export const LEVELS: LevelConfig[] = [
  {
    id: 1,
    title: "Level 1: The Flipper",
    description: "Drag the green NOT gate to the board. It flips the switch! If the switch is OFF, the light turns ON.",
    inputs: ['A'],
    gatesAvailable: [GateType.NOT],
    goal: (inputs) => !inputs[0],
    goalDescription: "Make the Light turn ON when the Switch is OFF."
  },
  {
    id: 2,
    title: "Level 2: Best Friends",
    description: "The red AND gate is strict. It needs BOTH switches to be ON to work.",
    inputs: ['A', 'B'],
    gatesAvailable: [GateType.AND],
    goal: (inputs) => inputs[0] && inputs[1],
    goalDescription: "Turn ON both switches to light the lamp."
  },
  {
    id: 3,
    title: "Level 3: Any Will Do",
    description: "The blue OR gate is friendly. It works if ANY one of the switches is ON.",
    inputs: ['A', 'B'],
    gatesAvailable: [GateType.OR],
    goal: (inputs) => inputs[0] || inputs[1],
    goalDescription: "Turn ON at least one switch to light the lamp."
  },
  {
    id: 4,
    title: "Level 4: Mix It Up",
    description: "Combine them! We need Switch A to be OFF, but Switch B to be ON.",
    inputs: ['A', 'B'],
    gatesAvailable: [GateType.NOT, GateType.AND],
    goal: (inputs) => !inputs[0] && inputs[1],
    goalDescription: "Make the Light turn ON if Switch A is OFF and Switch B is ON."
  },
  {
    id: 5,
    title: "Level 5: Security Alarm",
    description: "Build an alarm! The Main Switch (A) must be ON, plus either Button B OR Button C.",
    inputs: ['A', 'B', 'C'],
    gatesAvailable: [GateType.AND, GateType.OR],
    goal: (inputs) => inputs[0] && (inputs[1] || inputs[2]),
    goalDescription: "The Light turns ON if Switch A is ON, and either Button B or C is ON."
  }
];

export const GATE_COLORS = {
  [GateType.AND]: 'bg-red-500 border-red-700',
  [GateType.OR]: 'bg-blue-500 border-blue-700',
  [GateType.NOT]: 'bg-emerald-500 border-emerald-700',
};

export const GATE_ICONS = {
  [GateType.AND]: 'AND',
  [GateType.OR]: 'OR',
  [GateType.NOT]: 'NOT',
};