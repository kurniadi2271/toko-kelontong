/**
 * loader.js — memuat potongan HTML dari /components secara dinamis ke
 * placeholder di index.html memakai fetch(), lalu menyuntikkannya via
 * innerHTML. Ini menggantikan pendekatan "satu file HTML raksasa".
 *
 * Catatan: karena pakai fetch() ke file lokal, index.html WAJIB diakses
 * lewat web server (http://localhost:...), bukan dibuka langsung sebagai
 * file:// — gunakan `npx serve`, Live Server VSCode, atau hasil deploy Vercel.
 */
async function loadComponent(targetSelector, componentPath) {
  const target = document.querySelector(targetSelector);
  if (!target) {
    console.error(`[loader] Target "${targetSelector}" tidak ditemukan di DOM.`);
    return;
  }
  try {
    const res = await fetch(componentPath);
    if (!res.ok) throw new Error(`Gagal memuat ${componentPath} (${res.status})`);
    target.innerHTML = await res.text();
  } catch (err) {
    target.innerHTML = `<div class="p-6 text-red-500 text-sm">Gagal memuat komponen: ${componentPath}</div>`;
    console.error(err);
  }
}

/** Memuat beberapa komponen sekaligus secara paralel, resolve setelah semua selesai. */
async function loadComponents(map) {
  await Promise.all(Object.entries(map).map(([selector, path]) => loadComponent(selector, path)));
}
