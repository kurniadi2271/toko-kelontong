const bcrypt = require('bcrypt');
const { query } = require('../config/db');

const SALT_ROUNDS = 12;
const ROLES = ['admin', 'kasir'];

/** Daftar akun + jumlah transaksi yang pernah diproses (tanpa password_hash / token reset). */
async function listUsers() {
  const { rows } = await query(
    `SELECT u.id, u.name, u.email, u.role, u.is_active, u.created_at,
            COUNT(t.id)::int AS tx_count
       FROM users u
       LEFT JOIN transactions t ON t.cashier_id = u.id AND t.status = 'completed'
      GROUP BY u.id
      ORDER BY u.is_active DESC, u.role ASC, u.name ASC`
  );
  return rows;
}

async function createUser({ name, email, password, role }) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const { rows } = await query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, role, is_active, created_at`,
    [name, email.toLowerCase(), passwordHash, role]
  );
  return rows[0];
}

async function getUserById(id) {
  const { rows } = await query('SELECT id, name, email, role, is_active FROM users WHERE id = $1', [id]);
  return rows[0] || null;
}

async function countActiveAdmins() {
  const { rows } = await query("SELECT COUNT(*)::int AS n FROM users WHERE role = 'admin' AND is_active = TRUE");
  return rows[0].n;
}

async function updateUser(id, { name, email, role }) {
  const { rows } = await query(
    `UPDATE users SET
        name  = COALESCE($1, name),
        email = COALESCE($2, email),
        role  = COALESCE($3, role)
      WHERE id = $4
      RETURNING id, name, email, role, is_active, created_at`,
    [name || null, email ? email.toLowerCase() : null, role || null, id]
  );
  return rows[0] || null;
}

async function setActive(id, isActive) {
  const { rows } = await query(
    'UPDATE users SET is_active = $1 WHERE id = $2 RETURNING id, name, email, role, is_active',
    [isActive, id]
  );
  return rows[0] || null;
}

/** Admin mereset password akun lain (mis. kasir lupa password). Token reset lama ikut dibatalkan. */
async function resetPassword(id, newPassword) {
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  const { rowCount } = await query(
    `UPDATE users SET password_hash = $1, reset_token_hash = NULL, reset_token_expires = NULL WHERE id = $2`,
    [passwordHash, id]
  );
  return rowCount > 0;
}

module.exports = {
  ROLES, listUsers, createUser, getUserById, countActiveAdmins, updateUser, setActive, resetPassword,
};
