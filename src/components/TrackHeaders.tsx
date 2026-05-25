import React, { useState } from 'react';
import { Volume2, VolumeX, Mic, MoreVertical, Hash, Wand2, Loader2 } from 'lucide-react';
import { useStore, Track } from '../store/useStore';
import { aiService } from '../services/aiService';

export default function TrackHeaders() {
  const { tracks, updateTrack, selectedTrackId, setSelectedRegion } = useStore();

  return (
    <div className="flex flex-col">
      {tracks.map((track, index) => (
        <TrackHeaderItem 
          key={track.id} 
          track={track} 
          index={index}
          isActive={selectedTrackId === track.id}
          onSelect={() => {
            useStore.setState({ selectedTrackId: track.id });
            setSelectedRegion(null); // Clear region selection when selecting track
          }}
          onUpdate={(updates) => updateTrack(track.id, updates)}
        />
      ))}
    </div>
  );
}

function TrackHeaderItem({ track, index, isActive, onUpdate, onSelect }: { 
  track: Track; 
  index: number; 
  isActive: boolean;
  onUpdate: (updates: Partial<Track>) => void;
  onSelect: () => void;
  key?: string;
}) {
  const [isBalancing, setIsBalancing] = useState(false);
  const notify = useStore(state => state.notify);

  const handleAiBalance = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsBalancing(true);
    try {
      const suggestion = await aiService.getTrackBalanceSuggestions(track.name, track.type);
      onUpdate({
        volume: Math.max(0, Math.min(1.5, suggestion.volume)),
        pan: Math.max(-1, Math.min(1, suggestion.pan))
      });
      notify(`Balanced ${track.name}.`, 'success');
    } catch (e) {
      notify('AI balance failed. Check the Gemini key and try again.', 'error');
    } finally {
      setIsBalancing(false);
    }
  };

  return (
    <div 
      onClick={onSelect}
      className={`h-[100px] border-b border-zinc-900 group transition-colors relative flex flex-col p-3 cursor-default ${isActive ? 'bg-zinc-800/80 shadow-[inset_4px_0_0_0_#f97316]' : 'hover:bg-zinc-900/40'}`}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="text-[10px] font-bold text-zinc-700 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">{index + 1}</span>
          <input 
            value={track.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            className="bg-transparent border-none focus:ring-0 text-sm font-semibold p-0 text-zinc-300 w-full truncate focus:text-zinc-100"
          />
        </div>
        {track.type === 'midi' && (
          <span className="text-[8px] bg-brand-orange/10 text-brand-orange px-1 rounded font-black uppercase tracking-widest mt-0.5">
            {track.instrument?.name || 'Instrument'}
          </span>
        )}
        <button className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-zinc-200 transition-opacity">
          <MoreVertical size={14} />
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-end gap-2">
        <div className="flex items-center gap-1.5">
          <button 
            onClick={(e) => { e.stopPropagation(); onUpdate({ muted: !track.muted }); }}
            className={`w-7 h-5 text-[9px] font-black rounded flex items-center justify-center transition-all border ${track.muted ? 'bg-zinc-950 border-orange-500/50 text-orange-500' : 'bg-zinc-900 border-zinc-800 text-zinc-600 hover:border-zinc-700'}`}
          >
            M
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onUpdate({ soloed: !track.soloed }); }}
            className={`w-7 h-5 text-[9px] font-black rounded flex items-center justify-center transition-all border ${track.soloed ? 'bg-zinc-950 border-yellow-500/50 text-yellow-500' : 'bg-zinc-900 border-zinc-800 text-zinc-600 hover:border-zinc-700'}`}
          >
            S
          </button>
          <button 
             onClick={handleAiBalance}
             className={`p-1 rounded transition-all ${isBalancing ? 'text-brand-orange animate-spin' : 'text-zinc-600 hover:text-brand-orange'}`}
             title="AI Balance"
          >
             <Wand2 size={12} />
          </button>
          <div className="flex-1" />
          <Mic size={12} className="text-zinc-700" />
        </div>
        
        {/* Subtle Volume Indicator */}
        <div className="h-1 bg-zinc-950 rounded-full overflow-hidden border border-zinc-900/50">
           <div 
             className="h-full bg-zinc-700 transition-all duration-300" 
             style={{ width: `${track.volume * 100}%` }}
           />
        </div>
      </div>
    </div>
  );
}
