import { createHash } from "node:crypto";
import { digest } from "../snapshot.js";
import { validateAuditory, validateProduction } from "./freeze.js";
import { hash, makeTarget, nonempty } from "./targets.js";
import type { AudioAsset, AudioFacts, AudioVerification, AuditoryComparison, AuditoryRelease, ProductionContract } from "./model.js";

export function bytesHash(bytes: Uint8Array): string { return createHash("sha256").update(bytes).digest("hex"); }

export function inspectWav(bytes: Uint8Array, contract: ProductionContract): AudioFacts {
  validateProduction(contract);
  const data = Buffer.from(bytes);
  if (data.length < 44 || data.toString("ascii", 0, 4) !== "RIFF" || data.toString("ascii", 8, 12) !== "WAVE" ||
      data.readUInt32LE(4) + 8 !== data.length) throw new Error("Invalid complete RIFF/WAVE byte stream.");
  let offset = 12, formatSeen = false, payload: Buffer | undefined;
  while (offset < data.length) {
    if (offset + 8 > data.length) throw new Error("Truncated WAV chunk header.");
    const tag = data.toString("ascii", offset, offset + 4), size = data.readUInt32LE(offset + 4), start = offset + 8;
    const end = start + size, paddedEnd = end + size % 2;
    if (paddedEnd > data.length) throw new Error("Truncated WAV chunk payload.");
    if (tag === "fmt " && !formatSeen && size === 16) {
      const rate = data.readUInt32LE(start + 4);
      if (data.readUInt16LE(start) !== 1 || data.readUInt16LE(start + 2) !== 1 || rate !== contract.sample_rate ||
          data.readUInt32LE(start + 8) !== rate * 2 || data.readUInt16LE(start + 12) !== 2 || data.readUInt16LE(start + 14) !== 16) {
        throw new Error("Audio must use the registered PCM16 mono sample rate.");
      }
      formatSeen = true;
    } else if (tag === "data" && !payload) payload = data.subarray(start, end);
    else throw new Error("Only one fmt and data chunk are allowed; metadata cannot enter a blinded audio packet.");
    offset = paddedEnd;
  }
  if (!formatSeen || !payload || !payload.length || payload.length % 2) throw new Error("Missing or incomplete PCM16 frames.");
  const frames = payload.length / 2, seconds = frames / contract.sample_rate;
  if (seconds > contract.maximum_seconds) throw new Error("Recording exceeds the registered maximum duration.");
  let peak = 0, clipped = 0;
  for (let index = 0; index < payload.length; index += 2) {
    const sample = payload.readInt16LE(index);
    peak = Math.max(peak, Math.abs(sample));
    if (sample === -32768 || sample === 32767) clipped++;
  }
  return { sha256: bytesHash(data), bytes: data.length, format: "pcm16-mono-wav", sample_rate: contract.sample_rate,
    frames, seconds, peak_absolute_sample: peak, clipped_samples: clipped };
}

export interface AssetMaterial {
  target_digest: string;
  wav: Uint8Array;
  production_record: Uint8Array;
  verification: { record: AudioVerification; transcription_file: Uint8Array }[];
}

function validateAsset(comparison: AuditoryComparison, asset: AudioAsset): void {
  const target = comparison.items.find(item => item.target.digest === asset.target_digest)?.target;
  if (!target || digest(asset.production) !== digest(comparison.registration.production) || !hash(asset.production_record_sha256)) {
    throw new Error("Audio asset is not bound to the registered target and production settings.");
  }
  const facts = asset.audio, contract = comparison.registration.production;
  if (!hash(facts.sha256) || facts.format !== "pcm16-mono-wav" || facts.sample_rate !== contract.sample_rate ||
      !Number.isSafeInteger(facts.frames) || facts.frames <= 0 || facts.seconds !== facts.frames / facts.sample_rate || facts.seconds > contract.maximum_seconds ||
      !Number.isSafeInteger(facts.bytes) || facts.bytes !== 44 + facts.frames * 2 ||
      !Number.isSafeInteger(facts.peak_absolute_sample) || facts.peak_absolute_sample < 0 || facts.peak_absolute_sample > 32768 ||
      !Number.isSafeInteger(facts.clipped_samples) || facts.clipped_samples < 0 || facts.clipped_samples > facts.frames) throw new Error("Invalid frozen audio facts.");
  const people = new Set<string>();
  if (!Array.isArray(asset.verification)) throw new Error("Invalid verification inventory.");
  for (const record of asset.verification) {
    if (!hash(record.person_key) || people.has(record.person_key) || record.person_key === contract.producer_person_key ||
        record.audio_sha256 !== facts.sha256 || record.policy_digest !== target.policy_digest || !hash(record.transcription_sha256) ||
        record.independent_of_production !== true || record.blind_to_condition_and_target !== true || !nonempty(record.method)) {
      throw new Error("Invalid or dependent audio verification record.");
    }
    people.add(record.person_key);
    if (makeTarget(comparison.registration.pronunciation, record.transcription).digest !== target.digest) {
      throw new Error("Independent transcription does not match intended phones and stress.");
    }
  }
  if (comparison.registration.purpose === "human-study" && people.size < 2) throw new Error("Human release requires two independent blind pronunciation verifications per asset.");
}

