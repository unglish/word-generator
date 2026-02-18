importScripts('./unglish-worker.js');

onmessage = function(e) {
  if (e.data.action === 'generateStats') {
    const count = e.data.count || 200000;
    const PROGRESS_EVERY = 10000;
    const words = [];
    const phonemes = [];
    for (let i = 0; i < count; i++) {
      const w = self.unglish.generateWord({ mode: 'lexicon' });
      words.push(w.written.clean);
      const sounds = w.syllables.flatMap(function(s) {
        return [].concat(s.onset, s.nucleus, s.coda).map(function(p) {
          return p.sound.replace(/\u02B0/g, ''); // strip aspiration
        });
      });
      phonemes.push(sounds);
      if ((i + 1) % PROGRESS_EVERY === 0 && (i + 1) < count) {
        postMessage({ type: 'progress', done: i + 1, total: count });
      }
    }
    postMessage({ type: 'stats', words: words, phonemes: phonemes });
  }
};
