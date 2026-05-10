import React from 'react';
import { useStore, Track, Effect } from '../store/useStore';
import { Power, X, ChevronDown, Sliders, Activity, Music } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export default function PluginRack() {
  const { tracks, selectedTrackId, updateTrack, updateTrackInstrument } = useStore();
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

  const handleInstrumentChange = (type: any) => {
    const defaultSettings: any = {
      'synth-mono': { cutoff: 1500, resonance: 2, attack: 0.05, release: 0.3 },
      'synth-pad': { attack: 0.8, release: 1.5 },
      'synth-lead': { cutoff: 2000, decay: 0.5 },
      'drums': {}
    };

    updateTrack(track.id, {
      instrument: {
        id: uuidv4(),
        name: type.replace('-', ' ').toUpperCase(),
        type,
        settings: defaultSettings[type] || {}
      }
    });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Instrument Slot (MIDI Only) */}
      {track.type === 'midi' && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[10px] font-bold uppercase text-brand-orange tracking-wider">Virtual Instrument</span>
          </div>
          <div className="bg-zinc-900 border border-zinc-700/50 rounded-xl p-4 shadow-xl">
             <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-brand-orange/20 text-brand-orange rounded-lg flex items-center justify-center">
                   <Music size={20} />
                </div>
                <div className="flex-1">
                   <select 
                     value={track.instrument?.type || 'synth-mono'}
                     onChange={(e) => handleInstrumentChange(e.target.value)}
                     className="w-full bg-zinc-950 border-zinc-800 text-white font-black uppercase text-[10px] tracking-widest rounded px-2 py-1 focus:ring-brand-orange"
                   >
                     <option value="synth-mono">Analog Mono Synth</option>
                     <option value="synth-pad">Ethereal Pad</option>
                     <option value="synth-lead">Screaming Lead</option>
                     <option value="drums">Drum Machine V1</option>
                   </select>
                   <div className="text-[8px] text-zinc-600 font-bold uppercase mt-1">Professional VST Engine</div>
                </div>
             </div>

             {/* Instrument Parameters */}
             {track.instrument?.settings && (
               <div className="grid grid-cols-2 gap-4">
                  {Object.entries(track.instrument.settings).map(([key, value]) => (
                    <div key={key} className="flex flex-col items-center gap-1 group">
                       <span className="text-[8px] uppercase font-bold text-zinc-500 group-hover:text-zinc-300 transition-colors uppercase tracking-widest">{key}</span>
                       <input 
                         type="range" 
                         min={0}
                         max={key === 'cutoff' ? 5000 : key === 'resonance' ? 20 : 2}
                         step={0.01}
                         value={value as number}
                         onChange={(e) => updateTrackInstrument(track.id, { [key]: parseFloat(e.target.value) })}
                         className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-brand-orange"
                       />
                       <span className="text-[8px] font-mono text-zinc-600">{(value as number).toFixed(2)}</span>
                    </div>
                  ))}
               </div>
             )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">Plugin Rack (FX)</span>
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
