/**
 * pages/auth.js — Login admin, lupa password, reset password, logout.
 * Menggantikan pengecekan password client-side (localStorage) dengan
 * panggilan nyata ke POST /api/auth/login dsb di backend.
 */
const AuthPage = {
  /** @param {'kasir'|'admin'} targetRole — dashboard yang DITUJU saat modal ini dibuka */
  openModal(targetRole) {
    appState.pendingNavTarget = targetRole;
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

      document.getElementById('input-admin-pass').value = '';
      this.closeModal();
      this.routeAfterLogin();
    } catch (err) {
      showError(err);
    }
  },

  /**
   * Menentukan dashboard mana yang dibuka setelah login sukses, berdasarkan
   * ROLE AKUN (bukan sekadar tombol mana yang diklik):
   * - role 'kasir' SELALU diarahkan ke dashboard Kasir, walau tadinya klik
   *   tombol "Admin Panel" — kasir tidak pernah boleh melihat panel admin.
   * - role 'admin' boleh ke dashboard Kasir ATAU Admin, sesuai tombol yang
   *   tadi diklik (pemilik toko wajar sesekali pegang kasir sendiri).
   */
  routeAfterLogin() {
    const { currentUser, pendingNavTarget } = appState;

    if (currentUser.role === 'kasir') {
      if (pendingNavTarget === 'admin') {
        alert('Akun ini berperan sebagai Kasir dan tidak memiliki akses ke Admin Panel.');
      }
      switchRole('kasir');
      return;
    }

    // role === 'admin'
    switchRole(pendingNavTarget || 'admin');
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
    appState.activeRole = null;
    appState.cart = []; // keranjang milik sesi sebelumnya tidak boleh terbawa ke kasir berikutnya
    document.getElementById('admin-lock-icon').innerHTML = '<i class="fa-solid fa-lock text-yellow-400"></i>';
    document.getElementById('kasir-lock-icon').innerHTML = '<i class="fa-solid fa-lock text-yellow-400"></i>';
    KasirPage.showLocked();
    document.getElementById('view-admin').classList.add('hidden');

    const inactiveClass = 'px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-2 text-sage-200 hover:text-white';
    document.getElementById('nav-btn-kasir').className = inactiveClass;
    document.getElementById('nav-btn-admin').className = inactiveClass;
  },
};
window.AuthPage = AuthPage;
