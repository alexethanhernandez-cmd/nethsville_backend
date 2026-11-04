const $ = (id) => document.getElementById(id);

// Teachers and admins only. Other roles go to their own page, or login if no role is stored.
const storedRole = sessionStorage.getItem('nv_role');
const ROLE_PAGES = { teacher: 'dashboard-teacher.html', parent: 'parent-portal.html', admin: 'dashboard-admin.html' };
if (storedRole !== 'teacher' && storedRole !== 'admin') {
  window.location.replace(ROLE_PAGES[storedRole] || 'login.html');
}

const STATUSES = ['Present', 'Absent', 'Late', 'Excused'];

// Sample data only. Not connected to the school's database.
const students = [
  { id: 1, name: 'Juan Dela Cruz', status: 'Present' },
  { id: 2, name: 'Mia Ramos', status: 'Present' },
  { id: 3, name: 'Leo Garcia', status: 'Absent' },
  { id: 4, name: 'Zoe Fernandez', status: 'Present' },
  { id: 5, name: 'Hannah Cruz', status: 'Late' },
  { id: 6, name: 'Sam Villanueva', status: 'Present' }
];

const activities = [
  { id: 1, name: 'Morning Circle', time: '8:00 AM', done: false },
  { id: 2, name: 'Snack & Free Play', time: '9:30 AM', done: false },
  { id: 3, name: 'Art Corner', time: '10:30 AM', done: false },
  { id: 4, name: 'Story Time', time: '1:00 PM', done: false }
];

const log = [];
let submitted = false;

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

function countByStatus() {
  const counts = { Present: 0, Absent: 0, Late: 0, Excused: 0 };
  students.forEach((s) => counts[s.status]++);
  return counts;
}

function renderSummary() {
  const c = countByStatus();
  $('summary').innerHTML =
    '<span class="chip chip-ok">Present ' + c.Present + '</span>' +
    '<span class="chip chip-warn">Absent ' + c.Absent + '</span>' +
    '<span class="chip chip-info">Late ' + c.Late + '</span>' +
    '<span class="chip chip-muted">Excused ' + c.Excused + '</span>';
}

function renderAttendance() {
  $('attList').innerHTML = students.map((s) =>
    '<li class="att-row">' +
      '<span class="att-name">' + esc(s.name) + '</span>' +
      '<select class="status-select" data-id="' + s.id + '" aria-label="Attendance for ' + esc(s.name) + '"' + (submitted ? ' disabled' : '') + '>' +
        STATUSES.map((st) => '<option' + (st === s.status ? ' selected' : '') + '>' + st + '</option>').join('') +
      '</select>' +
    '</li>'
  ).join('');

  renderSummary();

  const btn = $('submitBtn');
  btn.disabled = submitted;
  btn.textContent = submitted ? 'Submitted' : 'Submit Attendance';
  $('markAllBtn').disabled = submitted;
}

function renderActivities() {
  $('activityList').innerHTML = activities.map((a) =>
    '<li class="act-item' + (a.done ? ' done' : '') + '">' +
      '<label>' +
        '<input type="checkbox" data-act="' + a.id + '"' + (a.done ? ' checked' : '') + '>' +
        '<span class="act-name">' + esc(a.name) + '</span>' +
      '</label>' +
      '<span class="act-time">' + esc(a.time) + '</span>' +
    '</li>'
  ).join('');
}

function renderLog() {
  $('logList').innerHTML = log.map((entry) =>
    '<li class="log-item">' +
      '<div class="log-text">' + esc(entry.text) + '</div>' +
      '<div class="log-time">' + esc(entry.time) + '</div>' +
    '</li>'
  ).join('');
  $('logEmpty').classList.toggle('show', log.length === 0);
}

function addLog(text) {
  log.unshift({ text, time: nowTime() });
  renderLog();
}

// Status changes
$('attList').addEventListener('change', (e) => {
  const sel = e.target.closest('select[data-id]');
  if (!sel || submitted) return;
  const s = students.find((x) => x.id === Number(sel.dataset.id));
  if (!s) return;
  s.status = sel.value;
  renderSummary();
});

// Mark all present
$('markAllBtn').addEventListener('click', () => {
  if (submitted) return;
  students.forEach((s) => (s.status = 'Present'));
  renderAttendance();
  showToast('All students marked Present.');
});

// Submit flow
$('submitBtn').addEventListener('click', () => {
  if (submitted) return;
  const c = countByStatus();
  $('confirmText').textContent =
    'Present: ' + c.Present + ' · Absent: ' + c.Absent + ' · Late: ' + c.Late + ' · Excused: ' + c.Excused +
    '. Once submitted, attendance is locked for today. Demo only, not saved.';
  openOverlay('confirmOverlay');
});

$('confirmBtn').addEventListener('click', () => {
  const c = countByStatus();
  submitted = true;
  closeOverlay('confirmOverlay');
  renderAttendance();
  $('submitStatus').textContent = 'Submitted at ' + nowTime() + '. Demo only, not saved.';
  addLog('Attendance submitted: Present ' + c.Present + ', Absent ' + c.Absent + ', Late ' + c.Late + ', Excused ' + c.Excused);
  showToast('Attendance submitted.');
});

// Activity checklist
$('activityList').addEventListener('change', (e) => {
  const box = e.target.closest('input[data-act]');
  if (!box) return;
  const a = activities.find((x) => x.id === Number(box.dataset.act));
  if (!a) return;
  a.done = box.checked;
  renderActivities();
  addLog(a.name + (a.done ? ' marked as done' : ' marked as not done'));
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

renderAttendance();
renderActivities();
renderLog();