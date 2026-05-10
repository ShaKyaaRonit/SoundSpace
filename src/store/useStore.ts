import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

export interface Note {
  id: string;
  midi: number;
  startTime: number; // in beats
  duration: number; // in beats
  velocity: number;
}

export interface Region {
  id: string;
  startTime: number; // in seconds (for audio) or beats (for midi triggers)
  duration: number;
  audioUrl?: string;
  buffer?: AudioBuffer;
  notes?: Note[]; // MIDI notes for patterns
}

export interface Effect {
  id: string;
  type: 'compressor' | 'eq' | 'reverb' | 'limiter' | 'delay';
  params: any;
  enabled: boolean;
}

export interface Instrument {
  id: string;
  name: string;
  type: 'synth-mono' | 'synth-pad' | 'synth-lead' | 'sampler-piano' | 'drums';
  settings: any;
}

export interface Track {
  id: string;
  name: string;
  type: 'audio' | 'midi';
  volume: number; // 0 to 1
  pan: number; // -1 to 1
  muted: boolean;
  soloed: boolean;
  regions: Region[];
  effects: Effect[];
  instrument?: Instrument;
}

export interface DAWState {
  projectName: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number; // total length of the project
  bpm: number;
  tracks: Track[];
  selectedTrackId: string | null;
  activeRegionId: string | null; // For Piano Roll focus
  isRecording: boolean;
  metronomeEnabled: boolean;
  snapEnabled: boolean;
  selectedRegionId: string | null;
  isProcessing: boolean; // For AI tasks
  activeTool: 'pointer' | 'scissors';
  projectId: string | null;
  
  // Actions
  setTool: (tool: 'pointer' | 'scissors') => void;
  setProjectId: (id: string | null) => void;
  setPlaying: (playing: boolean) => void;
  setRecording: (recording: boolean) => void;
  setMetronome: (enabled: boolean) => void;
  setSnap: (enabled: boolean) => void;
  setSelectedRegion: (id: string | null) => void;
  setProcessing: (processing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setActiveRegion: (id: string | null) => void;
  setBpm: (bpm: number) => void;
  addTrack: (name: string, type?: 'audio' | 'midi') => void;
  deleteRegion: (trackId: string, regionId: string) => void;
  updateRegion: (trackId: string, regionId: string, updates: Partial<Region>) => void;
  updateTrack: (id: string, updates: Partial<Track>) => void;
  removeTrack: (id: string) => void;
  addRegion: (trackId: string, region: Omit<Region, 'id'>) => void;
  updateTrackInstrument: (trackId: string, updates: any) => void;
  setProject: (name: string, tracks: Track[]) => void;
  setProjectName: (name: string) => void;
}

export const useStore = create<DAWState>()(
  persist(
    (set) => ({
      projectName: 'New Project',
      isPlaying: false,
      currentTime: 0,
      duration: 300, // default 5 mins
      bpm: 120,
      tracks: [
        {
          id: uuidv4(),
          name: 'Audio 1',
          type: 'audio',
          volume: 0.8,
          pan: 0,
          muted: false,
          soloed: false,
          regions: [],
          effects: [],
        }
      ],
      selectedTrackId: null,
      activeRegionId: null,
      selectedRegionId: null,
      isRecording: false,
      metronomeEnabled: false,
      snapEnabled: true,
      isProcessing: false,
      activeTool: 'pointer',
      projectId: null,

      setTool: (tool) => set({ activeTool: tool }),
      setProjectId: (id) => set({ projectId: id }),
      setPlaying: (playing) => set({ isPlaying: playing }),
      setRecording: (recording) => set({ isRecording: recording }),
      setMetronome: (enabled) => set({ metronomeEnabled: enabled }),
      setSnap: (enabled) => set({ snapEnabled: enabled }),
      setSelectedRegion: (id) => set({ selectedRegionId: id }),
      setProcessing: (processing) => set({ isProcessing: processing }),
      setCurrentTime: (time) => set({ currentTime: time }),
      setActiveRegion: (id) => set({ activeRegionId: id }),
      setBpm: (bpm) => set({ bpm }),
      addTrack: (name, type = 'audio') => set((state) => ({
        tracks: [
          ...state.tracks,
          {
            id: uuidv4(),
            name,
            type,
            volume: 0.8,
            pan: 0,
            muted: false,
            soloed: false,
            regions: [],
            effects: [],
            instrument: type === 'midi' ? {
              id: uuidv4(),
              name: 'Deep Bass Synth',
              type: 'synth-mono',
              settings: { cutoff: 800, resonance: 2, attack: 0.05, release: 0.3 }
            } : undefined
          }
        ]
      })),
      deleteRegion: (trackId, regionId) => set((state) => ({
        tracks: state.tracks.map(t => t.id === trackId ? { ...t, regions: t.regions.filter(r => r.id !== regionId) } : t),
        selectedRegionId: state.selectedRegionId === regionId ? null : state.selectedRegionId,
        activeRegionId: state.activeRegionId === regionId ? null : state.activeRegionId
      })),
      updateRegion: (trackId, regionId, updates) => set((state) => ({
        tracks: state.tracks.map(t => t.id === trackId ? {
          ...t,
          regions: t.regions.map(r => r.id === regionId ? { ...r, ...updates } : r)
        } : t)
      })),
      updateTrack: (id, updates) => set((state) => ({
        tracks: state.tracks.map(t => t.id === id ? { ...t, ...updates } : t)
      })),
      removeTrack: (id) => set((state) => ({
        tracks: state.tracks.filter(t => t.id !== id),
        selectedTrackId: state.selectedTrackId === id ? null : state.selectedTrackId
      })),
      addRegion: (trackId, region) => set((state) => ({
        tracks: state.tracks.map(t => 
          t.id === trackId 
            ? { ...t, regions: [...t.regions, { ...region, id: uuidv4() }] } 
            : t
        )
      })),
      updateTrackInstrument: (trackId, updates) => set((state) => ({
        tracks: state.tracks.map(t => 
          t.id === trackId && t.instrument 
            ? { ...t, instrument: { ...t.instrument, settings: { ...t.instrument.settings, ...updates } } } 
            : t
        )
      })),
      setProject: (name, tracks) => set({ projectName: name, tracks }),
      setProjectName: (name) => set({ projectName: name })
    }),
    {
      name: 'soundspace-storage',
      //@ts-ignore - AudioBuffer is not serializable, we need to handle this
      partialize: (state) => ({
        projectName: state.projectName,
        projectId: state.projectId,
        tracks: state.tracks.map(t => ({
          ...t,
          regions: t.regions.map(({ buffer, ...r }) => r) // Strip buffers from persistence
        })),
        bpm: state.bpm,
        duration: state.duration
      })
    }
  )
);
