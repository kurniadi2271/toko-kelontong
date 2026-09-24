/**
 * state.js — state aplikasi yang hidup di memori (bukan localStorage),
 * kecuali token JWT yang memang harus persisten antar reload (lihat api.js).
 * Semua data bisnis (produk, transaksi) SELALU diambil ulang dari backend,
 * tidak pernah disimpan permanen di browser.
 */
window.appState = {
  currentUser: null,        // { id, name, email, role } — diisi setelah login sukses
  storeSettings: { store_name: 'Toko Kelontong Asri', address: '' },

  activeRole: 'kasir',      // 'kasir' | 'admin'
  activeAdminTab: 'dashboard',

  products: [],              // cache katalog produk untuk halaman aktif
  cart: [],                  // [{ id, barcode, name, unit, sell_price, cost_price, stock, qty }]
  activeKasirCategory: 'Semua',
  activeStockFilter: 'all',

  currentPaymentMethod: 'CASH',
  pendingCheckoutTotal: 0,
  currentReceiptData: null,

  chartSalesInstance: null,
  chartCategoryInstance: null,
};
