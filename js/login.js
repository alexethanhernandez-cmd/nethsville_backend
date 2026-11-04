const $ = (id) => document.getElementById(id);

const ROLES = ['admin', 'teacher', 'parent'];

const ROLE_PAGES = {
  admin: 'dashboard-admin.html',
  teacher: 'dashboard-teacher.html',
  parent: 'parent-portal.html'
};

const PLACEHOLDERS = {
  admin: 'e.g. admin@nethsville.edu.ph',
  teacher: 'e.g. j.santos@nethsville.edu.ph',
  parent: 'e.g. parent.name@email.com'
};

const BRAND_CONTENT = {
  admin: {
    title: 'Admin Portal',
    subtitle: 'Oversee enrollments, school records, and pickup monitoring.',
    items: [
      'Review and approve enrollments',
      'Manage students, staff, and guardians',
      'Monitor pickups and school reports'
    ]
  },
  teacher: {
    title: 'Teacher Portal',
    subtitle: 'Tools for your classroom and daily work.',
    items: [
      'Record attendance and classroom activities',
      'Write observations and review progress summaries',
      'Monitor guardian pickups for your students'
    ]
  },
  parent: {
    title: 'Parent Portal',
    subtitle: "Stay updated on your child's progress and day.",
    items: [
      "View your child's progress and grades",
      'Read messages from teachers',
      'Manage authorized pickups'
    ]
  }
};

// Shown on plain Sign in, when no role has been chosen yet
const GENERIC_BRAND = {
  title: 'Welcome back',
  subtitle: 'Choose your role below to sign in.',
  items: [
    'Admin: manage students, staff, and school records',
    'Teacher: attendance, observations, and progress summaries',
    "Parent / Guardian: your child's progress and pickups"
  ]
};

const EYE_OPEN = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_OFF = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.9 10.9 0 0 1 12 19c-7 0-11-7-11-7a19.8 19.8 0 0 1 5.06-5.94M9.9 4.24A10.9 10.9 0 0 1 12 4c7 0 11 7 11 7a19.8 19.8 0 0 1-3.17 4.19M1 1l22 22"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/></svg>';

const tabsEl = document.querySelector('.tabs');

// null means no role chosen yet
let currentRole = null;

function esc(text) {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

function renderBrand(role) {
  const c = role ? BRAND_CONTENT[role] : GENERIC_BRAND;
  $('brandTitle').textContent = c.title;
  $('brandSubtitle').textContent = c.subtitle;
  $('brandList').innerHTML = c.items.map((item) => '<li>' + esc(item) + '</li>').join('');
}

function setRole(role) {
  currentRole = role || null;

  document.querySelectorAll('.tab').forEach((tab) => {
    const on = tab.dataset.role === currentRole;
    tab.setAttribute('aria-selected', String(on));
    tab.tabIndex = on || (currentRole === null && tab.dataset.role === ROLES[0]) ? 0 : -1;
  });

  $('email').placeholder = currentRole ? PLACEHOLDERS[currentRole] : 'e.g. name@nethsville.edu.ph';
  renderBrand(currentRole);
}

// Tabs: click
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => setRole(tab.dataset.role));
});

// Tabs: arrow keys
tabsEl.addEventListener('keydown', (e) => {
  const i = ROLES.indexOf(currentRole);
  if (e.key === 'ArrowRight') {
    e.preventDefault();
    const next = ROLES[(i + 1 + ROLES.length) % ROLES.length];
    setRole(next);
    document.querySelector('.tab[data-role="' + next + '"]').focus();
  }
  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    const prev = ROLES[(i - 1 + ROLES.length) % ROLES.length];
    setRole(prev);
    document.querySelector('.tab[data-role="' + prev + '"]').focus();
  }
});

// Password show or hide
$('eyeBtn').innerHTML = EYE_OPEN;
$('eyeBtn').addEventListener('click', () => {
  const input = $('password');
  const showing = input.type === 'text';
  input.type = showing ? 'password' : 'text';
  $('eyeBtn').innerHTML = showing ? EYE_OPEN : EYE_OFF;
  $('eyeBtn').setAttribute('aria-pressed', String(!showing));
  $('eyeBtn').setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
});

// Login (demo): a role must be chosen first. No real check of email or password.
$('loginForm').addEventListener('submit', (e) => {
  e.preventDefault();

  if (!currentRole) {
    $('brandSubtitle').textContent = 'Please choose your role first.';
    return;
  }

  const btn = $('loginBtn');
  btn.classList.add('loading');
  btn.disabled = true;
  $('loginBtnText').textContent = 'Logging in…';

  setTimeout(() => {
    sessionStorage.setItem('nv_role', currentRole);
    window.location.href = ROLE_PAGES[currentRole];
  }, 800);
});

// Clear error state while typing
$('loginForm').addEventListener('input', (e) => {
  const field = e.target.closest('.field');
  if (field) field.classList.remove('invalid');
});

// Overlays
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

// Forgot password (demo)
$('forgotBtn').addEventListener('click', () => {
  $('forgotForm').reset();
  openOverlay('forgotOverlay');
  $('forgotEmail').focus();
});

$('forgotCancel').addEventListener('click', () => closeOverlay('forgotOverlay'));

$('forgotForm').addEventListener('submit', (e) => {
  e.preventDefault();
  $('forgotInfo').textContent = 'Demo only. No reset email is sent.';
});

// Contact popover
function setPopover(open) {
  $('contactPopover').classList.toggle('open', open);
  $('contactBtn').setAttribute('aria-expanded', String(open));
}

$('contactBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  setPopover(!$('contactPopover').classList.contains('open'));
});

$('contactClose').addEventListener('click', () => setPopover(false));

$('contactPopover').addEventListener('click', (e) => e.stopPropagation());

document.addEventListener('click', () => setPopover(false));

// Backdrop click and Escape
document.querySelectorAll('.overlay').forEach((o) => {
  o.addEventListener('click', (e) => {
    if (e.target === o) closeOverlay(o.id);
  });
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  setPopover(false);
  document.querySelectorAll('.overlay.open').forEach((o) => closeOverlay(o.id));
});

// Role from the welcome page box (login.html?role=admin), or none for plain Sign in
const requestedRole = new URLSearchParams(window.location.search).get('role');

if (ROLE_PAGES[requestedRole]) {
  // Came from a role box: lock to that role and hide the role tabs
  tabsEl.style.display = 'none';
  setRole(requestedRole);
} else {
  // Plain Sign in: show all three tabs and let the user choose
  setRole(null);
}