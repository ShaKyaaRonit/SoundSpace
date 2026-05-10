import { Track, useStore } from '../store/useStore';

class AudioEngine {
  private context: AudioContext | null = null;
  private trackNodes: Map<string, { 
    gain: GainNode; 
    panner: StereoPannerNode; 
    effectNodes: AudioNode[]; 
    lastEffectList: string; 
  }> = new Map();
  private activeSources: AudioBufferSourceNode[] = [];
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private startTime: number = 0;
  private pauseTime: number = 0;

  // Mastering Chain
  private masterBus: GainNode | null = null;
  private masterAnalyzer: AnalyserNode | null = null;
  private masteringChain: {
    lowShelf: BiquadFilterNode;
    highShelf: BiquadFilterNode;
    compressor: DynamicsCompressorNode;
    limiter: DynamicsCompressorNode;
  } | null = null;
  private masteringWorklet: AudioWorkletNode | null = null;
  public lastPeak: number = -Infinity;
  public lastRMS: number = -Infinity;
  private metronomeTimers: number[] = [];

  constructor() {
    // Context will be lazily initialized in getContext()
  }

  getContext(): AudioContext {
    if (!this.context) {
      this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.context && !this.masterBus) {
      // Synchronously create the essential bus
      this.masterBus = this.context.createGain();
      this.initMasterChain();
    }
    return this.context;
  }

  private async initMasterChain() {
    const ctx = this.context!;
    if (!this.masterBus) this.masterBus = ctx.createGain();
    
    this.masterAnalyzer = ctx.createAnalyser();
    this.masterAnalyzer.fftSize = 2048;

    // Load Worklet
    try {
      await ctx.audioWorklet.addModule('/worklets/mastering-processor.js');
      this.masteringWorklet = new AudioWorkletNode(ctx, 'mastering-processor');
      this.masteringWorklet.port.onmessage = (e) => {
        this.lastPeak = e.data.peak;
        this.lastRMS = e.data.rms;
      };
    } catch (e) {
      console.error("Failed to load mastering worklet", e);
    }

    // Initialize Mastering Chain
    this.masteringChain = {
      lowShelf: ctx.createBiquadFilter(),
      highShelf: ctx.createBiquadFilter(),
      compressor: ctx.createDynamicsCompressor(),
      limiter: ctx.createDynamicsCompressor(),
    };

    this.masteringChain.lowShelf.type = 'lowshelf';
    this.masteringChain.lowShelf.frequency.value = 200;
    
    this.masteringChain.highShelf.type = 'highshelf';
    this.masteringChain.highShelf.frequency.value = 3000;
    
    this.masteringChain.compressor.threshold.value = -12;
    this.masteringChain.compressor.ratio.value = 4;
    
    this.masteringChain.limiter.threshold.value = -0.1;
    this.masteringChain.limiter.ratio.value = 20;

    // Route: Tracks -> MasterBus -> LowShelf -> HighShelf -> Compressor -> Limiter -> Worklet -> Analyzer -> Destination
    let lastNode: AudioNode = this.masterBus;
    
    lastNode.connect(this.masteringChain.lowShelf);
    lastNode = this.masteringChain.lowShelf;
    
    lastNode.connect(this.masteringChain.highShelf);
    lastNode = this.masteringChain.highShelf;
    
    lastNode.connect(this.masteringChain.compressor);
    lastNode = this.masteringChain.compressor;
    
    lastNode.connect(this.masteringChain.limiter);
    lastNode = this.masteringChain.limiter;

    if (this.masteringWorklet) {
      lastNode.connect(this.masteringWorklet);
      lastNode = this.masteringWorklet;
    }

    lastNode.connect(this.masterAnalyzer);
    this.masterAnalyzer.connect(ctx.destination);
  }

  getAnalyzerData(): Uint8Array {
    if (!this.masterAnalyzer) return new Uint8Array(0);
    const dataArray = new Uint8Array(this.masterAnalyzer.frequencyBinCount);
    this.masterAnalyzer.getByteFrequencyData(dataArray);
    return dataArray;
  }

