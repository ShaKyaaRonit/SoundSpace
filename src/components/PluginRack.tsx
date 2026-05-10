import React from 'react';
import { useStore, Track, Effect } from '../store/useStore';
import { Power, X, ChevronDown, Sliders, Activity } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export default function PluginRack() {
  const { tracks, selectedTrackId, updateTrack } = useStore();
  const track = tracks.find(t => t.id === selectedTrackId);

  if (!track) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 gap-2 p-4">
        <Activity size={24} />
        <span className="text-[10px] uppercase font-bold tracking-widest">Select a track to view plugins</span>
      </div>
    );
  }

  const addEffect = () => {
    const newEffect: Effect = {
      id: uuidv4(),
      type: 'eq',
      params: { gain: 0, freq: 1000 },
      enabled: true
    };
    updateTrack(track.id, { effects: [...(track.effects || []), newEffect] });
  };

  const toggleEffect = (effectId: string) => {
    updateTrack(track.id, {
      effects: track.effects.map(e => e.id === effectId ? { ...e, enabled: !e.enabled } : e)
    });
  };

  const removeEffect = (effectId: string) => {
    updateTrack(track.id, {
      effects: track.effects.filter(e => e.id !== effectId)
    });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">Plugin Rack: {track.name}</span>
        <button 
          onClick={addEffect}
          className="text-[9px] bg-brand-orange/20 text-brand-orange hover:bg-brand-orange hover:text-black px-2 py-0.5 rounded transition-all font-bold tracking-widest uppercase border border-brand-orange/30"
        >
          Add FX
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {track.effects?.map((effect) => (
          <div key={effect.id} className={`bg-zinc-900 border border-zinc-800 rounded group transition-all ${!effect.enabled && 'opacity-50'}`}>
            <div className="flex items-center gap-2 p-2 border-b border-zinc-800/50">
              <button 
                onClick={() => toggleEffect(effect.id)}
                className={`w-3 h-3 rounded-full border border-black/50 transition-all ${effect.enabled ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-zinc-700'}`}
              />
              <span className="text-[10px] font-bold text-zinc-300 uppercase flex-1">{effect.type} v1.0</span>
              <button 
                onClick={() => removeEffect(effect.id)}
                className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-500 transition-all"
              >
                <X size={12} />
              </button>
            </div>
            
            <div className="p-3 space-y-3 bg-black/20">
              {/* Parameter Dials Simulation */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 rounded-full border-2 border-zinc-800 relative flex items-center justify-center bg-zinc-900 shadow-inner group/knob">
                    <div className="w-1 h-3 bg-brand-orange/60 absolute top-1 rounded-full origin-bottom -rotate-45" />
                    <span className="text-[8px] font-mono text-zinc-500 mt-1">45%</span>
                  </div>
                  <span className="text-[7px] uppercase font-bold text-zinc-600 tracking-tighter">Amount</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 rounded-full border-2 border-zinc-800 relative flex items-center justify-center bg-zinc-900 shadow-inner group/knob">
                    <div className="w-1 h-3 bg-emerald-500/60 absolute top-1 rounded-full origin-bottom rotate-12" />
                    <span className="text-[8px] font-mono text-zinc-500 mt-1">12ms</span>
                  </div>
                  <span className="text-[7px] uppercase font-bold text-zinc-600 tracking-tighter">Time</span>
                </div>
              </div>
            </div>
          </div>
        ))}

        {(!track.effects || track.effects.length === 0) && (
          <div className="border border-dashed border-zinc-800 rounded-lg p-8 flex flex-col items-center justify-center gap-2 text-zinc-700">
             <Sliders size={20} />
             <span className="text-[9px] uppercase font-bold tracking-widest">No Effects Loaded</span>
          </div>
        )}
      </div>
    </div>
  );
}
