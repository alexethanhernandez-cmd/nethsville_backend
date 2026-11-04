const $ = (id) => document.getElementById(id);

// Teachers and admins only. Other roles go to their own page, or login if no role is stored.
const storedRole = sessionStorage.getItem('nv_role');
const ROLE_PAGES = { teacher: 'dashboard-teacher.html', parent: 'parent-portal.html', admin: 'dashboard-admin.html' };
if (storedRole !== 'teacher' && storedRole !== 'admin') {
  window.location.replace(ROLE_PAGES[storedRole] || 'login.html');
}

// Account info for the profile popover. Sample data only.
const PROFILES = {
  teacher: {
    name: 'Ms. Santos',
    role: 'Kinder 1 Teacher',
    email: 'ms.santos@nethsville.edu.ph',
    school: 'Nethsville Academy',
    section: 'Kinder 1 · Section Masaya'
  },
  admin: {
    name: 'Admin',
    role: 'School Administrator',
    email: 'admin@nethsville.edu.ph',
    school: 'Nethsville Academy',
    section: 'All sections'
  }
};

const SUBJECTS = ['Literacy', 'Numeracy', 'Motor Skills', 'Social Skills'];
const SECTION_LABELS = { grades: 'Grades', evaluation: 'Evaluation', feedback: 'Feedback' };

// Sample data only. Not connected to the school's database.
const students = [
  {
    id: 1, name: 'Juan Dela Cruz',
    grades: { 'Literacy': 'Proficient', 'Numeracy': 'Developing', 'Motor Skills': 'Proficient', 'Social Skills': 'Advanced' },
    observations: [
      { cat: 'Academic', text: 'Counted to 20 without help.', date: 'Oct 12' },
      { cat: 'Social', text: 'Shared crayons with a classmate during art.', date: 'Oct 13' },
      { cat: 'Behavior', text: 'Needed reminders to stay seated during story time.', date: 'Oct 14' }
    ],
    timeline: [{ date: 'Oct 7', text: 'Progress summary sent to parent.' }]
  },
  {
    id: 2, name: 'Mia Ramos',
    grades: { 'Literacy': 'Advanced', 'Numeracy': 'Proficient', 'Motor Skills': 'Proficient', 'Social Skills': 'Proficient' },
    observations: [
      { cat: 'Academic', text: 'Recognizes all uppercase letters.', date: 'Oct 13' },
      { cat: 'Health', text: 'Came in with a light cough. Parent informed.', date: 'Oct 14' }
    ],
    timeline: []
  },
  {
    id: 3, name: 'Leo Garcia',
    grades: { 'Literacy': 'Beginning', 'Numeracy': 'Developing', 'Motor Skills': 'Developing', 'Social Skills': 'Developing' },
    observations: [],
    timeline: []
  },
  {
    id: 4, name: 'Zoe Fernandez',
    grades: { 'Literacy': 'Proficient', 'Numeracy': 'Proficient', 'Motor Skills': 'Advanced', 'Social Skills': 'Proficient' },
    observations: [
      { cat: 'Social', text: 'Joined group play and took turns well.', date: 'Oct 14' }
    ],
    timeline: []
  },
  {
    id: 5, name: 'Hannah Cruz',
    grades: { 'Literacy': 'Developing', 'Numeracy': 'Beginning', 'Motor Skills': 'Developing', 'Social Skills': 'Developing' },
    observations: [],
    timeline: []
  },
  {
    id: 6, name: 'Sam Villanueva',
    grades: { 'Literacy': 'Developing', 'Numeracy': 'Proficient', 'Motor Skills': 'Proficient', 'Social Skills': 'Proficient' },
    observations: [
      { cat: 'Academic', text: 'Started tracing letter names.', date: 'Oct 13' }
    ],
    timeline: []
  }
];

let currentId = students[0].id;
let draftSent = false;
let genTimer = null;

