import { audioEngine } from './audio-engine';
import { useStore } from '../store/useStore';

const AUDIO_FILE_PATTERN = /\.(wav|mp3|m4a|aac|ogg|flac|webm)$/i;

export async function importAudioFiles(files: File[], options: { startTime?: number; trackId?: string } = {}) {
  const audioFiles = files.filter(file => file.type.startsWith('audio/') || AUDIO_FILE_PATTERN.test(file.name));
  const store = useStore.getState();

  if (!audioFiles.length) {
    store.notify('Drop or choose an audio file such as WAV, MP3, M4A, OGG, or FLAC.', 'error');
    return;
  }

  store.setProcessing(true, 'Importing audio...');
  try {
    for (const [index, file] of audioFiles.entries()) {
      const buffer = await audioEngine.decodeAudioFile(file);
      const latest = useStore.getState();
      const existingTrack = options.trackId
        ? latest.tracks.find(track => track.id === options.trackId && track.type === 'audio')
        : undefined;
      const trackId = index === 0 && existingTrack
        ? existingTrack.id
        : latest.addTrack(file.name.replace(/\.[^.]+$/, '') || `Audio ${latest.tracks.length + 1}`, 'audio');

      useStore.getState().addRegion(trackId, {
        startTime: options.startTime ?? latest.currentTime,
        duration: buffer.duration,
        buffer,
        name: file.name
      });
    }

    useStore.getState().notify(
      `Imported ${audioFiles.length} audio ${audioFiles.length === 1 ? 'file' : 'files'}.`,
      'success'
    );
  } catch {
    useStore.getState().notify('Audio import failed. Try a different file format.', 'error');
  } finally {
    useStore.getState().setProcessing(false);
  }
}
