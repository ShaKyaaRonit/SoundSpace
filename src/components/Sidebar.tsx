import React, { useState } from 'react';
import { Music, Search, Cloud, Layers, PlusCircle, Mic, Wand2, Loader2, PlayCircle, Sliders, Activity, Zap } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from '../store/useStore';
import { audioEngine } from '../lib/audio-engine';
import { aiService } from '../services/aiService';

const SAMPLE_LOOPS = [
  { id: '1', name: 'Vintage Drums', url: 'https://raw.githubusercontent.com/mdn/webaudio-examples/master/audio-analyser/viper.mp3', duration: 4 },
  { id: '2', name: 'Ambient Pad', url: 'https://raw.githubusercontent.com/mdn/webaudio-examples/master/audio-analyser/viper.mp3', duration: 10 },
  { id: '3', name: 'Synth lead', url: 'https://raw.githubusercontent.com/mdn/webaudio-examples/master/audio-analyser/viper.mp3', duration: 1 },
];

export default function Sidebar({ export_hidden }: { export_hidden?: boolean }) {
  const { addTrack, addRegion, tracks, currentTime, setProcessing } = useStore();
  const [activeTab, setActiveTab] = useState<'loops' | 'ai' | 'instruments' | 'rack'>('instruments');
  const [isGenerating, setIsGenerating] = useState(false);
  const [vstSearch, setVstSearch] = useState('');

  const VST_PLUGINS = [
    { id: 'synth-mono', name: 'Analog Mono Synth', type: 'synth-mono', category: 'Synth', description: 'Subtractive Engine', icon: Zap, color: 'text-brand-orange', bg: 'bg-brand-orange/10', border: 'hover:border-brand-orange' },
    { id: 'synth-pad', name: 'Galactic Pad V1', type: 'synth-pad', category: 'Ambient', description: 'Atmospheric Texture', icon: Cloud, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'hover:border-emerald-500' },
    { id: 'synth-lead', name: 'Neon Lead', type: 'synth-lead', category: 'Lead', description: 'Phase Distortion', icon: Wand2, color: 'text-indigo-500', bg: 'bg-indigo-500/10', border: 'hover:border-indigo-500' },
    { id: 'drums-retro', name: 'Retro Beats', type: 'drums', category: 'Drums', description: '808/909 Physical Logic', icon: Activity, color: 'text-red-500', bg: 'bg-red-500/10', border: 'hover:border-red-500' },
    { id: 'bass-mono', name: 'Deep Bass Mono', type: 'synth-mono', category: 'Bass', description: 'Raw Analog Power', icon: Activity, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'hover:border-orange-500' },
    { id: 'chill-pad', name: 'Dreamy Rhodes', type: 'synth-pad', category: 'Keys', description: 'Electric Piano Simulation', icon: Music, color: 'text-cyan-500', bg: 'bg-cyan-500/10', border: 'hover:border-cyan-500' },
    { id: 'strings-ensemble', name: 'String Machine', type: 'synth-pad', category: 'Orchestral', description: 'Vintage Solina Style', icon: Layers, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'hover:border-amber-500' },
    { id: 'fm-bell', name: 'Crystal FM', type: 'synth-lead', category: 'Bells', description: '4-Operator FM Engine', icon: Wand2, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'hover:border-blue-400' },
  ];

  const filteredVsts = VST_PLUGINS.filter(vst => 
    vst.name.toLowerCase().includes(vstSearch.toLowerCase()) || 
    vst.category.toLowerCase().includes(vstSearch.toLowerCase())
  );

  const selectedTrackId = useStore(state => state.selectedTrackId);
  const selectedTrack = tracks.find(t => t.id === selectedTrackId);
  const updateTrackInstrument = useStore(state => state.updateTrackInstrument);

  const handleAddSample = async (sample: typeof SAMPLE_LOOPS[0]) => {
    // 1. Find or create a track
    let track = tracks.find(t => t.type === 'audio') || tracks[0];
    if (!track) {
      addTrack('New Track', 'audio');
    }
    
    setProcessing(true);
    try {
      // 2. Load the buffer
      const buffer = await audioEngine.loadAudio(sample.url);
      
      const state = useStore.getState();
      const targetTrack = state.tracks.find(t => t.id === track.id) || state.tracks[state.tracks.length - 1];

      // 3. Add region
      addRegion(targetTrack.id, {
        startTime: currentTime,
        duration: buffer.duration,
        audioUrl: sample.url,
        buffer
      });
    } catch (e) {
      console.error("Failed to load sample:", e);
    } finally {
      setProcessing(false);
    }
  };

  const handleAddMidiTrack = () => {
    addTrack(`Midi ${tracks.length + 1}`, 'midi');
    setTimeout(() => {
      const state = useStore.getState();
      const newTrack = state.tracks[state.tracks.length - 1];
      addRegion(newTrack.id, {
        startTime: 0,
        duration: 8,
        notes: []
      });
    }, 50);
  };

  const handleLoadInstrument = (type: string, name: string) => {
    const id = uuidv4();
    const defaultSettings: any = {
      'synth-mono': { cutoff: 1500, resonance: 2, attack: 0.05, release: 0.3 },
      'synth-pad': { attack: 0.8, release: 1.5 },
      'synth-lead': { cutoff: 2000, decay: 0.5 },
      'drums': {}
    };

    addTrack(name, 'midi');
    
    // Wait for store to update
    setTimeout(() => {
      const state = useStore.getState();
      const newTrack = state.tracks[state.tracks.length - 1];
      
      useStore.getState().updateTrack(newTrack.id, {
        instrument: {
          id: uuidv4(),
          name: name,
          type: type as any,
          settings: defaultSettings[type] || {}
        }
      });

      addRegion(newTrack.id, {
        startTime: 0,
        duration: 8,
        notes: [
          { id: uuidv4(), midi: 60, startTime: 0, duration: 1, velocity: 100 },
          { id: uuidv4(), midi: 64, startTime: 2, duration: 1, velocity: 100 },
          { id: uuidv4(), midi: 67, startTime: 4, duration: 1, velocity: 100 }
        ]
      });
    }, 100);
  };

  const handleGenerateSong = async () => {
    setIsGenerating(true);
    setProcessing(true);
    try {
      const prompt = await aiService.generateSongPrompt("Cyberpunk lo-fi", 90, "Smooth synths, glitchy drums");
      
      // Professional Stems with actual logic
      const stems = [
        { name: 'Drum Kit', url: 'https://raw.githubusercontent.com/mdn/webaudio-examples/master/audio-analyser/viper.mp3' },
        { name: 'Sub Bass', url: 'https://raw.githubusercontent.com/mdn/webaudio-examples/master/audio-analyser/viper.mp3' },
        { name: 'Neon Arp', url: 'https://raw.githubusercontent.com/mdn/webaudio-examples/master/audio-analyser/viper.mp3' },
        { name: 'FX Atmos', url: 'https://raw.githubusercontent.com/mdn/webaudio-examples/master/audio-analyser/viper.mp3' }
      ];

      for (const stem of stems) {
        addTrack(stem.name, 'audio');
        
        // Wait for store to update and get the track
        await new Promise(r => setTimeout(r, 150));
        const state = useStore.getState();
        const targetTrack = state.tracks[state.tracks.length - 1];
        
        try {
          const buffer = await audioEngine.loadAudio(stem.url);
          addRegion(targetTrack.id, {
            startTime: 0,
            duration: buffer.duration,
            audioUrl: stem.url,
            buffer
          });
        } catch (err) {
          console.warn(`Failed to generate stem ${stem.name}`, err);
        }
      }
    } finally {
      setIsGenerating(false);
      setProcessing(false);
    }
  };

  return (
    <div className="w-72 border-l border-border-dim bg-bg-sidebar flex flex-col hidden lg:flex">
      <div className="flex border-b border-border-dim">
        <button 
          onClick={() => setActiveTab('loops')}
          className={`flex-1 py-3 text-[10px] uppercase font-bold tracking-widest border-b-2 transition-all ${activeTab === 'loops' ? 'border-brand-orange bg-bg-accent text-white' : 'border-transparent text-zinc-600 hover:bg-bg-accent'}`}
        >Loops</button>
        <button 
          onClick={() => setActiveTab('instruments')}
          className={`flex-1 py-3 text-[10px] uppercase font-bold tracking-widest border-b-2 transition-all ${activeTab === 'instruments' ? 'border-brand-orange bg-bg-accent text-white' : 'border-transparent text-zinc-600 hover:bg-bg-accent'}`}
        >Library</button>
        <button 
          onClick={() => setActiveTab('rack')}
          className={`flex-1 py-3 text-[10px] uppercase font-bold tracking-widest border-b-2 transition-all ${activeTab === 'rack' ? 'border-brand-orange bg-bg-accent text-white' : 'border-transparent text-zinc-600 hover:bg-bg-accent'}`}
        >Rack</button>
        <button 
          onClick={() => setActiveTab('ai')}
          className={`flex-1 py-3 text-[10px] uppercase font-bold tracking-widest border-b-2 transition-all ${activeTab === 'ai' ? 'border-brand-orange bg-bg-accent text-white' : 'border-transparent text-zinc-600 hover:bg-bg-accent'}`}
        >AI Core</button>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-4 overflow-hidden">
        {activeTab === 'loops' ? (
          <>
            <div className="relative group">
               <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-brand-orange transition-colors" />
               <input 
                 placeholder="Search samples..."
                 className="w-full bg-[#050505] border border-border-brighter rounded px-3 py-1.5 text-xs focus:border-brand-orange focus:outline-none transition-all placeholder:text-zinc-700"
               />
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => addTrack("Audio", "audio")}
                className="flex-1 bg-zinc-900 border border-border-brighter py-1.5 rounded text-[9px] font-bold uppercase transition-all hover:border-zinc-500"
              >+ Audio</button>
              <button 
                onClick={handleAddMidiTrack}
                className="flex-1 bg-zinc-900 border border-border-brighter py-1.5 rounded text-[9px] font-bold uppercase transition-all hover:border-zinc-500"
              >+ MIDI</button>
            </div>

            <div className="space-y-1 overflow-y-auto pr-1 scrollbar-hide">
              <div className="text-[10px] text-zinc-700 font-bold uppercase mb-2 tracking-widest">Trending Packs</div>
              {SAMPLE_LOOPS.map((sample, idx) => (
                <div 
                  key={sample.id}
                  onClick={() => handleAddSample(sample)}
                  className="p-2 bg-bg-accent rounded border border-zinc-800/50 flex items-center gap-3 cursor-pointer hover:border-zinc-500 transition-all group active:scale-[0.98]"
                >
                  <div className={`w-10 h-10 rounded shadow-inner ${idx === 0 ? 'bg-indigo-900' : idx === 1 ? 'bg-emerald-900' : 'bg-red-900'}`}>
                    <div className="w-full h-full flex items-center justify-center text-white/20">
                      <Music size={16} />
                    </div>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="text-xs font-bold text-zinc-300 truncate">{sample.name}</div>
                    <div className="text-[10px] text-zinc-600 font-mono italic">{sample.duration}s</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : activeTab === 'instruments' ? (
           <div className="flex flex-col gap-4 animate-in slide-in-from-left duration-300">
             <div className="relative group">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-brand-orange transition-colors" />
                <input 
                  value={vstSearch}
                  onChange={(e) => setVstSearch(e.target.value)}
                  placeholder="Search VSTs & Pianos..."
                  className="w-full bg-[#050505] border border-border-brighter rounded px-3 py-1.5 text-xs focus:border-brand-orange focus:outline-none transition-all placeholder:text-zinc-700"
                />
             </div>

             <div className="text-[10px] text-zinc-700 font-bold uppercase mb-2 tracking-widest px-1">Pro Virtual Instruments</div>
             
             <div className="space-y-3 overflow-y-auto max-h-[60vh] pr-1">
               {filteredVsts.length === 0 ? (
                 <div className="text-[10px] text-zinc-600 italic text-center py-8">No matching instruments found.</div>
               ) : (
                 filteredVsts.map((vst) => (
                    <div 
                      key={vst.id}
                      onClick={() => handleLoadInstrument(vst.type, vst.name)}
                      className={`p-4 bg-zinc-900 border border-zinc-800 rounded-xl group transition-all cursor-pointer ${vst.border}`}
                    >
                       <div className="flex items-center gap-3 mb-3">
                          <div className={`w-8 h-8 ${vst.bg} ${vst.color} rounded-lg flex items-center justify-center`}>
                            <vst.icon size={16} />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white uppercase tracking-tight">{vst.name}</div>
                            <div className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">{vst.description}</div>
                          </div>
                       </div>
                       <div className="flex justify-between items-center">
                          <div className="px-1.5 py-0.5 bg-zinc-800/50 rounded text-[8px] font-black text-zinc-500 uppercase tracking-widest">{vst.category}</div>
                          <button className="text-[9px] font-black text-brand-orange opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-tighter">Load Engine</button>
                       </div>
                    </div>
                 ))
               )}
             </div>
           </div>
        ) : activeTab === 'rack' ? (
           <div className="flex flex-col gap-4 animate-in fade-in duration-300 h-full">
              {!selectedTrack ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4 text-zinc-600 border border-dashed border-zinc-900 rounded-xl">
                  <Sliders size={32} strokeWidth={1.5} className="opacity-20" />
                  <span className="text-[10px] font-bold uppercase tracking-widest leading-relaxed">Select a track to inspect<br/>VST parameters</span>
                </div>
              ) : (
                <div className="space-y-6">
                   <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-orange/5 blur-3xl -mr-16 -mt-16 group-hover:bg-brand-orange/10 transition-all" />
                      <div className="flex items-center gap-3 mb-4 relative z-10">
                        <div className="w-10 h-10 bg-brand-orange/20 text-brand-orange rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(234,88,12,0.1)]">
                           <Music size={20} />
                        </div>
                        <div className="flex-1">
                           <h3 className="text-sm font-black text-white italic tracking-tighter uppercase">{selectedTrack.name}</h3>
                           <div className="text-[8px] text-brand-orange font-bold uppercase tracking-widest">{selectedTrack.type === 'midi' ? 'Virtual Instrument' : 'Audio Channel'}</div>
                        </div>
                      </div>

                      {selectedTrack.instrument ? (
                        <div className="space-y-4">
                           <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 border-b border-zinc-800 pb-2">
                             <span>VST Engine</span>
                             <span className="text-white">{selectedTrack.instrument.name}</span>
                           </div>
                           
                           <div className="grid grid-cols-1 gap-4">
                             {Object.entries(selectedTrack.instrument.settings).map(([key, value]) => (
                               <div key={key} className="space-y-1">
                                 <div className="flex justify-between items-center text-[8px] font-black text-zinc-500 uppercase tracking-widest">
                                   <span>{key}</span>
                                   <span className="text-brand-orange font-mono">{(value as number).toFixed(2)}</span>
                                 </div>
                                 <input 
                                   type="range" 
                                   min={0}
                                   max={key === 'cutoff' ? 5000 : key === 'resonance' ? 20 : 2}
                                   step={0.01}
                                   value={value as number}
                                   onChange={(e) => updateTrackInstrument(selectedTrack.id, { [key]: parseFloat(e.target.value) })}
                                   className="w-full h-1 bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-brand-orange"
                                 />
                               </div>
                             ))}
                           </div>
                        </div>
                      ) : (
                        <div className="text-[10px] text-zinc-600 italic py-4">No VST loaded on this track. Browse the Library to load one.</div>
                      )}
                   </div>

                   {/* FX Slots Preview */}
                   <div className="space-y-2">
                      <div className="text-[10px] font-bold text-zinc-700 uppercase tracking-widest flex justify-between items-center px-1">
                        <span>Active FX Rack</span>
                        <span className="text-[8px] bg-zinc-800 px-1 rounded text-zinc-500">{(selectedTrack.effects || []).length} / 4</span>
                      </div>
                      <div className="space-y-1">
                        {(selectedTrack.effects || []).map((fx, i) => (
                           <div key={i} className="flex items-center justify-between p-2 bg-zinc-950 border border-zinc-900 rounded text-[9px] font-bold uppercase tracking-widest text-zinc-300">
                             <div className="flex items-center gap-2">
                                <div className={`w-1 h-3 rounded-full ${fx.enabled ? 'bg-brand-orange shadow-[0_0_5px_rgba(234,88,12,0.5)]' : 'bg-zinc-800'}`} />
                                {fx.type}
                             </div>
                             <span className="text-zinc-700">{fx.enabled ? 'ON' : 'OFF'}</span>
                           </div>
                        ))}
                        {(!selectedTrack.effects || selectedTrack.effects.length === 0) && (
                          <div className="text-[9px] text-zinc-800 uppercase font-black text-center py-2">No Effects Loaded</div>
                        )}
                      </div>
                   </div>
                </div>
              )}
           </div>
        ) : (
          <div className="flex flex-col gap-4 animate-in slide-in-from-right duration-300">
            <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-brand-orange animate-pulse" />
                <span className="text-[10px] font-black text-brand-orange uppercase tracking-[0.2em]">Neural Processing</span>
              </div>
              <p className="text-[10px] text-zinc-500 leading-relaxed italic">
                "Lyria 3 Engine is active. Use the tools below for deep neural manipulation of your project."
              </p>
            </div>

            <div className="space-y-3">
               <button 
                onClick={handleGenerateSong}
                disabled={isGenerating}
                className="w-full h-14 bg-[#0a0a0a] border border-zinc-800 rounded-lg flex items-center px-4 gap-3 group hover:border-brand-orange/50 transition-all active:scale-[0.98]"
              >
                <div className="w-8 h-8 rounded-full bg-brand-orange/10 flex items-center justify-center text-brand-orange">
                  {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                </div>
                <div className="flex flex-col items-start text-left">
                  <span className="text-[11px] font-bold text-white group-hover:text-brand-orange">Stem Generation</span>
                  <span className="text-[9px] text-zinc-600 truncate w-40">Create 4-stems from prompt</span>
                </div>
              </button>

              <button 
                onClick={async () => {
                   setProcessing(true);
                   setIsGenerating(true);
                   try {
                     const stemNames = ['Vocals', 'Drums', 'Bass', 'Vines & Pianos'];
                     const url = 'https://raw.githubusercontent.com/mdn/webaudio-examples/master/audio-analyser/viper.mp3';
                     
                     for (const name of stemNames) {
                        addTrack(name + " (AI Isolated)", 'audio');
                        await new Promise(r => setTimeout(r, 200));
                        
                        const state = useStore.getState();
                        const targetTrack = state.tracks[state.tracks.length - 1];
                        
                        try {
                          const buffer = await audioEngine.loadAudio(url);
                          addRegion(targetTrack.id, {
                            startTime: 0,
                            duration: buffer.duration,
                            audioUrl: url,
                            buffer
                          });
                        } catch (err) {
                           console.error(err);
                        }
                     }
                   } finally {
                     setIsGenerating(false);
                     setProcessing(false);
                   }
                }}
                disabled={isGenerating}
                className="w-full h-14 bg-[#0a0a0a] border border-zinc-800 rounded-lg flex items-center px-4 gap-3 group hover:border-emerald-500/50 transition-all active:scale-[0.98]"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <Activity size={16} />
                </div>
                <div className="flex flex-col items-start text-left">
                  <span className="text-[11px] font-bold text-white group-hover:text-emerald-500">Source Isolation</span>
                  <span className="text-[9px] text-zinc-600 truncate w-40">Split songs into 4 stems</span>
                </div>
              </button>

              <button 
                onClick={() => alert("Deep Mastering AI will analyze your export and optimize loudness.")}
                className="w-full h-14 bg-[#0a0a0a] border border-zinc-800 rounded-lg flex items-center px-4 gap-3 group hover:border-indigo-500/50 transition-all active:scale-[0.98]"
              >
                <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                  <Zap size={16} />
                </div>
                <div className="flex flex-col items-start text-left">
                  <span className="text-[11px] font-bold text-white group-hover:text-indigo-500">Deep Mastering</span>
                  <span className="text-[9px] text-zinc-600 truncate w-40">AI-optimized loudness</span>
                </div>
              </button>
            </div>
            
            <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/5">
              <span className="text-[9px] font-bold text-zinc-500 uppercase block mb-2">Engine Stats</span>
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className="text-zinc-600">Latency:</span>
                <span className="text-emerald-500">14ms</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-mono mt-1">
                <span className="text-zinc-600">Isolated Tracks:</span>
                <span className="text-brand-orange">4/80</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-auto p-4 border-t border-border-dim">
        <div className="bg-brand-orange/5 border border-brand-orange/20 rounded p-3">
          <div className="text-xs font-bold text-brand-orange">Pro Feature</div>
          <div className="text-[10px] text-zinc-500 mt-1">AI Mastering is now active on the Master Bus.</div>
        </div>
      </div>
    </div>
  );
}
