export interface OrthographicStyle {
  id: string;
  label: string;
  interpretation: string;
}
export interface StyleSource {
  id: string;
  title: string;
  url: string;
  accessed_at: string;
  claim_scope: "lexeme-history" | "orthographic-association";
}
export interface LegacyOriginClaim { code: number; label: string | null; status: "unsourced-legacy" }
export interface BorrowingPathway { example: string; language_stages: string[]; source_id: string }
export interface OriginAssessment {
  kind: "unassessed" | "lexeme-dependent";
  legacy: LegacyOriginClaim;
  pathways: BorrowingPathway[];
  interpretation: string;
}
export interface StyleFeature {
  phoneme: string;
  form: string;
  associations: { style_id: string; multiplier: number }[];
  source_ids: string[];
  strength_basis: "experimental-heuristic";
}
export interface LexicalStylePolicy {
  version: "soft-orthographic-style-v1";
  strength: number;
  styles: { style: OrthographicStyle; prior: number }[];
  sources: StyleSource[];
  features: StyleFeature[];
}
export interface StyleChoice {
  profile_id: string;
  style_id: string;
  draw: number;
  normalized_priors: { style_id: string; probability: number }[];
}
export interface StyleWeightEvidence {
  phoneme: string;
  form: string;
  base_weight: number;
  multiplier: number;
  final_weight: number;
  association_source_ids: string[];
}
