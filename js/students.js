const $ = (id) => document.getElementById(id);

// Teachers and admins only. Other roles go to their own page, or login if no role is stored.
const storedRole = sessionStorage.getItem('nv_role');
const ROLE_PAGES = { teacher: 'dashboard-teacher.html', parent: 'parent-portal.html', admin: 'dashboard-admin.html' };
if (storedRole !== 'teacher' && storedRole !== 'admin') {
  window.location.replace(ROLE_PAGES[storedRole] || 'login.html');
}

// Sample data only. Not connected to the school's database.
const students = [
  { id: 1, name: 'Juan Dela Cruz', grade: 'Kinder 1', status: 'Present', guardians: [
    { name: 'Maria Dela Cruz', relationship: 'Grandmother', phone: '0900 000 0001', pickup: true }
  ]},
  { id: 2, name: 'Mia Ramos', grade: 'Kinder 1', status: 'Present', guardians: [
    { name: 'Carla Ramos', relationship: 'Mother', phone: '0900 000 0002', pickup: true },
    { name: 'Ben Ramos', relationship: 'Father', phone: '0900 000 0003', pickup: true }
  ]},
  { id: 3, name: 'Leo Garcia', grade: 'Kinder 1', status: 'Absent', guardians: [
    { name: 'Rico Garcia', relationship: 'Father', phone: '0900 000 0004', pickup: true }
  ]},
  { id: 4, name: 'Zoe Fernandez', grade: 'Kinder 1', status: 'Present', guardians: [
    { name: 'Ana Fernandez', relationship: 'Mother', phone: '0900 000 0005', pickup: true }
  ]},
  { id: 5, name: 'Hannah Cruz', grade: 'Kinder 1', status: 'Pending', guardians: [
    { name: 'Lea Cruz', relationship: 'Mother', phone: '0900 000 0006', pickup: false }
  ]},
  { id: 6, name: 'Sam Villanueva', grade: 'Kinder 1', status: 'Present', guardians: [
    { name: 'Joy Villanueva', relationship: 'Mother', phone: '0900 000 0007', pickup: true }
  ]}
];

let activeId = null;

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

function statusPill(status) {
  const cls = status === 'Present' ? 'pill-ok' : status === 'Absent' ? 'pill-warn' : 'pill-info';
  return '<span class="pill ' + cls + '">' + esc(status) + '</span>';
}

function getFiltered() {
  const q = $('searchInput').value.trim().toLowerCase();
  const status = $('statusFilter').value;

  return students.filter((s) => {
    const matchStatus = status === 'all' || s.status === status;
    const matchText = !q
      || s.name.toLowerCase().includes(q)
      || s.guardians.some((g) => g.name.toLowerCase().includes(q));
    return matchStatus && matchText;
  });
}

function renderList() {
  const rows = getFiltered();

  $('studentList').innerHTML = rows.map((s) =>
    '<li>' +
      '<button class="student-card" type="button" data-id="' + s.id + '">' +
        '<div>' +
          '<div class="s-name">' + esc(s.name) + '</div>' +
          '<div class="s-sub">' + esc(s.grade) + ' · ' + s.guardians.length + ' guardian(s)</div>' +
        '</div>' +
        statusPill(s.status) +
      '</button>' +
    '</li>'
  ).join('');

  $('resultCount').textContent = rows.length + (rows.length === 1 ? ' student' : ' students') + ' found';
  $('emptyMsg').classList.toggle('show', rows.length === 0);
}

function renderDetail() {
  const s = students.find((x) => x.id === activeId);
  if (!s) return;

  $('detailName').textContent = s.name;

  $('detailInfo').innerHTML =
    '<div><dt>Grade</dt><dd>' + esc(s.grade) + '</dd></div>' +
    '<div><dt>Status today</dt><dd>' + esc(s.status) + '</dd></div>';

  $('guardianList').innerHTML = s.guardians.length
    ? s.guardians.map((g) =>
        '<div class="guardian-item">' +
          '<div class="g-name">' + esc(g.name) + '</div>' +
          '<div class="g-rel">' + esc(g.relationship) + ' · ' + esc(g.phone) + '</div>' +
          '<div class="g-rel">' + (g.pickup ? 'Authorized for pickup' : 'Not authorized for pickup') + '</div>' +
        '</div>'
      ).join('')
    : '<p class="empty show">No guardians yet.</p>';
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

function openStudent(id) {
  activeId = id;
  renderDetail();
  openOverlay('studentOverlay');
}

// Search and filter
$('searchInput').addEventListener('input', renderList);
$('statusFilter').addEventListener('change', renderList);

// Open student details
$('studentList').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-id]');
  if (btn) openStudent(Number(btn.dataset.id));
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

// Add guardian flow
function backToDetail() {
  closeOverlay('guardianOverlay');
  openOverlay('studentOverlay');
}

$('addGuardianBtn').addEventListener('click', () => {
  $('guardianForm').reset();
  document.querySelectorAll('#guardianForm .field').forEach((f) => f.classList.remove('invalid'));
  closeOverlay('studentOverlay');
  openOverlay('guardianOverlay');
  $('gName').focus();
});

$('gCancel').addEventListener('click', backToDetail);
$('gClose').addEventListener('click', backToDetail);

// Clear error state while the user types
$('guardianForm').addEventListener('input', (e) => {
  const field = e.target.closest('.field');
  if (field) field.classList.remove('invalid');
});

$('guardianForm').addEventListener('submit', (e) => {
  e.preventDefault();

  const name = $('gName').value.trim();
  const relationship = $('gRel').value;
  const phone = $('gPhone').value.trim();
  const pickup = $('gPickup').checked;

  const nameOk = name.length > 0;
  const relOk = relationship !== '';
  const phoneOk = /^[0-9+\s-]{7,}$/.test(phone);

  $('gName').closest('.field').classList.toggle('invalid', !nameOk);
  $('gRel').closest('.field').classList.toggle('invalid', !relOk);
  $('gPhone').closest('.field').classList.toggle('invalid', !phoneOk);

  if (!nameOk || !relOk || !phoneOk) return;

  const student = students.find((s) => s.id === activeId);
  if (student) {
    student.guardians.push({ name, relationship, phone, pickup });
  }

  closeOverlay('guardianOverlay');
  renderDetail();
  openOverlay('studentOverlay');
  renderList();
  showToast(name + ' was added as a guardian. Demo only, not saved.');
});

// Logout (sidebar and topbar)
function logout() {
  sessionStorage.removeItem('nv_role');
  window.location.href = 'login.html';
}
$('sideLogout').addEventListener('click', logout);
$('topLogout').addEventListener('click', logout);

renderList();