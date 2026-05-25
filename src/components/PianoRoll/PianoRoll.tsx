import React, { useState } from 'react';
import { X, Wand2, Music, Pencil, Trash2 } from 'lucide-react';
import { useStore, Note, Region } from '../../store/useStore';
import { audioEngine } from '../../lib/audio-engine';
import { aiService } from '../../services/aiService';

const KEY_HEIGHT = 20;
const BEAT_WIDTH = 80;
const TOTAL_NOTES = 60; // 5 octaves

export default function PianoRoll() {
  const { activeRegionId, tracks, updateTrack, setActiveRegion, notify } = useStore();
  const [tool, setTool] = useState<'pencil' | 'trash'>('pencil');
  
  if (!activeRegionId) return null;

  const activeTrack = tracks.find(t => t.regions.some(reg => reg.id === activeRegionId));
  const activeRegion: Region | undefined = activeTrack?.regions.find(reg => reg.id === activeRegionId);

  if (!activeTrack || !activeRegion) return null;

  const activeTrackId = activeTrack.id;
  const notes: Note[] = activeRegion.notes || [];

  const handleAddNote = (e: React.MouseEvent) => {
    if (tool !== 'pencil') return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const beat = Math.floor(x / BEAT_WIDTH);
    const midi = 100 - Math.floor(y / KEY_HEIGHT);

    const newNote: Note = {
      id: Math.random().toString(36).substr(2, 9),
      midi,
      startTime: beat,
      duration: 1,
      velocity: 100
    };

    const newRegions = tracks.find(t => t.id === activeTrackId)!.regions.map(r => 
      r.id === activeRegionId ? { ...r, notes: [...(r.notes || []), newNote] } : r
    );

    updateTrack(activeTrackId, { regions: newRegions });
    audioEngine.playNote(midi, 0.5, activeTrackId);
  };

  const handleRemoveNote = (noteId: string) => {
    const newRegions = tracks.find(t => t.id === activeTrackId)!.regions.map(r => 
      r.id === activeRegionId ? { ...r, notes: (r.notes || []).filter(n => n.id !== noteId) } : r
    );
    updateTrack(activeTrackId, { regions: newRegions });
  };

  const handleAIChords = async () => {
    try {
      const progression = await aiService.generateChords("C", "Major", "Epic Cinematic");
      const newNotes: Note[] = [];
      progression.chords.forEach(chord => {
        chord.notes.forEach(noteName => {
          // Simplified note name to MIDI
          const midiMap: Record<string, number> = { 'C4': 60, 'D4': 62, 'E4': 64, 'F4': 65, 'G4': 67, 'A4': 69, 'B4': 71, 'C5': 72 };
          const midi = midiMap[noteName] || 60;
          newNotes.push({
            id: Math.random().toString(36),
            midi,
            startTime: chord.startTime,
            duration: chord.duration,
            velocity: 90
          });
        });
      });

      const newRegions = tracks.find(t => t.id === activeTrackId)!.regions.map(r => 
        r.id === activeRegionId ? { ...r, notes: newNotes } : r
      );
      updateTrack(activeTrackId, { regions: newRegions });
      notify('AI chords added to the MIDI clip.', 'success');
    } catch (e) {
      notify('AI chords failed. Check the Gemini key and try again.', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0a] flex flex-col border-t border-brand-orange/30 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="h-12 bg-bg-surface border-b border-border-dim flex items-center px-4 justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Music size={16} className="text-brand-orange" />
            <span className="text-xs font-bold uppercase tracking-widest text-zinc-300">Piano Roll - {activeRegionId.slice(0, 8)}</span>
          </div>
          <div className="flex items-center gap-px bg-bg-main rounded p-0.5 border border-white/5">
            <button 
              onClick={() => setTool('pencil')}
              className={`p-1.5 rounded ${tool === 'pencil' ? 'bg-brand-orange text-black' : 'text-zinc-500 hover:text-white'}`}
            >
              <Pencil size={14} />
            </button>
            <button 
              onClick={() => setTool('trash')}
              className={`p-1.5 rounded ${tool === 'trash' ? 'bg-red-600 text-white' : 'text-zinc-500 hover:text-white'}`}
            >
              <Trash2 size={14} />
            </button>
          </div>
          <button 
            onClick={handleAIChords}
            className="flex items-center gap-2 bg-brand-orange/10 hover:bg-brand-orange/20 border border-brand-orange/30 px-3 py-1 rounded text-[10px] font-bold text-brand-orange transition-all"
          >
            <Wand2 size={12} />
            AI CHORDS
          </button>
        </div>
        <button onClick={() => setActiveRegion(null)} className="text-zinc-500 hover:text-white transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Keys */}
        <div className="w-20 bg-bg-surface border-r border-border-dim overflow-y-auto scrollbar-hide">
          {Array.from({ length: TOTAL_NOTES }).map((_, i) => {
            const midi = 100 - i;
            const isBlack = [1, 3, 6, 8, 10].includes(midi % 12);
            return (
              <div 
                key={midi} 
                className={`h-[20px] border-b border-zinc-900 flex items-center justify-end px-2 text-[8px] font-mono ${isBlack ? 'bg-zinc-900 text-zinc-600' : 'bg-white text-zinc-400'}`}
                style={{ height: KEY_HEIGHT }}
              >
                {midi % 12 === 0 && `C${Math.floor(midi / 12) - 1}`}
              </div>
            );
          })}
        </div>

        {/* Grid */}
        <div className="flex-1 relative overflow-auto bg-grid-pattern">
          <div 
            onClick={handleAddNote}
            className="relative" 
            style={{ 
              width: BEAT_WIDTH * 32, 
              height: TOTAL_NOTES * KEY_HEIGHT,
              backgroundImage: 'linear-gradient(to right, #1a1a1a 1px, transparent 1px), linear-gradient(to bottom, #1a1a1a 1px, transparent 1px)',
              backgroundSize: `${BEAT_WIDTH}px ${KEY_HEIGHT}px`
            }}
          >
            {notes.map((note) => (
              <div 
                key={note.id}
                onClick={(e) => {
                  e.stopPropagation();
                  if (tool === 'trash') handleRemoveNote(note.id);
                  else audioEngine.playNote(note.midi, 0.5, activeTrackId);
                }}
                className={`absolute bg-brand-orange border border-white/20 rounded shadow-[0_0_10px_rgba(234,88,12,0.3)] cursor-pointer hover:brightness-125 transition-all ${tool === 'trash' && 'hover:bg-red-600'}`}
                style={{
                  left: note.startTime * BEAT_WIDTH,
                  top: (100 - note.midi) * KEY_HEIGHT,
                  width: note.duration * BEAT_WIDTH,
                  height: KEY_HEIGHT - 1
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
