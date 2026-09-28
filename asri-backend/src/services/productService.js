const { query, getClient } = require('../config/db');
const stockMovementService = require('./stockMovementService');

async function listProducts({ search, category, lowStock }) {
  const conditions = ['is_active = TRUE'];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(name ILIKE $${params.length} OR barcode ILIKE $${params.length})`);
  }
  if (category && category !== 'Semua') {
    params.push(category);
    conditions.push(`category = $${params.length}`);
  }
  if (lowStock === 'true') {
    conditions.push('stock < low_stock_threshold');
  }

  const { rows } = await query(
    `SELECT id, barcode, name, category, unit, cost_price, sell_price,
            stock, low_stock_threshold, created_at, updated_at
       FROM products
      WHERE ${conditions.join(' AND ')}
      ORDER BY name ASC`,
    params
  );
  return rows;
}

async function getProductById(id) {
  const { rows } = await query('SELECT * FROM products WHERE id = $1 AND is_active = TRUE', [id]);
  return rows[0] || null;
}

/**
 * Tambah produk baru. Bila stok awal > 0, dicatat sebagai ADJUSTMENT
 * ("Stok awal") di audit trail agar riwayat stok produk lengkap sejak nol.
 */
async function createProduct(data, userId) {
  const { barcode, name, category, unit, costPrice, sellPrice, stock, lowStockThreshold } = data;
  const initialStock = Number(stock) || 0;

  const client = await getClient();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO products (barcode, name, category, unit, cost_price, sell_price, stock, low_stock_threshold)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [barcode, name, category, unit, costPrice, sellPrice, initialStock, lowStockThreshold || 10]
    );
    const product = rows[0];

    if (initialStock > 0) {
      await stockMovementService.recordMovement(client, {
        productId: product.id, userId, movementType: 'ADJUSTMENT',
        qtyChange: initialStock, stockBefore: 0, stockAfter: initialStock, note: 'Stok awal produk baru',
      });
    }

    await client.query('COMMIT');
    return product;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Edit produk. Jika `stock` dikirim dan berbeda dari stok saat ini, stok
 * di-set ke nilai tsb sebagai koreksi manual (ADJUSTMENT) dan dicatat di audit
 * trail (siapa, dari berapa ke berapa). Baris produk dikunci FOR UPDATE agar
 * tidak bentrok dengan checkout kasir yang berjalan bersamaan.
 */
async function updateProduct(id, data, userId) {
  const { barcode, name, category, unit, costPrice, sellPrice, lowStockThreshold, stock } = data;

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { rows: existingRows } = await client.query(
      'SELECT stock FROM products WHERE id = $1 AND is_active = TRUE FOR UPDATE',
      [id]
    );
    if (!existingRows[0]) {
      await client.query('ROLLBACK');
      return null;
    }
    const stockBefore = existingRows[0].stock;
    const newStock = (stock === undefined || stock === null || stock === '') ? stockBefore : Number(stock);

    const { rows } = await client.query(
      `UPDATE products SET
          barcode = COALESCE($1, barcode),
          name = COALESCE($2, name),
          category = COALESCE($3, category),
          unit = COALESCE($4, unit),
          cost_price = COALESCE($5, cost_price),
          sell_price = COALESCE($6, sell_price),
          low_stock_threshold = COALESCE($7, low_stock_threshold),
          stock = $8
        WHERE id = $9
        RETURNING *`,
      [barcode, name, category, unit, costPrice, sellPrice, lowStockThreshold, newStock, id]
    );

    if (newStock !== stockBefore) {
      await stockMovementService.recordMovement(client, {
        productId: id, userId, movementType: 'ADJUSTMENT',
        qtyChange: newStock - stockBefore, stockBefore, stockAfter: newStock,
        note: 'Koreksi stok manual via Master Barang',
      });
    }

    await client.query('COMMIT');
    return rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Restock cepat — dibungkus database transaction agar penambahan stok
 * dan pencatatan audit trail (stock_movements) atomic: kalau salah satu
 * gagal, keduanya di-ROLLBACK, stok tidak pernah "nyangkut" tanpa jejak.
 * `userId` WAJIB diisi — bisa admin atau kasir (restock cepat dibuka untuk
 * keduanya, lihat product.routes.js), tercatat sebagai pelaku perubahan.
 */
async function restockProduct(id, qty, userId) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `SELECT id, stock FROM products WHERE id = $1 AND is_active = TRUE FOR UPDATE`,
      [id]
    );
    const existing = rows[0];
    if (!existing) {
      await client.query('ROLLBACK');
      return null;
    }

    const stockBefore = existing.stock;
    const stockAfter = stockBefore + qty;

    const { rows: updatedRows } = await client.query(
      `UPDATE products SET stock = $1 WHERE id = $2 RETURNING *`,
      [stockAfter, id]
    );

    await stockMovementService.recordMovement(client, {
      productId: id,
      userId,
      movementType: 'RESTOCK',
      qtyChange: qty,
      stockBefore,
      stockAfter,
    });

    await client.query('COMMIT');
    return updatedRows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Riwayat pergerakan stok satu produk — dipakai admin untuk audit siapa mengubah apa. */
async function getProductMovements(id) {
  return stockMovementService.listByProduct(id);
}

async function softDeleteProduct(id) {
  const { rows } = await query(
    `UPDATE products SET is_active = FALSE WHERE id = $1 RETURNING id`,
    [id]
  );
  return rows[0] || null;
}

module.exports = {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  restockProduct,
  softDeleteProduct,
  getProductMovements,
};
