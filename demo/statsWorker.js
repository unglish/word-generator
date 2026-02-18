importScripts('./unglish-worker.js');

onmessage = function(e) {
  if (e.data.action === 'generateStats') {
    const count = e.data.count || 200000;
    const seedStart = Number.isFinite(e.data.seedStart) ? e.data.seedStart : null;
    const diagnosticsConfig = e.data.diagnostics || { enabled: false, traceSamplePercent: 0 };
    const diagnosticsEnabled = !!diagnosticsConfig.enabled;
    const traceSamplePercent = Number.isFinite(diagnosticsConfig.traceSamplePercent) ? diagnosticsConfig.traceSamplePercent : 0;
    const traceStride = traceSamplePercent > 0 ? Math.max(1, Math.round(100 / traceSamplePercent)) : Infinity;
    const PROGRESS_EVERY = 10000;
    const words = [];
    const phonemes = [];
    const structuralEventCounts = {};
    const repairRuleCounts = {};
    const morphologyTemplateCounts = {};
    let tracedWords = 0;
    for (let i = 0; i < count; i++) {
      const shouldTrace = diagnosticsEnabled && (i % traceStride === 0);
      const options = { mode: 'lexicon' };
      if (seedStart !== null) options.seed = seedStart + i;
      if (shouldTrace) options.trace = true;
      const w = self.unglish.generateWord(options);
      words.push(w.written.clean);
      const sounds = w.syllables.flatMap(function(s) {
        return [].concat(s.onset, s.nucleus, s.coda).map(function(p) {
          return p.sound;
        });
      });
      phonemes.push(sounds);

      if (shouldTrace && w.trace) {
        tracedWords++;

        for (const evt of w.trace.structural || []) {
          structuralEventCounts[evt.event] = (structuralEventCounts[evt.event] || 0) + 1;
        }

        for (const rep of w.trace.repairs || []) {
          repairRuleCounts[rep.rule] = (repairRuleCounts[rep.rule] || 0) + 1;
        }

        if (w.trace.morphology && w.trace.morphology.template) {
          const tpl = w.trace.morphology.template;
          morphologyTemplateCounts[tpl] = (morphologyTemplateCounts[tpl] || 0) + 1;
        }
      }

      if ((i + 1) % PROGRESS_EVERY === 0 && (i + 1) < count) {
        postMessage({ type: 'progress', done: i + 1, total: count });
      }
    }
    postMessage({
      type: 'stats',
      words: words,
      phonemes: phonemes,
      diagnostics: diagnosticsEnabled ? {
        enabled: true,
        traceSamplePercent,
        tracedWords,
        totalWords: count,
        structuralEventCounts,
        repairRuleCounts,
        morphologyTemplateCounts,
      } : {
        enabled: false,
        traceSamplePercent: 0,
        tracedWords: 0,
        totalWords: count,
        structuralEventCounts: {},
        repairRuleCounts: {},
        morphologyTemplateCounts: {},
      },
    });
  }
};
