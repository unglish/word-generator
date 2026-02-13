importScripts('./unglish-worker.js');

onmessage = function(e) {
  if (e.data.action === 'generateStats') {
    const count = e.data.count || 10000;
    const words = [];
    for (let i = 0; i < count; i++) {
      const w = self.unglish.generateWord({ mode: 'lexicon' });
      words.push(w.written.clean);
    }
    postMessage({ type: 'stats', words: words });
  }
};
