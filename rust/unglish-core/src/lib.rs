//! Portable cluster repair. IDs are assigned by the caller in inventory order.
//! No platform dependencies, randomness, metadata reconstruction, or hidden bounds.
pub type PhonemeId = u32;

// A numeric comparison of both full-width IDs; no tuple layout assumptions.
const fn pair_key(left: PhonemeId, right: PhonemeId) -> u64 {
    (left as u64) | ((right as u64) << 32)
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Policy {
    DropCoda,
    DropOnset,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Syllable<'a> {
    pub onset: &'a [PhonemeId],
    pub nucleus: &'a [PhonemeId],
    pub coda: &'a [PhonemeId],
}

/// Zero-based original positions: retain coda[..coda_len] and onset[onset_start..].
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Cuts {
    pub coda_len: usize,
    pub onset_start: usize,
}

/// This is the shipping algorithm used by native, Wasm, and Kani callers.
/// Each iteration decreases the remaining selected cluster length by one.
pub fn repair_boundary(
    coda: &[PhonemeId],
    onset: &[PhonemeId],
    banned: &[(PhonemeId, PhonemeId)],
    policy: Policy,
) -> Cuts {
    let mut cuts = Cuts {
        coda_len: coda.len(),
        onset_start: 0,
    };
    while cuts.coda_len > 0 && cuts.onset_start < onset.len() && {
        let exposed = pair_key(coda[cuts.coda_len - 1], onset[cuts.onset_start]);
        banned
            .iter()
            .any(|&(left, right)| pair_key(left, right) == exposed)
    } {
        match policy {
            Policy::DropCoda => cuts.coda_len -= 1,
            Policy::DropOnset => cuts.onset_start += 1,
        }
    }
    cuts
}

/// Emit every initially nonempty boundary, including unchanged ones. No input
/// mutation: caller applies only these cuts, retaining its own objects/metadata.
pub struct Repairs<'a> {
    syllables: &'a [Syllable<'a>],
    banned: &'a [(PhonemeId, PhonemeId)],
    policy: Policy,
    next: usize,
}

impl Iterator for Repairs<'_> {
    type Item = (usize, Cuts);
    fn next(&mut self) -> Option<Self::Item> {
        while self.next < self.syllables.len().saturating_sub(1) {
            let i = self.next;
            self.next += 1;
            let coda = self.syllables[i].coda;
            let onset = self.syllables[i + 1].onset;
            if !coda.is_empty() && !onset.is_empty() {
                return Some((i, repair_boundary(coda, onset, self.banned, self.policy)));
            }
        }
        None
    }
}

pub fn repair_clusters<'a>(
    syllables: &'a [Syllable<'a>],
    banned: &'a [(PhonemeId, PhonemeId)],
    policy: Policy,
) -> Repairs<'a> {
    Repairs {
        syllables,
        banned,
        policy,
        next: 0,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn packed_pairs_preserve_full_width_and_order() {
        let banned = [(u32::MAX, 0x8000_0000)];
        assert_eq!(
            repair_boundary(&[u32::MAX], &[0x8000_0000], &banned, Policy::DropCoda).coda_len,
            0
        );
        for (left, right) in [
            (u32::MAX, 0),
            (0x7fff_ffff, 0x8000_0000),
            (0x8000_0000, u32::MAX),
        ] {
            assert_eq!(
                repair_boundary(&[left], &[right], &banned, Policy::DropCoda).coda_len,
                1
            );
        }
    }
}

#[cfg(kani)]
mod proofs {
    use super::*;

