import { GoogleGenAI } from "@google/genai";
import { NodeData, Wire, LevelConfig } from '../types';

const apiKey = process.env.API_KEY || '';

// We only instantiate if key is present to avoid crashes in dev if missing,
// but instructions say assume it is valid.
const ai = new GoogleGenAI({ apiKey });

export const getHintFromBit = async (
  level: LevelConfig,
  nodes: NodeData[],
  wires: Wire[],
  currentInputs: boolean[]
): Promise<string> => {
  
  if (!apiKey) return "I need an API Key to think! (Check settings)";

  const circuitStateDescription = JSON.stringify({
    nodes: nodes.map(n => ({ id: n.id, type: n.type, gate: n.gateType, label: n.label })),
    wires: wires.map(w => ({ from: w.from, to: w.to })),
    currentSwitchState: currentInputs
  });

  const systemPrompt = `
    You are "Bit", a friendly robot tutor for kids (ages 8-12) learning computer logic.
    Your goal is to give a ONE SENTENCE hint about the puzzle.
    
    STRICT RULES:
    1. USE PERFECT SPELLING AND GRAMMAR. No typos allowed.
    2. Use simple, clear English words.
    3. Be cheerful and kind.
    4. Do not give the answer directly. Guide them gently.
    5. If the circuit looks correct, tell them to press the green "TEST IT" button.

    Current Level Goal: ${level.goalDescription}
    Level Description: ${level.description}
    
    Analyze the user's circuit provided in JSON. 
    Identify if they are missing a gate, have the wrong gate, or incorrect wiring.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Here is the circuit: ${circuitStateDescription}. What is a good hint?`,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.1, // Low temperature for consistent, correct spelling
        maxOutputTokens: 60,
      }
    });
    return response.text || "I am thinking... try checking your wires!";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "My circuits are fuzzy. Try moving the wires!";
  }
};