  updateMastering(params: { lowGain: number; highGain: number; compThreshold: number; limiterCeiling: number }) {
    if (!this.masteringChain) return;
    const ctx = this.getContext();
    this.masteringChain.lowShelf.gain.setTargetAtTime(params.lowGain, ctx.currentTime, 0.1);
    this.masteringChain.highShelf.gain.setTargetAtTime(params.highGain, ctx.currentTime, 0.1);
    this.masteringChain.compressor.threshold.setTargetAtTime(params.compThreshold, ctx.currentTime, 0.1);
    this.masteringChain.limiter.threshold.setTargetAtTime(params.limiterCeiling, ctx.currentTime, 0.1);
  }

  setMasterVolume(volume: number) {
    const ctx = this.getContext();
    if (this.masterBus) {
      this.masterBus.gain.setTargetAtTime(volume, ctx.currentTime, 0.05);
    }
  }

  async resume() {
    if (this.context && this.context.state === 'suspended') {
      await this.context.resume();
    }
  }

  setupTrack(track: Track) {
    const ctx = this.getContext();
    const effectIds = JSON.stringify(track.effects?.map(e => ({ id: e.id, enabled: e.enabled })) || []);
    
    if (!this.trackNodes.has(track.id) || this.trackNodes.get(track.id)?.lastEffectList !== effectIds) {
      if (this.trackNodes.has(track.id)) {
        const old = this.trackNodes.get(track.id)!;
        old.gain.disconnect();
        old.panner.disconnect();
        old.effectNodes.forEach(n => n.disconnect());
      }

      const gain = ctx.createGain();
      const panner = ctx.createStereoPanner();
      const effectNodes: AudioNode[] = [];
      
      gain.gain.value = track.muted ? 0 : track.volume;
      panner.pan.value = track.pan;

      let lastNode: AudioNode = gain;

      track.effects?.forEach(effect => {
        if (!effect.enabled) return;
        let effectNode: AudioNode | null = null;
        switch (effect.type) {
          case 'reverb': effectNode = ctx.createConvolver(); break;
          case 'compressor': effectNode = ctx.createDynamicsCompressor(); break;
          case 'eq': effectNode = ctx.createBiquadFilter(); (effectNode as BiquadFilterNode).type = 'peaking'; break;
          case 'delay': effectNode = ctx.createDelay(); break;
        }
        if (effectNode) {
          lastNode.connect(effectNode);
          lastNode = effectNode;
          effectNodes.push(effectNode);
        }
      });

      lastNode.connect(panner);
      panner.connect(this.masterBus!);
      this.trackNodes.set(track.id, { gain, panner, effectNodes, lastEffectList: effectIds });
    } else {
      const nodes = this.trackNodes.get(track.id)!;
      const targetVolume = track.muted ? 0 : track.volume;
      nodes.gain.gain.setTargetAtTime(targetVolume, ctx.currentTime, 0.02);
      nodes.panner.pan.setTargetAtTime(track.pan, ctx.currentTime, 0.02);
    }
  }

  updateTrackParams(track: Track) {
    this.setupTrack(track);
  }

