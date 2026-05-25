import { audioEngine } from './audio-engine';
import { useStore } from '../store/useStore';

let recordingStartTime = 0;

export async function startPlayback() {
  const state = useStore.getState();
  await audioEngine.play(state.currentTime, state.tracks);
  useStore.getState().setPlaying(true);
}

export async function pausePlayback() {
  const state = useStore.getState();
  if (state.isRecording) {
    await stopRecording();
  }
  audioEngine.stopAll();
  useStore.getState().setPlaying(false);
}

export async function togglePlayback() {
  const state = useStore.getState();
  if (state.isPlaying || state.isRecording) {
    await pausePlayback();
    return;
  }

  await startPlayback();
}

export async function stopTransport() {
  const state = useStore.getState();
  if (state.isRecording) {
    await stopRecording();
  }
  audioEngine.stopAll();
  const store = useStore.getState();
  store.setPlaying(false);
  store.setCurrentTime(0);
}

export async function startRecording() {
  const state = useStore.getState();
  recordingStartTime = state.currentTime;

  try {
    await audioEngine.startRecording();
    const nextState = useStore.getState();
    if (!nextState.isPlaying) {
      await audioEngine.play(nextState.currentTime, nextState.tracks);
      useStore.getState().setPlaying(true);
    }
    useStore.getState().setRecording(true);
  } catch (error) {
    useStore.getState().setRecording(false);
    throw error;
  }
}

export async function stopRecording() {
  const store = useStore.getState();
  if (!store.isRecording) return;

  try {
    const { buffer } = await audioEngine.stopRecording();
    const nextStore = useStore.getState();
    const trackId = nextStore.addTrack(`Voice ${nextStore.tracks.length + 1}`, 'audio');
    nextStore.addRegion(trackId, {
      startTime: recordingStartTime,
      duration: buffer.duration,
      buffer,
      name: 'Recorded take'
    });
  } finally {
    useStore.getState().setRecording(false);
  }
}

export async function toggleRecording() {
  const state = useStore.getState();
  if (state.isRecording) {
    await stopRecording();
    return;
  }

  await startRecording();
}
