/**
 * main.js — Entry point aplikasi. Memuat seluruh komponen HTML secara
 * dinamis, lalu menginisialisasi setiap page module. Fungsi navigasi
 * lintas-halaman (switchRole, AdminShell) didefinisikan di sini karena
 * dipakai bersama oleh header.html & admin-nav.html.
 */

async function switchRole(role) {
  if (role === 'admin' && !appState.currentUser) {
    AuthPage.openModal();
    return;
  }

  appState.activeRole = role;
  const kasirBtn = document.getElementById('nav-btn-kasir');
  const adminBtn = document.getElementById('nav-btn-admin');
  const viewKasir = document.getElementById('component-kasir');
  const viewAdmin = document.getElementById('view-admin');

  const activeClass = 'px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-2 bg-sage-500 text-white shadow';
  const inactiveClass = 'px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-2 text-sage-200 hover:text-white';

  if (role === 'kasir') {
    kasirBtn.className = activeClass;
    adminBtn.className = inactiveClass;
    viewKasir.classList.remove('hidden');
    viewAdmin.classList.add('hidden');
  } else {
    adminBtn.className = activeClass;
    kasirBtn.className = inactiveClass;
    viewAdmin.classList.remove('hidden');
    viewKasir.classList.add('hidden');
    AdminShell.switchTab(appState.activeAdminTab);
  }
}

function handleAdminNavClick() {
  if (appState.currentUser) {
    switchRole('admin');
  } else {
    AuthPage.openModal();
  }
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

  // 4. Inisialisasi halaman Kasir (default view saat aplikasi dibuka)
  await KasirPage.init();

  // 5. Jika sebelumnya sudah login (token JWT masih tersimpan & valid), coba pulihkan sesi
  if (apiAuthToken.get()) {
    try {
      appState.currentUser = await api.auth.me();
      document.getElementById('admin-lock-icon').innerHTML = '<i class="fa-solid fa-circle-check text-green-400"></i>';
    } catch (err) {
      apiAuthToken.set(null); // token kedaluwarsa/invalid, bersihkan
    }
  }
}

window.addEventListener('DOMContentLoaded', bootstrap);
