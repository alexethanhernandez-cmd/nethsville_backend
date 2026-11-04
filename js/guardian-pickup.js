const $ = (id) => document.getElementById(id);

// Teachers and admins only. Other roles go to their own page, or login if no role is stored.
const storedRole = sessionStorage.getItem('nv_role');
const ROLE_PAGES = { teacher: 'dashboard-teacher.html', parent: 'parent-portal.html', admin: 'dashboard-admin.html' };
if (storedRole !== 'teacher' && storedRole !== 'admin') {
  window.location.replace(ROLE_PAGES[storedRole] || 'login.html');
}

// Django backend (run: python manage.py runserver)
const API = 'http://127.0.0.1:8000';

// Sample scan results (demo buttons). 'live' is filled in by real scans.
const scenarios = {
  live: {},
  verified: {
    title: 'Pickup verified',
    state: 'verified',
    pill: { text: 'Verified', cls: 'pill-ok' },
    student: 'Juan Dela Cruz',
    guardian: 'Maria Dela Cruz',
    relation: 'Grandmother',
    note: 'QR is valid and this guardian is on the authorized list for this student.'
  },
  notAuthorized: {
    title: 'Not authorized',
    state: 'notAuthorized',
    pill: { text: 'Not authorized', cls: 'pill-warn' },
    student: 'Leo Garcia',
    guardian: 'Unknown person',
    relation: 'Not on file',
    note: 'This person is not on the authorized pickup list for this student. Do not release the child. Report the incident.'
  },
  expired: {
    title: 'QR code expired',
    state: 'expired',
    pill: { text: 'Expired', cls: 'pill-info' },
    student: 'Zoe Fernandez',
    guardian: 'Ana Fernandez',
    relation: 'Mother',
    note: 'This pickup QR has expired. Ask the guardian to request a new QR code from the front office.'
  }
};

// Pickup log (replaced by the backend log when it is reachable)
let log = [
  { id: 's1', time: '3:14 PM', student: 'Juan Dela Cruz', guardian: 'Maria Dela Cruz', result: 'Released', cls: 'pill-ok' },
  { id: 's2', time: '3:05 PM', student: 'Mia Ramos', guardian: 'Carla Ramos', result: 'Released', cls: 'pill-ok' },
  { id: 's3', time: '2:50 PM', student: 'Leo Garcia', guardian: 'Rico Garcia', result: 'Pending', cls: 'pill-info' }
];

let currentKey = null;
let released = false;
let scanTimer = null;

function esc(text) {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

function nowTime() {
  return new Date().toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
}

let toastTimer;
function showToast(message) {
  const t = $('toast');
  t.textContent = message;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

function openOverlay(id) {
  const o = $(id);
  o.classList.add('open');
  o.setAttribute('aria-hidden', 'false');
}

function closeOverlay(id) {
  const o = $(id);
  o.classList.remove('open');
  o.setAttribute('aria-hidden', 'true');
}

// Entries removed from this screen (the database record is kept)
let removedIds = new Set();
try { removedIds = new Set(JSON.parse(localStorage.getItem('nv_removed_log') || '[]')); } catch (e) { /* ignore */ }

function saveRemoved() {
  try { localStorage.setItem('nv_removed_log', JSON.stringify(Array.from(removedIds))); } catch (e) { /* ignore */ }
}

function renderLog() {
  const visible = log.filter((entry) => !removedIds.has(String(entry.id)));
  if (visible.length === 0) {
    $('pickupLog').innerHTML = '<li class="log-item"><div class="log-sub">No pickups logged.</div></li>';
    return;
  }
  $('pickupLog').innerHTML = visible.map((entry) =>
    '<li class="log-item">' +
      '<div>' +
        '<div class="log-name">' + esc(entry.student) + '</div>' +
        '<div class="log-sub">' + esc(entry.guardian) + ' · ' + esc(entry.time) + '</div>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:8px">' +
        '<span class="pill ' + entry.cls + '">' + esc(entry.result) + '</span>' +
        '<button class="btn-outline" type="button" data-remove="' + esc(String(entry.id)) + '" ' +
          'style="padding:4px 10px;font-size:12px" aria-label="Remove this entry">Remove</button>' +
      '</div>' +
    '</li>'
  ).join('');
}

function addLog(entry) {
  entry.id = entry.id || 'local-' + Date.now();
  log.unshift(entry);
  renderLog();
}

$('pickupLog').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-remove]');
  if (!btn) return;
  removedIds.add(btn.dataset.remove);
  saveRemoved();
  renderLog();
  showToast('Entry removed from the log.');
});

