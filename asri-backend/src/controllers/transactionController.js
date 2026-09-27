const { asyncHandler } = require('../middleware/errorHandler');
const transactionService = require('../services/transactionService');

const PAYMENT_METHODS = ['CASH', 'QRIS', 'DEBIT'];

/**
 * POST /api/transactions — checkout.
 * Validasi input dasar di sini; seluruh logika atomic (kunci stok,
 * hitung total, insert header+detail, rollback bila gagal) ada di
 * services/transactionService.js#checkout.
 */
const createTransaction = asyncHandler(async (req, res) => {
  const { items, discountPct = 0, paymentMethod, cashReceived } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Keranjang belanja tidak boleh kosong.' });
  }
  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    return res.status(400).json({ error: `Metode pembayaran harus salah satu dari: ${PAYMENT_METHODS.join(', ')}` });
  }
  if (discountPct < 0 || discountPct > 100) {
    return res.status(400).json({ error: 'Diskon harus antara 0-100%.' });
  }

  const transaction = await transactionService.checkout({
    items, discountPct, paymentMethod, cashReceived, cashierId: req.user.id,
  });

  res.status(201).json(transaction);
});

const getTransactions = asyncHandler(async (req, res) => {
  const { startDate, endDate, page, limit } = req.query;
  const rows = await transactionService.listTransactions({ startDate, endDate, page, limit });
  res.json(rows);
});

const getTransactionById = asyncHandler(async (req, res) => {
  const transaction = await transactionService.getTransactionById(req.params.id);
  if (!transaction) return res.status(404).json({ error: 'Transaksi tidak ditemukan.' });
  res.json(transaction);
});

/**
 * GET /api/transactions/me
 * Riwayat transaksi milik kasir yang sedang login SAJA (untuk cross-check
 * struk sendiri). Beda dari getTransactions() yang admin-only & lintas kasir.
 */
const getMyTransactions = asyncHandler(async (req, res) => {
  const rows = await transactionService.listMyTransactions(req.user.id);
  res.json(rows);
});

module.exports = { createTransaction, getTransactions, getTransactionById, getMyTransactions };
