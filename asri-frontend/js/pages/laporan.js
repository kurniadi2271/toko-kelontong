/**
 * pages/laporan.js — Riwayat transaksi + unduh laporan.
 * Unduh Excel/PDF sekarang di-generate SERVER-SIDE oleh backend
 * (GET /api/dashboard/report?format=xlsx|pdf), bukan lagi SheetJS/jsPDF
 * di browser, sehingga tidak lagi bergantung pada data di memori.
 */
const LaporanPage = {
  async init() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('report-date-start').value = today;
    document.getElementById('report-date-end').value = today;
    await this.render();
  },

  async render() {
    const startDate = document.getElementById('report-date-start').value;
    const endDate = document.getElementById('report-date-end').value;

    let rows = [];
    try {
      rows = await api.transactions.list({ startDate, endDate });
    } catch (err) {
      showError(err);
    }

    const totals = rows.reduce(
      (acc, tx) => ({
        omset: acc.omset + Number(tx.grand_total),
        hpp: acc.hpp + Number(tx.total_hpp),
        laba: acc.laba + Number(tx.net_profit),
      }),
      { omset: 0, hpp: 0, laba: 0 }
    );

    document.getElementById('report-summary-omset').innerText = formatRp(totals.omset);
    document.getElementById('report-summary-hpp').innerText = formatRp(totals.hpp);
    document.getElementById('report-summary-laba').innerText = formatRp(totals.laba);

    const tbody = document.getElementById('laporan-tbody');
    if (rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-gray-400">Tidak ada data transaksi pada rentang tanggal ini.</td></tr>`;
      return;
    }

    tbody.innerHTML = rows.map((tx) => `
      <tr class="hover:bg-gray-50">
        <td class="p-3 font-mono font-bold">${tx.tx_code}</td>
        <td class="p-3">${formatDate(tx.created_at)}</td>
        <td class="p-3"><span class="bg-gray-100 text-gray-700 px-2 py-0.5 rounded">${tx.payment_method}</span></td>
        <td class="p-3 text-right font-bold">${formatRp(tx.grand_total)}</td>
        <td class="p-3 text-right text-red-500">${formatRp(tx.total_hpp)}</td>
        <td class="p-3 text-right font-bold text-sage-700">${formatRp(tx.net_profit)}</td>
        <td class="p-3 text-center text-gray-400">${tx.cashier_name || '-'}</td>
      </tr>
    `).join('');
  },

  async downloadReport(format) {
    const startDate = document.getElementById('report-date-start').value;
    const endDate = document.getElementById('report-date-end').value;

    try {
      const blob = await api.dashboard.downloadReport(startDate, endDate, format);
      const ext = format === 'xlsx' ? 'xlsx' : 'pdf';
      triggerBlobDownload(blob, `Laporan_${startDate}_sd_${endDate}.${ext}`);
    } catch (err) {
      showError(err);
    }
  },
};
window.LaporanPage = LaporanPage;
