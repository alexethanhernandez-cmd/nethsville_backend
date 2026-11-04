// Each role box opens the login page with that role already selected.
document.querySelectorAll('.role-card[data-role]').forEach((card) => {
  card.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = 'login.html?role=' + encodeURIComponent(card.dataset.role);
  });
});