/**
 * Menghasilkan ID Transaksi dengan format: TX-YYYYMMDD-XXXX
 * XXXX = nomor urut 4 digit untuk transaksi PADA HARI ITU (reset tiap hari),
 * dihitung dari jumlah transaksi hari ini + 1 agar berurutan dan mudah dibaca.
 *
 * Menggunakan tabel `transactions` yang sama (COUNT) di dalam transaksi DB
 * yang sedang berjalan (client) agar konsisten dengan proses checkout atomic.
 */
async function generateTxCode(client) {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const datePart = `${yyyy}${mm}${dd}`;

  const { rows } = await client.query(
    `SELECT COUNT(*)::int AS count
       FROM transactions
      WHERE tx_code LIKE $1`,
    [`TX-${datePart}-%`]
  );

  const sequence = String(rows[0].count + 1).padStart(4, '0');
  return `TX-${datePart}-${sequence}`;
}

module.exports = { generateTxCode };
