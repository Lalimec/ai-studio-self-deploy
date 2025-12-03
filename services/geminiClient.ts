import { GoogleGenAI } from '@google/genai';

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable not set");
}

export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Converts a data URL to base64 and mimeType.
 * For legacy sync usage - only works with data URLs.
 */
export const dataUrlToBlob = (dataUrl: string) => {
  const parts = dataUrl.split(',');
  const mimeType = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const base64 = parts[1];
  return { base64, mimeType };
};

/**
 * Converts either a data URL or HTTPS URL to base64 and mimeType.
 * This is the async version that handles remote images from webhook APIs.
 */
export const imageUrlToBase64 = async (imageUrl: string): Promise<{ base64: string; mimeType: string }> => {
  // Check if it's a data URL
  if (imageUrl.startsWith('data:')) {
    return dataUrlToBlob(imageUrl);
  }

  // It's an HTTPS URL - fetch and convert to base64
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const blob = await response.blob();
    const mimeType = blob.type || 'image/jpeg';

    // Convert blob to base64
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const base64 = btoa(binary);

    return { base64, mimeType };
  } catch (error) {
    throw new Error(`Failed to convert image URL to base64: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};