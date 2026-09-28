/**
 * api.js — SATU PINTU untuk semua komunikasi ke backend.
 * Tidak ada file lain di frontend ini yang boleh memanggil fetch() langsung;
 * semua lewat fungsi-fungsi di bawah agar mudah diaudit, di-mock saat testing,
 * dan agar base URL / auth header cukup diatur di satu tempat.
 */

const BASE_URL = window.APP_CONFIG.API_BASE_URL;

/** Ambil token JWT tersimpan (disimpan terpisah dari data bisnis apa pun). */
function getToken() {
  return localStorage.getItem('asri_token');
}

function setToken(token) {
  if (token) localStorage.setItem('asri_token', token);
  else localStorage.removeItem('asri_token');
}

/**
 * Wrapper fetch generik: menambahkan base URL, header JSON, dan
 * Authorization Bearer token otomatis bila tersedia. Melempar Error
 * berisi pesan dari backend agar mudah ditangkap & ditampilkan ke user.
 */
async function request(path, { method = 'GET', body, isBlob = false } = {}) {
  const headers = {
    'Content-Type': 'application/json',
    // Wajib bila BASE_URL menunjuk ke localtunnel (*.loca.lt): tanpa header
    // ini, localtunnel menyisipkan halaman HTML "klik untuk lanjut" di setiap
    // response, yang bikin res.json() gagal parse. Aman & diabaikan begitu
    // saja oleh server lain (Railway/VPS/dll).
    'Bypass-Tunnel-Reminder': 'true',
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    // fetch() melempar TypeError generik "Failed to fetch" untuk SEMUA jenis
    // kegagalan jaringan (bukan error dari backend): backend mati, localtunnel
    // terputus/URL berubah, domain diblokir CORS, atau tidak ada koneksi
    // internet sama sekali. Kita ganti dengan pesan yang actionable, karena
    // "Failed to fetch" mentah tidak memberi tahu user harus ngapain.
    console.error('[api] Network error saat memanggil', `${BASE_URL}${path}`, networkErr);
    throw new Error(
      `Tidak dapat terhubung ke server (${BASE_URL}). ` +
      'Cek: (1) backend & localtunnel masih berjalan, (2) URL di js/config.js sudah sesuai URL tunnel TERBARU, ' +
      '(3) domain frontend ini sudah didaftarkan di FRONTEND_ORIGIN pada .env backend.'
    );
  }

  if (isBlob) {
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Gagal mengunduh file.' }));
      throw new Error(err.error || 'Gagal mengunduh file.');
    }
    return res.blob();
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request gagal (${res.status})`);
  }
  return data;
}

const api = {
  // ---------- AUTH ----------
  auth: {
    login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
    forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: { email } }),
    resetPassword: (token, newPassword) =>
      request('/auth/reset-password', { method: 'POST', body: { token, newPassword } }),
    me: () => request('/auth/me'),
  },

  // ---------- PRODUCTS ----------
  products: {
    list: ({ search = '', category = '', lowStock = false } = {}) => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (category) params.set('category', category);
      if (lowStock) params.set('lowStock', 'true');
      const qs = params.toString();
      return request(`/products${qs ? `?${qs}` : ''}`);
    },
    create: (payload) => request('/products', { method: 'POST', body: payload }),
    update: (id, payload) => request(`/products/${id}`, { method: 'PUT', body: payload }),
    restock: (id, qty) => request(`/products/${id}/restock`, { method: 'PATCH', body: { qty } }),
    remove: (id) => request(`/products/${id}`, { method: 'DELETE' }),
    movements: (id) => request(`/products/${id}/movements`),
  },

  // ---------- TRANSACTIONS ----------
  transactions: {
    checkout: (payload) => request('/transactions', { method: 'POST', body: payload }),
    list: ({ startDate, endDate } = {}) => {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const qs = params.toString();
      return request(`/transactions${qs ? `?${qs}` : ''}`);
    },
    // Riwayat transaksi milik kasir yang sedang login saja.
    mine: () => request('/transactions/me'),
  },

  // ---------- DASHBOARD ----------
  dashboard: {
    stats: () => request('/dashboard/stats'),
    kasirStats: () => request('/dashboard/kasir-stats'),
    downloadReport: async (startDate, endDate, format) => {
      const blob = await request(
        `/dashboard/report?startDate=${startDate}&endDate=${endDate}&format=${format}`,
        { isBlob: true }
      );
      return blob;
    },
  },

  // ---------- USERS (manajemen akun, admin only) ----------
  users: {
    list: () => request('/users'),
    create: (payload) => request('/users', { method: 'POST', body: payload }),
    update: (id, payload) => request(`/users/${id}`, { method: 'PUT', body: payload }),
    setActive: (id, isActive) => request(`/users/${id}/status`, { method: 'PATCH', body: { isActive } }),
    resetPassword: (id, newPassword) => request(`/users/${id}/password`, { method: 'PATCH', body: { newPassword } }),
  },

  // ---------- CATEGORIES ----------
  categories: {
    list: () => request('/categories'),
    create: (name) => request('/categories', { method: 'POST', body: { name } }),
    rename: (id, name) => request(`/categories/${id}`, { method: 'PUT', body: { name } }),
    remove: (id) => request(`/categories/${id}`, { method: 'DELETE' }),
  },

  // ---------- SETTINGS ----------
  settings: {
    getStore: () => request('/settings/store'),
    updateStore: (payload) => request('/settings/store', { method: 'PUT', body: payload }),
  },
};

window.api = api;
window.apiAuthToken = { get: getToken, set: setToken };
