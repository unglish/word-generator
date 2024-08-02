import { describe, it, expect } from 'vitest';
import { generateWord, buildCluster } from './generate';

describe('Word Generator', () => {
  it('generates word with specified syllable count', () => {
    const word = generateWord({ syllableCount: 3 });
    expect(word.syllables.length).toBe(3);
  });

  it('generates reproducible word with seed', () => {
    const word1 = generateWord({ seed: 12345 });
    const word2 = generateWord({ seed: 12345 });
    expect(word1.written.clean).toBe(word2.written.clean);
  });
});

describe('buildCluster function', () => {
  it('produces s + p/t/k + * onset clusters', () => {
    const attempts = 10000;
    const exceptionalClusters = ['sp', 'st', 'sk'];
    const foundClusters = new Set<string>();
    const allClusters = new Set<string>();

    for (let i = 0; i < attempts; i++) {
      const cluster = buildCluster('onset', 3, [], true, false);
      const clusterString = cluster.map(p => p.sound).join('');
      
      allClusters.add(clusterString);
      
      // Check if the cluster starts with any special cluster and is 3 characters long
      if (exceptionalClusters.some(sc => clusterString.startsWith(sc)) && clusterString.length === 3) {
        foundClusters.add(clusterString.slice(0, 2));
      }

      if (foundClusters.size === exceptionalClusters.length) break;
    }

    expect(foundClusters.size).toBe(exceptionalClusters.length);
    exceptionalClusters.forEach(cluster => {
      expect(foundClusters.has(cluster)).toBe(true);
    });
  });

  it('produces *some* SSP violating clusters', () => {
    const attempts = 100000;
    const exceptionalClusters = ['pt', 'ps', 'ks', 'pt'];
    const foundClusters = new Set<string>();
    const allClusters = new Set<string>();

    for (let i = 0; i < attempts; i++) {
      const cluster = buildCluster('coda', 2, [], false, true);
      const clusterString = cluster.map(p => p.sound).join('');
      
      allClusters.add(clusterString);
      
      if (exceptionalClusters.some(sc => clusterString.endsWith(sc))) {
        foundClusters.add(clusterString.slice(0, 2));
      }

      if (foundClusters.size === exceptionalClusters.length) break;
    }

    expect(foundClusters.size).toBeGreaterThan(0);
  });
});