    // Harness-only limits: 3 symbols, sides of length 0..=4, arbitrary relation.
    // Native/Wasm accept longer sides and arbitrary u32 identifiers.
    #[kani::proof]
    #[kani::unwind(12)]
    fn boundary_contract() {
        let coda: [u32; 4] = kani::any();
        let onset: [u32; 4] = kani::any();
        for id in coda.iter().chain(onset.iter()) {
            kani::assume(*id < 3);
        }
        let c_len: usize = kani::any();
        let o_len: usize = kani::any();
        kani::assume(c_len <= 4 && o_len <= 4);
        let relation: [bool; 9] = kani::any();
        // Fixed relation representation avoids symbolic allocation. The sentinel
        // is outside the valid alphabet and therefore cannot ban a valid pair.
        let mut banned = [(3, 3); 9];
        for i in 0..9 {
            if relation[i] {
                banned[i] = ((i / 3) as u32, (i % 3) as u32);
            }
        }
        let policy = if kani::any() {
            Policy::DropCoda
        } else {
            Policy::DropOnset
        };
        let c = &coda[..c_len];
        let o = &onset[..o_len];
        let cuts = repair_boundary(c, o, &banned, policy);
        assert!(cuts.coda_len <= c_len && cuts.onset_start <= o_len);
        match policy {
            Policy::DropCoda => assert_eq!(cuts.onset_start, 0),
            Policy::DropOnset => assert_eq!(cuts.coda_len, c_len),
        }
        // Independent postcondition uses the boolean relation, not contains().
        if cuts.coda_len > 0 && cuts.onset_start < o_len {
            assert!(!relation[(c[cuts.coda_len - 1] * 3 + o[cuts.onset_start]) as usize]);
        }
        let deleted = c_len - cuts.coda_len + cuts.onset_start;
        assert!(
            deleted
                <= match policy {
                    Policy::DropCoda => c_len,
                    Policy::DropOnset => o_len,
                }
        );
        // A result describes an ordered prefix/suffix; reapplying repairs deletes
        // nothing. Nuclei are outside the boundary function and cannot change.
        let again = repair_boundary(&c[..cuts.coda_len], &o[cuts.onset_start..], &banned, policy);
        assert_eq!(again.coda_len, cuts.coda_len);
        assert_eq!(again.onset_start, 0);
        // Minimality: every deleted exposed pair was banned.
        for i in 0..deleted {
            let (a, b) = match policy {
                Policy::DropCoda => (c[c_len - 1 - i], o[0]),
                Policy::DropOnset => (c[c_len - 1], o[i]),
            };
            assert!(relation[(a * 3 + b) as usize]);
        }
    }

    // Wrapper proof uses fixed small views; larger/variable clusters are covered
    // by boundary_contract. No allocator abstractions or alternate algorithm.
    #[kani::proof]
    #[kani::unwind(5)]
    fn word_contract() {
        let c: u32 = kani::any();
        let o: u32 = kani::any();
        kani::assume(c < 2 && o < 2);
        let relation: [bool; 4] = kani::any();
        let mut banned = [(2, 2); 4];
        for i in 0..4 {
            if relation[i] {
                banned[i] = ((i / 2) as u32, (i % 2) as u32);
            }
        }
        let policy = if kani::any() {
            Policy::DropCoda
        } else {
            Policy::DropOnset
        };
        let coda = [c];
        let onset = [o];
        let nuclei: [u32; 2] = kani::any();
        let word = [
            Syllable {
                onset: &[],
                nucleus: &nuclei[..1],
                coda: &coda,
            },
            Syllable {
                onset: &onset,
                nucleus: &nuclei[1..],
                coda: &[],
            },
        ];
        assert!(repair_clusters(&word[..0], &banned, policy)
            .next()
            .is_none());
        assert!(repair_clusters(&word[..1], &banned, policy)
            .next()
            .is_none());
        let mut events = repair_clusters(&word, &banned, policy);
        let (index, cuts) = events.next().unwrap();
        assert_eq!(index, 0);
        assert!(events.next().is_none());
        assert!(cuts.coda_len <= 1 && cuts.onset_start <= 1);
        match policy {
            Policy::DropCoda => assert_eq!(cuts.onset_start, 0),
            Policy::DropOnset => assert_eq!(cuts.coda_len, 1),
        }
        if cuts.coda_len > 0 && cuts.onset_start < 1 {
            assert!(!relation[(c * 2 + o) as usize]);
        }
        let again = repair_boundary(
            &coda[..cuts.coda_len],
            &onset[cuts.onset_start..],
            &banned,
            policy,
        );
        assert_eq!(again.coda_len, cuts.coda_len);
        assert_eq!(again.onset_start, 0);
        assert_eq!(word[0].nucleus[0], nuclei[0]);
        assert_eq!(word[1].nucleus[0], nuclei[1]);
        assert_eq!(word[0].coda[0], c);
        assert_eq!(word[1].onset[0], o);
        let empty_coda = [
            Syllable {
                coda: &[],
                ..word[0]
            },
            word[1],
        ];
        let empty_onset = [
            word[0],
            Syllable {
                onset: &[],
                ..word[1]
            },
        ];
        assert!(repair_clusters(&empty_coda, &banned, policy)
            .next()
            .is_none());
        assert!(repair_clusters(&empty_onset, &banned, policy)
            .next()
            .is_none());
    }
}
