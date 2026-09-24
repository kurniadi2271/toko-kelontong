require('dotenv').config();
const app = require('./app');
const { pool } = require('./config/db');

const PORT = process.env.PORT || 4000;

async function start() {
  try {
    await pool.query('SELECT 1'); // pastikan koneksi DB hidup sebelum menerima traffic
    app.listen(PORT, () => {
      console.log(`[SERVER] Asri Backend berjalan di port ${PORT} (${process.env.NODE_ENV || 'development'})`);
    });
  } catch (err) {
    console.error('[SERVER] Gagal terkoneksi ke database saat startup:', err.message);
    process.exit(1);
  }
}

start();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[SERVER] SIGTERM diterima, menutup koneksi...');
  await pool.end();
  process.exit(0);
});
