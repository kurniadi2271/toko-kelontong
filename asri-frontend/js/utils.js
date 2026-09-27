/**
 * utils.js — helper murni (tidak menyentuh DOM/state), dipakai lintas halaman.
 */

function formatRp(val) {
  return 'Rp ' + Number(val || 0).toLocaleString('id-ID');
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch (e) { /* abaikan browser yang tidak mendukung Web Audio API */ }
}

/** Tampilkan pesan error dari api.js dengan cara yang seragam. */
function showError(err) {
  alert(err.message || 'Terjadi kesalahan. Silakan coba lagi.');
}

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Tanggal HARI INI dalam format YYYY-MM-DD memakai timezone LOKAL browser.
 * SENGAJA tidak memakai `new Date().toISOString()` — itu selalu mengonversi
 * ke UTC, sehingga dini hari WIB (UTC+7) bisa salah dihitung sebagai
 * "kemarin" menurut UTC. Dipakai sebagai default filter tanggal Laporan.
 */
function getLocalDateString(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