function renderResult() {
  const idle = $('resultIdle');
  const body = $('resultBody');
  const card = $('resultCard');

  if (!currentKey) {
    card.dataset.state = 'idle';
    idle.hidden = false;
    body.hidden = true;
    return;
  }

  const s = scenarios[currentKey];
  card.dataset.state = s.state || currentKey;
  idle.hidden = true;
  body.hidden = false;

  const pill = $('resultPill');
  pill.textContent = s.pill.text;
  pill.className = 'pill ' + s.pill.cls;

  $('resultTime').textContent = nowTime();
  $('resultTitle2').textContent = s.title;
  $('rStudent').textContent = s.student;
  $('rGuardian').textContent = s.guardian;
  $('rRel').textContent = s.relation;
  $('resultNote').textContent = s.note;

  let actions = '';
  if (s.state === 'verified') {
    actions = released
      ? '<span class="pill pill-ok">Released</span>'
      : '<button class="btn-small" type="button" id="releaseBtn">Release Student</button>';
  } else if (s.state === 'notAuthorized') {
    actions = '<button class="btn-small" type="button" id="reportBtn">Report Incident</button>';
  } else if (s.state === 'expired') {
    actions = '<button class="btn-small" type="button" id="newQrBtn">Request New QR</button>';
  }
  $('resultActions').innerHTML = actions;
}

function runScan(key) {
  clearTimeout(scanTimer);
  $('scanText').textContent = 'Scanning…';
  scanTimer = setTimeout(() => {
    currentKey = key;
    released = false;
    $('scanText').textContent = 'Camera is off';
    renderResult();
  }, 600);
}

// Scanner sample buttons
document.querySelectorAll('[data-scan]').forEach((btn) => {
  btn.addEventListener('click', () => runScan(btn.dataset.scan));
});

// Result actions (event delegation, since buttons are re-rendered)
$('resultActions').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;

  if (btn.id === 'releaseBtn') {
    released = true;
    const s = scenarios[currentKey];
    addLog({ time: nowTime(), student: s.student, guardian: s.guardian, result: 'Released', cls: 'pill-ok' });
    renderResult();
    showToast('Student released.');
  }

  if (btn.id === 'reportBtn') {
    $('reportForm').reset();
    document.querySelectorAll('#reportForm .field').forEach((f) => f.classList.remove('invalid'));
    openOverlay('reportOverlay');
  }

  if (btn.id === 'newQrBtn') {
    showToast('New QR request sent to the front office (demo).');
  }
});

// Report form
$('reportForm').addEventListener('submit', (e) => {
  e.preventDefault();

  const reason = $('rReason').value;
  const note = $('rNote').value.trim();

  $('reasonField').classList.toggle('invalid', reason === '');
  $('noteField').classList.toggle('invalid', note === '');

  if (reason === '' || note === '') return;

  const s = scenarios[currentKey] || scenarios.notAuthorized;
  addLog({ time: nowTime(), student: s.student, guardian: s.guardian, result: 'Reported', cls: 'pill-warn' });
  closeOverlay('reportOverlay');
  showToast('Incident reported (demo).');
});

$('reportForm').addEventListener('input', (e) => {
  const field = e.target.closest('.field');
  if (field) field.classList.remove('invalid');
});

// Close buttons, backdrop click, and Escape key
document.querySelectorAll('[data-close]').forEach((btn) => {
  btn.addEventListener('click', () => closeOverlay(btn.dataset.close));
});

document.querySelectorAll('.overlay').forEach((o) => {
  o.addEventListener('click', (e) => {
    if (e.target === o) closeOverlay(o.id);
  });
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.overlay.open').forEach((o) => closeOverlay(o.id));
  }
});

