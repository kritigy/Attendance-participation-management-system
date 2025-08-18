const base = '';
const el = (id) => document.getElementById(id);
const out = el('out');
const codeBox = el('codeBox');
const statusPill = el('statusPill');
const peek = el('peek');

const log = (obj, label) => {
  const line = label ? { [label]: obj } : obj;
  out.textContent += '\n' + JSON.stringify(line, null, 2);
  out.scrollTop = out.scrollHeight;
};

const enable = (...ids) => ids.forEach((i) => (el(i).disabled = false));
const disable = (...ids) => ids.forEach((i) => (el(i).disabled = true));

const setPill = (status) => {
  statusPill.textContent = 'Status: ' + status;
  statusPill.className =
    'pill ' +
    (status === 'OPEN' ? 'ok' : status === 'QUIZ' ? 'warn' : status === 'CLOSED' ? 'err' : '');
};

const updatePeek = (s) => {
  const rows = peek.querySelectorAll('tr td:nth-child(2)');
  rows[0].textContent = s.class_name ?? '—';
  rows[1].textContent = s.status ?? '—';
  rows[2].textContent = s.attendee_count ?? 0;
  rows[3].textContent = s.poll ? s.poll.question : '—';
  rows[4].textContent = s.responses_count ?? 0;
  el('attendeeCount').textContent = 'Attendees: ' + (s.attendee_count ?? 0);
  setPill(s.status || '—');
};

el('mk').onclick = async () => {
  const class_name = el('className').value || 'Untitled';
  const r = await fetch(`${base}/api/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ class_name })
  });
  const d = await r.json();
  log(d, 'create_session');
  const code = d.code;
  codeBox.textContent = code || 'No session';
  codeBox.dataset.code = code;
  enable('jn', 'mkpoll', 'get', 'answer', 'end');
  setPill('OPEN');
};

el('jn').onclick = async () => {
  const code = codeBox.dataset.code;
  const student_id = el('studentId').value || 's1';
  const r = await fetch(`${base}/api/sessions/${code}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ student_id })
  });
  log(await r.json(), 'join');
  el('get').click();
};

el('mkpoll').onclick = async () => {
  const code = codeBox.dataset.code;
  const question = el('q').value || 'Untitled';
  const options = (el('opts').value || '').split(',').map((s) => s.trim()).filter(Boolean);
  const correct_index = Number(el('ci').value);
  const r = await fetch(`${base}/api/sessions/${code}/poll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, options, correct_index })
  });
  log(await r.json(), 'poll');
  setPill('QUIZ');
  el('get').click();
};

el('answer').onclick = async () => {
  const code = codeBox.dataset.code;
  const student_id = el('studentId').value || 's1';
  const option_index = Number(el('ans').value);
  const r = await fetch(`${base}/api/sessions/${code}/responses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ student_id, option_index })
  });
  log(await r.json(), 'answer');
  el('get').click();
};

el('get').onclick = async () => {
  const code = codeBox.dataset.code;
  if (!code) return;
  const r = await fetch(`${base}/api/sessions/${code}`);
  const s = await r.json();
  log(s, 'session');
  updatePeek(s);
};

el('end').onclick = async () => {
  const code = codeBox.dataset.code;
  const r = await fetch(`${base}/api/sessions/${code}/end`, { method: 'POST' });
  log(await r.json(), 'end');
  setPill('CLOSED');
  disable('jn', 'mkpoll', 'answer');
  el('get').click();
};
