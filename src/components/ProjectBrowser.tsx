import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, FolderOpen, Plus, Trash2, Clock, Music, Loader2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { projectService } from '../services/projectService';
import { auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

interface ProjectBrowserProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProjectBrowser({ isOpen, onClose }: ProjectBrowserProps) {
  const { setProject, setProjectId, bpm, tracks, projectName } = useStore();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) loadProjects();
    });
    return () => unsubscribe();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const projs = await projectService.getProjects();
      setProjects(projs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleLoad = async (proj: any) => {
    setProject(proj.name, proj.tracks);
    setProjectId(proj.id);
    useStore.getState().setBpm(proj.bpm || 120);
    onClose();
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this project?")) return;
    
    try {
      await projectService.deleteProject(id);
      setProjects(projects.filter(p => p.id !== id));
      if (useStore.getState().projectId === id) {
        setProjectId(null);
      }
    } catch (e) {
      alert("Delete failed");
    }
  };

  const handleNewProject = () => {
    if (confirm("Create a new project? Any unsaved changes will be lost.")) {
      setProject("New Project", [
        {
          id: crypto.randomUUID(),
          name: 'Audio 1',
          type: 'audio',
          volume: 0.8,
          pan: 0,
          muted: false,
          soloed: false,
          regions: [],
          effects: []
        }
      ]);
      setProjectId(null);
      useStore.getState().setBpm(120);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
              <div className="flex items-center gap-3">
                <FolderOpen className="text-brand-orange" size={20} />
                <h2 className="text-lg font-black uppercase tracking-tighter text-white italic">Project Browser</h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-zinc-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {!user ? (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                  <p>Please sign in to see your projects.</p>
                </div>
              ) : loading ? (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-500 gap-4">
                  <Loader2 className="animate-spin" size={32} />
                  <p className="text-sm font-bold uppercase tracking-widest">Scanning Grid...</p>
                </div>
              ) : projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-500 gap-4 border-2 border-dashed border-zinc-800 rounded-xl">
                  <Music size={40} className="opacity-20" />
                  <p>No projects found in the archive.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {projects.map((proj) => (
                    <motion.div
                      key={proj.id}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleLoad(proj)}
                      className="group flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-brand-orange/50 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center group-hover:bg-brand-orange group-hover:text-black transition-colors">
                          <Music size={20} />
                        </div>
                        <div>
                          <h3 className="text-white font-bold tracking-tight">{proj.name}</h3>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="flex items-center gap-1 text-[10px] text-zinc-500 uppercase font-bold tracking-widest">
                               <Clock size={10} />
                               {new Date(proj.updatedAt?.seconds * 1000).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1 text-[10px] text-brand-orange uppercase font-black tracking-widest">
                               {proj.bpm} BPM
                            </span>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => handleDelete(e, proj.id)}
                        className="p-2 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-zinc-900/50 border-t border-zinc-800 flex items-center justify-between">
              <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                {projects.length} Saved Projects
              </span>
              <button 
                onClick={handleNewProject}
                className="flex items-center gap-2 px-6 py-2 bg-brand-orange text-black font-black uppercase text-[11px] tracking-widest rounded-lg hover:scale-105 transition-all shadow-[0_0_20px_rgba(234,88,12,0.2)]"
              >
                <Plus size={16} strokeWidth={3} />
                New Project
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