  playMetronomeTick() {
    if (!this.context) return;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.frequency.setValueAtTime(1000, this.context.currentTime);
    gain.gain.setValueAtTime(0.1, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(this.masterBus!);
    osc.start();
    osc.stop(this.context.currentTime + 0.1);
  }

  async play(time: number, tracks: Track[]) {
    await this.resume();
    const ctx = this.getContext();
    this.stopAll();

    this.startTime = ctx.currentTime - time;

    if (useStore.getState().metronomeEnabled) {
      const bpm = useStore.getState().bpm;
      const beatDuration = 60 / bpm;
      for (let i = 0; i < 64; i++) {
        const beatTime = i * beatDuration;
        if (beatTime >= time) {
          const delay = beatTime - time;
          const tId = window.setTimeout(() => this.playMetronomeTick(), delay * 1000);
          this.metronomeTimers.push(tId);
        }
      }
    }

    // Solo logic: If any track is soloed, only those play. Otherwise all play.
    const hasSolo = tracks.some(t => t.soloed);
    const playableTracks = hasSolo ? tracks.filter(t => t.soloed) : tracks;

    for (const track of playableTracks) {
      if (track.muted && !track.soloed) continue;
      
      this.setupTrack(track);
      const { gain } = this.trackNodes.get(track.id)!;

      for (const region of track.regions) {
        if (track.type === 'midi' && region.notes) {
          const secondsPerBeat = 60 / useStore.getState().bpm;
          region.notes.forEach(note => {
            const noteStartTime = (region.startTime || 0) + note.startTime * secondsPerBeat;
            if (noteStartTime >= time) {
              const delay = noteStartTime - time;
              setTimeout(() => {
                if (useStore.getState().isPlaying) {
                  this.playNote(note.midi, note.duration * secondsPerBeat, track.id);
                }
              }, delay * 1000);
            }
          });
        }
        
        if (region.buffer) {
          const source = ctx.createBufferSource();
          source.buffer = region.buffer;
          source.connect(gain); // Connect to gain instead of panner

          // Calculate start offset and delay
          const offset = Math.max(0, time - region.startTime);
          const delay = Math.max(0, region.startTime - time);
          
          if (time < region.startTime + region.duration) {
             source.start(ctx.currentTime + delay, offset);
             this.activeSources.push(source);
          }
        }
      }
    }
  }

  stopAll() {
    this.activeSources.forEach(s => {
      try { 
        s.onended = null;
        s.stop(); 
      } catch(e) {}
    });
    this.activeSources = [];
    this.metronomeTimers.forEach(t => clearTimeout(t));
    this.metronomeTimers = [];
  }

  async startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.mediaRecorder = new MediaRecorder(stream);
    this.audioChunks = [];

    this.mediaRecorder.ondataavailable = (event) => {
      this.audioChunks.push(event.data);
    };

    this.mediaRecorder.start();
  }

