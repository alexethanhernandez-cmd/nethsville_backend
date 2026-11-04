const $ = (id) => document.getElementById(id);

// Parents only. Other roles go to their own page, or login if no role is stored.
const storedRole = sessionStorage.getItem('nv_role');
const ROLE_PAGES = { teacher: 'dashboard-teacher.html', parent: 'parent-portal.html', admin: 'dashboard-admin.html' };
if (storedRole !== 'parent') {
  window.location.replace(ROLE_PAGES[storedRole] || 'login.html');
}

// Sample data only. Not connected to the school's database.
const attendanceWeek = [
  { day: 'Mon, Oct 12', status: 'Present' },
  { day: 'Tue, Oct 13', status: 'Excused' },
  { day: 'Wed, Oct 14', status: 'Present' },
  { day: 'Thu, Oct 15', status: 'Present' }
];

const messages = [
  { id: 1, from: 'Ms. Santos · Oct 14', text: 'Mia did great in art today!', read: false },
  { id: 2, from: 'Front office · Oct 13', text: 'Reminder: bring a change of clothes on Friday.', read: true }
];

let summaryAcknowledged = false;
const requests = [];

function esc(text) {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
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

function statusPill(status) {
  const cls = status === 'Present' ? 'pill-ok' : status === 'Excused' ? 'pill-muted' : 'pill-warn';
  return '<span class="pill ' + cls + '">' + esc(status) + '</span>';
}

function renderAttendance() {
  $('attWeek').innerHTML = attendanceWeek.map((a) =>
    '<li class="row"><span>' + esc(a.day) + '</span>' + statusPill(a.status) + '</li>'
  ).join('');
}

function renderAck() {
  const status = $('ackStatus');
  const btn = $('ackBtn');
  if (summaryAcknowledged) {
    status.textContent = 'Read';
    status.className = 'pill pill-ok';
    btn.disabled = true;
    btn.textContent = 'Marked as Read';
  } else {
    status.textContent = 'Not yet acknowledged';
    status.className = 'pill pill-info';
    btn.disabled = false;
    btn.textContent = 'Mark as Read';
  }
}

function renderMessages() {
  $('msgList').innerHTML = messages.map((m) =>
    '<li class="row msg-row" data-id="' + m.id + '" tabindex="0">' +
      '<div>' +
        '<div class="msg-text' + (m.read ? '' : ' row-unread') + '">' + esc(m.text) + '</div>' +
        '<div class="msg-from">' + esc(m.from) + '</div>' +
      '</div>' +
      (m.read ? '' : '<span class="pill pill-info">New</span>') +
    '</li>'
  ).join('');
}

function renderRequests() {
  $('requestList').innerHTML = requests.map((r) =>
    '<li class="row">' +
      '<div>' +
        '<div>' + esc(r.name) + '</div>' +
        '<div class="msg-from">' + esc(r.reason) + ' · ' + esc(r.date) + '</div>' +
      '</div>' +
      '<span class="pill pill-warn">Pending</span>' +
    '</li>'
  ).join('');
  $('requestEmpty').classList.toggle('show', requests.length === 0);
}

// Mark summary as read
$('ackBtn').addEventListener('click', () => {
  if (summaryAcknowledged) return;
  summaryAcknowledged = true;
  renderAck();
  showToast('Progress summary marked as read.');
});

// Mark message as read
function markRead(id) {
  const m = messages.find((x) => x.id === id);
  if (!m || m.read) return;
  m.read = true;
  renderMessages();
}

$('msgList').addEventListener('click', (e) => {
  const row = e.target.closest('.msg-row');
  if (row) markRead(Number(row.dataset.id));
});

$('msgList').addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const row = e.target.closest('.msg-row');
  if (row) {
    e.preventDefault();
    markRead(Number(row.dataset.id));
  }
});

// Pickup change request
$('requestBtn').addEventListener('click', () => {
  $('requestForm').reset();
  document.querySelectorAll('#requestForm .field').forEach((f) => f.classList.remove('invalid'));
  openOverlay('requestOverlay');
  $('rqName').focus();
});

$('requestForm').addEventListener('submit', (e) => {
  e.preventDefault();

  const name = $('rqName').value.trim();
  const date = $('rqDate').value;
  const reason = $('rqReason').value;

  $('rqNameField').classList.toggle('invalid', name === '');
  $('rqDateField').classList.toggle('invalid', date === '');
  $('rqReasonField').classList.toggle('invalid', reason === '');

  if (name === '' || date === '' || reason === '') return;

  requests.unshift({ name, date, reason });
  renderRequests();
  closeOverlay('requestOverlay');
  showToast('Pickup change request submitted (demo).');
});

$('requestForm').addEventListener('input', (e) => {
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

renderAttendance();
renderAck();
renderMessages();
renderRequests();   