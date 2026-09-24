/**
 * pages/dashboard.js — Statistik real-time & grafik, dari GET /api/dashboard/stats.
 */
const DashboardPage = {
  async render() {
    try {
      const stats = await api.dashboard.stats();

      document.getElementById('dash-total-omset').innerText = formatRp(stats.totalOmsetHariIni);
      document.getElementById('dash-total-laba').innerText = formatRp(stats.totalLabaHariIni);
      document.getElementById('dash-total-tx').innerText = stats.totalTransaksiHariIni;
      document.getElementById('dash-low-stock').innerText = `${stats.produkStokMenipis} Produk`;

      this.renderCharts(stats);
    } catch (err) {
      showError(err);
    }
  },

  renderCharts(stats) {
    const ctxTrend = document.getElementById('chart-sales-trend').getContext('2d');
    if (appState.chartSalesInstance) appState.chartSalesInstance.destroy();

    appState.chartSalesInstance = new Chart(ctxTrend, {
      type: 'bar',
      data: {
        labels: stats.trend7Hari.map((d) => d.date.slice(5)),
        datasets: [
          { label: 'Omset (Rp)', data: stats.trend7Hari.map((d) => d.omset), backgroundColor: '#588157' },
          { label: 'Laba (Rp)', data: stats.trend7Hari.map((d) => d.laba), backgroundColor: '#bc8a5f' },
        ],
      },
      options: { responsive: true, maintainAspectRatio: false },
    });

    const ctxPie = document.getElementById('chart-category-pie').getContext('2d');
    if (appState.chartCategoryInstance) appState.chartCategoryInstance.destroy();

    const hasData = stats.proporsiKategori.length > 0;
    appState.chartCategoryInstance = new Chart(ctxPie, {
      type: 'doughnut',
      data: {
        labels: hasData ? stats.proporsiKategori.map((c) => c.category) : ['Belum Ada Data'],
        datasets: [{
          data: hasData ? stats.proporsiKategori.map((c) => c.total) : [1],
          backgroundColor: ['#3a5a40', '#588157', '#a3b18a', '#dad7cd', '#bc8a5f'],
        }],
      },
      options: { responsive: true, maintainAspectRatio: false },
    });
  },
};
window.DashboardPage = DashboardPage;