function esc(text) {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

function todayShort() {
  return new Date().toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

function current() {
  return students.find((s) => s.id === currentId);
}

function ratingClass(rating) {
  const map = { Advanced: 'pill-ok', Proficient: 'pill-info', Developing: 'pill-warn', Beginning: 'pill-muted' };
  return map[rating] || 'pill-muted';
}

// Toast
let toastTimer;
function showToast(message) {
  const t = $('toast');
  t.textContent = message;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

// Overlays (confirmation modal)
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

// Page menu drawer
function openDrawer() {
  $('drawerOverlay').classList.add('open');
  $('menuBtn').setAttribute('aria-expanded', 'true');
}

function closeDrawer() {
  $('drawerOverlay').classList.remove('open');
  $('menuBtn').setAttribute('aria-expanded', 'false');
}

// Profile popover
function isPopoverOpen() {
  return $('profilePop').classList.contains('open');
}

function setPopover(open) {
  $('profilePop').classList.toggle('open', open);
  $('profileBtn').setAttribute('aria-expanded', String(open));
}

function renderProfile() {
  const p = PROFILES[storedRole];
  if (!p) return;

  $('ppName').textContent = p.name;
  $('ppRole').textContent = p.role;
  $('ppInfo').innerHTML = [
    ['Email', p.email],
    ['School', p.school],
    ['Section', p.section]
  ].map(([label, value]) =>
    '<div><dt>' + esc(label) + '</dt><dd>' + esc(value) + '</dd></div>'
  ).join('');
}

// Show only one section, or all of them
function setSection(key) {
  document.querySelectorAll('[data-section]').forEach((sec) => {
    sec.hidden = key !== 'all' && sec.dataset.section !== key;
  });

  $('pageName').textContent = key === 'all'
    ? 'Child Progress'
    : 'Child Progress · ' + SECTION_LABELS[key];

  document.querySelectorAll('.drawer-item').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.filter === key);
  });
}

function renderStudentPicker() {
  $('studentSelect').innerHTML = students.map((s) =>
    '<option value="' + s.id + '"' + (s.id === currentId ? ' selected' : '') + '>' + esc(s.name) + '</option>'
  ).join('');
}

function renderGrades() {
  const s = current();
  $('gradeList').innerHTML = SUBJECTS.map((subject) => {
    const rating = s.grades[subject];
    return '<li class="row"><span>' + esc(subject) + '</span>' +
      '<span class="pill ' + ratingClass(rating) + '">' + esc(rating) + '</span></li>';
  }).join('');
}

function renderObservations() {
  const s = current();
  $('obsList').innerHTML = s.observations.map((o) =>
    '<li class="obs-item">' +
      '<div class="obs-meta"><span class="cat">' + esc(o.cat) + '</span><span>' + esc(o.date) + '</span></div>' +
      '<div class="obs-text">' + esc(o.text) + '</div>' +
    '</li>'
  ).join('');
  $('obsEmpty').classList.toggle('show', s.observations.length === 0);
}

function renderTimeline() {
  const s = current();
  $('timeline').innerHTML = s.timeline.map((t) =>
    '<li class="tl-item">' +
      '<span class="tl-dot" aria-hidden="true"></span>' +
      '<div><div class="tl-text">' + esc(t.text) + '</div><div class="tl-date">' + esc(t.date) + '</div></div>' +
    '</li>'
  ).join('');
  $('tlEmpty').classList.toggle('show', s.timeline.length === 0);
}

function renderDraftState() {
  const hasDraft = $('draftText').value.trim().length > 0;
  $('sendBtn').disabled = !hasDraft || draftSent;
  $('discardBtn').disabled = !hasDraft;
  if (draftSent) {
    $('draftNote').textContent = 'Summary sent (demo only, not actually delivered).';
  }
}

function resetDraft() {
  clearTimeout(genTimer);
  $('genLoading').hidden = true;
  $('genBtn').disabled = false;
  $('draftText').value = '';
  $('draftNote').textContent = '';
  draftSent = false;
  renderDraftState();
}