export function freezeRelease(comparison: AuditoryComparison, materials: AssetMaterial[]): AuditoryRelease {
  validateAuditory(comparison);
  if (comparison.draws.some(draw => draw.assessment.status === "unresolved")) {
    throw new Error("Unresolved source targets remain; no available-subset audio release is allowed.");
  }
  const expected = new Set(comparison.items.map(item => item.target.digest));
  if (materials.length !== expected.size || new Set(materials.map(value => value.target_digest)).size !== materials.length ||
      materials.some(value => !expected.has(value.target_digest))) throw new Error("Exactly one audio asset is required per distinct target across all conditions.");
  const audioTargets = new Map<string, string>();
  const assets: AudioAsset[] = materials.map(material => {
    if (!material.production_record.length) throw new Error("Production record must be retained.");
    const audio = inspectWav(material.wav, comparison.registration.production);
    const productionRecord = JSON.parse(Buffer.from(material.production_record).toString("utf8"));
    if (productionRecord.version !== "auditory-production-record-v1" || productionRecord.target_digest !== material.target_digest ||
        productionRecord.audio_sha256 !== audio.sha256 || productionRecord.contract_digest !== digest(comparison.registration.production) ||
        !nonempty(productionRecord.method_details)) throw new Error("Production record does not bind the audio, target and registered contract.");
    const previous = audioTargets.get(audio.sha256);
    if (previous && previous !== material.target_digest) throw new Error("Different targets cannot share identical audio bytes.");
    audioTargets.set(audio.sha256, material.target_digest);
    const verification = material.verification.map(({ record, transcription_file }) => {
      if (bytesHash(transcription_file) !== record.transcription_sha256 ||
          digest(JSON.parse(Buffer.from(transcription_file).toString("utf8"))) !== digest(record.transcription)) {
        throw new Error("Verification transcription file changed.");
      }
      return record;
    });
    const asset = { target_digest: material.target_digest, audio, production: comparison.registration.production,
      production_record_sha256: bytesHash(material.production_record), verification };
    validateAsset(comparison, asset);
    return asset;
  }).sort((a, b) => a.target_digest < b.target_digest ? -1 : a.target_digest > b.target_digest ? 1 : 0);
  const content = { comparison_digest: comparison.digest, assets };
  return structuredClone({ ...content, digest: digest(content) });
}

export function validateRelease(comparison: AuditoryComparison, release: AuditoryRelease): void {
  validateAuditory(comparison);
  if (comparison.draws.some(draw => draw.assessment.status === "unresolved") || release.comparison_digest !== comparison.digest ||
      release.digest !== digest({ comparison_digest: release.comparison_digest, assets: release.assets })) throw new Error("Invalid auditory release binding.");
  const expected = new Set(comparison.items.map(item => item.target.digest));
  if (release.assets.length !== expected.size || new Set(release.assets.map(value => value.target_digest)).size !== expected.size ||
      new Set(release.assets.map(value => value.audio.sha256)).size !== release.assets.length) throw new Error("Audio inventory must preserve every distinct target exactly once.");
  release.assets.forEach(asset => validateAsset(comparison, asset));
}

export function verifyReleaseFiles(comparison: AuditoryComparison, release: AuditoryRelease, materials: AssetMaterial[]): void {
  if (digest(freezeRelease(comparison, materials)) !== digest(release)) throw new Error("Frozen audio, production or verification bytes changed.");
}
