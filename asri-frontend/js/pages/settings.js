/**
 * pages/settings.js — Identitas toko & ganti password admin (PUT /api/settings/store).
 */
const SettingsPage = {
  async render() {
    try {
      const settings = await api.settings.getStore();
      appState.storeSettings = settings;
      document.getElementById('setting-store-name').value = settings.store_name;
      document.getElementById('setting-store-address').value = settings.address;
      this.updateHeaderUI();
    } catch (err) {
      showError(err);
    }
  },

  updateHeaderUI() {
    const nameEl = document.getElementById('app-header-store-name');
    if (nameEl) nameEl.innerText = appState.storeSettings.store_name;
    document.title = appState.storeSettings.store_name + ' - POS & Management';
  },

  async save(e) {
    e.preventDefault();
    const storeName = document.getElementById('setting-store-name').value;
    const address = document.getElementById('setting-store-address').value;
    const currentPassword = document.getElementById('setting-current-pass').value;
    const newPassword = document.getElementById('setting-new-pass').value;
    const confirmPassword = document.getElementById('setting-confirm-pass').value;

    if (newPassword.trim() !== '' && newPassword !== confirmPassword) {
      alert('Konfirmasi password baru tidak cocok!');
      return;
    }

    try {
      const updated = await api.settings.updateStore({
        storeName, address, currentPassword,
        newPassword: newPassword.trim() || undefined,
      });
      appState.storeSettings = updated;
      this.updateHeaderUI();
      alert('Pengaturan Toko & Keamanan berhasil diperbarui!');
      document.getElementById('setting-current-pass').value = '';
      document.getElementById('setting-new-pass').value = '';
      document.getElementById('setting-confirm-pass').value = '';
    } catch (err) {
      showError(err);
    }
  },
};
window.SettingsPage = SettingsPage;
