const $ = (id) => document.getElementById(id);

// Admins only. Other roles go to their own page, or login if no role is stored.
const storedRole = sessionStorage.getItem('nv_role');
const ROLE_PAGES = { teacher: 'dashboard-teacher.html', parent: 'parent-portal.html', admin: 'dashboard-admin.html' };
if (storedRole !== 'admin') {
  window.location.replace(ROLE_PAGES[storedRole] || 'login.html');
}

// Sample data only. Not connected to the school's database.
const pending = [
  { id: 1, name: 'Sofia Reyes', detail: 'Nursery · Parent: Joy Reyes (Mother)' },
  { id: 2, name: 'Miguel Santos', detail: 'Kinder 2 · Parent: Ruel Santos (Father)' },
  { id: 3, name: 'Hannah Cruz', detail: 'Kinder 1 · Parent: Lea Cruz (Mother)' }
];

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

function renderPending() {
  $('pendingList').innerHTML = pending.map((p) =>
    '<div class="item" data-id="' + p.id + '">' +
      '<div>' +
        '<div class="item-name">' + esc(p.name) + '</div>' +
        '<div class="item-sub">' + esc(p.detail) + '</div>' +
      '</div>' +
      '<div class="item-actions">' +
        '<button class="btn-small" type="button" data-act="approve">Approve</button>' +
        '<button class="btn-outline" type="button" data-act="reject">Reject</button>' +
      '</div>' +
    '</div>'
  ).join('');

  $('pendingCount').textContent = pending.length;
  $('pendingEmpty').classList.toggle('show', pending.length === 0);
}

// Approve or reject (event delegation, since rows are re-rendered)
$('pendingList').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;

  const row = btn.closest('.item');
  const id = Number(row.dataset.id);
  const index = pending.findIndex((p) => p.id === id);
  if (index === -1) return;

  const name = pending[index].name;
  pending.splice(index, 1);
  renderPending();

  showToast(btn.dataset.act === 'approve'
    ? name + ' was approved (demo).'
    : name + ' was rejected (demo).');
});

// Logout (sidebar and topbar)
function logout() {
  sessionStorage.removeItem('nv_role');
  window.location.href = 'login.html';
}
$('sideLogout').addEventListener('click', logout);
$('topLogout').addEventListener('click', logout);

renderPending();