/**
 * pages/masterBarang.js — CRUD Master Barang (POST/PUT/DELETE /api/products).
 */
const MasterBarangPage = {
  products: [],

  async render() {
    try {
      this.products = await api.products.list();
    } catch (err) {
      showError(err);
      this.products = [];
    }

    const query = (document.getElementById('master-search').value || '').toLowerCase();
    const filtered = this.products.filter((p) =>
      p.name.toLowerCase().includes(query) || p.barcode.toLowerCase().includes(query)
    );

    document.getElementById('master-barang-tbody').innerHTML = filtered.map((p) => `
      <tr class="hover:bg-gray-50">
        <td class="p-3 font-mono text-[11px]">${p.barcode}</td>
        <td class="p-3 font-bold">${p.name}</td>
        <td class="p-3"><span class="bg-gray-100 text-gray-700 px-2 py-0.5 rounded">${p.category}</span></td>
        <td class="p-3 text-right font-medium">${formatRp(p.cost_price)}</td>
        <td class="p-3 text-right font-bold text-sage-700">${formatRp(p.sell_price)}</td>
        <td class="p-3 text-center">
          <span class="font-bold px-2 py-0.5 rounded ${p.stock < p.low_stock_threshold ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}">
            ${p.stock} ${p.unit}
          </span>
        </td>
        <td class="p-3 text-center space-x-2">
          <button onclick="MasterBarangPage.openHistory('${p.id}', '${p.name.replace(/'/g, "\\'")}')" class="text-gray-500 hover:text-sage-700" title="Riwayat Pergerakan Stok"><i class="fa-solid fa-clock-rotate-left"></i></button>
          <button onclick="MasterBarangPage.openModal('${p.id}')" class="text-blue-600 hover:text-blue-800"><i class="fa-solid fa-pen-to-square"></i></button>
          <button onclick="MasterBarangPage.remove('${p.id}')" class="text-red-500 hover:text-red-700"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>
    `).join('');
  },

  openModal(editId = null) {
    const modal = document.getElementById('modal-product');
    const title = document.getElementById('modal-product-title');

    if (editId) {
      const p = this.products.find((prod) => prod.id === editId);
      title.innerText = 'Edit Produk';
      document.getElementById('prod-id').value = p.id;
      document.getElementById('prod-barcode').value = p.barcode;
      document.getElementById('prod-name').value = p.name;
      document.getElementById('prod-category').value = p.category;
      document.getElementById('prod-unit').value = p.unit;
      document.getElementById('prod-cost').value = p.cost_price;
      document.getElementById('prod-price').value = p.sell_price;
      document.getElementById('prod-stock').value = p.stock;
    } else {
      title.innerText = 'Tambah Produk Baru';
      document.getElementById('prod-id').value = '';
      document.getElementById('prod-barcode').value = '899' + Math.floor(1000 + Math.random() * 9000);
      document.getElementById('prod-name').value = '';
      document.getElementById('prod-unit').value = 'Pcs';
      document.getElementById('prod-cost').value = '';
      document.getElementById('prod-price').value = '';
      document.getElementById('prod-stock').value = 10;
    }
    modal.classList.remove('hidden');
  },

  closeModal() {
    document.getElementById('modal-product').classList.add('hidden');
  },

  async saveProduct(e) {
    e.preventDefault();
    const id = document.getElementById('prod-id').value;
    const payload = {
      barcode: document.getElementById('prod-barcode').value,
      name: document.getElementById('prod-name').value,
      category: document.getElementById('prod-category').value,
      unit: document.getElementById('prod-unit').value,
      costPrice: Number(document.getElementById('prod-cost').value),
      sellPrice: Number(document.getElementById('prod-price').value),
      stock: Number(document.getElementById('prod-stock').value),
    };

    try {
      if (id) {
        await api.products.update(id, payload);
      } else {
        await api.products.create(payload);
      }
      this.closeModal();
      await this.render();
      await KasirPage.loadProducts();
      KasirPage.renderCategories();
      KasirPage.render();
    } catch (err) {
      showError(err);
    }
  },

  async remove(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus produk ini?')) return;
    try {
      await api.products.remove(id);
      await this.render();
      await KasirPage.loadProducts();
      KasirPage.render();
    } catch (err) {
      showError(err);
    }
  },

  /**
   * Riwayat pergerakan stok (audit trail) untuk satu produk: siapa
   * mengurangi/menambah stok, kapan, dan lewat transaksi yang mana
   * (lihat asri-backend GET /api/products/:id/movements).
   */
  async openHistory(productId, productName) {
    document.getElementById('stock-history-product-name').innerText = productName;
    const container = document.getElementById('stock-history-list');
    container.innerHTML = `<p class="text-center text-gray-400 py-6">Memuat riwayat...</p>`;
    document.getElementById('modal-stock-history').classList.remove('hidden');

    try {
      const movements = await api.products.movements(productId);
      if (movements.length === 0) {
        container.innerHTML = `<p class="text-center text-gray-400 py-6">Belum ada pergerakan stok tercatat.</p>`;
        return;
      }

      const typeLabel = { SALE: 'Penjualan', RESTOCK: 'Restock', ADJUSTMENT: 'Koreksi' };
      const typeColor = { SALE: 'text-red-600 bg-red-50', RESTOCK: 'text-green-600 bg-green-50', ADJUSTMENT: 'text-amber-600 bg-amber-50' };

      container.innerHTML = movements.map((m) => `
        <div class="flex justify-between items-center p-2.5 bg-gray-50 rounded-lg border border-gray-100">
          <div>
            <p class="font-semibold">
              <span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${typeColor[m.movement_type]}">${typeLabel[m.movement_type]}</span>
              ${m.qty_change > 0 ? '+' : ''}${m.qty_change} (${m.stock_before} → ${m.stock_after})
            </p>
            <p class="text-[10px] text-gray-500 mt-0.5">
              oleh <span class="font-medium text-gray-700">${m.user_name}</span> · ${formatDate(m.created_at)}
              ${m.tx_code ? ` · <span class="font-mono">${m.tx_code}</span>` : ''}
            </p>
          </div>
        </div>
      `).join('');
    } catch (err) {
      container.innerHTML = `<p class="text-center text-red-400 py-6">Gagal memuat riwayat.</p>`;
      showError(err);
    }
  },

  closeHistoryModal() {
    document.getElementById('modal-stock-history').classList.add('hidden');
  },
};
window.MasterBarangPage = MasterBarangPage;