  async stopRecording(): Promise<{ blob: Blob; buffer: AudioBuffer }> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder) return;
      
      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioBuffer = await this.getContext().decodeAudioData(arrayBuffer);
        resolve({ blob: audioBlob, buffer: audioBuffer });
      };

      this.mediaRecorder.stop();
      this.mediaRecorder.stream.getTracks().forEach(t => t.stop());
    });
  }

  playNote(midi: number, duration: number, trackId: string) {
    const ctx = this.getContext();
    let destination: AudioNode = ctx.destination;
    
    const track = useStore.getState().tracks.find(t => t.id === trackId);
    const node = this.trackNodes.get(trackId);
    if (node) {
      destination = node.gain;
    } else if (trackId === 'master' && this.masterBus) {
      destination = this.masterBus;
    }
    
    const instrument = track?.instrument;
    const type = instrument?.type || 'synth-mono';

    switch (type) {
      case 'synth-mono':
        this.synthMono(midi, duration, destination, instrument?.settings);
        break;
      case 'synth-pad':
        this.synthPad(midi, duration, destination, instrument?.settings);
        break;
      case 'synth-lead':
        this.synthLead(midi, duration, destination, instrument?.settings);
        break;
      case 'drums':
        this.drumTrigger(midi, destination);
        break;
      default:
        this.synthMono(midi, duration, destination);
    }
  }

  private synthMono(midi: number, duration: number, destination: AudioNode, settings?: any) {
    const ctx = this.getContext();
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    const osc = ctx.createOscillator();
    const sub = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = settings?.oscType || 'square';
    sub.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    sub.frequency.setValueAtTime(freq / 2, ctx.currentTime);

    filter.type = 'lowpass';
    const cutoff = settings?.cutoff || 1500;
    filter.frequency.setValueAtTime(cutoff, ctx.currentTime);
    // Filter Envelope: dynamic based on cutoff
    filter.frequency.exponentialRampToValueAtTime(Math.max(20, cutoff * 0.1), ctx.currentTime + duration);
    filter.Q.value = settings?.resonance || 2;

    const attack = settings?.attack ?? 0.05;
    const release = settings?.release ?? 0.3;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration + release);

    osc.connect(filter);
    sub.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    osc.start();
    sub.start();
    osc.stop(ctx.currentTime + duration + release);
    sub.stop(ctx.currentTime + duration + release);
  }

  private synthPad(midi: number, duration: number, destination: AudioNode, settings?: any) {
    const ctx = this.getContext();
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    
    // Polyphonic-ish feel with two detuned oscillators
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const osc3 = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    const detune = settings?.detune ?? 0.005;

    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc3.type = 'sine';
    osc1.frequency.setValueAtTime(freq, ctx.currentTime);
    osc2.frequency.setValueAtTime(freq * (1 + detune), ctx.currentTime);
    osc3.frequency.setValueAtTime(freq * 0.5, ctx.currentTime); // Sub

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(settings?.cutoff || 1200, ctx.currentTime);
    filter.Q.value = 1;

    const attack = settings?.attack ?? 0.8;
    const release = settings?.release ?? 1.5;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration + release);

    osc1.connect(filter);
    osc2.connect(filter);
    osc3.connect(gain); // Sub bypasses filter for warmth
    filter.connect(gain);
    gain.connect(destination);

    osc1.start();
    osc2.start();
    osc3.start();
    osc1.stop(ctx.currentTime + duration + release);
    osc2.stop(ctx.currentTime + duration + release);
    osc3.stop(ctx.currentTime + duration + release);
  }

  private synthLead(midi: number, duration: number, destination: AudioNode, settings?: any) {
    const ctx = this.getContext();
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    // Vibrato LFO
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = settings?.vibrato ?? 5;
    lfoGain.gain.value = 5;
    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);
    lfoGain.connect(osc2.frequency);

    osc1.type = 'sawtooth';
    osc2.type = 'square';
    osc1.frequency.setValueAtTime(freq, ctx.currentTime);
    osc2.frequency.setValueAtTime(freq * 1.01, ctx.currentTime);

    filter.type = 'lowpass';
    const cutoff = settings?.cutoff ?? 2000;
    filter.frequency.setValueAtTime(cutoff, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + (settings?.decay ?? 0.5));

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration + 0.1);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    lfo.start();
    osc1.start();
    osc2.start();
    lfo.stop(ctx.currentTime + duration + 0.1);
    osc1.stop(ctx.currentTime + duration + 0.1);
    osc2.stop(ctx.currentTime + duration + 0.1);
  }

  private drumTrigger(midi: number, destination: AudioNode) {
    const ctx = this.getContext();
    const gain = ctx.createGain();
    gain.connect(destination);

    // Basic GM Drum Mapping
    if (midi === 36) { // Kick
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      g.gain.setValueAtTime(1, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.connect(g);
      g.connect(gain);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } else if (midi === 38) { // Snare
      const noise = ctx.createBufferSource();
      const bufferSize = ctx.sampleRate * 0.2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 1000;

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.5, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

      noise.connect(filter);
      filter.connect(g);
      g.connect(gain);
      noise.start();
    } else if (midi === 42) { // Hi-Hat
      const noise = ctx.createBufferSource();
      const bufferSize = ctx.sampleRate * 0.05;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 7000;

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.3, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

      noise.connect(filter);
      filter.connect(g);
      g.connect(gain);
      noise.start();
    }
  }

  async loadAudio(url: string): Promise<AudioBuffer> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.status} ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      
      if (arrayBuffer.byteLength === 0) {
        throw new Error("Audio buffer is empty");
      }

      const ctx = this.getContext();
      // Use the promise-based decodeAudioData with a fallback for older implementations if needed
      // but in this environment it should be fine.
      return await ctx.decodeAudioData(arrayBuffer);
    } catch (e) {
      console.error(`AudioEngine: Error loading audio from ${url}`, e);
      // Create a short silent buffer as a fallback to prevent total failure
      const ctx = this.getContext();
      return ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
    }
  }
}

export const audioEngine = new AudioEngine();
