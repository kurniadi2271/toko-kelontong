const { query } = require('../config/db');

async function getStoreSettings() {
  const { rows } = await query('SELECT store_name, address FROM store_settings WHERE id = 1');
  return rows[0];
}

async function updateStoreSettings(storeName, address) {
  const { rows } = await query(
    `UPDATE store_settings SET store_name = $1, address = $2 WHERE id = 1 RETURNING store_name, address`,
    [storeName, address]
  );
  return rows[0];
}

module.exports = { getStoreSettings, updateStoreSettings };
