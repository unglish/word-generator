use std::{hint::black_box, time::Instant};
use unglish_core::{repair_clusters, Policy, Syllable};
fn main() {
    let syllables = vec![
        Syllable {
            onset: &[0],
            nucleus: &[3],
            coda: &[2, 2],
        },
        Syllable {
            onset: &[1, 1],
            nucleus: &[3],
            coda: &[],
        },
    ];
    let banned = [(2, 1)];
    for _ in 0..2000 {
        black_box(
            repair_clusters(black_box(&syllables), &banned, Policy::DropCoda).collect::<Vec<_>>(),
        );
    }
    let mut samples = Vec::new();
    for _ in 0..5 {
        let start = Instant::now();
        for _ in 0..20000 {
            black_box(
                repair_clusters(black_box(&syllables), &banned, Policy::DropCoda)
                    .collect::<Vec<_>>(),
            );
        }
        samples.push(start.elapsed().as_secs_f64() * 1e9 / 20000.0);
    }
    println!("{{\"callsPerSample\":20000,\"nsPerCall\":{:?}}}", samples);
}
