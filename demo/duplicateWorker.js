importScripts('./unglish-worker.js');

onmessage = function(e) {
  if (e.data.action === 'findDuplicates') {
    const iterations = e.data.iterations;
    findDuplicateWords(iterations);
  }
};

function findDuplicateWords(iterations) {
  if (typeof self.unglish === 'undefined' || typeof self.unglish.generateWord !== 'function') {
    postMessage({
      type: 'error',
      message: 'Unglish object or generateWord function is not available'
    });
    return;
  }

  const generatedWords = new Map();
  const startTime = performance.now();

  for (let i = 0; i < iterations; i++) {
    const newWord = self.unglish.generateWord();
    const wordKey = `${newWord.written.clean} (${newWord.pronunciation})`;
    generatedWords.set(wordKey, (generatedWords.get(wordKey) || 0) + 1);

    if (i % 1000 === 0) {
      postMessage({
        type: 'progress',
        progress: i,
        total: iterations
      });
    }
  }

  const endTime = performance.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  const duplicates = Array.from(generatedWords.entries())
    .filter(([_, count]) => count > 1)
    .sort((a, b) => b[1] - a[1]);

  const totalDuplicates = duplicates.reduce((sum, [_, count]) => sum + count, 0);
  const uniqueDuplicates = duplicates.length;
  const dupeCount = totalDuplicates - uniqueDuplicates;

  const formattedDuplicates = duplicates
    .map(([word, count]) => `${word} (${count})`)
    .join(', ');

  postMessage({
    type: 'result',
    iterations: iterations,
    dupeCount: dupeCount,
    dupePercentage: (dupeCount / iterations * 100).toFixed(2),
    formattedDuplicates: formattedDuplicates,
    duration: duration
  });
}