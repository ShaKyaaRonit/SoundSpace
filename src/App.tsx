import React, { useEffect, useRef } from 'react';
import { Play, Pause, Square, Mic, Plus, Settings, Save, ListMusic } from 'lucide-react';
import { useStore } from './store/useStore';
import { audioEngine } from './lib/audio-engine';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Components
import Toolbar from './components/Toolbar';
import TrackHeaders from './components/TrackHeaders';
import Timeline from './components/Timeline';
import Mixer from './components/Mixer';
import Sidebar from './components/Sidebar';
import PianoRoll from './components/PianoRoll/PianoRoll';

export default function App() {
  const { isPlaying, currentTime, setCurrentTime, setPlaying, metronomeEnabled, bpm, setMetronome, snapEnabled, setSnap, isRecording, setRecording, selectedRegionId, deleteRegion, selectedTrackId, activeTool, setTool } = useStore();
  const requestRef = useRef<number>(null);
  const lastTimeRef = useRef<number>(0);
  const lastBeatRef = useRef<number>(-1);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
          setPlaying(!isPlaying);
          break;
        case 'KeyR':
          setRecording(!isRecording);
          break;
        case 'KeyM':
          setMetronome(!metronomeEnabled);
          break;
        case 'KeyS':
          setSnap(!snapEnabled);
          break;
        case 'Backspace':
        case 'Delete':
          if (selectedRegionId && selectedTrackId) {
            deleteRegion(selectedTrackId, selectedRegionId);
          }
          break;
        case 'Enter':
          setPlaying(false);
          setCurrentTime(0);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isRecording, metronomeEnabled, snapEnabled, selectedRegionId, selectedTrackId]);

  // Synchronization loop using requestAnimationFrame
  const animate = (time: number) => {
    if (isPlaying) {
      if (lastTimeRef.current > 0) {
        const deltaTime = (time - lastTimeRef.current) / 1000;
        const nextTime = currentTime + deltaTime;
        setCurrentTime(nextTime);

        if (metronomeEnabled) {
          const currentBeat = Math.floor(nextTime * (bpm / 60));
          if (currentBeat > lastBeatRef.current) {
            audioEngine.playNote(currentBeat % 4 === 0 ? 84 : 72, 0.05, "master");
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
  }, [isPlaying, metronomeEnabled, bpm]); // Removed currentTime from dependencies

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
            <button className="p-1 hover:bg-bg-accent rounded transition-colors text-zinc-600 hover:text-zinc-100">
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
    </div>
  );
}
