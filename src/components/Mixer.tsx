import React from 'react';
import { useStore, Track } from '../store/useStore';
import { Sliders, Activity, Mic, Headphones, Wand2 } from 'lucide-react';
import { audioEngine } from '../lib/audio-engine';
import { aiService } from '../services/aiService';
import FFTVisualizer from './Visualizers/FFTVisualizer';

import PluginRack from './PluginRack';

export default function Mixer() {
  const { tracks, updateTrack, selectedTrackId } = useStore();

  const handleAIMastering = async () => {
    try {
      const peak = audioEngine.lastPeak === -Infinity ? -3.0 : audioEngine.lastPeak;
      const rms = audioEngine.lastRMS === -Infinity ? -14.0 : audioEngine.lastRMS;
      
      const suggestion = await aiService.getMasteringSuggestions(peak, rms, "Electronic/EDM");
      audioEngine.updateMastering({
        lowGain: suggestion.eqLowGain,
        highGain: suggestion.eqHighGain,
        compThreshold: suggestion.compressorThreshold,
        limiterCeiling: suggestion.limiterCeiling
      });
      alert(`AI Mastered: Boosted Lows by ${suggestion.eqLowGain}dB, Highs by ${suggestion.eqHighGain}dB`);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <footer className="h-64 bg-[#0a0a0b] border-t border-zinc-800 flex p-3 gap-3 shadow-[0_-10px_40px_rgba(0,0,0,0.6)] z-30 relative overflow-hidden">
      {/* Dynamic Background Noise/Texture */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>

      <div className="flex gap-1.5 h-full overflow-x-auto scrollbar-hide flex-1 pb-1">
        {tracks.map((track) => (
          <MixerStrip 
            key={track.id} 
            track={track} 
            isActive={selectedTrackId === track.id}
            onSelect={() => useStore.setState({ selectedTrackId: track.id })}
            onUpdate={(updates) => updateTrack(track.id, updates)} 
          />
        ))}
        
        {/* Master Section */}
        <div className="w-48 bg-[#0a0a0a] border border-brand-orange/20 rounded flex flex-col items-center py-2 ml-4 shadow-xl group">
          <div className="text-[9px] font-bold text-brand-orange uppercase mb-2 tracking-widest">Master Out</div>
          <div className="mb-2">
            <FFTVisualizer />
          </div>
          <div className="flex-1 flex w-full justify-around px-4">
             {/* Left Channel Meter */}
            <div className="w-3 bg-[#050505] rounded relative overflow-hidden ring-1 ring-white/5">
               <div 
                 className="absolute bottom-0 w-full bg-gradient-to-t from-emerald-500 via-yellow-400 to-red-500 shadow-[0_0_10px_rgba(16,185,129,0.2)] transition-all duration-75"
                 style={{ height: `${Math.min(100, (audioEngine.lastRMS + 40) * 2)}%` }}
               ></div>
            </div>
             {/* Right Channel Meter */}
            <div className="w-3 bg-[#050505] rounded relative overflow-hidden ring-1 ring-white/5">
               <div 
                 className="absolute bottom-0 w-full bg-gradient-to-t from-emerald-500 via-yellow-400 to-red-500 shadow-[0_0_10px_rgba(16,185,129,0.2)] transition-all duration-75"
                 style={{ height: `${Math.min(100, (audioEngine.lastRMS + 40) * 1.9)}%` }}
               ></div>
            </div>
            {/* Master Fader */}
            <div className="w-1 h-full bg-black/60 relative ml-2 rounded-full">
               <input 
                 type="range"
                 min="0"
                 max="1.5"
                 step="0.01"
                 defaultValue="1.0"
                 onChange={(e) => audioEngine.setMasterVolume(parseFloat(e.target.value))}
                 className="absolute top-1/2 left-1/2 -ml-[60px] -mt-1 w-[120px] -rotate-90 bg-transparent appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-brand-orange [&::-webkit-slider-thumb]:rounded-sm [&::-webkit-slider-thumb]:shadow-[0_2px_15px_rgba(234,88,12,0.4)] [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-white/30 cursor-ns-resize z-10"
               />
            </div>
          </div>
          <button 
            onClick={handleAIMastering}
            className="my-2 flex items-center gap-1 bg-brand-orange/20 hover:bg-brand-orange/40 text-brand-orange px-2 py-1 rounded text-[8px] font-bold uppercase transition-all"
          >
            <Wand2 size={10} />
            AI Master
          </button>
          <div className="mt-auto w-full text-center py-1 text-[11px] text-white font-mono bg-black/40 border-t border-white/5">0.0 dB</div>
        </div>
      </div>

      {/* FX Panel */}
      <div className="w-80 bg-zinc-900/40 border border-zinc-800 rounded-lg p-3 flex flex-col gap-3 hidden lg:flex shadow-2xl">
        <PluginRack />
      </div>
    </footer>
  );
}

function MixerStrip({ track, onUpdate, isActive, onSelect }: { track: Track; onUpdate: (updates: Partial<Track>) => void; isActive: boolean; onSelect: () => void; key?: string }) {
  return (
    <div 
      onClick={onSelect}
      className={`w-20 bg-zinc-900/40 border rounded-md flex flex-col items-center py-2 relative group hover:bg-zinc-900/60 transition-all duration-300 cursor-pointer ${isActive ? 'border-brand-orange shadow-[0_0_15px_rgba(234,88,12,0.15)] bg-zinc-900/80' : 'border-zinc-800/50'}`}
    >
       <div className={`text-[10px] font-bold uppercase mb-1 truncate w-full px-2 text-center tracking-tighter ${isActive ? 'text-brand-orange' : 'text-zinc-400'}`}>
         {track.name}
       </div>

       {/* Real-time VST Parameters */}
       {track.instrument?.settings && (
         <div className="w-full px-2 mb-2 space-y-0.5">
           {Object.entries(track.instrument.settings).slice(0, 2).map(([key, value]) => (
             <div key={key} className="flex flex-col">
               <div className="flex justify-between items-center text-[7px] font-black text-zinc-600 uppercase tracking-widest leading-none">
                 <span>{key.substring(0, 3)}</span>
                 <span className="text-brand-orange/70 font-mono">{(value as number).toFixed(1)}</span>
               </div>
               <div className="w-full h-0.5 bg-zinc-950 rounded-full overflow-hidden mt-0.5">
                 <div 
                   className="h-full bg-brand-orange transition-all duration-100" 
                   style={{ width: `${Math.min(100, (value as number) / (key === 'cutoff' ? 50 : 0.02))}%` }}
                 />
               </div>
             </div>
           ))}
         </div>
       )}
       
       <div className="flex-1 w-full px-2 flex flex-col gap-2 items-center justify-end">
          <div className="flex gap-1">
            <button 
              onClick={(e) => { e.stopPropagation(); onUpdate({ muted: !track.muted }); }}
              className={`w-7 h-5 text-[9px] font-black rounded-sm flex items-center justify-center transition-all active:scale-95 ${track.muted ? 'bg-brand-orange text-black shadow-[0_0_10px_rgba(249,115,22,0.3)]' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
            >M</button>
            <button 
              onClick={(e) => { e.stopPropagation(); onUpdate({ soloed: !track.soloed }); }}
              className={`w-7 h-5 text-[9px] font-black rounded-sm flex items-center justify-center transition-all active:scale-95 ${track.soloed ? 'bg-yellow-400 text-black shadow-[0_0_10px_rgba(250,204,21,0.3)]' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
            >S</button>
          </div>

          <div className="flex-1 w-1 bg-black/60 rounded-full relative my-3 group/fader">
            {/* Fader Track Details */}
            <div className="absolute inset-y-0 -left-1.5 w-4 flex flex-col justify-between opacity-10 pointer-events-none">
              {[0, -6, -12, -18, -24, -36, -48].map(db => (
                <div key={db} className="h-[1px] w-full bg-white"></div>
              ))}
            </div>

            <input 
              type="range"
              min="0"
              max="1.5"
              step="0.01"
              value={track.volume}
              onChange={(e) => onUpdate({ volume: parseFloat(e.target.value) })}
              className="absolute top-1/2 left-1/2 -ml-[60px] -mt-1 w-[120px] -rotate-90 bg-transparent appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-zinc-300 [&::-webkit-slider-thumb]:rounded-sm [&::-webkit-slider-thumb]:shadow-[0_2px_10px_rgba(0,0,0,0.8)] [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-white/20 cursor-ns-resize z-10"
            />
          </div>
       </div>

       <div className="mt-2 bg-black/40 w-full text-center py-1 border-t border-zinc-900 text-[10px] text-zinc-500 font-mono tracking-tighter">
         {track.volume > 0 ? `-${( (1 - Math.min(1, track.volume)) * 24 ).toFixed(1)}` : '-∞'}
       </div>
    </div>
  );
}
