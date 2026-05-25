import { GoogleGenAI, Type } from "@google/genai";

let ai: GoogleGenAI | null = null;

function getAI() {
  const apiKey = __GEMINI_API_KEY__;

  if (!apiKey) {
    throw new Error("Missing VITE_GEMINI_API_KEY. Add it to .env and restart the dev server to use AI features.");
  }

  ai ??= new GoogleGenAI({ apiKey });
  return ai;
}

function getResponseText(response: { text?: string }): string {
  if (!response.text) {
    throw new Error("The AI service returned an empty response.");
  }

  return response.text;
}

function parseJsonResponse<T>(response: { text?: string }): T {
  const text = getResponseText(response);

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("The AI service returned invalid JSON.");
  }
}

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

export interface ArrangementTrack {
  name: string;
  instrument: 'synth-mono' | 'synth-pad' | 'synth-lead' | 'drums';
  notes: {
    midi: number;
    startTime: number;
    duration: number;
    velocity: number;
  }[];
}

export interface ArrangementPlan {
  title: string;
  bpm: number;
  bars: number;
  tracks: ArrangementTrack[];
}

export const aiService = {
  /**
   * Generates a chord progression based on a key and mood.
   */
  async generateChords(key: string, scale: string, mood: string): Promise<ChordProgression> {
    const response = await getAI().models.generateContent({
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

    return parseJsonResponse<ChordProgression>(response);
  },

  /**
   * Generates a music description for Lyria/MusicGen and returns instructions.
   */
  async generateSongPrompt(style: string, tempo: number, instrumentation: string): Promise<string> {
    const response = await getAI().models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Create a detailed descriptive prompt for a high-fidelity music generation model.
                 Style: ${style}, BPM: ${tempo}, Instruments: ${instrumentation}.
                 The prompt should describe rhythm, texture, and emotional quality.`
    });
    return getResponseText(response);
  },

  async generateArrangement(style: string, tempo: number, instrumentation: string): Promise<ArrangementPlan> {
    const response = await getAI().models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Create an editable 8-bar MIDI starter arrangement for a music producer.
                 Style: ${style}. BPM: ${tempo}. Instruments: ${instrumentation}.
                 Use practical MIDI note numbers. Include drums, bass, chords, and one melodic/hook track where appropriate.
                 Keep notes inside 8 bars of 4/4, with startTime and duration measured in beats.
                 Return JSON only.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            bpm: { type: Type.NUMBER },
            bars: { type: Type.NUMBER },
            tracks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  instrument: { type: Type.STRING },
                  notes: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        midi: { type: Type.NUMBER },
                        startTime: { type: Type.NUMBER },
                        duration: { type: Type.NUMBER },
                        velocity: { type: Type.NUMBER }
                      },
                      required: ["midi", "startTime", "duration", "velocity"]
                    }
                  }
                },
                required: ["name", "instrument", "notes"]
              }
            }
          },
          required: ["title", "bpm", "bars", "tracks"]
        }
      }
    });

    return parseJsonResponse<ArrangementPlan>(response);
  },

  /**
   * Analyzes audio features and suggests mastering settings.
   */
  async getMasteringSuggestions(peak: number, rms: number, style: string) {
    const response = await getAI().models.generateContent({
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
    return parseJsonResponse<{
      limiterCeiling: number;
      compressorThreshold: number;
      compressorRatio: number;
      eqLowGain: number;
      eqHighGain: number;
    }>(response);
  },

  /**
   * Suggests volume and panning based on track characteristics.
   */
  async getTrackBalanceSuggestions(trackName: string, trackType: string) {
    const response = await getAI().models.generateContent({
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
    return parseJsonResponse<{
      volume: number;
      pan: number;
    }>(response);
  }
};
