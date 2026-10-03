export function auditoryCollectorHtml(nonce: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Word sound review</title><style nonce="${nonce}">
body{font:18px/1.5 system-ui,sans-serif;max-width:42rem;margin:3rem auto;padding:0 1.25rem;color:#16202a;background:#fafafa}
button{font:inherit;padding:.7rem 1rem;margin:.4rem .4rem .4rem 0;cursor:pointer}button:disabled{cursor:default}
fieldset{border:1px solid #9ba7b3;padding:1rem;margin:1rem 0}label{display:block;padding:.3rem}input{margin-right:.6rem}
audio{width:100%;margin:1rem 0}#notice{min-height:3rem}#progress:focus{outline:2px solid #53687c;outline-offset:.3rem}
</style></head><body><main><h1>Word sound review</h1><p id="instruction"></p><p id="question"></p>
<p id="progress" tabindex="-1"></p><audio id="audio" controls preload="auto"></audio><div id="choices"></div><div id="actions"></div>
<p id="notice" role="status" aria-live="polite"></p></main><script nonce="${nonce}">
const $ = id => document.getElementById(id), supplied = location.hash.slice(1);
let token = supplied || sessionStorage.getItem('auditory-review-token') || '';
if (supplied) { sessionStorage.setItem('auditory-review-token', supplied); history.replaceState(null, '', '/'); }
const answerKey = 'auditory-answer-' + token, playbackKey = 'auditory-playback-' + token;
let assignment = null, blobUrl = null, delivery = null, ready = false, heard = false, busy = false;
let pendingAnswer = JSON.parse(sessionStorage.getItem(answerKey) || 'null'), pendingPlayback = JSON.parse(sessionStorage.getItem(playbackKey) || 'null');
async function request(path, body) {
  const response = await fetch(path, { method: body ? 'POST' : 'GET', headers: { Authorization: 'Bearer ' + token,
    ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const value = await response.json(); if (!response.ok) throw new Error(value.error || 'Unable to continue.'); return value;
}
function lock(value) {
  busy = value; document.querySelectorAll('button').forEach(element => { element.disabled = value; });
  document.querySelectorAll('input').forEach(element => { element.disabled = value || !!pendingAnswer || !heard || !ready; });
  $('audio').controls = !value && !pendingAnswer;
}
function option(group, value, text) {
  const label = document.createElement('label'), input = document.createElement('input'); input.type = 'radio'; input.name = group; input.value = value;
  label.append(input, document.createTextNode(text)); return label;
}
function fieldset(text) { const field = document.createElement('fieldset'), legend = document.createElement('legend'); legend.textContent = text; field.append(legend); return field; }
function button(text, handler) { const result = document.createElement('button'); result.type = 'button'; result.textContent = text; result.addEventListener('click', handler); return result; }
function clearAudio() { $('audio').pause(); $('audio').removeAttribute('src'); $('audio').load(); if (blobUrl) URL.revokeObjectURL(blobUrl); blobUrl = null; delivery = null; ready = false; }
async function loadAudio(item) {
  const response = await fetch('/api/audio/' + item.audio_sha256, { headers: { Authorization: 'Bearer ' + token } });
  if (!response.ok) { const value = await response.json(); throw new Error(value.error || 'Audio could not be loaded.'); }
  const bytes = await response.arrayBuffer(), calculated = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).map(value => value.toString(16).padStart(2, '0')).join('');
  if (calculated !== item.audio_sha256 || response.headers.get('x-auditory-sha256') !== item.audio_sha256) throw new Error('This recording could not be verified. Please contact the study owner.');
  delivery = response.headers.get('x-auditory-delivery'); if (!delivery || !/^[a-f0-9]{64}$/.test(delivery)) throw new Error('Audio delivery receipt is missing.');
  blobUrl = URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' })); $('audio').src = blobUrl; ready = true;
}
async function showNext() {
  assignment = await request('/api/next'); clearAudio(); $('choices').replaceChildren(); $('actions').replaceChildren();
  if (assignment.exhausted) {
    $('audio').hidden = true; $('progress').textContent = 'Thank you'; $('question').textContent = 'Your review is complete.'; $('instruction').textContent = '';
    $('notice').textContent = 'All your responses have been saved.'; sessionStorage.removeItem('auditory-review-token'); return;
  }
  const packet = assignment.packet, rubric = packet.rubric, item = packet.items[assignment.position]; heard = assignment.playback_complete;
  $('audio').hidden = false; $('instruction').textContent = rubric.instructions; $('question').textContent = rubric.question;
  $('progress').textContent = 'Sound ' + (assignment.position + 1) + ' of ' + packet.items.length + ' in this session';
  const ratings = fieldset('Your rating'); rubric.scale.forEach(choice => ratings.append(option('rating', choice.value, choice.value + ' — ' + choice.label)));
  const familiarity = fieldset(rubric.familiarity_question); familiarity.append(option('familiar', 'yes', 'Yes'), option('familiar', 'no', 'No'));
  $('choices').append(ratings, familiarity); $('actions').append(button('Save and continue', () => save(false)), button('Skip this sound', () => save(true)), button('Retry connection', start));
  lock(true); await loadAudio(item); $('notice').textContent = heard ? 'Playback was saved. Choose your rating or listen again.' : 'Play the entire recording before rating.'; $('progress').focus();
}
async function confirmPlayback() {
  if (!pendingPlayback) return;
  await request('/api/playback', pendingPlayback); pendingPlayback = null; sessionStorage.removeItem(playbackKey); heard = true;
}
async function confirmAnswer() {
  if (!pendingAnswer) return;
  await request('/api/answer', pendingAnswer); pendingAnswer = null; sessionStorage.removeItem(answerKey);
}
async function start() {
  if (busy) return;
  lock(true);
  try { await confirmPlayback(); await confirmAnswer(); await showNext(); }
  catch (error) { $('notice').textContent = error.message + ' Retry the connection to confirm saved progress.'; }
  finally { lock(false); }
}
$('audio').addEventListener('ended', async () => {
  if (busy || !ready || !delivery || assignment.exhausted || pendingAnswer) return;
  const audio = $('audio'), ranges = Array.from({ length: audio.played.length }, (_, index) => [audio.played.start(index), audio.played.end(index)]);
  if (!ranges.length || ranges[0][0] > 0.02 || ranges.some((range, index) => index && range[0] > ranges[index - 1][1] + 0.02) || ranges[ranges.length - 1][1] < audio.duration - 0.02) {
    $('notice').textContent = 'Please listen from the beginning without skipping part of the recording.'; return;
  }
  if (!pendingPlayback) { pendingPlayback = { session_id: assignment.packet.session_id, position: assignment.position, delivery_id: delivery,
    evidence: { verified_audio_sha256: assignment.packet.items[assignment.position].audio_sha256, duration_seconds: audio.duration, played_ranges: ranges, ended: true } };
    sessionStorage.setItem(playbackKey, JSON.stringify(pendingPlayback)); }
  lock(true);
  try { await confirmPlayback(); $('notice').textContent = 'Playback saved. Choose your rating or listen again.'; }
  catch (error) { $('notice').textContent = error.message + ' Retry the connection to confirm playback.'; }
  finally { lock(false); }
});
$('audio').addEventListener('ratechange', () => { if ($('audio').playbackRate !== 1) $('audio').playbackRate = 1; });
async function save(skip) {
  if (busy || !assignment || assignment.exhausted) return;
  if (!pendingAnswer) {
    const rating = document.querySelector('input[name="rating"]:checked'), familiar = document.querySelector('input[name="familiar"]:checked');
    if (!skip && (!ready || !heard || !rating || !familiar)) { $('notice').textContent = 'Listen to the entire recording, then choose a rating and familiarity answer, or skip this sound.'; return; }
    pendingAnswer = { session_id: assignment.packet.session_id, position: assignment.position,
      answer: skip ? { status: 'skipped', rating: null, familiar: null } : { status: 'rated', rating: Number(rating.value), familiar: familiar.value === 'yes' } };
    sessionStorage.setItem(answerKey, JSON.stringify(pendingAnswer));
  }
  lock(true); $('notice').textContent = 'Saving…';
  try { await confirmPlayback(); await confirmAnswer(); await showNext(); }
  catch (error) { $('notice').textContent = error.message + ' Retry to confirm the same response.'; }
  finally { lock(false); }
}
$('actions').append(button('Retry connection', start)); start();
</script></body></html>`;
}
