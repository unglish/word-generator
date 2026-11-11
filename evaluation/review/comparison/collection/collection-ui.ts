export function collectorHtml(nonce: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Word spelling review</title><style nonce="${nonce}">
body{font:18px/1.5 system-ui,sans-serif;max-width:42rem;margin:3rem auto;padding:0 1.25rem;color:#16202a;background:#fafafa}
h2{font-size:2.8rem;letter-spacing:.02em}button{font:inherit;padding:.7rem 1rem;margin:.4rem .4rem .4rem 0;cursor:pointer}
fieldset{border:1px solid #9ba7b3;padding:1rem;margin:1rem 0}label{display:block;padding:.3rem}input{margin-right:.6rem}
#notice{min-height:3rem}button:disabled{cursor:wait}#word:focus{outline:2px solid #53687c;outline-offset:.3rem}
</style></head><body><main><h1>Word spelling review</h1><p id="instruction"></p><p id="question"></p>
<p id="progress"></p><h2 id="word" tabindex="-1"></h2><div id="choices"></div><div id="actions"></div>
<p id="notice" role="status" aria-live="polite"></p></main><script nonce="${nonce}">
const $ = id => document.getElementById(id);
const supplied = location.hash.slice(1);
let token = supplied || sessionStorage.getItem('written-review-token') || '';
if (supplied) { sessionStorage.setItem('written-review-token', supplied); history.replaceState(null, '', '/'); }
let assignment = null, pending = null, busy = false;
async function request(path, body) {
  const response = await fetch(path, { method: body ? 'POST' : 'GET', headers: { Authorization: 'Bearer ' + token,
    ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const value = await response.json(); if (!response.ok) throw new Error(value.error || 'Unable to continue.'); return value;
}
function lock(value) { busy = value; document.querySelectorAll('button,input').forEach(element => { element.disabled = value || (pending && element.tagName === 'INPUT'); }); }
function option(group, value, text) {
  const label = document.createElement('label'), input = document.createElement('input'); input.type = 'radio'; input.name = group; input.value = value;
  label.append(input, document.createTextNode(text)); return label;
}
function fieldset(legendText) { const field = document.createElement('fieldset'), legend = document.createElement('legend'); legend.textContent = legendText; field.append(legend); return field; }
function button(text, handler) { const result = document.createElement('button'); result.type = 'button'; result.textContent = text; result.addEventListener('click', handler); return result; }
async function showNext() {
  assignment = await request('/api/next'); $('choices').replaceChildren(); $('actions').replaceChildren();
  if (assignment.exhausted) {
    $('word').textContent = 'Thank you'; $('question').textContent = 'Your review is complete.'; $('instruction').textContent = '';
    $('progress').textContent = ''; $('notice').textContent = 'All your responses have been saved.'; sessionStorage.removeItem('written-review-token'); return;
  }
  const packet = assignment.packet, rubric = packet.assignment.rubric, item = packet.assignment.items[assignment.position];
  $('instruction').textContent = rubric.instruction || ''; $('question').textContent = rubric.question; $('word').textContent = item.spelling;
  $('progress').textContent = 'Word ' + (assignment.position + 1) + ' of ' + packet.assignment.items.length + ' in this session';
  const ratings = fieldset('Your rating'); rubric.labels.forEach((label, index) => ratings.append(option('rating', index + 1, (index + 1) + ' — ' + label)));
  const familiarity = fieldset(rubric.familiarity); familiarity.append(option('familiar', 'yes', 'Yes'), option('familiar', 'no', 'No'));
  $('choices').append(ratings, familiarity); $('actions').append(button('Save and continue', () => save(false)), button('Skip this word', () => save(true)));
  $('word').focus();
}
async function save(skip) {
  if (busy) return;
  if (!pending) {
    const rating = document.querySelector('input[name="rating"]:checked'), familiar = document.querySelector('input[name="familiar"]:checked');
    if (!skip && (!rating || !familiar)) { $('notice').textContent = 'Choose a rating and familiarity answer, or skip this word.'; return; }
    pending = { session_id: assignment.packet.session_id, position: assignment.position,
      answer: skip ? { status: 'skipped', rating: null, familiar: null } : { status: 'rated', rating: Number(rating.value), familiar: familiar.value === 'yes' } };
  }
  lock(true); $('notice').textContent = 'Saving…';
  try { await request('/api/answer', pending); await showNext(); pending = null; if (!assignment.exhausted) $('notice').textContent = 'Saved.'; }
  catch (error) { $('notice').textContent = error.message + ' Retry to confirm the same answer.'; }
  finally { lock(false); }
}
showNext().catch(error => { $('notice').textContent = error.message + ' Please use the link provided by the study owner.'; });
</script></body></html>`;
}
