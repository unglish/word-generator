importScripts('./unglish-worker.js');

let isSearching = false;

onmessage = function(e) {
  if (e.data.action === 'findMatch') {
    isSearching = true;
    findMatch(e.data.targetWord, e.data.isRegex, e.data.syllableCount);
  } else if (e.data.action === 'cancel') {
    isSearching = false;
  }
};

function findMatch(targetWord, isRegex, syllableCount) {
  if (typeof self.unglish === 'undefined' || typeof self.unglish.generateWord !== 'function') {
    postMessage({
      type: 'error',
      message: 'Unglish object or generateWord function is not available'
    });
    return;
  }

  let attempts = 0;
  const closeMatches = new Set();
  const generatedWords = new Set();
  const startTime = performance.now();
  const regex = isRegex ? new RegExp(targetWord) : null;

  while (isSearching) {
    const generatedWord = self.unglish.generateWord({ syllableCount: syllableCount || undefined });
    const writtenWord = generatedWord.written.clean.toLowerCase();
    attempts++;

    if (!generatedWords.has(writtenWord)) {
      generatedWords.add(writtenWord);

      if (isRegex ? regex.test(writtenWord) : writtenWord === targetWord) {
        postMessage({
          type: 'match',
          word: writtenWord,
          attempts: attempts,
          duration: ((performance.now() - startTime) / 1000).toFixed(2)
        });
        isSearching = false;
        return;
      } else if (
        (isRegex ? 
          (writtenWord.length === targetWord.length && writtenWord.match(regex)) : 
          (writtenWord.includes(targetWord) || isOffByOneLetter(writtenWord, targetWord))
        ) &&
        !closeMatches.has(writtenWord)
      ) {
        closeMatches.add(writtenWord);
        postMessage({
          type: 'closeMatch',
          word: writtenWord,
          attempts: attempts,
          duration: ((performance.now() - startTime) / 1000).toFixed(2)
        });
      }
    }

    if (attempts % 1000 === 0) {
      postMessage({
        type: 'progress',
        attempts: attempts,
        duration: ((performance.now() - startTime) / 1000).toFixed(2)
      });
    }

    if (!isSearching) {
      break; // Exit the loop if search is cancelled
    }
  }

  // If we've exited the loop due to cancellation or completion
  postMessage({ 
    type: isSearching ? 'match' : 'cancelled',
    word: isSearching ? writtenWord : null,
    attempts: attempts,
    duration: ((performance.now() - startTime) / 1000).toFixed(2)
  });
}

function isOffByOneLetter(word1, word2) {
  const len1 = word1.length;
  const len2 = word2.length;
  
  if (Math.abs(len1 - len2) > 1) return false;
  
  let differences = 0;
  for (let i = 0, j = 0; i < len1 && j < len2; i++, j++) {
    if (word1[i] !== word2[j]) {
      differences++;
      if (differences > 1) return false;
      if (len1 > len2) i++;
      else if (len1 < len2) j++;
    }
  }
  
  return differences === 1 || (len1 !== len2 && differences === 0);
}