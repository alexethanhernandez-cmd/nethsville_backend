const $ = (id) => document.getElementById(id);

// Any signed-in role can open these pages. No role stored = back to login.
const storedRole = sessionStorage.getItem('nv_role');
const HOME_PAGES = {
  teacher: 'dashboard-teacher.html',
  admin: 'dashboard-admin.html',
  parent: 'parent-portal.html'
};

if (!HOME_PAGES[storedRole]) {
  window.location.replace('login.html');
} else {
  const back = $('backLink');
  back.href = HOME_PAGES[storedRole];
  back.textContent = storedRole === 'parent' ? '← Back to Home' : '← Back to Dashboard';
}

function logout() {
  sessionStorage.removeItem('nv_role');
  window.location.href = 'login.html';
}
$('topLogout').addEventListener('click', logout);