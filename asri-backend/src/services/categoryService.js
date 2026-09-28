const { query } = require('../config/db');

/** Daftar kategori + jumlah produk aktif di tiap kategori (untuk ditampilkan di UI kelola kategori). */
async function listCategories() {
  const { rows } = await query(
    `SELECT c.id, c.name,
            COUNT(p.id) FILTER (WHERE p.is_active = TRUE)::int AS product_count
       FROM categories c
       LEFT JOIN products p ON p.category = c.name
      GROUP BY c.id, c.name
      ORDER BY c.name ASC`
  );
  return rows;
}

async function createCategory(name) {
  const { rows } = await query('INSERT INTO categories (name) VALUES ($1) RETURNING id, name', [name]);
  return rows[0];
}

/** Ganti nama: produk ikut ter-update otomatis lewat FK ON UPDATE CASCADE. */
async function renameCategory(id, name) {
  const { rows } = await query('UPDATE categories SET name = $1 WHERE id = $2 RETURNING id, name', [name, id]);
  return rows[0] || null;
}

/**
 * Hapus kategori. Ditolak (23503) bila masih ada produk yang memakainya —
 * dipetakan controller menjadi pesan yang jelas.
 */
async function deleteCategory(id) {
  const { rowCount } = await query('DELETE FROM categories WHERE id = $1', [id]);
  return rowCount > 0;
}

module.exports = { listCategories, createCategory, renameCategory, deleteCategory };
