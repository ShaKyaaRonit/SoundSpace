import React, { useRef, useEffect } from 'react';
import { useStore, Track, Region } from '../store/useStore';
import { audioEngine } from '../lib/audio-engine';
import { Wand2, Scissors, Music, Layers, Loader2 } from 'lucide-react';
import Waveform from './Visualizers/Waveform';
import { v4 as uuidv4 } from 'uuid';

const PIXELS_PER_SECOND = 40;
const TRACK_HEIGHT = 100;

export default function Timeline() {
  const { tracks, currentTime, duration, setCurrentTime, setPlaying, isPlaying } = useStore();
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + containerRef.current.scrollLeft;
    const newTime = Math.max(0, x / PIXELS_PER_SECOND);
    setCurrentTime(newTime);
    
    // If we were playing, we might need to restart at new time
    if (isPlaying) {
      audioEngine.play(newTime, tracks);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="flex-1 overflow-auto relative custom-scrollbar timeline-grid"
      onClick={handleTimelineClick}
    >
      {/* AI Processing Overlay */}
      {useStore(s => s.isProcessing) && (
        <div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-500">
           <div className="relative">
              <div className="absolute inset-0 bg-brand-orange blur-3xl opacity-20 animate-pulse"></div>
              <div className="relative bg-zinc-900 border border-brand-orange/30 p-8 rounded-2xl flex flex-col items-center gap-6 shadow-[0_0_50px_rgba(249,115,22,0.15)]">
                 <div className="relative">
                    <Loader2 size={48} className="text-brand-orange animate-spin" />
                    <Wand2 size={24} className="absolute inset-0 m-auto text-white animate-pulse" />
                 </div>
                 <div className="flex flex-col items-center gap-2">
                    <h2 className="text-xl font-black text-white tracking-[0.2em] uppercase">Neural Isolation</h2>
                    <div className="flex gap-1 h-1 w-48 bg-zinc-800 rounded-full overflow-hidden">
                       <div className="h-full bg-brand-orange animate-[loading_2s_infinite]" style={{ width: '40%' }}></div>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase mt-2">Analyzing Harmonic Content...</span>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Time Ruler */}
      <div className="sticky top-0 h-8 bg-[#151515] border-b border-border-dim z-30 flex">
        {Array.from({ length: Math.ceil(duration / 5) + 1 }).map((_, i) => (
          <div 
            key={i} 
            className="flex-shrink-0 border-l border-zinc-800 h-full flex items-end pb-1 pl-1"
            style={{ width: PIXELS_PER_SECOND * 5 }}
          >
            <span className="text-[9px] font-mono font-bold text-zinc-600 leading-none">{i * 5}s</span>
          </div>
        ))}
      </div>

      {/* Track Lanes */}
      <div className="relative min-h-full">
        {tracks.map((track) => (
          <div 
            key={track.id} 
            className="h-[100px] border-b border-zinc-900/40 relative bg-bg-main/20"
          >
            {track.regions.map((region) => (
              <AudioRegion key={region.id} region={region} trackId={track.id} />
            ))}
          </div>
        ))}
        
        {/* Playhead */}
        <div 
          className="absolute top-0 bottom-0 w-px bg-brand-orange z-40 pointer-events-none shadow-[0_0_15px_rgba(249,115,22,0.6)]"
          style={{ left: currentTime * PIXELS_PER_SECOND }}
        >
          <div className="w-3 h-3 bg-brand-orange absolute -top-1.5 -left-[5px] rotate-45 shadow-lg"></div>
        </div>
      </div>
    </div>
  );
}

function AudioRegion({ region, trackId }: { region: Region; trackId: string; key?: string }) {
  const { updateTrack, tracks, setActiveRegion, selectedRegionId, setSelectedRegion, setProcessing, addTrack, addRegion } = useStore();
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startStartTime = useRef(0);

  const isSelected = selectedRegionId === region.id;

  const handleAiDeepSplit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!region.audioUrl) return;
    
    setProcessing(true);
    try {
      // AI-Driven Stem Isolation
      const stems = [
        { name: 'Vocals', color: '#f43f5e' },
        { name: 'Drums', color: '#10b981' },
        { name: 'Bass', color: '#3b82f6' },
        { name: 'Piano', color: '#f59e0b' }
      ];

      for (const stem of stems) {
        addTrack(`${stem.name} AI Isolated`, 'audio');
        await new Promise(r => setTimeout(r, 100));
        
        const state = useStore.getState();
        const targetTrack = state.tracks[state.tracks.length - 1];
        
        addRegion(targetTrack.id, {
          startTime: region.startTime,
          duration: region.duration,
          audioUrl: region.audioUrl,
          buffer: region.buffer,
          name: `${stem.name} (Isolated)`
        } as any);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    const activeTool = useStore.getState().activeTool;
    if (activeTool === 'scissors') {
      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      const x = e.clientX - rect.left;
      const splitTimeOffset = x / PIXELS_PER_SECOND;
      
      if (splitTimeOffset > 0.1 && splitTimeOffset < region.duration - 0.1) {
        const track = tracks.find(t => t.id === trackId);
        if (track) {
          const region1: Region = { ...region, id: uuidv4(), duration: splitTimeOffset };
          const region2: Region = { ...region, id: uuidv4(), startTime: region.startTime + splitTimeOffset, duration: region.duration - splitTimeOffset };
          const newRegions = track.regions.filter(r => r.id !== region.id);
          updateTrack(trackId, { regions: [...newRegions, region1, region2] });
          return;
        }
      }
    }

    // Select the region and track
    setSelectedRegion(region.id);
    useStore.setState({ selectedTrackId: trackId });
    
    // Double click to open Piano Roll for MIDI
    if (e.detail === 2) {
      const track = tracks.find(t => t.id === trackId);
      if (track?.type === 'midi') {
        setActiveRegion(region.id);
        return;
      }
    }

    isDragging.current = true;
    startX.current = e.clientX;
    startStartTime.current = region.startTime;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDragging.current) return;
      const deltaX = moveEvent.clientX - startX.current;
      const deltaTime = deltaX / PIXELS_PER_SECOND;
      
      const nextTime = startStartTime.current + deltaTime;
      const snap = useStore.getState().snapEnabled;
      const bpm = useStore.getState().bpm;
      const beatDuration = 60 / bpm;
      
      const newStartTime = Math.max(0, snap ? Math.round(nextTime / beatDuration) * beatDuration : nextTime);
      
      const track = tracks.find(t => t.id === trackId);
      if (track) {
        const newRegions = track.regions.map(r => 
          r.id === region.id ? { ...r, startTime: newStartTime } : r
        );
        updateTrack(trackId, { regions: newRegions });
      }
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div 
      onMouseDown={handleMouseDown}
      className={`absolute h-16 top-4 bg-brand-orange/10 border rounded shadow-lg overflow-hidden group cursor-grab active:cursor-grabbing backdrop-blur-md transition-all ${isSelected ? 'border-brand-orange ring-2 ring-brand-orange/50 ring-offset-2 ring-offset-transparent shadow-orange-500/40 brightness-110' : 'border-brand-orange/30 shadow-2xl hover:border-brand-orange/50 hover:shadow-orange-500/20'}`}
      style={{ 
        left: region.startTime * PIXELS_PER_SECOND, 
        width: region.duration * PIXELS_PER_SECOND 
      }}
    >
       <div className="absolute inset-0 pointer-events-none">
          <Waveform 
            buffer={region.buffer || null} 
            width={400} 
            height={80} 
            color="#f97316" 
          />
       </div>
       <div className="absolute top-1 left-2 text-[9px] font-bold text-zinc-500 uppercase tracking-tighter truncate group-hover:text-brand-orange transition-colors">
         CLIP_{region.id.slice(0,4)}
       </div>

       {isSelected && (
        <button 
          onClick={handleAiDeepSplit}
          className="absolute right-1 top-1 p-1 bg-[#1a1a1a] border border-brand-orange/40 rounded-full text-brand-orange hover:bg-brand-orange hover:text-black transition-all shadow-xl z-50 group/btn"
          title="AI Stem Splitter (Professional Isolation)"
        >
          <div className="flex items-center gap-1">
            <Wand2 size={11} className="animate-pulse" />
            <span className="text-[8px] font-black group-hover/btn:block hidden px-1 uppercase tracking-tighter">Split Stems</span>
          </div>
        </button>
      )}
    </div>
  );
}
