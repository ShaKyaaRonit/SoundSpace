import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDocs, 
  query, 
  where, 
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Track } from '../store/useStore';

export const projectService = {
  async saveProject(name: string, tracks: Track[]) {
    if (!auth.currentUser) throw new Error("Not authenticated");
    
    const projectData = {
      name,
      authorId: auth.currentUser.uid,
      tracks: tracks.map(t => ({
        ...t,
        regions: t.regions.map(r => ({
          id: r.id,
          startTime: r.startTime,
          duration: r.duration,
          audioUrl: r.audioUrl || null
        }))
      })),
      updatedAt: serverTimestamp()
    };

    return await addDoc(collection(db, 'projects'), projectData);
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
