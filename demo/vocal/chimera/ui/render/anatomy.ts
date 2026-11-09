/**
 * Thin slice of Chimera's anatomy.ts for the 3D head: handle positions + view flags.
 * Full 2D AnatomyRenderer is not vendored into the Unglish vocal demo.
 */
import type { HumanArtic, HumanFrame } from "../../wasm/types.ts";
import type { Vec } from "./geom.ts";
import type { VoiceModel } from "../analysis.ts";
import { jawFn } from "./profile.ts";

export type HandleId = "tongue" | "tip" | "jaw" | "lips" | "velum" | "larynx";

export interface Handle {
  id: HandleId;
  pos: Vec;
  label: string;
}

/** where the articulators' handles sit (body cm) */
export function faceHandles(model: VoiceModel, f: HumanFrame, a: HumanArtic): Handle[] {
  const t = model.tract;
  const J = jawFn(model, a);
  const lips = {
    x: (f.upperLip[6].x + f.lowerLip[6].x) / 2 + 0.15,
    y: (f.upperLip[6].y + f.lowerLip[6].y) / 2,
  };
  return [
    { id: "tongue", pos: f.tongueCenter, label: "Tongue body" },
    { id: "tip", pos: f.tip, label: "Tongue tip" },
    { id: "jaw", pos: J(7.5, 4.9), label: "Jaw" },
    { id: "lips", pos: lips, label: "Lips" },
    { id: "velum", pos: f.velum[Math.floor(f.velum.length / 2)], label: "Soft palate" },
    { id: "larynx", pos: { x: f.glottis.x + 1.2 * t.scale, y: f.glottis.y }, label: "Larynx" },
  ];
}

export interface FaceView {
  handles(model: VoiceModel, f: HumanFrame, a: HumanArtic): Handle[];
  X(p: Vec): number;
  Y(p: Vec): number;
  readonly pxPerCm: number;
}

export interface ViewFlags {
  pressure: boolean;
  particles: boolean;
  grid: boolean;
  calipers: boolean;
}

/** Defaults for the Unglish vocal head (pressure + particles on, no calipers). */
export const DEFAULT_VIEW: ViewFlags = {
  pressure: true,
  particles: true,
  grid: false,
  calipers: false,
};
