const { Pool } = require('pg');
require('dotenv').config();

// Pool koneksi PostgreSQL (Supabase-compatible).
// SSL wajib untuk koneksi ke Supabase dari luar VPC mereka.
//
// ⚠️ PENTING soal pilihan connection string Supabase (lihat juga .env.example):
// Supabase menyediakan 2 mode pooler — "Session" (port 5432) dan "Transaction"
// (port 6543). Backend ini adalah aplikasi Node long-running dengan pool
// koneksinya sendiri (bukan serverless), jadi WAJIB pakai mode "Session"
// (atau koneksi langsung). Mode "Transaction" TIDAK kompatibel dengan
// prepared statement yang otomatis dibuat oleh library `pg` — gejalanya
// query yang SAMA kadang berhasil kadang gagal dengan error acak seperti
// "prepared statement ... already exists", yang persis terlihat seperti
// "kadang error kadang normal" pada endpoint tertentu (mis. Laporan).
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 10, // batas koneksi bersamaan, aman untuk instance kecil/free-tier
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 8000, // dilonggarkan — koneksi lewat localtunnel/internet bisa lebih lambat dari localhost
  keepAlive: true, // cegah koneksi idle "mati diam-diam" saat lewat internet/tunnel, penyebab umum error acak
});

pool.on('error', (err) => {
  // Error tak terduga pada koneksi idle di pool -> log, jangan crash proses utama
  console.error('[DB] Unexpected error on idle client', err);
});

/**
 * Jalankan query sederhana (auto-release koneksi).
 * SELALU gunakan parameterized query ($1, $2, ...) — JANGAN PERNAH
 * melakukan string concatenation untuk mencegah SQL Injection.
 */
async function query(text, params) {
  return pool.query(text, params);
}

/**
 * Ambil satu client dari pool untuk transaksi manual (BEGIN/COMMIT/ROLLBACK).
 * Dipakai khusus untuk proses checkout agar pengurangan stok bersifat atomic.
 */
async function getClient() {
  const client = await pool.connect();
  return client;
}

module.exports = { pool, query, getClient };
