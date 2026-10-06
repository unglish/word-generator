/** Rendering-thread collector: dynamic block sizes, one start, exact frame bound. */
export const recorderWorklet = `
class FirstRecording extends AudioWorkletProcessor {
  constructor(options) {
    super(); this.limit = options.processorOptions.maximumFrames;
    if (!Number.isSafeInteger(this.limit) || this.limit < 1) throw new Error('Invalid frame bound');
    this.started = false; this.running = false; this.completed = false; this.ready = false; this.frames = 0; this.chunks = [];
    this.port.onmessage = event => {
      if (event.data === 'start' && !this.started && !this.completed) {
        this.started = true; this.running = true; this.port.postMessage({kind:'started'});
      } else if (event.data === 'stop' && this.started && !this.completed) this.finish();
    };
  }
  finish() {
    if (this.completed) return;
    this.running = false; this.completed = true;
    const samples = new Float32Array(this.frames); let offset = 0;
    for (const chunk of this.chunks) { samples.set(chunk, offset); offset += chunk.length; }
    this.chunks = []; this.port.postMessage({kind:'complete', samples:samples.buffer}, [samples.buffer]);
  }
  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (!this.ready && channel && channel.length) { this.ready = true; this.port.postMessage({kind:'ready'}); }
    if (this.running) {
      if (!channel || !channel.length) { this.running = false; this.completed = true; this.port.postMessage({kind:'failed', reason:'Audio input was interrupted.'}); }
      else {
        const count = Math.min(channel.length, this.limit - this.frames);
        this.chunks.push(channel.slice(0, count)); this.frames += count;
        if (this.frames === this.limit) this.finish();
      }
    }
    return true;
  }
}
registerProcessor('first-recording', FirstRecording);
`;
