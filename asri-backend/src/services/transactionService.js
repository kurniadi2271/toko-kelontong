const { getClient, query } = require('../config/db');
const { generateTxCode } = require('../utils/generateTxCode');

/**
 * Menjalankan seluruh proses checkout dalam satu database transaction:
 * kunci baris produk (FOR UPDATE) -> validasi stok -> kurangi stok ->
 * insert header transaksi -> insert detail transaksi -> COMMIT.
 * Jika ada satu saja langkah gagal, seluruhnya di-ROLLBACK.
 *
 * @throws {Error} dengan properti `.status` untuk dipetakan controller ke HTTP status yang sesuai.
 */
async function checkout({ items, discountPct, paymentMethod, cashReceived, cashierId }) {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    let subtotal = 0;
    let totalHpp = 0;
    const detailRows = [];

    for (const item of items) {
      const qty = Number(item.qty);
      if (!item.productId || !qty || qty <= 0) {
        throw Object.assign(new Error('Setiap item harus memiliki productId dan qty > 0.'), { status: 400 });
      }

      const { rows } = await client.query(
        `SELECT id, name, barcode, unit, cost_price, sell_price, stock
           FROM products WHERE id = $1 AND is_active = TRUE FOR UPDATE`,
        [item.productId]
      );

      const product = rows[0];
      if (!product) {
        throw Object.assign(new Error(`Produk dengan ID ${item.productId} tidak ditemukan.`), { status: 404 });
      }
      if (product.stock < qty) {
        throw Object.assign(
          new Error(`Stok "${product.name}" tidak mencukupi (tersisa ${product.stock}, diminta ${qty}).`),
          { status: 409 }
        );
      }

      const lineSubtotal = Number(product.sell_price) * qty;
      const lineHpp = Number(product.cost_price) * qty;
      subtotal += lineSubtotal;
      totalHpp += lineHpp;

      detailRows.push({
        productId: product.id, name: product.name, barcode: product.barcode, unit: product.unit,
        qty, unitPrice: product.sell_price, unitCost: product.cost_price, lineSubtotal, lineHpp,
      });

      await client.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [qty, product.id]);
    }

    const discountAmount = Math.round((subtotal * Number(discountPct)) / 100);
    const grandTotal = subtotal - discountAmount;
    const netProfit = grandTotal - totalHpp;

    let cashReceivedValue = grandTotal;
    let changeAmount = 0;

    if (paymentMethod === 'CASH') {
      cashReceivedValue = Number(cashReceived);
      if (!cashReceivedValue || cashReceivedValue < grandTotal) {
        throw Object.assign(new Error('Nominal tunai yang diterima kurang dari total pembayaran.'), { status: 400 });
      }
      changeAmount = cashReceivedValue - grandTotal;
    }

    const txCode = await generateTxCode(client);

    const { rows: txRows } = await client.query(
      `INSERT INTO transactions
         (tx_code, cashier_id, subtotal, discount_pct, discount_amount, grand_total,
          total_hpp, net_profit, payment_method, cash_received, change_amount)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [txCode, cashierId, subtotal, discountPct, discountAmount, grandTotal,
        totalHpp, netProfit, paymentMethod, cashReceivedValue, changeAmount]
    );
    const transaction = txRows[0];

    for (const d of detailRows) {
      await client.query(
        `INSERT INTO transaction_details
           (transaction_id, product_id, product_name_snapshot, barcode_snapshot,
            unit_snapshot, qty, unit_price, unit_cost, line_subtotal, line_hpp)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [transaction.id, d.productId, d.name, d.barcode, d.unit, d.qty, d.unitPrice, d.unitCost, d.lineSubtotal, d.lineHpp]
      );
    }

    await client.query('COMMIT');
    return { ...transaction, items: detailRows };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function listTransactions({ startDate, endDate, page = 1, limit = 50 }) {
  const conditions = ["status = 'completed'"];
  const params = [];

  if (startDate) {
    params.push(startDate);
    conditions.push(`created_at::date >= $${params.length}`);
  }
  if (endDate) {
    params.push(endDate);
    conditions.push(`created_at::date <= $${params.length}`);
  }

  const offset = (Number(page) - 1) * Number(limit);
  params.push(Number(limit), offset);

  const { rows } = await query(
    `SELECT t.*, u.name AS cashier_name
       FROM transactions t JOIN users u ON u.id = t.cashier_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY t.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return rows;
}

async function getTransactionById(id) {
  const { rows: txRows } = await query(
    `SELECT t.*, u.name AS cashier_name FROM transactions t
      JOIN users u ON u.id = t.cashier_id WHERE t.id = $1`,
    [id]
  );
  const transaction = txRows[0];
  if (!transaction) return null;

  const { rows: items } = await query('SELECT * FROM transaction_details WHERE transaction_id = $1', [id]);
  return { ...transaction, items };
}

module.exports = { checkout, listTransactions, getTransactionById };
