/**
 * pages/auth.js — Login admin, lupa password, reset password, logout.
 * Menggantikan pengecekan password client-side (localStorage) dengan
 * panggilan nyata ke POST /api/auth/login dsb di backend.
 */
const AuthPage = {
  openModal() {
    this.toggleView('login');
    document.getElementById('modal-admin-auth').classList.remove('hidden');
  },

  closeModal() {
    document.getElementById('modal-admin-auth').classList.add('hidden');
  },

  toggleView(view) {
    ['login', 'forgot', 'reset'].forEach((v) => {
      document.getElementById(`auth-${v}-view`).classList.add('hidden');
    });
    document.getElementById(`auth-${view}-view`).classList.remove('hidden');
  },

  async handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('input-admin-email').value;
    const password = document.getElementById('input-admin-pass').value;

    try {
      const { token, user } = await api.auth.login(email, password);
      apiAuthToken.set(token);
      appState.currentUser = user;

      document.getElementById('admin-lock-icon').innerHTML = '<i class="fa-solid fa-circle-check text-green-400"></i>';
      document.getElementById('input-admin-pass').value = '';
      this.closeModal();
      switchRole('admin');
    } catch (err) {
      showError(err);
    }
  },

  async handleForgotPassword(e) {
    e.preventDefault();
    const email = document.getElementById('input-forgot-email').value;
    try {
      const res = await api.auth.forgotPassword(email);
      alert(res.message);
      this.toggleView('reset');
    } catch (err) {
      showError(err);
    }
  },

  async handleResetPassword(e) {
    e.preventDefault();
    const token = document.getElementById('input-reset-token').value;
    const newPassword = document.getElementById('input-reset-pass').value;
    try {
      const res = await api.auth.resetPassword(token, newPassword);
      alert(res.message);
      this.toggleView('login');
    } catch (err) {
      showError(err);
    }
  },

  logout() {
    apiAuthToken.set(null);
    appState.currentUser = null;
    document.getElementById('admin-lock-icon').innerHTML = '<i class="fa-solid fa-lock text-yellow-400"></i>';
    switchRole('kasir');
  },
};
window.AuthPage = AuthPage;
