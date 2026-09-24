const { Pool } = require('pg');
require('dotenv').config();

// Pool koneksi PostgreSQL (Supabase-compatible).
// SSL wajib untuk koneksi ke Supabase dari luar VPC mereka.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 10, // batas koneksi bersamaan, aman untuk instance kecil/free-tier
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
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
