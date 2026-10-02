use serde_json::Value;
use unglish_core::{repair_clusters, Policy, Syllable as View};
#[derive(Clone, Debug, PartialEq, Eq)]
struct Syllable {
    onset: Vec<u32>,
    nucleus: Vec<u32>,
    coda: Vec<u32>,
}
fn views(data: &[Syllable]) -> Vec<View> {
    data.iter()
        .map(|s| View {
            onset: &s.onset,
            nucleus: &s.nucleus,
            coda: &s.coda,
        })
        .collect()
}
fn ids(v: &Value) -> Vec<u32> {
    v.as_array()
        .unwrap()
        .iter()
        .map(|n| n.as_u64().unwrap() as u32)
        .collect()
}
fn syllables(v: &Value) -> Vec<Syllable> {
    v.as_array()
        .unwrap()
        .iter()
        .map(|s| Syllable {
            onset: ids(&s["onset"]),
            nucleus: ids(&s["nucleus"]),
            coda: ids(&s["coda"]),
        })
        .collect()
}
#[test]
fn shared_typescript_fixtures() {
    let corpus: Value = serde_json::from_str(include_str!(
        "../../../evaluation/repair-pilot/fixtures.json"
    ))
    .unwrap();
    assert_eq!(corpus["schema"], 1);
    for case in corpus["cases"].as_array().unwrap() {
        let before = syllables(&case["input"]);
        let mut after = before.clone();
        let policy = if case["policy"] == "drop-coda" {
            Policy::DropCoda
        } else {
            Policy::DropOnset
        };
        let banned: Vec<_> = case["banned"]
            .as_array()
            .unwrap()
            .iter()
            .map(|p| {
                let p = ids(p);
                (p[0], p[1])
            })
            .collect();
        let events: Vec<_> = repair_clusters(&views(&before), &banned, policy).collect();
        let cuts: Vec<u32> = events
            .iter()
            .flat_map(|(i, c)| [*i as u32, c.coda_len as u32, c.onset_start as u32])
            .collect();
        assert_eq!(cuts, ids(&case["cuts"]), "{}", case["name"]);
        for (i, cuts) in events {
            after[i].coda.truncate(cuts.coda_len);
            after[i + 1].onset.drain(..cuts.onset_start);
        }
        assert_eq!(after, syllables(&case["expected"]), "{}", case["name"]);
        for (a, b) in before.iter().zip(&after) {
            assert_eq!(a.nucleus, b.nucleus);
        }
        for pair in after.windows(2) {
            if let (Some(a), Some(b)) = (pair[0].coda.last(), pair[1].onset.first()) {
                assert!(!banned.contains(&(*a, *b)));
            }
        }
        assert!(repair_clusters(&views(&after), &banned, policy)
            .all(|(i, c)| c.coda_len == after[i].coda.len() && c.onset_start == 0));
    }
}
