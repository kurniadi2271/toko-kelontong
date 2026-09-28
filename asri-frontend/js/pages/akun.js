/**
 * pages/akun.js — Manajemen akun kasir & admin (admin only).
 * "Hapus" akun = NONAKTIFKAN: transaksi lama merujuk ke akun ini, jadi
 * baris user tidak pernah benar-benar dihapus (riwayat & laporan tetap utuh).
 */
const AkunPage = {
  users: [],

  async render() {
    try {
      this.users = await api.users.list();
    } catch (err) {
      showError(err);
      return;
    }

    const myId = appState.currentUser && appState.currentUser.id;
    document.getElementById('akun-tbody').innerHTML = this.users.map((u) => {
      const isMe = u.id === myId;
      return `
        <tr class="hover:bg-gray-50 ${u.is_active ? '' : 'opacity-60'}">
          <td class="p-3 font-bold">${u.name}${isMe ? ' <span class="text-[10px] text-sage-600 font-semibold">(Anda)</span>' : ''}</td>
          <td class="p-3">${u.email}</td>
          <td class="p-3 text-center">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${u.role === 'admin' ? 'bg-sage-100 text-sage-700' : 'bg-blue-100 text-blue-700'}">${u.role === 'admin' ? 'Admin' : 'Kasir'}</span>
          </td>
          <td class="p-3 text-center">
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}">${u.is_active ? 'Aktif' : 'Nonaktif'}</span>
          </td>
          <td class="p-3 text-center font-semibold">${u.tx_count}</td>
          <td class="p-3 text-center space-x-2 whitespace-nowrap">
            <button onclick="AkunPage.openModal('${u.id}')" class="text-blue-600 hover:text-blue-800" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
            <button onclick="AkunPage.openResetModal('${u.id}')" class="text-amber-600 hover:text-amber-800" title="Reset password"><i class="fa-solid fa-key"></i></button>
            ${isMe ? '' : (u.is_active
              ? `<button onclick="AkunPage.toggleActive('${u.id}', false)" class="text-red-500 hover:text-red-700" title="Nonaktifkan"><i class="fa-solid fa-user-slash"></i></button>`
              : `<button onclick="AkunPage.toggleActive('${u.id}', true)" class="text-green-600 hover:text-green-800" title="Aktifkan kembali"><i class="fa-solid fa-user-check"></i></button>`)}
          </td>
        </tr>`;
    }).join('');
  },

  openModal(editId = null) {
    const isEdit = Boolean(editId);
    document.getElementById('modal-akun-title').innerText = isEdit ? 'Edit Akun' : 'Tambah Akun';
    document.getElementById('akun-id').value = editId || '';
    document.getElementById('akun-password-wrap').classList.toggle('hidden', isEdit);
    document.getElementById('akun-password').required = !isEdit;

    if (isEdit) {
      const u = this.users.find((x) => x.id === editId);
      document.getElementById('akun-name').value = u.name;
      document.getElementById('akun-email').value = u.email;
      document.getElementById('akun-role').value = u.role;
    } else {
      document.getElementById('akun-name').value = '';
      document.getElementById('akun-email').value = '';
      document.getElementById('akun-role').value = 'kasir';
      document.getElementById('akun-password').value = '';
    }
    document.getElementById('modal-akun').classList.remove('hidden');
  },

  closeModal() {
    document.getElementById('modal-akun').classList.add('hidden');
  },

  async save(e) {
    e.preventDefault();
    const id = document.getElementById('akun-id').value;
    const payload = {
      name: document.getElementById('akun-name').value,
      email: document.getElementById('akun-email').value,
      role: document.getElementById('akun-role').value,
    };

    try {
      if (id) {
        await api.users.update(id, payload);
      } else {
        payload.password = document.getElementById('akun-password').value;
        await api.users.create(payload);
      }
      this.closeModal();
      await this.render();
    } catch (err) {
      showError(err);
    }
  },

  async toggleActive(id, isActive) {
    const u = this.users.find((x) => x.id === id);
    const msg = isActive
      ? `Aktifkan kembali akun "${u.name}"?`
      : `Nonaktifkan akun "${u.name}"?\nOrang ini tidak bisa login lagi, tapi riwayat transaksinya tetap tersimpan.`;
    if (!confirm(msg)) return;

    try {
      await api.users.setActive(id, isActive);
      await this.render();
    } catch (err) {
      showError(err);
    }
  },

  openResetModal(id) {
    const u = this.users.find((x) => x.id === id);
    document.getElementById('akun-reset-id').value = id;
    document.getElementById('akun-reset-name').innerText = `${u.name} (${u.email})`;
    document.getElementById('akun-reset-password').value = '';
    document.getElementById('modal-akun-reset').classList.remove('hidden');
  },

  closeResetModal() {
    document.getElementById('modal-akun-reset').classList.add('hidden');
  },

  async saveReset(e) {
    e.preventDefault();
    try {
      await api.users.resetPassword(
        document.getElementById('akun-reset-id').value,
        document.getElementById('akun-reset-password').value
      );
      this.closeResetModal();
      alert('Password berhasil direset. Sampaikan password baru ke yang bersangkutan.');
    } catch (err) {
      showError(err);
    }
  },
};
window.AkunPage = AkunPage;
