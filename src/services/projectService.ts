import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDocs, 
  query, 
  where, 
  serverTimestamp,
  getDoc,
  deleteDoc
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Track } from '../store/useStore';

export const projectService = {
  async saveProject(name: string, tracks: Track[], bpm: number, id?: string | null) {
    if (!auth.currentUser) throw new Error("Not authenticated");
    
    const projectData = {
      name,
      bpm,
      authorId: auth.currentUser.uid,
      tracks: tracks.map(t => ({
        id: t.id,
        name: t.name,
        type: t.type,
        volume: t.volume,
        pan: t.pan,
        muted: t.muted,
        soloed: t.soloed,
        effects: t.effects || [],
        instrument: t.instrument || null,
        regions: t.regions.map(r => ({
          id: r.id,
          startTime: r.startTime,
          duration: r.duration,
          audioUrl: r.audioUrl || null,
          name: (r as any).name || 'Region',
          notes: r.notes || []
        }))
      })),
      updatedAt: serverTimestamp()
    };

    if (id) {
      const docRef = doc(db, 'projects', id);
      await updateDoc(docRef, projectData);
      return id;
    } else {
      const docRef = await addDoc(collection(db, 'projects'), {
        ...projectData,
        createdAt: serverTimestamp()
      });
      return docRef.id;
    }
  },

  async deleteProject(id: string) {
    if (!auth.currentUser) throw new Error("Not authenticated");
    const docRef = doc(db, 'projects', id);
    await deleteDoc(docRef);
  },

  async getProjects() {
    if (!auth.currentUser) return [];
    const q = query(collection(db, 'projects'), where('authorId', '==', auth.currentUser.uid));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async getProject(id: string) {
    const docRef = doc(db, 'projects', id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() };
    }
    return null;
  }
};
