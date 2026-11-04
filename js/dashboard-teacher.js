// Only Teachers can open this page. No login = back to login.
const storedRole = sessionStorage.getItem('nv_role');
const ROLE_PAGES = {
  admin: 'dashboard-admin.html',
  parent: 'parent-portal.html',
  teacher: 'dashboard-teacher.html'
};

if (storedRole !== 'teacher') {
  window.location.replace(ROLE_PAGES[storedRole] || 'login.html');
}

const $ = (id) => document.getElementById(id);

/* ---------- Toast ---------- */
let toastTimer;
function showToast(message) {
  const t = $('toast');
  t.textContent = message;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2000);
}

/* ---------- Activities ---------- */
const activities = [
  { name: 'Circle Time & Attendance', time: '7:30 AM', done: true },
  { name: 'Letter Tracing — Aa to Ee', time: '8:15 AM', done: true },
  { name: 'Snack & Free Play', time: '9:30 AM', done: false },
  { name: 'Story Time', time: '10:15 AM', done: false }
];

function esc(text) {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

function renderActivities() {
  const list = $('activityList');
  list.innerHTML = activities.map((a, i) =>
    '<li class="activity' + (a.done ? ' done' : '') + '">' +
      '<button class="checkbox" type="button" role="checkbox" aria-checked="' + a.done + '" data-index="' + i + '" aria-label="' + esc(a.name) + '"></button>' +
      '<div class="activity-text"><div class="activity-name">' + esc(a.name) + '</div></div>' +
      '<div class="activity-time">' + esc(a.time) + '</div>' +
    '</li>'
  ).join('');
}

$('activityList').addEventListener('click', (e) => {
  const btn = e.target.closest('.checkbox');
  if (!btn) return;
  const item = activities[Number(btn.dataset.index)];
  item.done = !item.done;
  renderActivities();
});

/* ---------- Add activity / observation modal ---------- */
const entryOverlay = $('entryOverlay');
let entryMode = 'activity';

function openEntry(mode) {
  entryMode = mode;
  $('entryTitle').textContent = mode === 'observation' ? 'Add Observation' : 'Add Activity Entry';
  $('entryForm').reset();
  $('nameField').classList.remove('error');
  $('timeField').classList.remove('error');
  entryOverlay.classList.add('open');
  entryOverlay.setAttribute('aria-hidden', 'false');
  $('entryName').focus();
}

function closeEntry() {
  entryOverlay.classList.remove('open');
  entryOverlay.setAttribute('aria-hidden', 'true');
}

$('addActivityBtn').addEventListener('click', () => openEntry('activity'));
$('addObservationBtn').addEventListener('click', () => openEntry('observation'));
$('entryX').addEventListener('click', closeEntry);
$('entryCancel').addEventListener('click', closeEntry);

entryOverlay.addEventListener('click', (e) => {
  if (e.target === entryOverlay) closeEntry();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && entryOverlay.classList.contains('open')) closeEntry();
});

function to12Hour(value) {
  const [h, m] = value.split(':').map(Number);
  return ((h + 11) % 12 + 1) + ':' + String(m).padStart(2, '0') + ' ' + (h >= 12 ? 'PM' : 'AM');
}

$('entryForm').addEventListener('submit', (e) => {
  e.preventDefault();

  const name = $('entryName').value.trim();
  const time = $('entryTime').value;

  if (entryMode === 'observation') {
    // Observations are saved as notes, not as checklist items.
    if (!name) {
      $('nameField').classList.add('error');
      $('entryName').focus();
      return;
    }
    $('nameField').classList.remove('error');
    closeEntry();
    showToast('Observation saved.');
    return;
  }

  $('nameField').classList.toggle('error', !name);
  $('timeField').classList.toggle('error', !time);
  if (!name) { $('entryName').focus(); return; }
  if (!time) { $('entryTime').focus(); return; }

  activities.push({ name: name, time: to12Hour(time), done: false });
  renderActivities();
  closeEntry();
  showToast('Activity entry saved.');
});

/* ---------- Logout ---------- */
function logout() {
  sessionStorage.removeItem('nv_role');
  window.location.href = 'login.html';
}

$('sideLogout').addEventListener('click', logout);
$('topLogout').addEventListener('click', logout);

renderActivities();