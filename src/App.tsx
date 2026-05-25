import React, { useEffect, useRef } from 'react';
import { Plus, X } from 'lucide-react';
import { useStore } from './store/useStore';
import { audioEngine } from './lib/audio-engine';
import { stopTransport, togglePlayback, toggleRecording } from './lib/transport';

// Components
import Toolbar from './components/Toolbar';
import TrackHeaders from './components/TrackHeaders';
import Timeline from './components/Timeline';
import Mixer from './components/Mixer';
import Sidebar from './components/Sidebar';
import PianoRoll from './components/PianoRoll/PianoRoll';

export default function App() {
  const { isPlaying, setCurrentTime, metronomeEnabled, setMetronome, snapEnabled, setSnap, selectedRegionId, deleteRegion, selectedTrackId, activeTool, setTool, addTrack, notify } = useStore();
  const requestRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const lastBeatRef = useRef<number>(-1);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      switch (e.code) {
        case 'KeyV':
          setTool('pointer');
          break;
        case 'KeyC':
          setTool('scissors');
          break;
        case 'Space':
          e.preventDefault();
          try {
            await togglePlayback();
          } catch {
            notify('Playback could not start. Try again after the audio engine is ready.', 'error');
          }
          break;
        case 'KeyR':
          try {
            await toggleRecording();
          } catch {
            notify('Recording could not start. Check microphone permission and try again.', 'error');
          }
          break;
        case 'KeyM':
          setMetronome(!metronomeEnabled);
          break;
        case 'KeyS':
          setSnap(!snapEnabled);
          break;
        case 'KeyL': {
          const state = useStore.getState();
          state.setLoopEnabled(!state.loopEnabled);
          notify(state.loopEnabled ? 'Loop disabled.' : 'Loop enabled.', 'info');
          break;
        }
        case 'KeyD':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (selectedRegionId && useStore.getState().duplicateRegion(selectedRegionId)) {
              notify('Clip duplicated.', 'success');
            }
          }
          break;
        case 'Backspace':
        case 'Delete':
          if (selectedRegionId && selectedTrackId) {
            deleteRegion(selectedTrackId, selectedRegionId);
          }
          break;
        case 'Enter':
          await stopTransport();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [metronomeEnabled, snapEnabled, selectedRegionId, selectedTrackId, notify]);

  // Synchronization loop using requestAnimationFrame
  const animate = (time: number) => {
    const state = useStore.getState();
    if (state.isPlaying) {
      if (lastTimeRef.current > 0) {
        const deltaTime = (time - lastTimeRef.current) / 1000;
        let nextTime = state.currentTime + deltaTime;
        if (state.loopEnabled && nextTime >= state.loopEnd) {
          nextTime = state.loopStart;
          lastBeatRef.current = -1;
          audioEngine.play(state.loopStart, state.tracks);
        }
        setCurrentTime(nextTime);

        if (state.metronomeEnabled) {
          const currentBeat = Math.floor(nextTime * (state.bpm / 60));
          if (currentBeat > lastBeatRef.current) {
            audioEngine.playMetronomeTick();
            lastBeatRef.current = currentBeat;
          }
        }
      }
      lastTimeRef.current = time;
    } else {
      lastTimeRef.current = 0;
      lastBeatRef.current = -1;
    }
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, setCurrentTime]);

  // Real-time audio node updates
  const tracks = useStore(state => state.tracks);
  useEffect(() => {
    tracks.forEach(track => audioEngine.updateTrackParams(track));
  }, [tracks]);

  return (
    <div className={`flex flex-col h-screen bg-bg-main text-[#e0e0e0] overflow-hidden font-sans select-none ${activeTool === 'scissors' ? 'cursor-crosshair' : 'cursor-default'}`}>
      {/* Top Toolbar */}
      <Toolbar />

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Track Headers */}
        <div className="w-64 border-r border-border-dim flex flex-col bg-bg-sidebar">
          <div className="p-4 border-b border-border-dim flex justify-between items-center bg-bg-accent/30">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Track List</span>
            <button
              onClick={() => addTrack(`Audio ${useStore.getState().tracks.length + 1}`, 'audio')}
              className="p-1 hover:bg-bg-accent rounded transition-colors text-zinc-600 hover:text-zinc-100"
              title="Add audio track"
            >
              <Plus size={14} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-hide">
             <TrackHeaders />
          </div>
        </div>

        {/* Main Timeline Area */}
        <div className="flex-1 relative overflow-hidden flex flex-col bg-[#0d0d0d]">
           <Timeline />
        </div>

        {/* Right Sidebar - Assets/Loops */}
        <Sidebar export_hidden />
      </div>

      {/* Bottom Mixer Console */}
      <Mixer />
      <PianoRoll />
      <NoticeToast />
    </div>
  );
}

function NoticeToast() {
  const notice = useStore(state => state.notice);
  const clearNotice = useStore(state => state.clearNotice);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(clearNotice, 4200);
    return () => window.clearTimeout(timeout);
  }, [notice, clearNotice]);

  if (!notice) return null;

  const tone = notice.type === 'error'
    ? 'border-red-500/40 bg-red-500/10 text-red-100'
    : notice.type === 'success'
      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
      : 'border-brand-orange/40 bg-brand-orange/10 text-orange-100';

  return (
    <div className={`fixed right-4 top-20 z-[120] flex max-w-sm items-start gap-3 rounded border px-4 py-3 shadow-2xl backdrop-blur ${tone}`}>
      <p className="text-sm leading-relaxed">{notice.message}</p>
      <button onClick={clearNotice} className="mt-0.5 text-current opacity-70 hover:opacity-100" title="Dismiss">
        <X size={14} />
      </button>
    </div>
  );
}
