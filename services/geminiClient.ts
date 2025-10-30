import { GoogleGenAI } from '@google/genai';

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable not set");
}

export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const dataUrlToBlob = (dataUrl: string) => {
  const parts = dataUrl.split(',');
  const mimeType = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const base64 = parts[1];
  return { base64, mimeType };
};