import { GoogleGenAI } from "@google/genai";

let genAI: GoogleGenAI | null = null;

export function getGemini(): GoogleGenAI {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey || apiKey === 'undefined') {
      console.warn("GEMINI_API_KEY is not defined. AI features will be disabled.");
      // We throw a more descriptive error or return a mock? 
      // Better to return it and let the SDK fail if it must, 
      // but the main goal is to avoid crashing the whole app on import.
      throw new Error("API_KEY_MISSING");
    }
    
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
}
