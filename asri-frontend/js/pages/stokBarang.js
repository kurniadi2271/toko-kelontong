/**
 * pages/stokBarang.js — Alert stok menipis & Restock Cepat (PATCH /api/products/:id/restock).
 */
const StokBarangPage = {
  products: [],

  async render() {
    try {
      this.products = await api.products.list(
        appState.activeStockFilter === 'low' ? { lowStock: true } : {}
      );
    } catch (err) {
      showError(err);
      this.products = [];
    }

    document.getElementById('stock-summary-text').innerText = `Menampilkan ${this.products.length} barang`;

    document.getElementById('stok-barang-tbody').innerHTML = this.products.map((p) => `
      <tr class="hover:bg-gray-50">
        <td class="p-3 font-bold">${p.name}</td>
        <td class="p-3"><span class="bg-gray-100 text-gray-700 px-2 py-0.5 rounded">${p.category}</span></td>
        <td class="p-3 text-center font-extrabold text-sm ${p.stock < p.low_stock_threshold ? 'text-red-600' : 'text-gray-800'}">${p.stock} ${p.unit}</td>
        <td class="p-3 text-center">
          ${p.stock < p.low_stock_threshold
            ? '<span class="bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold text-[10px]">Menipis</span>'
            : '<span class="bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold text-[10px]">Aman</span>'}
        </td>
        <td class="p-3 text-center">
          <button onclick="StokBarangPage.openModal('${p.id}')" class="px-3 py-1 bg-sage-600 hover:bg-sage-700 text-white font-bold rounded text-[11px]">+ Restock</button>
        </td>
      </tr>
    `).join('');
  },

  filterStatus(status) {
    appState.activeStockFilter = status;
    document.getElementById('stock-filter-all').className = status === 'all'
      ? 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-sage-600 text-white'
      : 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200';
    document.getElementById('stock-filter-low').className = status === 'low'
      ? 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-sage-600 text-white'
      : 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200';
    this.render();
  },

  openModal(id) {
    const p = this.products.find((prod) => prod.id === id);
    if (!p) return;
    document.getElementById('restock-prod-id').value = p.id;
    document.getElementById('restock-prod-name').innerText = `${p.name} (Stok Saat Ini: ${p.stock})`;
    document.getElementById('modal-restock').classList.remove('hidden');
  },

  closeModal() {
    document.getElementById('modal-restock').classList.add('hidden');
  },

  async saveRestock(e) {
    e.preventDefault();
    const id = document.getElementById('restock-prod-id').value;
    const qty = Number(document.getElementById('restock-qty').value);

    try {
      await api.products.restock(id, qty);
      this.closeModal();
      await this.render();
      await KasirPage.loadProducts();
      KasirPage.render();
    } catch (err) {
      showError(err);
    }
  },
};
window.StokBarangPage = StokBarangPage;
