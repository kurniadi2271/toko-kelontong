const { query } = require('../config/db');

async function getTodaySummary() {
  const { rows } = await query(`
    SELECT
      COALESCE(SUM(grand_total), 0) AS total_omset,
      COALESCE(SUM(net_profit), 0)  AS total_laba,
      COUNT(*)                       AS total_transaksi
    FROM transactions
    WHERE status = 'completed' AND created_at::date = CURRENT_DATE
  `);
  return rows[0];
}

async function getSevenDayTrend() {
  const { rows } = await query(`
    SELECT to_char(d.day, 'YYYY-MM-DD') AS date,
           COALESCE(SUM(t.grand_total), 0) AS omset,
           COALESCE(SUM(t.net_profit), 0)  AS laba
      FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day') AS d(day)
      LEFT JOIN transactions t ON t.created_at::date = d.day AND t.status = 'completed'
     GROUP BY d.day ORDER BY d.day ASC
  `);
  return rows;
}

async function getCategoryProportionToday() {
  const { rows } = await query(`
    SELECT p.category, COALESCE(SUM(td.line_subtotal), 0) AS total
      FROM transaction_details td
      JOIN transactions t ON t.id = td.transaction_id
      LEFT JOIN products p ON p.id = td.product_id
     WHERE t.status = 'completed' AND t.created_at::date = CURRENT_DATE
     GROUP BY p.category ORDER BY total DESC
  `);
  return rows;
}

async function getLowStockCount() {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS count FROM products WHERE is_active = TRUE AND stock < low_stock_threshold`
  );
  return rows[0].count;
}

async function getReportRows(startDate, endDate) {
  const { rows } = await query(
    `SELECT t.tx_code, t.created_at, t.payment_method, t.grand_total, t.total_hpp, t.net_profit
       FROM transactions t
      WHERE t.status = 'completed' AND t.created_at::date BETWEEN $1 AND $2
      ORDER BY t.created_at ASC`,
    [startDate, endDate]
  );
  return rows;
}

module.exports = {
  getTodaySummary,
  getSevenDayTrend,
  getCategoryProportionToday,
  getLowStockCount,
  getReportRows,
};
