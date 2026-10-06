/** Preserve every captured mono frame; quantization is the only sample transform. */
export function encodeMonoWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  if (!Number.isInteger(sampleRate) || sampleRate < 8000 || sampleRate > 192000 || !samples.length) throw new Error("Invalid captured PCM dimensions.");
  const wav = new ArrayBuffer(44 + samples.length * 2), view = new DataView(wav);
  const text = (offset: number, value: string): void => { for (let index = 0; index < value.length; index++) view.setUint8(offset + index, value.charCodeAt(index)); };
  text(0, "RIFF"); view.setUint32(4, wav.byteLength - 8, true); text(8, "WAVE"); text(12, "fmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); text(36, "data"); view.setUint32(40, samples.length * 2, true);
  samples.forEach((sample, index) => {
    if (!Number.isFinite(sample)) throw new Error("Capture contains a nonfinite sample.");
    const bounded = Math.max(-1, Math.min(1, sample));
    view.setInt16(44 + index * 2, Math.round(bounded * (bounded < 0 ? 32768 : 32767)), true);
  });
  return wav;
}
