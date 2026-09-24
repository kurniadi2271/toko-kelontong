const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { asyncHandler } = require('../middleware/errorHandler');
const dashboardService = require('../services/dashboardService');

function formatRp(val) {
  return 'Rp ' + Number(val || 0).toLocaleString('id-ID');
}

/**
 * GET /api/dashboard/stats
 * Mengambil beberapa dataset dari dashboardService secara paralel lalu
 * merangkainya menjadi satu payload untuk kartu ringkasan & grafik.
 */
const getStats = asyncHandler(async (req, res) => {
  const [summary, trend, category, lowStockCount] = await Promise.all([
    dashboardService.getTodaySummary(),
    dashboardService.getSevenDayTrend(),
    dashboardService.getCategoryProportionToday(),
    dashboardService.getLowStockCount(),
  ]);

  res.json({
    totalOmsetHariIni: Number(summary.total_omset),
    totalLabaHariIni: Number(summary.total_laba),
    totalTransaksiHariIni: Number(summary.total_transaksi),
    produkStokMenipis: lowStockCount,
    trend7Hari: trend.map((r) => ({ date: r.date, omset: Number(r.omset), laba: Number(r.laba) })),
    proporsiKategori: category.map((r) => ({ category: r.category || 'Lainnya', total: Number(r.total) })),
  });
});

/**
 * GET /api/dashboard/report?startDate=&endDate=&format=json|xlsx|pdf
 * Data diambil dari dashboardService; pembentukan file (xlsx/pdf) murni
 * urusan presentasi sehingga tetap di controller, bukan service.
 */
const getReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, format = 'json' } = req.query;
  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'Parameter startDate dan endDate wajib diisi (YYYY-MM-DD).' });
  }

  const rows = await dashboardService.getReportRows(startDate, endDate);
  const totals = rows.reduce(
    (acc, r) => ({
      omset: acc.omset + Number(r.grand_total),
      hpp: acc.hpp + Number(r.total_hpp),
      laba: acc.laba + Number(r.net_profit),
    }),
    { omset: 0, hpp: 0, laba: 0 }
  );

  if (format === 'json') {
    return res.json({ periode: { startDate, endDate }, totals, transactions: rows });
  }

  if (format === 'xlsx') {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Laporan Penjualan');
    sheet.columns = [
      { header: 'ID Transaksi', key: 'tx_code', width: 22 },
      { header: 'Tanggal', key: 'created_at', width: 20 },
      { header: 'Metode Bayar', key: 'payment_method', width: 15 },
      { header: 'Total Omset (Rp)', key: 'grand_total', width: 18 },
      { header: 'Total HPP (Rp)', key: 'total_hpp', width: 18 },
      { header: 'Laba Bersih (Rp)', key: 'net_profit', width: 18 },
    ];
    sheet.getRow(1).font = { bold: true };

    rows.forEach((r) => sheet.addRow({
      tx_code: r.tx_code,
      created_at: new Date(r.created_at).toLocaleString('id-ID'),
      payment_method: r.payment_method,
      grand_total: Number(r.grand_total),
      total_hpp: Number(r.total_hpp),
      net_profit: Number(r.net_profit),
    }));

    sheet.addRow({});
    const totalRow = sheet.addRow({
      tx_code: 'TOTAL', grand_total: totals.omset, total_hpp: totals.hpp, net_profit: totals.laba,
    });
    totalRow.font = { bold: true };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Laporan_${startDate}_sd_${endDate}.xlsx"`);
    await workbook.xlsx.write(res);
    return res.end();
  }

  if (format === 'pdf') {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Laporan_${startDate}_sd_${endDate}.pdf"`);
    doc.pipe(res);

    doc.fontSize(16).text('Laporan Penjualan & Laba Rugi', { align: 'left' });
    doc.fontSize(10).fillColor('#555').text(`Periode: ${startDate} s/d ${endDate}`);
    doc.moveDown(1);

    doc.fontSize(9).fillColor('#000');
    const colX = [40, 150, 260, 340, 420, 490];
    ['ID Transaksi', 'Tanggal', 'Metode', 'Omset', 'HPP', 'Laba'].forEach((h, i) =>
      doc.text(h, colX[i], doc.y, { continued: i < 5 })
    );
    doc.moveDown(0.5);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#ccc').stroke();
    doc.moveDown(0.3);

    rows.forEach((r) => {
      const y = doc.y;
      doc.text(r.tx_code, colX[0], y, { width: 105 });
      doc.text(new Date(r.created_at).toLocaleDateString('id-ID'), colX[1], y, { width: 105 });
      doc.text(r.payment_method, colX[2], y, { width: 75 });
      doc.text(formatRp(r.grand_total), colX[3], y, { width: 75 });
      doc.text(formatRp(r.total_hpp), colX[4], y, { width: 65 });
      doc.text(formatRp(r.net_profit), colX[5], y, { width: 65 });
      doc.moveDown(0.6);
    });

    doc.moveDown(0.5);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#ccc').stroke();
    doc.moveDown(0.3);
    doc.font('Helvetica-Bold');
    doc.text(`TOTAL Omset: ${formatRp(totals.omset)}   HPP: ${formatRp(totals.hpp)}   Laba: ${formatRp(totals.laba)}`, 40);
    doc.end();
    return;
  }

  return res.status(400).json({ error: 'Format tidak dikenal. Gunakan json, xlsx, atau pdf.' });
});

module.exports = { getStats, getReport };
