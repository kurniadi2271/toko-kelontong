/**
 * pages/kasir.js — Katalog produk, keranjang, checkout, cetak struk.
 * Produk diambil dari backend (GET /api/products); saat checkout,
 * pengurangan stok terjadi atomic di server (lihat asri-backend), bukan
 * lagi dihitung manual di browser.
 */
const KasirPage = {
  async init() {
    document.getElementById('kasir-locked-screen').classList.add('hidden');
    document.getElementById('kasir-content').classList.remove('hidden');

    document.getElementById('kasir-recap-name').innerText = appState.currentUser
      ? `${appState.currentUser.name} (${appState.currentUser.role === 'admin' ? 'Admin' : 'Kasir'})`
      : '-';

    await this.loadProducts();
    this.renderCategories();
    this.render();
    this.renderCart();
    this.loadRecap();
    this.focusSearch();
  },

  // ---------- SCAN BARCODE ----------
  /**
   * Cara kerja scanner: scanner barcode USB/Bluetooth berperilaku seperti
   * KEYBOARD — ia "mengetik" angka barcode dengan sangat cepat lalu menekan
   * Enter. Jadi tidak butuh driver/library khusus; yang penting kolom
   * pencarian ini sedang fokus.
   *
   * Saat Enter ditekan:
   *  1. Cocok PERSIS dengan satu barcode → langsung masuk keranjang (qty +1),
   *     kolom dikosongkan & tetap fokus untuk scan berikutnya.
   *  2. Tidak ada barcode persis, tapi hasil filter tinggal 1 produk → produk itu ditambahkan
   *     (praktis saat mengetik nama manual).
   *  3. Selain itu → pesan "tidak ditemukan"/"pilih salah satu".
   */
  handleSearchKey(e) {
    if (e.key !== 'Enter') return;
    e.preventDefault();

    const input = e.target;
    const code = input.value.trim().toLowerCase();
    if (!code) return;

    let product = appState.products.find((p) => p.barcode.toLowerCase() === code);
    if (!product) {
      const matches = appState.products.filter((p) =>
        p.name.toLowerCase().includes(code) || p.barcode.toLowerCase().includes(code));
      if (matches.length === 1) {
        product = matches[0];
      } else {
        this.showScanFeedback(matches.length === 0 ? `Barcode/produk "${input.value.trim()}" tidak ditemukan` : 'Ada beberapa hasil — klik produk yang dimaksud', false);
        input.select();
        return;
      }
    }

    if (product.stock <= 0) {
      this.showScanFeedback(`Stok "${product.name}" habis`, false);
      input.select();
      return;
    }

    const inCart = appState.cart.find((i) => i.id === product.id);
    if (inCart && inCart.qty + 1 > product.stock) {
      this.showScanFeedback(`Stok "${product.name}" tidak mencukupi`, false);
      input.select();
      return;
    }

    this.addToCart(product.id);
    this.showScanFeedback(`✓ ${product.name} ditambahkan`, true);
    input.value = '';
    this.render();
    input.focus();
  },

  showScanFeedback(message, ok) {
    const el = document.getElementById('kasir-scan-feedback');
    el.innerText = message;
    el.className = `absolute left-1 top-full mt-1 text-[11px] font-semibold z-10 ${ok ? 'text-green-600' : 'text-red-500'}`;
    clearTimeout(this._feedbackTimer);
    this._feedbackTimer = setTimeout(() => el.classList.add('hidden'), 2500);
  },

  focusSearch() {
    const el = document.getElementById('kasir-search');
    if (el && !document.getElementById('kasir-content').classList.contains('hidden')) el.focus();
  },

  /**
   * Tangkap ketikan scanner walau fokus sedang tidak di kolom pencarian
   * (mis. setelah menutup struk): karakter pertama memindahkan fokus ke kolom
   * pencarian sehingga sisa digit barcode tidak hilang. Tidak aktif saat ada
   * modal terbuka atau fokus sedang di input/select/textarea lain.
   */
  installGlobalScanCapture() {
    document.addEventListener('keydown', (e) => {
      if (appState.activeRole !== 'kasir') return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) return;
      if (document.querySelector('[id^="modal-"]:not(.hidden)')) return;
      this.focusSearch();
    });
  },

  /** Ditampilkan saat belum ada sesi login sama sekali. */
  showLocked() {
    document.getElementById('kasir-locked-screen').classList.remove('hidden');
    document.getElementById('kasir-content').classList.add('hidden');
  },

  /** Ringkasan milik kasir yang login: omset & jumlah transaksi HARI INI (tanpa laba). */
  async loadRecap() {
    try {
      const recap = await api.dashboard.kasirStats();
      appState.kasirRecap = recap;
      document.getElementById('kasir-recap-tx-count').innerText = recap.totalTransaksiSayaHariIni;
      document.getElementById('kasir-recap-omset').innerText = formatRp(recap.totalOmsetSayaHariIni);
    } catch (err) {
      console.error('[KasirPage] Gagal memuat ringkasan:', err.message);
    }
  },

  openHistoryModal() {
    const list = appState.kasirRecap.transaksiTerakhir || [];
    const container = document.getElementById('kasir-history-list');

    container.innerHTML = list.length === 0
      ? `<p class="text-center text-gray-400 py-6">Belum ada transaksi.</p>`
      : list.map((tx) => `
        <div class="flex justify-between items-center p-2.5 bg-gray-50 rounded-lg border border-gray-100">
          <div>
            <p class="font-mono font-bold text-[11px]">${tx.tx_code}</p>
            <p class="text-gray-500 text-[10px]">${formatDate(tx.created_at)} · ${tx.payment_method}</p>
          </div>
          <span class="font-bold text-sage-700">${formatRp(tx.grand_total)}</span>
        </div>
      `).join('');

    document.getElementById('modal-kasir-history').classList.remove('hidden');
  },

  closeHistoryModal() {
    document.getElementById('modal-kasir-history').classList.add('hidden');
  },

  /** Konfirmasi sebelum logout — peringatkan bila keranjang belum di-checkout. */
  confirmLogout() {
    const message = appState.cart.length > 0
      ? 'Keranjang belanja belum di-checkout dan akan hilang. Yakin ingin keluar?'
      : 'Yakin ingin keluar dari sesi kasir ini?';
    if (confirm(message)) {
      AuthPage.logout();
    }
  },

  async loadProducts() {
    try {
      appState.products = await api.products.list();
    } catch (err) {
      showError(err);
      appState.products = [];
    }
  },

  renderCategories() {
    const categories = ['Semua', ...new Set(appState.products.map((p) => p.category))];
    const container = document.getElementById('kasir-category-filters');
    if (!container) return;
    container.innerHTML = categories.map((cat) => `
      <button onclick="KasirPage.setCategory('${cat}')" class="px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition ${appState.activeKasirCategory === cat ? 'bg-sage-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}">
        ${cat}
      </button>
    `).join('');
  },

  setCategory(cat) {
    appState.activeKasirCategory = cat;
    this.renderCategories();
    this.render();
  },

  render() {
    const searchEl = document.getElementById('kasir-search');
    const query = (searchEl ? searchEl.value : '').toLowerCase();
    const container = document.getElementById('kasir-product-grid');
    if (!container) return;

    const filtered = appState.products.filter((p) => {
      const matchCat = appState.activeKasirCategory === 'Semua' || p.category === appState.activeKasirCategory;
      const matchQuery = p.name.toLowerCase().includes(query) || p.barcode.toLowerCase().includes(query);
      return matchCat && matchQuery;
    });

    if (filtered.length === 0) {
      container.innerHTML = `<div class="col-span-full py-12 text-center text-gray-400 text-xs">Produk tidak ditemukan</div>`;
      return;
    }

    container.innerHTML = filtered.map((p) => {
      const isOutOfStock = p.stock <= 0;
      return `
        <div onclick="${isOutOfStock ? '' : `KasirPage.addToCart('${p.id}')`}" class="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex flex-col justify-between cursor-pointer hover:border-sage-500 hover:shadow-md transition relative group ${isOutOfStock ? 'opacity-50 cursor-not-allowed' : ''}">
          <div>
            <div class="flex justify-between items-start mb-1">
              <span class="text-[10px] font-semibold text-sage-600 bg-sage-50 px-2 py-0.5 rounded-md">${p.category}</span>
              <span class="text-[10px] font-bold ${p.stock <= 5 ? 'text-red-500' : 'text-gray-400'}">Stok: ${p.stock}</span>
            </div>
            <h4 class="font-bold text-gray-800 text-xs line-clamp-2 leading-snug">${p.name}</h4>
          </div>
          <div class="mt-3 flex justify-between items-end border-t border-gray-50 pt-2">
            <div>
              <p class="text-[10px] text-gray-400">/ ${p.unit}</p>
              <p class="font-extrabold text-sage-700 text-xs">${formatRp(p.sell_price)}</p>
            </div>
            <button class="w-7 h-7 bg-sage-100 text-sage-700 rounded-lg group-hover:bg-sage-600 group-hover:text-white flex items-center justify-center transition">
              <i class="fa-solid fa-plus text-xs"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  addToCart(productId) {
    const product = appState.products.find((p) => p.id === productId);
    if (!product || product.stock <= 0) return;

    const existing = appState.cart.find((item) => item.id === productId);
    if (existing) {
      if (existing.qty + 1 > product.stock) {
        alert('Stok barang tidak mencukupi!');
        return;
      }
      existing.qty += 1;
    } else {
      appState.cart.push({ ...product, qty: 1 });
    }
    playBeep();
    this.renderCart();
  },

  updateCartQty(productId, delta) {
    const item = appState.cart.find((i) => i.id === productId);
    const product = appState.products.find((p) => p.id === productId);
    if (!item) return;

    const newQty = item.qty + delta;
    if (newQty <= 0) {
      appState.cart = appState.cart.filter((i) => i.id !== productId);
    } else {
      if (newQty > product.stock) {
        alert('Stok barang tidak mencukupi!');
        return;
      }
      item.qty = newQty;
    }
    this.renderCart();
  },

  clearCart() {
    appState.cart = [];
    this.renderCart();
  },

  renderCart() {
    const container = document.getElementById('cart-items-list');
    if (!container) return;
    document.getElementById('cart-item-count').innerText = appState.cart.reduce((acc, i) => acc + i.qty, 0);

    if (appState.cart.length === 0) {
      container.innerHTML = `
        <div class="h-full flex flex-col items-center justify-center text-gray-400 text-center py-12 space-y-2">
          <i class="fa-solid fa-cart-flatbed text-3xl text-gray-300"></i>
          <p class="text-xs">Keranjang belanja kosong</p>
        </div>`;
      this.updateCartTotals();
      return;
    }

    container.innerHTML = appState.cart.map((item) => `
      <div class="pt-2 first:pt-0">
        <div class="flex justify-between items-start mb-1">
          <h4 class="font-semibold text-gray-800 text-xs leading-snug">${item.name}</h4>
          <span class="font-bold text-xs text-gray-800">${formatRp(item.sell_price * item.qty)}</span>
        </div>
        <div class="flex justify-between items-center text-xs text-gray-500">
          <span>${formatRp(item.sell_price)} / ${item.unit}</span>
          <div class="flex items-center gap-2 border rounded-lg p-0.5 bg-gray-50">
            <button onclick="KasirPage.updateCartQty('${item.id}', -1)" class="w-5 h-5 rounded bg-white text-gray-600 shadow-sm hover:bg-gray-200 font-bold">-</button>
            <span class="font-bold text-xs px-1">${item.qty}</span>
            <button onclick="KasirPage.updateCartQty('${item.id}', 1)" class="w-5 h-5 rounded bg-white text-gray-600 shadow-sm hover:bg-gray-200 font-bold">+</button>
          </div>
        </div>
      </div>
    `).join('');

    this.updateCartTotals();
  },

  updateCartTotals() {
    const subtotal = appState.cart.reduce((acc, item) => acc + (item.sell_price * item.qty), 0);
    const discountPct = Number(document.getElementById('cart-discount').value || 0);
    const grandTotal = subtotal - (subtotal * (discountPct / 100));

    document.getElementById('cart-subtotal').innerText = formatRp(subtotal);
    document.getElementById('cart-grand-total').innerText = formatRp(grandTotal);
    document.getElementById('btn-checkout').disabled = appState.cart.length === 0;
    appState.pendingCheckoutTotal = grandTotal;
  },

  // ---------- CHECKOUT ----------
  openCheckoutModal() {
    if (appState.cart.length === 0) return;
    document.getElementById('checkout-total-display').innerText = formatRp(appState.pendingCheckoutTotal);
    this.renderQuickCashPills();
    this.setPaymentMethod('CASH');
    document.getElementById('modal-checkout').classList.remove('hidden');
  },

  closeCheckoutModal() {
    document.getElementById('modal-checkout').classList.add('hidden');
    this.focusSearch();
  },

  setPaymentMethod(method) {
    appState.currentPaymentMethod = method;
    const btnCash = document.getElementById('pay-method-cash');
    const btnQris = document.getElementById('pay-method-qris');
    const btnDebit = document.getElementById('pay-method-debit');
    const cashSection = document.getElementById('cash-input-section');
    const nonCashSection = document.getElementById('non-cash-section');
    const inactiveClass = 'py-2 px-3 border border-gray-200 text-gray-600 rounded-lg font-bold text-center text-xs';
    const activeClass = 'py-2 px-3 border border-sage-600 bg-sage-100 text-sage-800 rounded-lg font-bold text-center text-xs';

    [btnCash, btnQris, btnDebit].forEach((b) => (b.className = inactiveClass));

    if (method === 'CASH') {
      btnCash.className = activeClass;
      cashSection.classList.remove('hidden');
      nonCashSection.classList.add('hidden');
    } else {
      (method === 'QRIS' ? btnQris : btnDebit).className = activeClass;
      cashSection.classList.add('hidden');
      nonCashSection.classList.remove('hidden');
    }
    this.calculateChange();
  },

  renderQuickCashPills() {
    const container = document.getElementById('quick-cash-pills');
    const exact = appState.pendingCheckoutTotal;
    const presets = [...new Set([exact, 20000, 50000, 100000].filter((v) => v >= exact))];
    container.innerHTML = presets.map((val) => `
      <button type="button" onclick="KasirPage.setCashReceived(${val})" class="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 rounded text-[11px] font-semibold text-gray-700">
        ${val === exact ? 'Uang Pas' : formatRp(val)}
      </button>
    `).join('');
  },

  setCashReceived(val) {
    document.getElementById('cash-received').value = val;
    this.calculateChange();
  },

  calculateChange() {
    if (appState.currentPaymentMethod !== 'CASH') return;
    const received = Number(document.getElementById('cash-received').value || 0);
    const change = received - appState.pendingCheckoutTotal;
    const display = document.getElementById('cash-change-display');
    if (change < 0) {
      display.innerText = 'Uang kurang!';
      display.className = 'text-red-500 font-bold';
    } else {
      display.innerText = formatRp(change);
      display.className = 'text-sage-700 font-bold';
    }
  },

  async processTransaction() {
    const discountPct = Number(document.getElementById('cart-discount').value || 0);
    let cashReceived;

    if (appState.currentPaymentMethod === 'CASH') {
      cashReceived = Number(document.getElementById('cash-received').value || 0);
      if (cashReceived < appState.pendingCheckoutTotal) {
        alert('Nominal pembayaran kurang!');
        return;
      }
    }

    const payload = {
      items: appState.cart.map((item) => ({ productId: item.id, qty: item.qty })),
      discountPct,
      paymentMethod: appState.currentPaymentMethod,
      cashReceived,
    };

    try {
      const transaction = await api.transactions.checkout(payload);
      appState.currentReceiptData = transaction;
      this.closeCheckoutModal();
      this.showReceiptModal(transaction);
      this.clearCart();
      document.getElementById('cart-discount').value = 0;
      await this.loadProducts(); // sinkronkan stok terbaru dari server
      this.render();
      this.loadRecap(); // perbarui ringkasan omset & jumlah transaksi milik sendiri
    } catch (err) {
      showError(err); // mis. "Stok tidak mencukupi" bila kasir lain checkout duluan
    }
  },

  showReceiptModal(tx) {
    document.getElementById('receipt-date-time').innerText = formatDate(tx.created_at);
    document.getElementById('receipt-tx-id').innerText = tx.tx_code;
    document.getElementById('receipt-store-name').innerText = appState.storeSettings.store_name;
    document.getElementById('receipt-store-address').innerText = appState.storeSettings.address;

    document.getElementById('receipt-items-list').innerHTML = tx.items.map((i) => `
      <div class="flex justify-between text-[11px]">
        <div>
          <p class="font-semibold">${i.name}</p>
          <p class="text-gray-500">${i.qty} x ${formatRp(i.unitPrice)}</p>
        </div>
        <span class="font-semibold">${formatRp(i.lineSubtotal)}</span>
      </div>
    `).join('');

    document.getElementById('receipt-subtotal').innerText = formatRp(tx.subtotal);
    document.getElementById('receipt-discount').innerText = `${tx.discount_pct}%`;
    document.getElementById('receipt-grand-total').innerText = formatRp(tx.grand_total);
    document.getElementById('receipt-paid').innerText = formatRp(tx.cash_received);
    document.getElementById('receipt-change').innerText = formatRp(tx.change_amount);
    document.getElementById('modal-receipt').classList.remove('hidden');
  },

  closeReceiptModal() {
    document.getElementById('modal-receipt').classList.add('hidden');
    this.focusSearch();
  },
};
window.KasirPage = KasirPage;
