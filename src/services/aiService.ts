import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface ChordProgression {
  key: string;
  scale: string;
  chords: {
    name: string;
    notes: string[]; // e.g., ["C4", "E4", "G4"]
    startTime: number; // in beats
    duration: number; // in beats
  }[];
}

export const aiService = {
  /**
   * Generates a chord progression based on a key and mood.
   */
  async generateChords(key: string, scale: string, mood: string): Promise<ChordProgression> {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a 4-bar chord progression in the key of ${key} ${scale}. Mood: ${mood}.
                 Return as a JSON object with the specified structure.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            key: { type: Type.STRING },
            scale: { type: Type.STRING },
            chords: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  notes: { 
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  startTime: { type: Type.NUMBER },
                  duration: { type: Type.NUMBER }
                },
                required: ["name", "notes", "startTime", "duration"]
              }
            }
          },
          required: ["key", "scale", "chords"]
        }
      }
    });

    return JSON.parse(response.text);
  },

  /**
   * Generates a music description for Lyria/MusicGen and returns instructions.
   */
  async generateSongPrompt(style: string, tempo: number, instrumentation: string): Promise<string> {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Create a detailed descriptive prompt for a high-fidelity music generation model.
                 Style: ${style}, BPM: ${tempo}, Instruments: ${instrumentation}.
                 The prompt should describe rhythm, texture, and emotional quality.`
    });
    return response.text;
  },

  /**
   * Analyzes audio features and suggests mastering settings.
   */
  async getMasteringSuggestions(peak: number, rms: number, style: string) {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Audio Analysis: Peak: ${peak}dB, RMS: ${rms}dB. Style: ${style}.
                 Suggest mastering offsets for a Limiter (ceiling), Compressor (ratio/threshold), and EQ (high/low shelves).
                 Return as JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            limiterCeiling: { type: Type.NUMBER },
            compressorThreshold: { type: Type.NUMBER },
            compressorRatio: { type: Type.NUMBER },
            eqLowGain: { type: Type.NUMBER },
            eqHighGain: { type: Type.NUMBER }
          }
        }
      }
    });
    return JSON.parse(response.text);
  },

  /**
   * Suggests volume and panning based on track characteristics.
   */
  async getTrackBalanceSuggestions(trackName: string, trackType: string) {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Track Name: ${trackName}, Type: ${trackType}. 
                 Suggest professional volume (0.0 to 1.0) and panning (-1.0 to 1.0) for this track in a modern mix.
                 Return as JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            volume: { type: Type.NUMBER },
            pan: { type: Type.NUMBER }
          }
        }
      }
    });
    return JSON.parse(response.text);
  }
};
