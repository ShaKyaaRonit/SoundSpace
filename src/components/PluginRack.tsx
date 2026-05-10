import React from 'react';
import { useStore, Track, Effect } from '../store/useStore';
import { Power, X, ChevronDown, Sliders, Activity, Music, Zap } from 'lucide-react';
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
      'synth-mono': { cutoff: 1500, resonance: 2, attack: 0.05, release: 0.3, oscType: 'square' },
      'synth-pad': { attack: 0.8, release: 1.5, detune: 0.005 },
      'synth-lead': { cutoff: 2000, decay: 0.5, vibrato: 5 },
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

  const applyPreset = (presetName: string) => {
    if (!track.instrument) return;
    
    const presets: any = {
      'Fat Bass': { cutoff: 400, resonance: 8, attack: 0.01, release: 0.2, oscType: 'sawtooth' },
      'Acid Line': { cutoff: 1200, resonance: 15, attack: 0.05, release: 0.1, oscType: 'square' },
      'Cloudy': { attack: 1.5, release: 3.0, detune: 0.01 },
      'Metal Lead': { cutoff: 4000, decay: 0.2, vibrato: 12 }
    };

    if (presets[presetName]) {
      updateTrackInstrument(track.id, presets[presetName]);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Instrument Slot (MIDI Only) */}
      {track.type === 'midi' && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[10px] font-bold uppercase text-brand-orange tracking-wider flex items-center gap-2">
              <Zap size={12} />
              Virtual Instrument
            </span>
            <div className="flex gap-2">
               <span className="text-[8px] bg-zinc-800 px-1 rounded text-zinc-500 font-mono">CPU: 2%</span>
            </div>
          </div>
          <div className="bg-[#121214] border border-zinc-800 rounded-xl p-4 shadow-2xl relative overflow-hidden group">
             {/* Decorative VST Background Elements */}
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-orange via-yellow-500 to-brand-orange opacity-50" />
             <div className="absolute -right-4 -top-4 w-16 h-16 bg-brand-orange/5 blur-2xl rounded-full group-hover:bg-brand-orange/10 transition-all" />

             <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-zinc-950 border border-zinc-800 text-brand-orange rounded-lg flex items-center justify-center shadow-inner">
                   <Music size={24} strokeWidth={1.5} />
                </div>
                <div className="flex-1 space-y-1.5">
                   <div className="flex items-center justify-between">
                     <select 
                       value={track.instrument?.type || 'synth-mono'}
                       onChange={(e) => handleInstrumentChange(e.target.value)}
                       className="bg-transparent border-none text-white font-black uppercase text-xs tracking-widest p-0 focus:ring-0 cursor-pointer hover:text-brand-orange transition-colors"
                     >
                       <option className="bg-zinc-900" value="synth-mono">Analog Mono Synth</option>
                       <option className="bg-zinc-900" value="synth-pad">Ethereal Pad</option>
                       <option className="bg-zinc-900" value="synth-lead">Screaming Lead</option>
                       <option className="bg-zinc-900" value="drums">Drum Machine V1</option>
                     </select>
                   </div>
                   <div className="flex items-center gap-2">
                      <div className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest px-1.5 py-0.5 bg-black/40 rounded border border-white/5">v2.4.0 Engine</div>
                      <select 
                        onChange={(e) => applyPreset(e.target.value)}
                        className="bg-zinc-950 border-white/5 text-[8px] text-brand-orange/80 uppercase font-black tracking-widest rounded px-1 py-0 focus:ring-0"
                      >
                         <option value="">Presets</option>
                         <option value="Fat Bass">Fat Bass</option>
                         <option value="Acid Line">Acid Line</option>
                         <option value="Cloudy">Cloudy</option>
                         <option value="Metal Lead">Metal Lead</option>
                      </select>
                   </div>
                </div>
             </div>

             {/* Instrument Parameters */}
             {track.instrument?.settings && (
               <div className="grid grid-cols-2 gap-x-6 gap-y-4 pt-2 border-t border-white/5">
                  {Object.entries(track.instrument.settings).map(([key, value]) => (
                    <div key={key} className="flex flex-col gap-1.5 group/param">
                       <div className="flex justify-between items-center transition-opacity">
                         <span className="text-[8px] uppercase font-black text-zinc-500 group-hover/param:text-zinc-300 transition-colors tracking-widest leading-none">{key}</span>
                         <span className="text-[9px] font-mono text-brand-orange/60 font-bold leading-none">{(value as number).toFixed(2)}</span>
                       </div>
                       <div className="relative h-4 flex items-center">
                          <input 
                            type="range" 
                            min={0}
                            max={key === 'cutoff' ? 5000 : key === 'resonance' ? 20 : key === 'detune' ? 0.05 : 2}
                            step={key === 'detune' ? 0.001 : 0.01}
                            value={value as number}
                            onChange={(e) => updateTrackInstrument(track.id, { [key]: parseFloat(e.target.value) })}
                            className="w-full h-1 bg-zinc-950 rounded-full appearance-none cursor-pointer accent-brand-orange group-hover/param:bg-zinc-900 transition-all"
                          />
                          {/* Visual ticks */}
                          <div className="absolute inset-0 flex justify-between items-center px-1 pointer-events-none opacity-20 group-hover/param:opacity-40 transition-opacity">
                            {[...Array(6)].map((_, i) => <div key={i} className="w-[1px] h-2 bg-zinc-600 rounded-full" />)}
                          </div>
                       </div>
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
