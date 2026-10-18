use unglish_core::{repair_clusters, Policy, Syllable};
use wasm_bindgen::prelude::*;

/// Reusable configuration. Pairs are consecutive u32 IDs; inventory_size is
/// checked before accepting either configuration or words.
#[wasm_bindgen]
pub struct RepairConfig {
    inventory_size: u32,
    banned: Vec<(u32, u32)>,
}

impl RepairConfig {
    // Keep validation independent of JsValue: constructing a JavaScript error
    // is a platform operation, not part of the native repair contract.
    fn from_pairs(inventory_size: u32, pairs: &[u32]) -> Result<Self, &'static str> {
        if pairs.len() % 2 != 0 || pairs.iter().any(|id| *id >= inventory_size) {
            return Err("Invalid banned-pair IDs");
        }
        Ok(Self {
            inventory_size,
            banned: pairs.chunks_exact(2).map(|p| (p[0], p[1])).collect(),
        })
    }

    fn repair_packet(&self, packet: &[u32], drop_onset: bool) -> Result<Vec<u32>, &'static str> {
        let syllables = decode(packet, self.inventory_size)?;
        let policy = if drop_onset {
            Policy::DropOnset
        } else {
            Policy::DropCoda
        };
        // Each initially nonempty boundary emits exactly one triple. Reserve the
        // final size so returning the Vec does not require growth or shrinking.
        let count = syllables
            .windows(2)
            .filter(|pair| !pair[0].coda.is_empty() && !pair[1].onset.is_empty())
            .count();
        let mut result = Vec::with_capacity(count * 3);
        // All output positions fit u32: count and segment lengths were decoded
        // from u32 fields, and repair only retains or drops existing positions.
        for (i, cuts) in repair_clusters(&syllables, &self.banned, policy) {
            result.extend([i as u32, cuts.coda_len as u32, cuts.onset_start as u32]);
        }
        Ok(result)
    }
}

#[wasm_bindgen]
impl RepairConfig {
    #[wasm_bindgen(constructor)]
    pub fn new(inventory_size: u32, pairs: &[u32]) -> Result<RepairConfig, JsValue> {
        Self::from_pairs(inventory_size, pairs).map_err(JsValue::from_str)
    }

    /// Packet v1: [version=1, syllable_count, onset_len, nucleus_len, coda_len,
    /// onset IDs..., nucleus IDs..., coda IDs..., ...]. One call per word.
    /// Result triples: [boundary_index, retained_coda_length, dropped_onset_length].
    pub fn repair(&self, packet: &[u32], drop_onset: bool) -> Result<Vec<u32>, JsValue> {
        self.repair_packet(packet, drop_onset)
            .map_err(JsValue::from_str)
    }
}

fn decode<'a>(packet: &'a [u32], inventory_size: u32) -> Result<Vec<Syllable<'a>>, &'static str> {
    if packet.len() < 2 || packet[0] != 1 {
        return Err("Invalid repair packet version");
    }
    let count = packet[1] as usize;
    // Reject oversized counts before allocating; each syllable needs 3 lengths.
    if count > (packet.len() - 2) / 3 {
        return Err("Invalid syllable count");
    }
    let mut result = Vec::with_capacity(count);
    let mut cursor: usize = 2;
    for _ in 0..count {
        let end = cursor.checked_add(3).ok_or("Cluster length overflow")?;
        let lengths = packet.get(cursor..end).ok_or("Missing cluster lengths")?;
        cursor = end;
        let mut read = |length: u32| -> Result<&'a [u32], &'static str> {
            let end = cursor
                .checked_add(length as usize)
                .ok_or("Cluster length overflow")?;
            let ids = packet.get(cursor..end).ok_or("Missing phoneme IDs")?;
            if ids.iter().any(|id| *id >= inventory_size) {
                return Err("Invalid phoneme ID");
            }
            cursor = end;
            Ok(ids)
        };
        result.push(Syllable {
            onset: read(lengths[0])?,
            nucleus: read(lengths[1])?,
            coda: read(lengths[2])?,
        });
    }
    if cursor != packet.len() {
        return Err("Trailing repair packet data");
    }
    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::Value;

    #[test]
    fn configurations_are_validated_without_javascript_errors() {
        for (inventory_size, pairs) in [(2, &[0][..]), (2, &[0, 2][..]), (0, &[0, 0][..])] {
            assert!(matches!(
                RepairConfig::from_pairs(inventory_size, pairs),
                Err("Invalid banned-pair IDs")
            ));
        }
        assert!(RepairConfig::from_pairs(0, &[]).is_ok());
        assert_eq!(
            RepairConfig::from_pairs(2, &[0, 1, 0, 1]).unwrap().banned,
            [(0, 1), (0, 1)]
        );
    }

    #[test]
    fn packets_are_validated_without_panics() {
        let config = RepairConfig::from_pairs(2, &[]).unwrap();
        for p in [
            vec![],
            vec![0, 0],
            vec![1, u32::MAX],
            vec![1, 1, u32::MAX, 0, 0],
            vec![1, 0, 3],
            vec![1, 1, 1, 0, 0, 2],
        ] {
            assert!(decode(&p, 2).is_err());
            for drop_onset in [false, true] {
                assert!(config.repair_packet(&p, drop_onset).is_err());
            }
        }
        assert!(decode(&[1, 0], 0).unwrap().is_empty());
        assert_eq!(decode(&[1, 1, 1, 1, 0, 0, 1], 2).unwrap()[0].nucleus, [1]);
    }

    #[test]
    fn shared_packets_match_cuts_and_borrow_input() {
        let corpus: Value = serde_json::from_str(include_str!(
            "../../../evaluation/repair-pilot/fixtures.json"
        ))
        .unwrap();
        let ids = |values: &Value| -> Vec<u32> {
            values
                .as_array()
                .unwrap()
                .iter()
                .map(|id| u32::try_from(id.as_u64().unwrap()).unwrap())
                .collect()
        };
        let inventory_size = u32::try_from(corpus["inventory"].as_array().unwrap().len()).unwrap();
        for case in corpus["cases"].as_array().unwrap() {
            let packet = ids(&case["packet"]);
            let original = packet.clone();
            let pairs: Vec<u32> = case["banned"]
                .as_array()
                .unwrap()
                .iter()
                .flat_map(ids)
                .collect();
            let config = RepairConfig::from_pairs(inventory_size, &pairs).unwrap();
            let drop_onset = match case["policy"].as_str().unwrap() {
                "drop-coda" => false,
                "drop-onset" => true,
                policy => panic!("unknown fixture policy: {policy}"),
            };
            assert_eq!(
                config.repair_packet(&packet, drop_onset).unwrap(),
                ids(&case["cuts"]),
                "{}",
                case["name"]
            );
            let decoded = decode(&packet, inventory_size).unwrap();
            let mut cursor = 2;
            for syllable in decoded {
                cursor += 3;
                for segment in [syllable.onset, syllable.nucleus, syllable.coda] {
                    assert_eq!(segment.as_ptr(), packet[cursor..].as_ptr());
                    cursor += segment.len();
                }
            }
            assert_eq!(cursor, packet.len());
            assert_eq!(packet, original);
        }
    }
}