function buildDraft(s) {
  const first = s.name.split(' ')[0];
  const lines = s.observations.map((o) => '• ' + o.text).join('\n');
  return 'Dear Parent / Guardian,\n\n' +
    'Here is a summary of ' + first + "'s progress.\n\n" +
    lines + '\n\n' +
    'We look forward to continuing to support ' + first + "'s growth.\n\n" +
    'Thank you,\nMs. Santos';
}

// Student picker
$('studentSelect').addEventListener('change', (e) => {
  currentId = Number(e.target.value);
  resetDraft();
  renderGrades();
  renderObservations();
  renderTimeline();
});

// Evaluation: add observation
$('obsForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const text = $('obsText').value.trim();
  $('obsTextField').classList.toggle('invalid', text === '');
  if (text === '') return;

  current().observations.push({ cat: $('obsCat').value, text, date: todayShort() });
  $('obsText').value = '';
  renderObservations();
  showToast('Observation added.');
});

$('obsText').addEventListener('input', () => {
  $('obsTextField').classList.remove('invalid');
});

// Feedback: generate draft (sample template, with a short loading state)
$('genBtn').addEventListener('click', () => {
  const s = current();
  if (s.observations.length === 0) {
    showToast('Add at least one observation first.');
    return;
  }

  $('genBtn').disabled = true;
  $('genLoading').hidden = false;
  draftSent = false;

  genTimer = setTimeout(() => {
    $('draftText').value = buildDraft(s);
    $('genLoading').hidden = true;
    $('genBtn').disabled = false;
    $('draftNote').textContent = 'Draft created from the sample observations. Review and edit before sending.';
    renderDraftState();
  }, 900);
});

$('draftText').addEventListener('input', () => {
  draftSent = false;
  renderDraftState();
});

$('discardBtn').addEventListener('click', () => {
  resetDraft();
  showToast('Draft discarded.');
});

// Feedback: send flow
$('sendBtn').addEventListener('click', () => {
  if ($('sendBtn').disabled) return;
  $('sendText').textContent = 'Send this summary to the parent / guardian of ' + current().name +
    '? Demo only, nothing is sent.';
  openOverlay('sendOverlay');
});

$('sendConfirmBtn').addEventListener('click', () => {
  draftSent = true;
  current().timeline.unshift({ date: todayShort(), text: 'Progress summary sent to parent.' });
  closeOverlay('sendOverlay');
  renderDraftState();
  renderTimeline();
  showToast('Summary sent (demo).');
});

// Page menu: open, pick a section, close
$('menuBtn').addEventListener('click', openDrawer);
$('drawerClose').addEventListener('click', closeDrawer);

$('drawerOverlay').addEventListener('click', (e) => {
  if (e.target === $('drawerOverlay')) closeDrawer();
});

$('drawerList').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-filter]');
  if (!btn) return;
  setSection(btn.dataset.filter);
  closeDrawer();
});

// Profile popover
$('profileBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  setPopover(!isPopoverOpen());
});

$('profilePop').addEventListener('click', (e) => {
  e.stopPropagation();
});

document.addEventListener('click', () => {
  if (isPopoverOpen()) setPopover(false);
});

// Generic modal close buttons and backdrop click
document.querySelectorAll('[data-close]').forEach((btn) => {
  btn.addEventListener('click', () => closeOverlay(btn.dataset.close));
});

document.querySelectorAll('.overlay').forEach((o) => {
  o.addEventListener('click', (e) => {
    if (e.target === o) closeOverlay(o.id);
  });
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  closeDrawer();
  setPopover(false);
  document.querySelectorAll('.overlay.open').forEach((o) => closeOverlay(o.id));
});

// Logout (sidebar, popover)
function logout() {
  sessionStorage.removeItem('nv_role');
  window.location.href = 'login.html';
}
$('sideLogout').addEventListener('click', logout);
$('ppLogout').addEventListener('click', logout);

// Init
renderProfile();
renderStudentPicker();
renderGrades();
renderObservations();
renderTimeline();
renderDraftState();
setSection('all');