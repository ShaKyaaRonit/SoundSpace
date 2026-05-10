class MasteringProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._rms = 0;
    this._peak = 0;
    this._count = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];

    // Simple pass-through with analysis
    if (input.length > 0) {
      const channel = input[0]; // Assuming mono for analysis
      
      let sum = 0;
      let peak = 0;
      
      for (let i = 0; i < channel.length; i++) {
        const sample = Math.abs(channel[i]);
        sum += sample * sample;
        if (sample > peak) peak = sample;
        
        // Pass through
        for (let c = 0; c < input.length; c++) {
          if (output[c]) output[c][i] = input[c][i];
        }
      }

      this._peak = peak;
      this._rms = Math.sqrt(sum / channel.length);
      
      this._count++;
      if (this._count % 40 === 0) { // Send updates every ~100ms
        this.port.postMessage({
          peak: 20 * Math.log10(this._peak || 1e-10),
          rms: 20 * Math.log10(this._rms || 1e-10)
        });
      }
    }

    return true;
  }
}

registerProcessor('mastering-processor', MasteringProcessor);