// Logout (sidebar and topbar)
function logout() {
  sessionStorage.removeItem('nv_role');
  window.location.href = 'login.html';
}
$('sideLogout').addEventListener('click', logout);
$('topLogout').addEventListener('click', logout);

// ---------- Real QR scanning + backend ----------
let scanner = null;
let cameraOn = false;
let busy = false;

function setScanText(text) { $('scanText').textContent = text; }

async function verifyToken(token) {
  if (busy || !token) return;
  busy = true;
  setScanText('Verifying…');
  try {
    const res = await fetch(API + '/api/pickup/verify/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token })
    });
    const data = await res.json();

    if (data.result === 'verified') {
      scenarios.live = {
        title: 'Pickup verified',
        state: 'verified',
        pill: { text: 'Verified', cls: 'pill-ok' },
        student: data.student.name,
        guardian: data.guardian.name,
        relation: data.guardian.relationship,
        note: 'QR is valid and this guardian is on the authorized list for this student.'
      };
    } else {
      const expired = data.reason === 'QR expired';
      scenarios.live = {
        title: expired ? 'QR code expired' : 'Not authorized',
        state: expired ? 'expired' : 'notAuthorized',
        pill: expired ? { text: 'Expired', cls: 'pill-info' } : { text: 'Denied', cls: 'pill-warn' },
        student: '—',
        guardian: '—',
        relation: '—',
        note: (data.reason || 'Denied') + '. Do not release the child. ' +
              (expired ? 'Ask the guardian to request a new QR code.' : 'Report the incident if needed.')
      };
    }
    currentKey = 'live';
    released = false;
    renderResult();
    await loadLog();
  } catch (err) {
    showToast('Cannot reach the backend. Is the Django server running?');
  } finally {
    busy = false;
    setScanText(cameraOn ? 'Point the camera at a QR code' : 'Camera is off');
  }
}

async function startCamera() {
  if (typeof Html5Qrcode === 'undefined') {
    showToast('Scanner library not loaded. Check your internet connection.');
    return;
  }
  $('qrReader').style.display = 'block';
  $('scanner').querySelector('.scanner-frame').style.display = 'none';
  scanner = new Html5Qrcode('qrReader');
  try {
    await scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: 220 },
      (text) => { stopCamera().then(() => verifyToken(text)); },
      () => {}
    );
    cameraOn = true;
    $('camBtn').textContent = 'Stop camera';
    setScanText('Point the camera at a QR code');
  } catch (err) {
    $('qrReader').style.display = 'none';
    $('scanner').querySelector('.scanner-frame').style.display = '';
    showToast('Cannot open the camera. Allow camera access, or paste the token.');
  }
}

async function stopCamera() {
  try {
    if (scanner && cameraOn) await scanner.stop();
    if (scanner) scanner.clear();
  } catch (err) { /* already stopped */ }
  cameraOn = false;
  $('qrReader').style.display = 'none';
  $('scanner').querySelector('.scanner-frame').style.display = '';
  $('camBtn').textContent = 'Start camera';
  setScanText('Camera is off');
}

$('camBtn').addEventListener('click', () => { cameraOn ? stopCamera() : startCamera(); });

$('verifyBtn').addEventListener('click', () => {
  const t = $('tokenInput').value.trim();
  if (!t) { showToast('Paste a QR token first.'); return; }
  verifyToken(t);
});
$('tokenInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('verifyBtn').click();
});

async function loadLog() {
  try {
    const res = await fetch(API + '/api/pickup/log/');
    const data = await res.json();
    log = data.log.map((l) => ({
      id: l.id,
      time: new Date(l.scanned_at).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' }),
      student: l.student || 'Unknown',
      guardian: l.guardian || 'Unknown',
      result: l.result === 'verified' ? 'Verified' : 'Denied',
      cls: l.result === 'verified' ? 'pill-ok' : 'pill-warn'
    }));
    renderLog();
  } catch (err) { /* backend off: keep sample log */ }
}

renderLog();
renderResult();
loadLog();