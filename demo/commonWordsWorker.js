importScripts('./unglish-worker.js');

const commonWords = [
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
  'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
  'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
  'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
  'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take',
  'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other',
  'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also',
  'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way',
  'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us'
];

onmessage = function(e) {
  if (e.data.action === 'findCommonWords') {
    findCommonWords();
  }
};

function findCommonWords() {
  if (typeof self.unglish === 'undefined' || typeof self.unglish.generateWord !== 'function') {
    postMessage({
      type: 'error',
      message: 'Unglish object or generateWord function is not available'
    });
    return;
  }

  const foundWords = new Set();
  const startTime = performance.now();
  let iterations = 0;

  while (foundWords.size < commonWords.length) {
    iterations++;
    const newWord = self.unglish.generateWord();
    const generatedWord = newWord.written.clean.toLowerCase();

    if (commonWords.includes(generatedWord) && !foundWords.has(generatedWord)) {
      const wordGenerationTime = performance.now() - startTime;
      foundWords.add(generatedWord);
      postMessage({
        type: 'wordFound',
        word: generatedWord,
        iterations: iterations,
        time: (wordGenerationTime / 1000).toFixed(2),
        remainingCount: commonWords.length - foundWords.size
      });
    }

    if (iterations % 1000 === 0) {
      postMessage({
        type: 'progress',
        iterations: iterations,
        foundCount: foundWords.size,
        remainingCount: commonWords.length - foundWords.size
      });
    }
  }

  const endTime = performance.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  postMessage({
    type: 'complete',
    iterations: iterations,
    duration: duration
  });
}

// Send the list of common words to the main thread
postMessage({
  type: 'wordList',
  words: commonWords
});
