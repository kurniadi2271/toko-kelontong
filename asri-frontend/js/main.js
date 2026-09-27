/**
 * main.js — Entry point aplikasi. Memuat seluruh komponen HTML secara
 * dinamis, lalu menginisialisasi setiap page module. Fungsi navigasi
 * lintas-halaman (switchRole, AdminShell) didefinisikan di sini karena
 * dipakai bersama oleh header.html & admin-nav.html.
 *
 * ATURAN AKSES:
 * - Dashboard Kasir & Admin Panel SAMA-SAMA terkunci sampai login.
 * - Akun role 'kasir' HANYA boleh membuka dashboard Kasir.
 * - Akun role 'admin' boleh membuka Kasir MAUPUN Admin Panel.
 * Frontend menegakkan ini untuk UX; backend (authorize() middleware) tetap
 * jadi garda terakhir yang sesungguhnya — lihat asri-backend/src/middleware/auth.js.
 */

const ACTIVE_NAV_CLASS = 'px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-2 bg-sage-500 text-white shadow';
const INACTIVE_NAV_CLASS = 'px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-2 text-sage-200 hover:text-white';

/** Dipanggil saat klik tombol "Kasir (POS)" di header. */
function handleKasirNavClick() {
  if (!appState.currentUser) {
    AuthPage.openModal('kasir');
    return;
  }
  // Baik admin maupun kasir boleh membuka dashboard Kasir.
  switchRole('kasir');
}

/** Dipanggil saat klik tombol "Admin Panel" di header. */
function handleAdminNavClick() {
  if (!appState.currentUser) {
    AuthPage.openModal('admin');
    return;
  }
  if (appState.currentUser.role !== 'admin') {
    alert('Akun ini berperan sebagai Kasir dan tidak memiliki akses ke Admin Panel.');
    return;
  }
  switchRole('admin');
}

/**
 * Menampilkan dashboard sesuai role. Dipanggil HANYA setelah dipastikan
 * `appState.currentUser` ada & berhak (lihat handleKasirNavClick/handleAdminNavClick
 * serta AuthPage.routeAfterLogin) — fungsi ini sendiri tidak mengecek ulang.
 */
async function switchRole(role) {
  appState.activeRole = role;
  const kasirBtn = document.getElementById('nav-btn-kasir');
  const adminBtn = document.getElementById('nav-btn-admin');
  const viewKasir = document.getElementById('component-kasir');
  const viewAdmin = document.getElementById('view-admin');

  if (role === 'kasir') {
    kasirBtn.className = ACTIVE_NAV_CLASS;
    adminBtn.className = INACTIVE_NAV_CLASS;
    viewKasir.classList.remove('hidden');
    viewAdmin.classList.add('hidden');
    await KasirPage.init();
  } else {
    adminBtn.className = ACTIVE_NAV_CLASS;
    kasirBtn.className = INACTIVE_NAV_CLASS;
    viewAdmin.classList.remove('hidden');
    viewKasir.classList.add('hidden');
    AdminShell.switchTab(appState.activeAdminTab);
  }

  updateLockIcons();
}

/** Ikon gembok di kedua tombol nav mencerminkan status login & role akun aktif. */
function updateLockIcons() {
  const unlocked = '<i class="fa-solid fa-circle-check text-green-400"></i>';
  const locked = '<i class="fa-solid fa-lock text-yellow-400"></i>';

  document.getElementById('kasir-lock-icon').innerHTML = appState.currentUser ? unlocked : locked;
  document.getElementById('admin-lock-icon').innerHTML =
    (appState.currentUser && appState.currentUser.role === 'admin') ? unlocked : locked;
}

/** Mengelola tab di dalam Admin Panel (Dashboard, Master Barang, dst). */
const AdminShell = {
  tabs: ['dashboard', 'master-barang', 'stok-barang', 'laporan', 'pengaturan'],

  switchTab(tabName) {
    appState.activeAdminTab = tabName;

    this.tabs.forEach((t) => {
      document.getElementById(`admin-tab-${t}`).classList.add('hidden');
      document.getElementById(`tab-btn-${t}`).className = 'px-4 py-2 rounded-lg hover:bg-gray-100 flex items-center gap-2';
    });

    document.getElementById(`admin-tab-${tabName}`).classList.remove('hidden');
    document.getElementById(`tab-btn-${tabName}`).className = 'px-4 py-2 rounded-lg bg-sage-600 text-white flex items-center gap-2';

    if (tabName === 'dashboard') DashboardPage.render();
    if (tabName === 'master-barang') MasterBarangPage.render();
    if (tabName === 'stok-barang') StokBarangPage.render();
    if (tabName === 'laporan') LaporanPage.init();
    if (tabName === 'pengaturan') SettingsPage.render();
  },
};
window.AdminShell = AdminShell;
window.switchRole = switchRole;
window.handleKasirNavClick = handleKasirNavClick;
window.handleAdminNavClick = handleAdminNavClick;

function updateClock() {
  const el = document.getElementById('realtime-clock');
  if (el) el.innerText = new Date().toLocaleTimeString('id-ID');
}

async function bootstrap() {
  // 1. Muat seluruh potongan HTML dari /components ke placeholder index.html
  await loadComponents({
    '#component-header': 'components/header.html',
    '#component-kasir': 'components/kasir.html',
    '#component-admin-nav': 'components/admin-nav.html',
    '#component-dashboard': 'components/dashboard.html',
    '#component-master-barang': 'components/master-barang.html',
    '#component-stok-barang': 'components/stok-barang.html',
    '#component-laporan': 'components/laporan.html',
    '#component-pengaturan': 'components/pengaturan.html',
    '#component-modals': 'components/modals.html',
  });

  // 2. Jalankan jam realtime
  updateClock();
  setInterval(updateClock, 1000);

  // 3. Ambil identitas toko (dipakai header & struk) — endpoint publik untuk kasir
  await SettingsPage.render();

  // 4. Defaultnya kedua dashboard terkunci; Admin Panel selalu mulai tersembunyi.
  KasirPage.showLocked();
  document.getElementById('view-admin').classList.add('hidden');

  // 5. Jika sebelumnya sudah login (token JWT masih tersimpan & valid), pulihkan sesi
  //    dan langsung buka dashboard sesuai role akun tsb — tidak perlu login ulang
  //    hanya untuk membuka dashboard Kasir.
  if (apiAuthToken.get()) {
    try {
      appState.currentUser = await api.auth.me();
      await switchRole(appState.currentUser.role === 'admin' ? 'admin' : 'kasir');
    } catch (err) {
      apiAuthToken.set(null); // token kedaluwarsa/invalid, bersihkan
    }
  }

  updateLockIcons();
}

window.addEventListener('DOMContentLoaded', bootstrap);
