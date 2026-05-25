import React, { useState } from 'react';
import { Play, Pause, Square, Mic, Save, FolderOpen, CloudUpload, Loader2, Music, Hash, MousePointer2, Scissors as ScissorsIcon } from 'lucide-react';
import { useStore } from '../store/useStore';
import { audioEngine } from '../lib/audio-engine';
import { projectService } from '../services/projectService';
import ProjectBrowser from './ProjectBrowser';
import { signInWithGoogle, auth } from '../lib/firebase';
import { LogIn, User } from 'lucide-react';
import { stopTransport, togglePlayback, toggleRecording } from '../lib/transport';

export default function Toolbar() {
  const { 
    isPlaying,
    isRecording,
    currentTime, setCurrentTime, 
    projectName, setProjectName, tracks, 
    bpm,
    metronomeEnabled, setMetronome, 
    snapEnabled, setSnap,
    isProcessing,
    activeTool, setTool,
    projectId, setProjectId,
    notify
  } = useStore();
  const [isSaving, setIsSaving] = useState(false);
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);
  const [user, setUser] = useState(auth.currentUser);

  React.useEffect(() => {
    return auth.onAuthStateChanged((u) => setUser(u));
  }, []);

  const handleAuth = async () => {
    if (user) {
      if (confirm("Sign out?")) await auth.signOut();
    } else {
      try {
        await signInWithGoogle();
        notify('Signed in successfully.', 'success');
      } catch {
        notify('Sign-in failed. Please try again.', 'error');
      }
    }
  };

  const handlePlayPause = async () => {
    try {
      await togglePlayback();
    } catch {
      notify('Playback could not start. Try again after the audio engine is ready.', 'error');
    }
  };

  const handleStop = async () => {
    try {
      await stopTransport();
    } catch {
      notify('The transport could not stop cleanly.', 'error');
    }
  };

  const handleToggleRecord = async () => {
    try {
      await toggleRecording();
      notify(isRecording ? 'Recording captured as a new audio track.' : 'Recording started.', isRecording ? 'success' : 'info');
    } catch {
      notify('Recording failed. Check microphone permission and try again.', 'error');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const id = await projectService.saveProject(projectName, tracks, bpm, projectId);
      setProjectId(id);
      notify('Project saved successfully.', 'success');
    } catch (e) {
      notify('Save failed. Sign in and try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async () => {
    setIsSaving(true);
    try {
      const blob = await audioEngine.exportMixdown(tracks, bpm);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${projectName.trim() || 'soundspace-project'}.wav`;
      link.click();
      URL.revokeObjectURL(url);
      notify('Exported a WAV mixdown.', 'success');
    } catch {
      notify('Export failed. Make sure the project has playable clips and try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  return (
    <header className="h-16 bg-[#0a0a0b] border-b border-zinc-800 flex items-center justify-between px-6 shadow-2xl z-40 relative overflow-hidden group">
      <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-brand-orange/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-orange rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(234,88,12,0.3)]">
            <Music className="text-black" size={18} strokeWidth={3} />
          </div>
          <span className="text-lg font-black tracking-tighter text-white uppercase italic">SoundSpace</span>
        </div>
        
        <div className="flex items-center gap-1 bg-black/40 rounded-lg p-1 border border-white/5">
          <button 
            onClick={handlePlayPause}
            className={`w-10 h-10 rounded flex items-center justify-center transition-all ${isPlaying ? 'bg-brand-orange text-black font-black' : 'text-zinc-400 hover:text-white'}`}
          >
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
          </button>
          <button 
             onClick={handleStop}
             className="w-10 h-10 rounded flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <Square size={20} fill="currentColor" />
          </button>
          <button 
            onClick={handleToggleRecord}
            className={`w-10 h-10 rounded flex items-center justify-center transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'text-zinc-600 hover:text-red-400'}`}
          >
            <Mic size={20} />
          </button>
          
          <div className="w-[1px] h-6 bg-zinc-800 mx-1" />

          <button 
            onClick={() => setTool('pointer')}
            className={`w-8 h-8 rounded flex items-center justify-center transition-all ${activeTool === 'pointer' ? 'text-brand-orange bg-brand-orange/10' : 'text-zinc-600 hover:text-zinc-400'}`}
            title="Selection Tool (V)"
          >
            <MousePointer2 size={16} />
          </button>
          <button 
            onClick={() => setTool('scissors')}
            className={`w-8 h-8 rounded flex items-center justify-center transition-all ${activeTool === 'scissors' ? 'text-brand-orange bg-brand-orange/10' : 'text-zinc-600 hover:text-zinc-400'}`}
            title="Scissors Tool (C)"
          >
            <ScissorsIcon size={16} />
          </button>

          <div className="w-[1px] h-6 bg-zinc-800 mx-1" />

          <button 
            onClick={() => setMetronome(!metronomeEnabled)}
            className={`w-8 h-8 rounded flex items-center justify-center transition-all ${metronomeEnabled ? 'text-brand-orange bg-brand-orange/10' : 'text-zinc-600 hover:text-zinc-400'}`}
            title="Metronome (M)"
          >
            <Music size={14} />
          </button>
          <button 
            onClick={() => setSnap(!snapEnabled)}
            className={`w-8 h-8 rounded flex items-center justify-center transition-all ${snapEnabled ? 'text-brand-orange bg-brand-orange/10' : 'text-zinc-600 hover:text-zinc-400'}`}
            title="Snap to Grid (S)"
          >
            <Hash size={14} />
          </button>
        </div>

        {isProcessing && (
          <div className="flex items-center gap-2 px-3 py-1 bg-brand-orange/10 border border-brand-orange/20 rounded text-brand-orange text-[10px] font-black tracking-widest uppercase">
            <Loader2 size={12} className="animate-spin" />
            AI Processing
          </div>
        )}

        <div className="flex flex-col ml-4">
          <input 
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="bg-transparent border-none p-0 text-zinc-100 font-bold text-sm focus:ring-0 w-32 placeholder-zinc-700"
            placeholder="Project Name"
          />
          <span className="text-[8px] text-zinc-600 uppercase font-black tracking-widest">Active Session</span>
        </div>
      </div>

      <div className="flex items-center gap-12">
        <div className="bg-[#050506] border border-white/5 rounded-xl px-8 py-1.5 flex items-center gap-12 shadow-inner">
          <div className="flex flex-col items-center">
             <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-1">Position</span>
             <span className="text-xl font-mono font-medium text-white tabular-nums tracking-wider leading-none">
               {formatTime(currentTime)}
             </span>
          </div>
          <div className="flex flex-col items-center border-l border-white/5 pl-10">
             <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-1">Tempo</span>
             <div className="flex items-center leading-none">
               <input 
                 type="number"
                 min={40}
                 max={240}
                 value={bpm}
                 onChange={(e) => useStore.getState().setBpm(parseFloat(e.target.value))}
                 className="w-12 text-xl font-mono font-medium text-brand-orange bg-transparent border-none p-0 focus:ring-0 text-center appearance-none"
               />
               <span className="text-[9px] font-mono text-zinc-700 ml-1">BPM</span>
             </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button 
          onClick={() => setIsBrowserOpen(true)}
          className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-brand-orange hover:border-brand-orange/50 transition-all group"
          title="Open Library"
        >
          <FolderOpen size={18} className="group-hover:scale-110 transition-transform" />
        </button>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-[11px] font-black text-zinc-400 uppercase tracking-widest hover:border-zinc-700 hover:text-white transition-all disabled:opacity-50"
        >
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save
        </button>
        <button 
           onClick={handleExport}
           className="px-5 py-2 bg-brand-orange text-black rounded-lg text-[11px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-[0_4px_15px_rgba(234,88,12,0.3)] flex items-center gap-2"
        >
          <CloudUpload size={14} strokeWidth={3} />
          Export
        </button>
        
        <button 
          onClick={handleAuth}
          className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all ${user ? 'bg-zinc-800 border-zinc-700 text-brand-orange' : 'bg-black border-white/10 text-zinc-500 hover:text-white'}`}
          title={user ? `Signed in as ${user.displayName}` : "Sign In"}
        >
          {user ? (
            user.photoURL ? (
              <img src={user.photoURL} alt="User" className="w-full h-full rounded-full" />
            ) : (
              <User size={18} />
            )
          ) : (
            <LogIn size={18} />
          )}
        </button>
      </div>
      <ProjectBrowser isOpen={isBrowserOpen} onClose={() => setIsBrowserOpen(false)} />
    </header>
  );
}
