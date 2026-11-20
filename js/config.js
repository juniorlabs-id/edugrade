/* ============================================================
 * KONFIGURASI — WAJIB DIISI sebelum upload ke GitHub
 * ============================================================ */
window.RP_CONFIG = {
  // 1) Tempel URL Web App dari Google Apps Script (berakhiran /exec)
  GAS_URL: 'https://script.google.com/macros/s/AKfycbyBYiMMmoPTNzOZNdhmZb0ayEHFE4LYjH-Pz7H1J2Aq0TH2AX9IvgSFTmF6dc4Gi3G6/exec',

  // 2) Nomor WhatsApp admin (format 62...). Dipakai bila server belum bisa dihubungi.
  //    Nomor resmi tetap diambil dari menu Pengaturan admin.
  WA_ADMIN: '628561254689',

  // Paket cadangan (tampil hanya bila server belum bisa dihubungi)
  PAKET_CADANGAN: [
    { id: 'PKT-SATUAN', nama: 'Satuan', kuota: 1, jam: 24, harga: 15000, populer: false, keterangan: 'Cocok untuk mencoba 1 file' },
    { id: 'PKT-KELAS', nama: 'Paket Kelas', kuota: 8, jam: 336, harga: 65000, populer: true, keterangan: 'Pas untuk 1 guru kelas' },
    { id: 'PKT-SEKOLAH', nama: 'Paket Sekolah', kuota: 50, jam: 720, harga: 300000, populer: false, keterangan: 'Dipakai bersama beberapa guru' }
  ]
};
