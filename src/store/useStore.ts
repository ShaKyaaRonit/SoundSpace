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
  clipOffset?: number;
  audioUrl?: string;
  buffer?: AudioBuffer;
  notes?: Note[]; // MIDI notes for patterns
  name?: string;
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
  loopEnabled: boolean;
  loopStart: number;
  loopEnd: number;
  selectedRegionId: string | null;
  isProcessing: boolean; // For AI tasks
  processingMessage: string | null;
  notice: {
    id: string;
    type: 'success' | 'error' | 'info';
    message: string;
  } | null;
  activeTool: 'pointer' | 'scissors';
  projectId: string | null;
  
  // Actions
  setTool: (tool: 'pointer' | 'scissors') => void;
  setProjectId: (id: string | null) => void;
  setPlaying: (playing: boolean) => void;
  setRecording: (recording: boolean) => void;
  setMetronome: (enabled: boolean) => void;
  setSnap: (enabled: boolean) => void;
  setLoopEnabled: (enabled: boolean) => void;
  setLoopRange: (start: number, end: number) => void;
  setSelectedRegion: (id: string | null) => void;
  setProcessing: (processing: boolean, message?: string | null) => void;
  notify: (message: string, type?: 'success' | 'error' | 'info') => void;
  clearNotice: () => void;
  setCurrentTime: (time: number) => void;
  setActiveRegion: (id: string | null) => void;
  setBpm: (bpm: number) => void;
  addTrack: (name: string, type?: 'audio' | 'midi') => string;
  deleteRegion: (trackId: string, regionId: string) => void;
  duplicateRegion: (regionId: string) => string | null;
  splitRegion: (trackId: string, regionId: string, offsetSeconds: number) => [string, string] | null;
  updateRegion: (trackId: string, regionId: string, updates: Partial<Region>) => void;
  updateTrack: (id: string, updates: Partial<Track>) => void;
  removeTrack: (id: string) => void;
  addRegion: (trackId: string, region: Omit<Region, 'id'>) => string;
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
      loopEnabled: false,
      loopStart: 0,
      loopEnd: 8,
      isProcessing: false,
      processingMessage: null,
      notice: null,
      activeTool: 'pointer',
      projectId: null,

      setTool: (tool) => set({ activeTool: tool }),
      setProjectId: (id) => set({ projectId: id }),
      setPlaying: (playing) => set({ isPlaying: playing }),
      setRecording: (recording) => set({ isRecording: recording }),
      setMetronome: (enabled) => set({ metronomeEnabled: enabled }),
      setSnap: (enabled) => set({ snapEnabled: enabled }),
      setLoopEnabled: (enabled) => set({ loopEnabled: enabled }),
      setLoopRange: (start, end) => set({
        loopStart: Math.max(0, Math.min(start, end - 0.25)),
        loopEnd: Math.max(end, start + 0.25)
      }),
      setSelectedRegion: (id) => set({ selectedRegionId: id }),
      setProcessing: (processing, message = null) => set({ isProcessing: processing, processingMessage: processing ? message : null }),
      notify: (message, type = 'info') => set({ notice: { id: uuidv4(), type, message } }),
      clearNotice: () => set({ notice: null }),
      setCurrentTime: (time) => set({ currentTime: time }),
      setActiveRegion: (id) => set({ activeRegionId: id }),
      setBpm: (bpm) => set({ bpm: Number.isFinite(bpm) ? Math.min(240, Math.max(40, bpm)) : 120 }),
      addTrack: (name, type = 'audio') => {
        const id = uuidv4();
        set((state) => ({
          selectedTrackId: id,
          tracks: [
            ...state.tracks,
            {
              id,
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
        }));
        return id;
      },
      deleteRegion: (trackId, regionId) => set((state) => ({
        tracks: state.tracks.map(t => t.id === trackId ? { ...t, regions: t.regions.filter(r => r.id !== regionId) } : t),
        selectedRegionId: state.selectedRegionId === regionId ? null : state.selectedRegionId,
        activeRegionId: state.activeRegionId === regionId ? null : state.activeRegionId
      })),
      duplicateRegion: (regionId) => {
        const id = uuidv4();
        let didDuplicate = false;
        set((state) => {
          const tracks = state.tracks.map(track => {
            const region = track.regions.find(r => r.id === regionId);
            if (!region) return track;

            didDuplicate = true;
            const beatDuration = 60 / state.bpm;
            const duplicateStart = region.startTime + (state.snapEnabled ? beatDuration : Math.min(1, region.duration));
            return {
              ...track,
              regions: [
                ...track.regions,
                {
                  ...region,
                  id,
                  startTime: duplicateStart,
                  name: region.name ? `${region.name} copy` : undefined
                }
              ]
            };
          });

          return didDuplicate ? { tracks, selectedRegionId: id } : {};
        });

        return didDuplicate ? id : null;
      },
      splitRegion: (trackId, regionId, offsetSeconds) => {
        const firstId = uuidv4();
        const secondId = uuidv4();
        let didSplit = false;

        set((state) => ({
          tracks: state.tracks.map(track => {
            if (track.id !== trackId) return track;

            const region = track.regions.find(r => r.id === regionId);
            if (!region || offsetSeconds <= 0.05 || offsetSeconds >= region.duration - 0.05) return track;

            didSplit = true;
            const secondsPerBeat = 60 / state.bpm;
            const splitBeat = offsetSeconds / secondsPerBeat;
            const firstNotes = region.notes?.filter(note => note.startTime < splitBeat);
            const secondNotes = region.notes
              ?.filter(note => note.startTime + note.duration > splitBeat)
              .map(note => ({
                ...note,
                id: uuidv4(),
                startTime: Math.max(0, note.startTime - splitBeat)
              }));

            const firstRegion: Region = {
              ...region,
              id: firstId,
              duration: offsetSeconds,
              notes: firstNotes
            };
            const secondRegion: Region = {
              ...region,
              id: secondId,
              startTime: region.startTime + offsetSeconds,
              duration: region.duration - offsetSeconds,
              clipOffset: (region.clipOffset || 0) + offsetSeconds,
              notes: secondNotes
            };

            return {
              ...track,
              regions: track.regions
                .filter(r => r.id !== regionId)
                .concat(firstRegion, secondRegion)
            };
          }),
          selectedRegionId: secondId,
          activeRegionId: state.activeRegionId === regionId ? null : state.activeRegionId
        }));

        return didSplit ? [firstId, secondId] : null;
      },
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
        selectedTrackId: state.selectedTrackId === id ? null : state.selectedTrackId,
        selectedRegionId: state.tracks.find(t => t.id === id)?.regions.some(r => r.id === state.selectedRegionId) ? null : state.selectedRegionId,
        activeRegionId: state.tracks.find(t => t.id === id)?.regions.some(r => r.id === state.activeRegionId) ? null : state.activeRegionId
      })),
      addRegion: (trackId, region) => {
        const id = uuidv4();
        set((state) => ({
          selectedRegionId: id,
          tracks: state.tracks.map(t => 
            t.id === trackId 
              ? { ...t, regions: [...t.regions, { ...region, id }] } 
              : t
          )
        }));
        return id;
      },
      updateTrackInstrument: (trackId, updates) => set((state) => ({
        tracks: state.tracks.map(t => 
          t.id === trackId && t.instrument 
            ? { ...t, instrument: { ...t.instrument, settings: { ...t.instrument.settings, ...updates } } } 
            : t
        )
      })),
      setProject: (name, tracks) => set({
        projectName: name,
        tracks,
        currentTime: 0,
        isPlaying: false,
        isRecording: false,
        loopEnabled: false,
        selectedTrackId: tracks[0]?.id ?? null,
        selectedRegionId: null,
        activeRegionId: null
      }),
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
        duration: state.duration,
        loopEnabled: state.loopEnabled,
        loopStart: state.loopStart,
        loopEnd: state.loopEnd
      })
    }
  )
);
