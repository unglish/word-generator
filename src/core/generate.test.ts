import { describe, it, expect } from 'vitest';
import { generateWord, buildCluster, isValidCluster } from './generate';
import { ClusterContext, Phoneme } from '../types';
import { phonemes } from '../elements/phonemes';

describe('Word Generator', () => {
  it('generates word with specified syllable count', () => {
    const word = generateWord({ syllableCount: 3 });
    expect(word.syllables.length).toBe(3);
  });

  it('generates a word with a valid written form', () => {
    const word = generateWord();
    expect(word.written.clean).toBeTruthy();
    expect(word.written.hyphenated).toBeTruthy();
  });

  it('generates a word with a valid pronunciation', () => {
    const word = generateWord();
    expect(word.pronunciation).toBeTruthy();
  });

  it('generates reproducible word with seed', () => {
    const word1 = generateWord({ seed: 12345 });
    const word2 = generateWord({ seed: 12345 });
    expect(word1.written.clean).toBe(word2.written.clean);
    expect(word1.pronunciation).toBe(word2.pronunciation);
  });
});

describe('buildCluster function', () => {
  it('produces s + p/t/k + * onset clusters', () => {
    const attempts = 10000;
    const exceptionalClusters = ['sp', 'st', 'sk'];
    const foundClusters = new Set<string>();
    const allClusters = new Set<string>();

    for (let i = 0; i < attempts; i++) {
      const context: ClusterContext = {
        position: 'onset',
        cluster: [],
        ignore: [],
        isStartOfWord: true,
        isEndOfWord: false,
        maxLength: 3,
        syllableCount: 1,
      };
      const cluster = buildCluster(context);
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

  it('produces *some* SSP violating clusters in codas', () => {
    const attempts = 10000;
    const exceptionalClusters = ['pt', 'ps', 'ks', 'pt'];
    const foundClusters = new Set<string>();
    const allClusters = new Set<string>();

    for (let i = 0; i < attempts; i++) {
      const context: ClusterContext = {
        position: 'coda',
        cluster: [],
        ignore: [],
        isStartOfWord: false,
        isEndOfWord: true,
        maxLength: 2,
        syllableCount: 1,
      };
      const cluster = buildCluster(context);
      const clusterString = cluster.map(p => p.sound).join('');
      
      allClusters.add(clusterString);
      
      if (exceptionalClusters.some(exception => clusterString.endsWith(exception))) {
        foundClusters.add(clusterString.slice(0, 2));
      }

      if (foundClusters.size === exceptionalClusters.length) break;
    }

    expect(foundClusters.size).toBeGreaterThan(0);
  });
});

describe('isValidCluster', () => {

  function getPhonemeBySounds(sounds: string[]): Phoneme[] {
    return sounds.map(sound => {
      const phoneme = phonemes.find(phoneme => phoneme.sound === sound);
      if (!phoneme) throw new Error(`Phoneme with sound "${sound}" not found`);
      return phoneme;
    });
  }

  describe('should block invalid onsets', () => {
    const invalidClusters = [
      ['t', 'd'],
      ['d', 'm'],
      ['f', 'n'],
      ['s', 'r'],
      ['p', 'n'],
      ['k', 'n'],
      ['d', 'g'],
      ['dʒ','w'],
    ];
    
    invalidClusters.forEach(cluster => {
      it(`should block invalid onset: ${cluster.join('')}`, () => {
        expect(isValidCluster({ cluster: getPhonemeBySounds(cluster), position: 'onset' } as ClusterContext)).toBe(false);
      });
    });
  });

  // it('should return false "dm" in an onset', () => {
  //   const validOnsetCluster = [getPhonemeBySound('d')];
  //   expect(isValidCluster(getPhonemeBySound('n'), { cluster: validOnsetCluster, position: 'onset' } as ClusterContext)).toBe(false);
  // });

  // it('should return false "fn" in an onset', () => {
  //   const validOnsetCluster = [getPhonemeBySound('f')];
  //   expect(isValidCluster(getPhonemeBySound('n'), { cluster: validOnsetCluster, position: 'onset' } as ClusterContext)).toBe(false);
  // });

  // it('should return false "dm" in an coda', () => {
  //   const validOnsetCluster = [getPhonemeBySound('d')];
  //   expect(isValidCluster(getPhonemeBySound('m'), { cluster: validOnsetCluster, position: 'coda' } as ClusterContext)).toBe(false);
  // });
});