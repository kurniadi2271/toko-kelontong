const bcrypt = require('bcrypt');
const { query } = require('../config/db');

const SALT_ROUNDS = 12;

/**
 * userService — manajemen akun KASIR (dipakai admin).
 * Semua fungsi di sini SENGAJA dibatasi ke role 'kasir': akun admin tidak
 * pernah tampil, dibuat, diubah, di-reset, atau dinonaktifkan lewat jalur ini.
 * (Admin mengganti passwordnya sendiri lewat menu Pengaturan.)
 */

/** Daftar kasir + jumlah transaksi yang pernah diproses (tanpa password_hash / token reset). */
async function listKasir() {
  const { rows } = await query(
    `SELECT u.id, u.name, u.email, u.is_active, u.created_at,
            COUNT(t.id)::int AS tx_count
       FROM users u
       LEFT JOIN transactions t ON t.cashier_id = u.id AND t.status = 'completed'
      WHERE u.role = 'kasir'
      GROUP BY u.id
      ORDER BY u.is_active DESC, u.name ASC`
  );
  return rows;
}

async function createKasir({ name, email, password }) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const { rows } = await query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, 'kasir')
     RETURNING id, name, email, is_active, created_at`,
    [name, email.toLowerCase(), passwordHash]
  );
  return rows[0];
}

async function getKasirById(id) {
  const { rows } = await query(
    "SELECT id, name, email, is_active FROM users WHERE id = $1 AND role = 'kasir'",
    [id]
  );
  return rows[0] || null;
}

async function updateKasir(id, { name, email }) {
  const { rows } = await query(
    `UPDATE users SET
        name  = COALESCE($1, name),
        email = COALESCE($2, email)
      WHERE id = $3 AND role = 'kasir'
      RETURNING id, name, email, is_active, created_at`,
    [name || null, email ? email.toLowerCase() : null, id]
  );
  return rows[0] || null;
}

async function setActive(id, isActive) {
  const { rows } = await query(
    "UPDATE users SET is_active = $1 WHERE id = $2 AND role = 'kasir' RETURNING id, name, email, is_active",
    [isActive, id]
  );
  return rows[0] || null;
}

/** Admin mereset password kasir (mis. lupa password). Token reset lama ikut dibatalkan. */
async function resetPassword(id, newPassword) {
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  const { rowCount } = await query(
    `UPDATE users SET password_hash = $1, reset_token_hash = NULL, reset_token_expires = NULL
      WHERE id = $2 AND role = 'kasir'`,
    [passwordHash, id]
  );
  return rowCount > 0;
}

module.exports = { listKasir, createKasir, getKasirById, updateKasir, setActive, resetPassword };
