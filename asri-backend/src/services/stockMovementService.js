const { query } = require('../config/db');

/**
 * stockMovementService — audit trail untuk SETIAP perubahan stok, siapa pun
 * pelakunya (kasir atau admin). Dipanggil dari transactionService (saat
 * checkout, movement_type = SALE) dan productService (saat restock,
 * movement_type = RESTOCK).
 *
 * `client` bersifat opsional: bila dipanggil dari dalam database transaction
 * yang sedang berjalan (checkout/restock atomic), kirim `client` agar insert
 * ini ikut ROLLBACK bila terjadi kegagalan di langkah lain. Bila dipanggil
 * di luar transaksi, cukup biarkan kosong (pakai pool biasa).
 */
async function recordMovement(runner, {
  productId, userId, movementType, qtyChange, stockBefore, stockAfter, referenceTxId = null, note = null,
}) {
  const exec = runner ? runner.query.bind(runner) : query;
  await exec(
    `INSERT INTO stock_movements
       (product_id, user_id, movement_type, qty_change, stock_before, stock_after, reference_tx_id, note)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [productId, userId, movementType, qtyChange, stockBefore, stockAfter, referenceTxId, note]
  );
}

/** Riwayat pergerakan stok satu produk, terbaru dulu — dipakai admin untuk audit. */
async function listByProduct(productId, limit = 50) {
  const { rows } = await query(
    `SELECT sm.*, u.name AS user_name, t.tx_code
       FROM stock_movements sm
       JOIN users u ON u.id = sm.user_id
       LEFT JOIN transactions t ON t.id = sm.reference_tx_id
      WHERE sm.product_id = $1
      ORDER BY sm.created_at DESC
      LIMIT $2`,
    [productId, limit]
  );
  return rows;
}

module.exports = { recordMovement, listByProduct };
