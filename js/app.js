/* ============================================================
 * EduGrade — Aplikasi Guru (SPA berbasis hash)
 * #/            Beranda
 * #/ubah/1..4   Ubah Nilai
 * #/erapor/1..5 Isi e-Rapor
 * #/beli        Cara Pembelian Kode
 * ============================================================ */
(function () {
  'use strict';
  const E = window.RPEngine, U = window.RPUI, A = window.RPApi, C = window.RP_CONFIG;
  const { icon, esc, fmt, fmt1, rupiah } = U;
  const $ = s => document.querySelector(s);
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* abaikan */ } }
  };
  const DEF_PREFS = { kkm: 70, h1: 75, h2: 95, method: 'linear', n: 5, dec: 0, tMin: 90, rMax: 85 };

  // ============================================
  // STATE
  // ============================================
  const S = {
    cfg: { wa: C.WA_ADMIN, paket: C.PAKET_CADANGAN, unduhUlangJam: 24, banner: '', perawatan: false, fromServer: false },
    code: LS.get('rp_code', null),
    ref: LS.get('rp_ref', ''),
    hist: [],
    prefs: Object.assign({}, DEF_PREFS, LS.get('rp_prefs', {})),
    k: null, // Ubah Nilai
    e: null, // Isi e-Rapor
    lastRoute: ''
  };
  const savePrefs = () => LS.set('rp_prefs', S.prefs);
  const num = v => (v === '' || v === null || v === undefined || isNaN(+v) ? null : +v);

  // ============================================
  // ROUTER & RENDER
  // ============================================
  function parseRoute() {
    const h = location.hash.replace(/^#\/?/, '');
    const [page, step] = h.split('/');
    return { page: page || 'home', step: Math.max(1, parseInt(step, 10) || 1), arg: decodeURIComponent(step || '') };
  }
  const go = h => { if (location.hash === h) render(); else location.hash = h; };

  function render() {
    const r = parseRoute();
    // Penjaga langkah: tidak boleh lompat bila data belum ada
    if (r.page === 'ubah' && r.step > 1 && !(S.k && S.k.an && S.k.an.ok)) return go('#/ubah/1');
    if (r.page === 'erapor' && r.step > 1 && !(S.e && S.e.tpls.length)) return go('#/erapor/1');
    if (r.page === 'erapor' && r.step > 2 && !teacherWb()) return go('#/erapor/2');
    const key = r.page + '/' + r.step;
    const changed = key !== S.lastRoute;
    S.lastRoute = key;
    renderTop(r);
    let v;
    if (r.page === 'ubah') v = viewUbah(r.step);
    else if (r.page === 'erapor') v = viewErapor(r.step);
    else if (r.page === 'beli') v = viewBeli();
    else if (r.page === 'pesan') v = viewPesan(r.arg);
    else if (r.page === 'bayar') v = viewBayar(r.arg);
    else if (r.page === 'affiliate') v = viewAff();
    else v = viewHome();
    $('#stepper').innerHTML = v.stepper || '';
    $('#stepper').classList.toggle('hidden', !v.stepper);
    $('#main').innerHTML = '<div class="' + (v.wide ? 'container' : 'container') + '">' + v.main + '</div>';
    $('#bar').innerHTML = v.bar ? '<div class="bottombar"><div class="bottombar-in">' + v.bar + '</div></div>' : '';
    $('#main').classList.toggle('has-bar', !!v.bar);
    document.body.classList.toggle('with-bar', !!v.bar);
    document.title = (v.title ? v.title + ' — ' : '') + 'EduGrade';
    if (changed) window.scrollTo(0, 0);
    if (v.after) v.after();
  }

  function renderTop(r) {
    const nav = [['home', '#/', 'Beranda'], ['ubah', '#/ubah/1', 'Ubah Nilai'], ['erapor', '#/erapor/1', 'Isi e-Rapor'], ['beli', '#/beli', 'Cara Beli Kode'], ['affiliate', '#/affiliate', 'Jadi Affiliate']];
    if (r.page === 'pesan' || r.page === 'bayar') r = Object.assign({}, r, { page: 'beli' });
    const codeLbl = S.code ? 'Kode Saya: Sisa kuota ' + S.code.sisa : 'Masukkan Kode';
    $('#top').innerHTML = '<div class="topbar-in">' +
      '<a class="brand" href="#/"><img class="brand-mark" src="assets/icon-192.png" alt="">EduGrade</a>' +
      '<nav class="nav" id="nav" aria-label="Navigasi utama">' + nav.map(n => '<a href="' + n[1] + '" class="' + (r.page === n[0] ? 'active' : '') + '">' + n[2] + '</a>').join('') + '</nav>' +
      '<div class="top-actions">' +
      '<button class="chip-btn" data-act="openCode">' + icon('key', 'ic-sm') + '<span class="tnum">' + esc(codeLbl) + '</span></button>' +
      '<button class="chip-btn ghost help" data-act="help" aria-label="Bantuan">' + icon('help', 'ic-sm') + '<span class="lbl">Bantuan</span></button>' +
      '<button class="icon-btn menu-btn" data-act="menu" aria-label="Menu">' + icon('menu') + '</button>' +
      '</div></div>';
  }

  function stepper(labels, cur, base) {
    return '<div class="stepper">' + labels.map((l, i) => {
      const n = i + 1, cls = n < cur ? 'done' : n === cur ? 'cur' : '';
      const dot = n < cur ? icon('check', 'ic-sm') : n;
      return (i ? '<div class="step-line ' + (n <= cur ? 'done' : '') + '"></div>' : '') +
        '<div class="step ' + cls + '" ' + (n < cur ? 'data-act="goStep" data-href="' + base + n + '"' : '') + '><span class="dot tnum">' + dot + '</span><span class="txt">' + l + '</span></div>';
    }).join('') + '</div>';
  }

  const backBtn = (href, label) => '<button class="btn btn-secondary btn-lg" data-act="nav" data-href="' + href + '">' + icon('arrow-left') + '<span>' + (label || 'Kembali') + '</span></button>';
  const nextBtn = (href, label, disabled, act) => '<button id="nextBtn" class="btn btn-primary btn-lg" ' + (act ? 'data-act="' + act + '"' : 'data-act="nav" data-href="' + href + '"') + (disabled ? ' disabled' : '') + '><span>' + (label || 'Lanjut') + '</span>' + icon('arrow-right') + '</button>';
  const pageHead = (title, sub, right) => '<div class="row-between"><div class="stack-xs"><h1 class="h1">' + title + '</h1>' + (sub ? '<p class="lead">' + sub + '</p>' : '') + '</div>' + (right || '') + '</div>';

  // ============================================
  // BERANDA
  // ============================================
  function viewHome() {
    const codeCard = S.code ? (
      '<section class="card row-between"><div class="row"><div class="icon-tile sm success">' + icon('key') + '</div><div class="stack-xs">' +
      '<div class="row wrap"><span class="h3">Kode Saya</span>' + statusPill(S.code.status) + '<span class="mono b">' + esc(S.code.kode) + '</span></div>' +
      '<div class="muted tnum">Sisa kuota ' + S.code.sisa + ' dari ' + S.code.total + (S.code.berlakuSampai ? ' · Berlaku sampai ' + U.tgl(S.code.berlakuSampai) : (S.code.masaJam ? ' · Berlaku ' + U.masa(S.code.masaJam) + ' sejak unduhan pertama' : '')) + '</div>' +
      '</div></div><button class="link-btn" data-act="openCode">Lihat detail ' + icon('chev-right', 'ic-sm') + '</button></section>'
    ) : (
      '<section class="card row-between"><div class="row"><div class="icon-tile sm">' + icon('key') + '</div><div class="stack-xs"><span class="h3">Sudah punya kode?</span><span class="muted">Kode hanya diperlukan saat mengunduh hasil. Mencoba dan melihat hasil selalu gratis.</span></div></div>' +
      '<div class="row wrap"><button class="btn btn-secondary" data-act="openCode">' + icon('key', 'ic-sm') + 'Masukkan Kode</button><a class="link-btn" href="#/beli">Belum punya kode? Cara pembelian</a></div></section>'
    );
    const main = '<div class="narrow stack" style="max-width:1040px">' +
      '<section class="center stack-sm" style="align-items:center"><h1 class="h1">Mau mengerjakan apa hari ini?</h1><p class="lead" style="max-width:620px">Pilih pekerjaan yang ingin Anda selesaikan. Semua data siswa diproses di komputer Anda sendiri.</p></section>' +
      (S.cfg.perawatan ? '<div class="info warning">' + icon('alert') + '<div>Unduhan sedang ditutup sebentar untuk perawatan. Anda tetap bisa mencoba dan melihat hasil.</div></div>' : '') +
      '<section class="grid-2">' +
      heroCard('sheet', '1. Ubah Nilai', 'Naikkan dan rapikan nilai siswa langsung di file Excel Anda sendiri tanpa merusak rumus.', 'Mulai Ubah Nilai', '#/ubah/1') +
      heroCard('clipboard', '2. Isi e-Rapor (T/R)', 'Isi kolom Tinggi (T) dan Rendah (R) pada template resmi e-Rapor secara otomatis dan rapi.', 'Mulai Isi e-Rapor', '#/erapor/1') +
      '</section>' +
      '<div class="info center">' + icon('info') + '<b>Disarankan: kerjakan 1 dulu, lalu 2. Nilai hasil Ubah Nilai bisa langsung dipakai di Isi e-Rapor.</b></div>' +
      '<section class="row wrap" style="justify-content:center;gap:24px">' +
      ['Nama file tidak berubah', 'Format template tetap', 'Tanpa daftar akun'].map(t => '<span class="row" style="gap:8px">' + icon('check-circle', 't-success') + t + '</span>').join('') +
      '<span class="pill pill-neutral" style="background:#fff;border:1px solid var(--border);color:var(--ink)">' + icon('lock', 'ic-sm t-primary') + 'Data siswa tetap di komputer Anda</span></section>' +
      pendingOrderStrip() + codeCard +
      (S.cfg.affiliate && S.cfg.affiliate.terbuka ? '<section class="card-flat row-between" style="background:linear-gradient(120deg,#E6EEFC,#fff)"><div class="row"><div class="icon-tile sm">' + icon('users') + '</div><div class="stack-xs"><b>Punya banyak kenalan guru?</b><span class="muted small">Jadi affiliate EduGrade dan dapatkan komisi ' + S.cfg.affiliate.persen + '% dari setiap penjualan lewat kode Anda.</span></div></div><a class="btn btn-secondary" href="#/affiliate">Pelajari ' + icon('arrow-right', 'ic-sm') + '</a></section>' : '') +
      '</div>';
    return { main, title: 'Beranda' };
  }
  const heroCard = (ic, title, text, btn, href) => '<article class="card card-hero"><div class="stack-sm"><div class="icon-tile">' + icon(ic, 'ic-lg') + '</div><h2 class="h2">' + title + '</h2><p class="lead">' + text + '</p></div><a class="btn btn-primary btn-lg btn-block" href="' + href + '"><span>' + btn + '</span>' + icon('arrow-right') + '</a></article>';
  function statusPill(st) {
    const m = { BARU: ['pill-primary', 'BARU'], AKTIF: ['pill-success', 'AKTIF'], HABIS: ['pill-neutral', 'HABIS'], KEDALUWARSA: ['pill-warning', 'KEDALUWARSA'], NONAKTIF: ['pill-danger', 'NONAKTIF'] }[st] || ['pill-neutral', st || '-'];
    return '<span class="pill ' + m[0] + '">' + m[1] + '</span>';
  }

  // ============================================
  // FILE HELPERS
  // ============================================
  async function readFile(file) {
    if (file.size > 10 * 1024 * 1024) throw new Error('File lebih dari 10 MB. Hapus lembar yang tidak perlu lalu coba lagi.');
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    const hash = await E.sha256(bytes);
    return { name: file.name, bytes, hash, size: file.size };
  }
  const tick = () => new Promise(r => setTimeout(r, 30));
  const dropZone = (id, title, sub, btn, multiple, small) =>
    '<label class="drop ' + (small ? 'sm' : '') + '" data-drop="' + id + '"><input type="file" class="sr-only" accept=".xlsx,.xlsm" ' + (multiple ? 'multiple' : '') + ' data-ch="file" data-target="' + id + '">' +
    '<div class="icon-circle">' + icon(multiple ? 'files' : 'upload', 'ic-lg') + '</div><div class="stack-xs"><p class="h3">' + title + '</p><p class="muted">' + sub + '</p></div>' +
    '<span class="btn btn-primary ' + (small ? '' : 'btn-lg') + '">' + icon(multiple ? 'plus' : 'folder') + '<span>' + btn + '</span></span></label>';

  async function onFiles(target, files) {
    if (!files || !files.length) return;
    if (target === 'konv') return loadKonvFile(files[0]);
    if (target === 'tpl') return loadTemplates(files);
    if (target === 'erFile') return loadErTeacherFile(files[0]);
  }

  // ============================================
  // UBAH NILAI
  // ============================================
  const UBAH_STEPS = ['Unggah', 'Atur', 'Ringkasan', 'Hasil'];
  function newK() {
    const p = S.prefs;
    return { kkmMode: 'one', kkm: p.kkm, perKkm: {}, perH: false, perH1: {}, perH2: {}, h1: p.h1, h2: p.h2, method: p.method, t: null, n: p.n, dec: p.dec, overrides: {}, tab: null, filter: 'all', search: '', page: 0, bulk: [], done: false };
  }

  async function loadKonvFile(file) {
    const k = S.k = newK();
    U.loading(true, 'Membaca file Excel...');
    await tick();
    try {
      k.file = await readFile(file);
      k.wb = E.readWorkbook(k.file.bytes, k.file.name);
      k.ranked = E.rankSheets(k.wb);
      if (!k.ranked.length) throw new Error('Kami tidak menemukan daftar nama siswa dan kolom nilai di file ini. Pastikan ada kolom berjudul "NAMA" dan kolom nilai berupa angka.');
      setKSheet(k.ranked[0].name);
    } catch (e) {
      k.error = e.message || String(e);
      k.an = null;
    } finally { U.loading(false); }
    render();
  }
  function setKSheet(name) {
    const k = S.k;
    k.sheet = name;
    k.an = E.analyzeSheet(k.wb, name);
    k.selected = k.an.ok ? E.defaultSelected(k.an) : [];
    k.overrides = {}; k.bulk = []; k.tab = k.selected[0] != null ? k.selected[0] : null; k.done = false;
  }
  const kCol = c => S.k.an.columns.find(x => x.c === c);
  const kCols = () => S.k.selected.map(kCol).filter(Boolean);
  const kNames = () => S.k.an.rows.map(r => r.name);
  function kParams(c) {
    const k = S.k;
    return {
      kkm: k.kkmMode === 'per' && k.perKkm[c] != null ? k.perKkm[c] : k.kkm,
      h1: k.perH && k.perH1[c] != null ? k.perH1[c] : k.h1,
      h2: k.perH && k.perH2[c] != null ? k.perH2[c] : k.h2,
      method: k.method, t: k.t, n: k.n, decimals: k.dec
    };
  }
  function kResult(c) {
    const col = kCol(c);
    const p = kParams(c);
    const r = E.convertSeries(col.values, p);
    const ov = S.k.overrides[c] || {};
    const final = r.values.map((v, i) => (ov[i] != null ? ov[i] : v));
    return { orig: col.values, auto: r.values, final, notes: r.notes, p };
  }
  function kValidate() {
    const k = S.k, errs = [];
    if (!k.selected.length) errs.push({ f: 'cols', m: 'Pilih minimal satu kolom nilai.' });
    const inR = v => v != null && v >= 0 && v <= 100;
    kCols().forEach(col => {
      const p = kParams(col.c);
      if (!inR(num(p.kkm))) errs.push({ f: 'kkm', m: 'KKM ' + col.label + ' harus antara 0 sampai 100.' });
      if (!inR(num(p.h1)) || !inR(num(p.h2))) errs.push({ f: 'h', m: 'Nilai terendah dan tertinggi harus antara 0 sampai 100.' });
      else if (+p.h1 >= +p.h2) errs.push({ f: 'h', m: 'Nilai tertinggi harus lebih besar dari nilai terendah' + (k.perH ? ' (' + col.label + ')' : '') + '.' });
    });
    if (k.method === 'kkm' && k.t != null && k.t !== '' && !k.perH && (+k.t < +k.h1 || +k.t > +k.h2)) errs.push({ f: 't', m: 'Nilai untuk siswa tepat di KKM harus di antara nilai terendah dan tertinggi.' });
    if (k.method === 'poin' && !(num(k.n) >= 0 && num(k.n) <= 100)) errs.push({ f: 'n', m: 'Kenaikan poin harus antara 0 sampai 100.' });
    const seen = {};
    return errs.filter(e => (seen[e.m] ? false : (seen[e.m] = true)));
  }

  function viewUbah(step) {
    const st = '<div class="stepper-bar">' + stepper(UBAH_STEPS, step, '#/ubah/') + '</div>';
    if (step === 1) return Object.assign(ubah1(), { stepper: st, title: 'Ubah Nilai' });
    if (step === 2) return Object.assign(ubah2(), { stepper: st, title: 'Atur Nilai' });
    if (step === 3) return Object.assign(ubah3(), { stepper: st, title: 'Ringkasan Nilai Asli' });
    return Object.assign(ubah4(), { stepper: st, title: 'Hasil Ubah Nilai' });
  }

  // ---------- Langkah 1 ----------
  function ubah1() {
    const k = S.k;
    let body;
    if (k && k.file) {
      const fileCard = '<div class="card-flat row" style="background:var(--page)"><div class="icon-tile sm success">' + icon('sheet') + '</div><div class="grow stack-xs"><b style="word-break:break-all">' + esc(k.file.name) + '</b><span class="muted small">' + fmt(k.file.size / 1024) + ' KB</span></div><label class="btn btn-outline btn-sm">' + icon('refresh', 'ic-sm') + 'Ganti file<input type="file" class="sr-only" accept=".xlsx,.xlsm" data-ch="file" data-target="konv"></label></div>';
      if (k.error) {
        body = '<section class="card stack">' + fileCard + '<div class="info danger">' + icon('alert-circle') + '<div class="stack-xs"><b>File ini tidak bisa dipakai</b><span>' + esc(k.error) + '</span></div></div><div class="row wrap"><label class="btn btn-primary">' + icon('refresh', 'ic-sm') + 'Coba file lain<input type="file" class="sr-only" accept=".xlsx,.xlsm" data-ch="file" data-target="konv"></label><a class="btn btn-outline" target="_blank" rel="noopener" href="' + U.waLink(S.cfg.wa, 'Halo Admin EduGrade, file nilai saya tidak bisa dibaca.') + '">' + icon('chat', 'ic-sm') + 'Tanya admin</a></div></section>';
      } else {
        const an = k.an;
        body = '<section class="card stack"><div class="row-between"><div class="row"><span class="pill pill-success">' + icon('check-circle', 'ic-sm') + 'Terbaca dengan baik</span></div></div>' + fileCard +
          '<div class="grid-3">' + [[k.wb.SheetNames.length, 'lembar'], [an.rows.length, 'siswa'], [an.columns.filter(c => !c.disabled).length, 'kolom nilai']].map(x => '<div class="stat"><span class="v tnum">' + x[0] + '</span><span class="muted">' + x[1] + '</span></div>').join('') + '</div>' +
          (an.uncachedCount ? '<div class="info warning">' + icon('alert') + '<div><b>Rumus di file ini belum dihitung.</b> Buka file di Excel, tekan Simpan, lalu unggah lagi. Bila tidak, beberapa nilai akan terbaca kosong.</div></div>' : '') +
          '</section>';
      }
    } else {
      body = dropZone('konv', 'Tarik file Excel ke sini atau klik untuk memilih', 'Format .xlsx. File Anda tidak dikirim ke mana pun.', 'Pilih File Excel');
    }
    const main = '<div class="narrow stack">' + pageHead('Unggah File Excel Nilai', 'Pilih file daftar nilai siswa yang ingin Anda ubah.') + body +
      '<div class="info">' + icon('lock') + '<div>Semua isi file dibaca langsung di komputer Anda. Format dan rumus lain tetap aman.</div></div></div>';
    const ok = k && k.an && k.an.ok;
    const bar = backBtn('#/') + '<p class="hint">' + (ok ? 'Berikutnya: periksa kolom nilai dan atur KKM.' : 'Pilih file Excel terlebih dahulu untuk melanjutkan.') + '</p>' + nextBtn('#/ubah/2', 'Lanjut', !ok);
    return { main, bar };
  }

  // ---------- Langkah 2 ----------
  const miniGraph = m => ({
    linear: '<svg class="mini" viewBox="0 0 100 44"><line x1="8" y1="36" x2="92" y2="8" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="8" cy="36" r="3.5" fill="currentColor"/><circle cx="92" cy="8" r="3.5" fill="currentColor"/></svg>',
    kkm: '<svg class="mini" viewBox="0 0 100 44"><polyline points="8,38 46,18 92,8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="46" cy="18" r="4" fill="#1D5BD6"/></svg>',
    poin: '<svg class="mini" viewBox="0 0 100 44"><line x1="8" y1="38" x2="92" y2="18" stroke="#C9D3E3" stroke-width="2" stroke-dasharray="4 3"/><line x1="8" y1="26" x2="92" y2="6" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>'
  }[m]);

  function ubah2() {
    const k = S.k, an = k.an;
    const nameHdr = (an.matrix[an.headerRow] || [])[an.nameCol];
    const errs = kValidate();
    const cardA = '<section class="card stack-sm"><h2 class="h3">A. Pilih lembar dan kolom nama</h2><div class="grid-2" style="gap:16px">' +
      '<div class="field"><div class="field-label">Lembar nilai <span class="pill pill-primary">Terdeteksi otomatis</span></div><select class="select" data-ch="kSheet">' +
      k.ranked.map(s => '<option value="' + esc(s.name) + '" ' + (s.name === k.sheet ? 'selected' : '') + '>' + esc(s.name) + ' (' + s.students + ' siswa)</option>').join('') + '</select></div>' +
      '<div class="field"><div class="field-label">Kolom nama siswa <span class="pill pill-primary">Terdeteksi otomatis</span></div><div class="input" style="display:flex;align-items:center;background:var(--page)">Kolom ' + E.colLetter(an.nameCol) + ' — ' + esc(nameHdr || 'Nama') + '</div></div>' +
      '</div><p class="muted small">Daftar siswa: ' + an.rows.length + ' nama, mulai baris ' + (an.rows[0].r + 1) + '.</p></section>';
    const cardB = '<section class="card stack-sm"><div class="row-between"><h2 class="h3">B. Kolom nilai yang diubah</h2><span class="muted small">' + k.selected.length + ' dipilih</span></div>' +
      '<p class="muted small">Centang kolom yang nilainya ingin diubah. Kolom yang dipilih akan menjadi angka tetap (rumusnya diganti angka hasil).</p><div class="list">' +
      an.columns.map(c => {
        const on = k.selected.includes(c.c);
        if (c.disabled) return '<div class="list-item dis"><span class="row"><input type="checkbox" class="check" disabled><span>' + esc(c.label) + '</span></span><span class="small">' + esc(c.note) + '</span></div>';
        return '<label class="list-item ' + (on ? 'sel' : '') + '"><span class="row"><input type="checkbox" class="check" data-ch="kCol" data-c="' + c.c + '" ' + (on ? 'checked' : '') + '><span class="b">' + esc(c.label) + '</span><span class="muted small">Kolom ' + c.letter + '</span></span><span class="muted tnum small">' + c.samples.map(fmt).join(', ') + '</span></label>';
      }).join('') + '</div></section>';
    const cardC = '<section class="card stack-sm" id="cardC">' + kkmCardInner() + '</section>';
    const cardD = '<section class="card stack-sm" id="cardD">' + hCardInner(errs) + '</section>';
    const cardE = '<section class="card stack-sm"><h2 class="h3">E. Cara mengubah nilai</h2><div class="grid-3" style="gap:16px">' +
      methodCard('linear', 'Merata', 'Semua nilai digeser seimbang dari nilai terendah ke tertinggi baru. Urutan peringkat tetap.') +
      methodCard('kkm', 'Jaga KKM', 'Nilai di bawah KKM naik lebih banyak, nilai tinggi naik sedikit.') +
      methodCard('poin', 'Naik sekian poin', 'Semua nilai naik sama rata, dibatasi nilai tertinggi.') + '</div>' +
      (k.method === 'kkm' ? '<div class="row wrap"><span>Nilai untuk siswa yang tepat di KKM:</span><input class="input num-sm" type="number" min="0" max="100" data-in="kT" value="' + esc(k.t != null ? k.t : E.defaultT(+k.kkm, +k.h1, +k.h2)) + '"><span class="muted small">Bawaan otomatis. Harus di antara nilai terendah dan tertinggi.</span></div>' : '') +
      (k.method === 'poin' ? '<div class="row wrap"><span>Semua nilai naik</span><input class="input num-sm" type="number" min="0" max="100" data-in="kN" value="' + esc(k.n) + '"><span>poin</span></div>' : '') +
      '<details class="adv"><summary>Pengaturan lanjutan</summary><div class="row wrap mt-sm"><span>Pembulatan hasil:</span><select class="select sm" style="width:auto" data-ch="kDec"><option value="0" ' + (k.dec == 0 ? 'selected' : '') + '>Bilangan bulat (contoh 85)</option><option value="1" ' + (k.dec == 1 ? 'selected' : '') + '>1 angka desimal (contoh 85,3)</option></select></div></details></section>';
    const main = '<div class="split"><div class="stack">' + pageHead('Atur Nilai yang Diinginkan', 'Periksa pilihan di bawah ini. Sebagian sudah kami isi otomatis dari file Anda.') + cardA + cardB + cardC + cardD + cardE + '</div>' +
      '<aside class="sticky-side"><div class="card p0" id="preview">' + previewInner() + '</div></aside></div>';
    const bar = backBtn('#/ubah/1') + '<p class="hint" id="hint2">' + (errs.length ? esc(errs[0].m) : 'Berikutnya: lihat ringkasan nilai asli siswa sebelum diubah.') + '</p>' + nextBtn('#/ubah/3', 'Lanjut', errs.length > 0);
    return { main, bar };
  }
  const methodCard = (m, title, text) => '<div class="choice ' + (S.k.method === m ? 'on' : '') + '" role="radio" tabindex="0" aria-checked="' + (S.k.method === m) + '" data-act="kMethod" data-m="' + m + '"><span class="tick">' + icon('check', 'ic-sm') + '</span><span class="' + (S.k.method === m ? 't-primary' : 'muted') + '">' + miniGraph(m) + '</span><h3 class="h3">' + title + '</h3><p class="small ' + (S.k.method === m ? '' : 'muted') + '">' + text + '</p></div>';

  function kkmCardInner() {
    const k = S.k;
    let h = '<h2 class="h3">C. KKM (batas tuntas)</h2><div class="seg"><button data-act="kkmMode" data-m="one" class="' + (k.kkmMode === 'one' ? 'on' : '') + '">Satu KKM untuk semua mapel</button><button data-act="kkmMode" data-m="per" class="' + (k.kkmMode === 'per' ? 'on' : '') + '">KKM berbeda per mapel</button></div>';
    if (k.kkmMode === 'one') {
      h += '<div class="row wrap"><span class="label">KKM</span><div class="numstep"><button data-act="kkmStep" data-d="-1" aria-label="Kurangi KKM">' + icon('minus') + '</button><input type="number" min="0" max="100" data-in="kKkm" value="' + esc(k.kkm) + '" aria-label="KKM"><button data-act="kkmStep" data-d="1" aria-label="Tambah KKM">' + icon('plus') + '</button></div><span class="muted small">Siswa dengan nilai di bawah angka ini dianggap belum tuntas.</span></div>';
      return h;
    }
    const cols = kCols();
    if (!cols.length) return h + '<p class="muted">Centang kolom nilai di kartu B terlebih dahulu.</p>';
    const bulk = k.bulk.filter(c => k.selected.includes(c));
    h += (bulk.length ? '<div class="bulkbar"><b class="tnum">' + bulk.length + ' mapel dipilih</b><div class="row wrap"><input class="input num-sm" type="number" min="0" max="100" id="bulkVal" value="' + esc(k.kkm) + '" aria-label="KKM untuk yang dipilih"><button class="btn btn-primary btn-sm" data-act="bulkApply">Terapkan KKM ke yang dipilih</button><button class="link-btn" data-act="bulkClear">Batal pilih</button></div></div>' : '') +
      '<div class="list" style="overflow-x:auto"><table class="tbl compact"><thead><tr><th style="width:40px"><input type="checkbox" class="check" aria-label="Pilih semua" data-ch="bulkAll" ' + (bulk.length === cols.length ? 'checked' : '') + '></th><th>Mapel / kolom</th><th>KKM</th><th class="r">Nilai terendah asli</th><th>Di bawah KKM</th></tr></thead><tbody>' +
      cols.map(c => {
        const kk = k.perKkm[c.c] != null ? k.perKkm[c.c] : k.kkm;
        const st = E.stats(c.values, kNames(), +kk);
        return '<tr class="' + (bulk.includes(c.c) ? 'sel' : '') + '"><td><input type="checkbox" class="check" data-ch="bulkOne" data-c="' + c.c + '" ' + (bulk.includes(c.c) ? 'checked' : '') + '></td><td class="b">' + esc(c.label) + '</td><td><input class="input num-sm" type="number" min="0" max="100" data-in="perKkm" data-c="' + c.c + '" value="' + esc(kk) + '"></td><td class="r tnum muted">' + fmt(st.min ? st.min.v : null) + '</td><td id="below-' + c.c + '">' + belowPill(st.below.length) + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<div class="row" style="justify-content:flex-end"><span class="muted">Samakan semua ke</span><input class="input num-sm" type="number" min="0" max="100" id="allVal" value="' + esc(k.kkm) + '"><button class="btn btn-tint btn-sm" data-act="allApply">Terapkan</button></div>';
    return h;
  }
  const belowPill = n => '<span class="pill ' + (n ? 'pill-warning' : 'pill-success') + ' tnum">' + n + ' siswa</span>';

  function hCardInner(errs) {
    const k = S.k;
    errs = errs || kValidate();
    const hErr = errs.find(e => e.f === 'h' || e.f === 't' || e.f === 'n' || e.f === 'kkm' || e.f === 'cols');
    let h = '<div class="row-between"><h2 class="h3">D. Nilai yang diinginkan</h2>' + (kCols().length > 1 ? '<button class="link-btn" data-act="perH">' + (k.perH ? 'Samakan untuk semua mapel' : 'Atur berbeda per mapel') + '</button>' : '') + '</div>';
    if (!k.perH) {
      h += '<div class="grid-2" style="gap:16px"><label class="field"><span class="field-label">Nilai terendah</span><input class="input big ' + (hErr && hErr.f === 'h' ? 'err' : '') + '" type="number" min="0" max="100" data-in="kH1" value="' + esc(k.h1) + '"></label>' +
        '<label class="field"><span class="field-label">Nilai tertinggi</span><input class="input big ' + (hErr && hErr.f === 'h' ? 'err' : '') + '" type="number" min="0" max="100" data-in="kH2" value="' + esc(k.h2) + '"></label></div>';
    } else {
      h += '<div class="list"><table class="tbl compact"><thead><tr><th>Mapel / kolom</th><th>Terendah</th><th>Tertinggi</th></tr></thead><tbody>' +
        kCols().map(c => '<tr><td class="b">' + esc(c.label) + '</td><td><input class="input num-sm" type="number" data-in="perH1" data-c="' + c.c + '" value="' + esc(k.perH1[c.c] != null ? k.perH1[c.c] : k.h1) + '"></td><td><input class="input num-sm" type="number" data-in="perH2" data-c="' + c.c + '" value="' + esc(k.perH2[c.c] != null ? k.perH2[c.c] : k.h2) + '"></td></tr>').join('') + '</tbody></table></div>';
    }
    h += '<div id="valD">' + (errs.length ? '<div class="err-msg" role="alert">' + icon('alert-circle') + esc(errs[0].m) + '</div>' : '<div class="ok-msg">' + icon('check-circle') + 'Sudah benar</div>') + '</div>';
    return h;
  }

  function previewInner() {
    const k = S.k, cols = kCols();
    if (!cols.length) return '<div class="preview-head"><span class="h3 row">' + icon('eye') + 'Pratinjau langsung</span></div><div class="empty">Centang minimal satu kolom nilai.</div>';
    if (!k.selected.includes(k.tab)) k.tab = cols[0].c;
    const errs = kValidate();
    const col = kCol(k.tab);
    const head = '<div class="preview-head"><span class="h3 row">' + icon('eye') + 'Pratinjau langsung</span>' +
      (cols.length > 1 ? '<select class="select sm" style="width:auto;max-width:200px" data-ch="kTab">' + cols.map(c => '<option value="' + c.c + '" ' + (c.c === k.tab ? 'selected' : '') + '>' + esc(c.label) + '</option>').join('') + '</select>' : '<span class="small">' + esc(col.label) + '</span>') + '</div>';
    if (errs.length) return head + '<div class="card-pad"><div class="info warning">' + icon('alert') + '<div>' + esc(errs[0].m) + '</div></div></div>';
    const r = kResult(k.tab);
    const names = kNames();
    const s0 = E.stats(r.orig, names, +r.p.kkm), s1 = E.stats(r.final, names, +r.p.kkm);
    const idx = r.orig.map((v, i) => ({ v, i })).filter(x => E.isNum(x.v)).sort((a, b) => a.v - b.v);
    const pick = idx.length <= 5 ? idx : [idx[0], idx[1], idx[Math.floor(idx.length / 2)], idx[idx.length - 2], idx[idx.length - 1]];
    return head + '<div class="card-pad stack-sm"><div class="grid-2" style="gap:12px">' +
      '<div class="stat" style="box-shadow:none;background:var(--page)"><span class="small muted">Rata-rata nilai</span><div class="ba"><span class="strike tnum">' + fmt1(s0.avg) + '</span>' + icon('arrow-right', 'ic-sm t-primary') + '<span class="v md">' + fmt1(s1.avg) + '</span></div></div>' +
      '<div class="stat ' + (s1.below.length ? 'warning' : 'success') + '"><span class="small">Di bawah KKM</span><div class="ba"><span class="tnum" style="text-decoration:line-through">' + s0.below.length + '</span>' + icon('arrow-right', 'ic-sm') + '<span class="v md">' + s1.below.length + ' siswa</span></div></div></div>' +
      '<div class="list"><table class="tbl compact"><thead><tr><th>Nama</th><th class="r">Asli</th><th class="r">Baru</th><th class="r">Selisih</th></tr></thead><tbody>' +
      pick.map(x => {
        const nv = r.final[x.i], under = x.v < +r.p.kkm, d = nv - x.v;
        return '<tr><td><div class="b">' + esc(names[x.i]) + '</div>' + (under ? '<span class="pill pill-danger" style="margin-top:2px">Remedial</span>' : '') + '</td><td class="r tnum ' + (under ? 't-danger b' : 'muted') + '">' + fmt(x.v) + '</td><td class="r tnum b">' + fmt(nv) + '</td><td class="r tnum small ' + (d >= 0 ? 't-success' : 'muted') + '">' + (d >= 0 ? '+' : '') + fmt(d) + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      (r.notes.length ? '<p class="small muted">' + icon('info', 'ic-sm') + ' ' + esc(r.notes[0]) + '</p>' : '') +
      '<p class="small muted">' + icon('shield', 'ic-sm') + ' Rumus di kolom lain tetap utuh. Hanya kolom yang dicentang yang diganti angka.</p></div>';
  }

  // Perbarui bagian yang bergantung pada isian tanpa merender ulang input
  function liveUbah2() {
    const errs = kValidate();
    const pv = $('#preview'); if (pv) pv.innerHTML = previewInner();
    const vd = $('#valD'); if (vd) vd.innerHTML = errs.length ? '<div class="err-msg" role="alert">' + icon('alert-circle') + esc(errs[0].m) + '</div>' : '<div class="ok-msg">' + icon('check-circle') + 'Sudah benar</div>';
    const nb = $('#nextBtn'); if (nb) nb.disabled = errs.length > 0;
    const h2 = $('#hint2'); if (h2) h2.textContent = errs.length ? errs[0].m : 'Berikutnya: lihat ringkasan nilai asli siswa sebelum diubah.';
    document.querySelectorAll('[data-in="kH1"],[data-in="kH2"]').forEach(el => el.classList.toggle('err', errs.some(e => e.f === 'h')));
    if (S.k.kkmMode === 'per') kCols().forEach(c => {
      const el = $('#below-' + c.c);
      if (el) el.innerHTML = belowPill(E.stats(c.values, kNames(), +(S.k.perKkm[c.c] != null ? S.k.perKkm[c.c] : S.k.kkm)).below.length);
    });
    S.prefs.kkm = S.k.kkm; S.prefs.h1 = S.k.h1; S.prefs.h2 = S.k.h2; S.prefs.method = S.k.method; S.prefs.n = S.k.n; S.prefs.dec = S.k.dec;
    savePrefs();
  }

  // ---------- Grafik sebaran ----------
  function binChart(values, kkm) {
    const b = E.bins(values);
    const max = Math.max(1, ...b.map(x => x.count));
    let pos = null;
    if (kkm != null) {
      const i = b.findIndex(x => kkm >= x.lo && kkm < x.hi);
      if (i >= 0) { const lo = isFinite(b[i].lo) ? b[i].lo : b[i].hi - 10, hi = isFinite(b[i].hi) ? b[i].hi : lo + 11; pos = ((i + (kkm - lo) / (hi - lo)) / b.length) * 100; }
    }
    return '<div style="position:relative"><div class="chart" style="grid-template-columns:repeat(' + b.length + ',1fr)">' +
      (pos != null ? '<div class="kkm-line" style="left:' + pos + '%"><span>KKM ' + fmt(kkm) + '</span></div>' : '') +
      b.map(x => '<div class="col"><div class="bars"><div class="bar ' + (kkm != null && x.hi <= kkm ? 'under' : '') + '" style="height:' + (x.count / max * 100) + '%"><span>' + x.count + '</span></div></div></div>').join('') +
      '</div><div class="chart-x" style="grid-template-columns:repeat(' + b.length + ',1fr)">' + b.map(x => '<span>' + x.label + '</span>').join('') + '</div></div>';
  }
  function groupedChart(before, after) {
    const b0 = E.bins(before), b1 = E.bins(after);
    const max = Math.max(1, ...b0.map(x => x.count), ...b1.map(x => x.count));
    return '<div class="chart" style="grid-template-columns:repeat(6,1fr)">' + b0.map((x, i) =>
      '<div class="col"><div class="bars"><div class="bar before" style="height:' + (x.count / max * 100) + '%"><span>' + x.count + '</span></div><div class="bar after" style="height:' + (b1[i].count / max * 100) + '%"><span style="color:var(--primary)">' + b1[i].count + '</span></div></div></div>').join('') +
      '</div><div class="chart-x" style="grid-template-columns:repeat(6,1fr)">' + b0.map(x => '<span>' + x.label + '</span>').join('') + '</div>';
  }
  const colTabs = (act) => {
    const k = S.k, cols = kCols();
    if (!k.selected.includes(k.tab)) k.tab = cols[0].c;
    return cols.length > 1 ? '<div class="tabs">' + cols.map(c => '<button class="tab ' + (c.c === k.tab ? 'on' : '') + '" data-act="' + act + '" data-c="' + c.c + '">' + esc(c.label) + '</button>').join('') + '</div>' : '';
  };

  // ---------- Langkah 3 ----------
  function ubah3() {
    const k = S.k;
    colTabs('kTab');
    const col = kCol(k.tab), p = kParams(k.tab), names = kNames();
    const st = E.stats(col.values, names, +p.kkm);
    const q = k.search.trim().toLowerCase();
    const all = col.values.map((v, i) => ({ v, i, name: names[i] })).filter(x => !q || x.name.toLowerCase().includes(q));
    const per = 50, pages = Math.max(1, Math.ceil(all.length / per));
    k.page = Math.min(k.page, pages - 1);
    const pageRows = all.slice(k.page * per, k.page * per + per);
    const main = '<div class="stack">' + pageHead('Ringkasan Nilai Asli', 'Gambaran nilai siswa dari file Anda sebelum diubah.', '<div class="info" style="padding:10px 16px">' + icon('info') + '<b>Ini nilai asli. Belum ada yang diubah.</b></div>') +
      colTabs('kTab3') +
      '<section class="grid-4 keep2">' +
      '<div class="stat"><span class="muted">Rata-rata</span><span class="v">' + fmt1(st.avg) + '</span><span class="small muted">Dari ' + st.n + ' siswa</span></div>' +
      '<div class="stat"><span class="muted">Tertinggi</span><span class="v">' + fmt(st.max && st.max.v) + '</span><span class="small muted">' + esc(st.max ? st.max.name : '') + '</span></div>' +
      '<div class="stat"><span class="muted">Terendah</span><span class="v">' + fmt(st.min && st.min.v) + '</span><span class="small muted">' + esc(st.min ? st.min.name : '') + '</span></div>' +
      '<div class="stat ' + (st.below.length ? 'warning' : 'success') + '"><span>Di bawah KKM (' + fmt(p.kkm) + ')</span><span class="v">' + st.below.length + ' siswa</span><span class="small tnum">' + fmt1(st.belowPct || 0) + '% dari kelas</span></div></section>' +
      '<section class="card stack-sm"><div class="row-between"><h2 class="h3">Sebaran nilai asli</h2><span class="small muted">Garis putus-putus = batas KKM ' + fmt(p.kkm) + '</span></div>' + binChart(col.values, +p.kkm) + '</section>' +
      '<section class="grid-2"><div class="card stack-sm"><h2 class="h3">10 nilai tertinggi</h2><div class="stack-xs">' +
      st.top.map((x, i) => '<div class="row-between" style="padding:8px 10px;border-radius:10px;' + (i === 0 ? 'background:var(--primary-tint)' : '') + '"><span class="row"><span class="rank ' + (i === 0 ? 'first' : '') + ' tnum">' + (i + 1) + '</span><span class="' + (i === 0 ? 'b' : '') + '">' + esc(x.name) + '</span></span><span class="b tnum ' + (i === 0 ? 't-primary' : '') + '">' + fmt(x.v) + '</span></div>').join('') + '</div></div>' +
      '<div class="card stack-sm"><div class="row-between"><h2 class="h3">Siswa di bawah KKM</h2><span class="pill ' + (st.below.length ? 'pill-warning' : 'pill-success') + '">' + st.below.length + ' siswa</span></div>' +
      (st.below.length ? '<div class="stack-xs" style="max-height:440px;overflow:auto">' + st.below.map(x => '<div class="row-between" style="padding:8px 10px"><span>' + esc(x.name) + '</span><span class="row tnum"><b>' + fmt(x.v) + '</b><span class="pill pill-danger">' + fmt(x.v - p.kkm) + '</span></span></div>').join('') + '</div>' : '<div class="empty">' + icon('check-circle', 'ic-lg t-success') + 'Semua siswa sudah tuntas.</div>') + '</div></section>' +
      '<section class="card p0"><div class="card-pad row-between" style="border-bottom:1px solid var(--border)"><h2 class="h3">Daftar seluruh siswa (' + col.values.length + ')</h2><div class="search">' + icon('search') + '<input class="input" type="search" placeholder="Cari nama siswa..." data-in="kSearch" value="' + esc(k.search) + '"></div></div>' +
      '<div class="tbl-wrap" id="tbl3"><table class="tbl"><thead><tr><th style="width:64px">No</th><th>Nama siswa</th><th class="r">Nilai asli</th><th>Status</th></tr></thead><tbody>' +
      (pageRows.length ? pageRows.map(x => '<tr><td class="muted tnum">' + (x.i + 1) + '</td><td class="b">' + esc(x.name) + '</td><td class="r tnum b ' + (E.isNum(x.v) && x.v < p.kkm ? 't-danger' : '') + '">' + fmt(x.v) + '</td><td>' + (!E.isNum(x.v) ? '<span class="pill pill-neutral">Kosong</span>' : x.v < p.kkm ? '<span class="pill pill-danger">Belum tuntas</span>' : '<span class="pill pill-success">Tuntas</span>') + '</td></tr>').join('') : '<tr><td colspan="4"><div class="empty">Tidak ada nama yang cocok.</div></td></tr>') +
      '</tbody></table></div>' + pager(k.page, pages, all.length, per, 'kPage') + '</section></div>';
    const bar = backBtn('#/ubah/2') + '<p class="hint">Berikutnya: lihat hasil nilai baru dan periksa setiap siswa.</p>' + nextBtn('#/ubah/4', 'Ubah Nilai Sekarang');
    return { main, bar };
  }
  const pager = (page, pages, total, per, act) => pages <= 1 ? '<div class="tbl-foot"><span class="tnum">' + total + ' siswa</span></div>' :
    '<div class="tbl-foot"><span class="tnum">Menampilkan ' + (page * per + 1) + '–' + Math.min(total, page * per + per) + ' dari ' + total + '</span><div class="row"><button class="btn btn-outline btn-sm" data-act="' + act + '" data-p="' + (page - 1) + '" ' + (page === 0 ? 'disabled' : '') + '>Sebelumnya</button><span class="tnum">' + (page + 1) + ' / ' + pages + '</span><button class="btn btn-outline btn-sm" data-act="' + act + '" data-p="' + (page + 1) + '" ' + (page >= pages - 1 ? 'disabled' : '') + '>Berikutnya</button></div></div>';

  // ---------- Langkah 4 ----------
  function ubah4() {
    const k = S.k;
    if (k.done) return ubahDone();
    colTabs('kTab');
    const r = kResult(k.tab), names = kNames();
    const s0 = E.stats(r.orig, names, +r.p.kkm), s1 = E.stats(r.final, names, +r.p.kkm);
    const ov = k.overrides[k.tab] || {};
    let rows = r.orig.map((v, i) => ({ i, v, nv: r.final[i], name: names[i], mod: ov[i] != null })).filter(x => E.isNum(x.v));
    const nBig = rows.filter(x => x.nv - x.v >= 15).length, nMod = rows.filter(x => x.mod).length;
    if (k.filter === 'big') rows = rows.filter(x => x.nv - x.v >= 15);
    if (k.filter === 'mod') rows = rows.filter(x => x.mod);
    const q = k.search.trim().toLowerCase();
    if (q) rows = rows.filter(x => x.name.toLowerCase().includes(q));
    const per = 50, pages = Math.max(1, Math.ceil(rows.length / per));
    k.page = Math.min(k.page, pages - 1);
    const stat = (lbl, a, b, extra, cls) => '<div class="stat ' + (cls || '') + '"><span class="' + (cls ? '' : 'muted') + '">' + lbl + '</span><div class="ba"><span class="strike tnum" style="font-size:18px' + (cls ? ';color:inherit' : '') + '">' + a + '</span>' + icon('arrow-right', 'ic-sm t-primary') + '<span class="v">' + b + '</span></div>' + (extra ? '<span class="small">' + extra + '</span>' : '') + '</div>';
    const quotaTxt = S.code ? 'Memakai 1 kuota dari sisa ' + S.code.sisa : 'Memakai 1 kuota';
    const main = '<div class="stack">' + pageHead('Hasil Perubahan Nilai', 'Periksa nilai baru. Anda bisa mengubah angka tertentu langsung di tabel sebelum mengunduh.') +
      colTabs('kTab4') +
      '<section class="grid-4 keep2">' + stat('Rata-rata', fmt1(s0.avg), fmt1(s1.avg)) + stat('Tertinggi', fmt(s0.max && s0.max.v), fmt(s1.max && s1.max.v)) + stat('Terendah', fmt(s0.min && s0.min.v), fmt(s1.min && s1.min.v)) +
      stat('Di bawah KKM', s0.below.length, s1.below.length, s1.below.length ? '' : 'Semua tuntas', s1.below.length ? 'warning' : 'success') + '</section>' +
      (r.notes.length ? '<div class="info">' + icon('info') + '<div>' + r.notes.map(esc).join(' ') + '</div></div>' : '') +
      '<section class="card stack-sm"><div class="row-between"><h2 class="h3">Sebelum vs sesudah</h2><div class="legend"><span><i style="background:var(--chart-before)"></i>Nilai asli</span><span><i style="background:var(--primary)"></i>Nilai baru</span></div></div>' + groupedChart(r.orig, r.final) + '</section>' +
      '<section class="card p0"><div class="card-pad row-between" style="border-bottom:1px solid var(--border)"><div class="chips">' +
      [['all', 'Semua (' + r.orig.filter(E.isNum).length + ')'], ['big', 'Naik banyak (' + nBig + ')'], ['mod', 'Diedit manual (' + nMod + ')']].map(f => '<button class="chip ' + (k.filter === f[0] ? 'on' : '') + '" data-act="kFilter" data-f="' + f[0] + '">' + f[1] + '</button>').join('') +
      '</div><div class="row wrap"><div class="search">' + icon('search') + '<input class="input" type="search" placeholder="Cari nama..." data-in="kSearch4" value="' + esc(k.search) + '"></div>' + (nMod ? '<button class="link-btn" data-act="kReset">' + icon('refresh', 'ic-sm') + ' Kembalikan otomatis</button>' : '') + '</div></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th style="width:56px">No</th><th>Nama</th><th class="r">Nilai asli</th><th>Nilai baru</th><th>Selisih</th><th>Status</th></tr></thead><tbody>' +
      (rows.length ? rows.slice(k.page * per, k.page * per + per).map(x => {
        const d = x.nv - x.v;
        return '<tr class="' + (x.mod ? '' : '') + '"><td class="muted tnum">' + (x.i + 1) + '</td><td class="b">' + esc(x.name) + '</td><td class="r muted tnum">' + fmt(x.v) + '</td>' +
          '<td><span class="row" style="gap:8px"><span class="edit-cell ' + (x.mod ? 'mod' : '') + '"><input type="number" min="0" max="100" step="' + (k.dec ? '0.1' : '1') + '" data-ch="kEdit" data-i="' + x.i + '" value="' + esc(x.nv) + '" aria-label="Nilai baru ' + esc(x.name) + '">' + icon('pencil', 'ic-sm ' + (x.mod ? 't-primary' : 'muted')) + '</span>' + (x.mod ? '<span class="pill pill-primary">Diubah manual</span>' : '') + '</span></td>' +
          '<td><span class="pill ' + (d >= 0 ? 'pill-success' : 'pill-neutral') + ' tnum">' + (d >= 0 ? '+' : '') + fmt(d) + '</span></td>' +
          '<td>' + (x.nv < r.p.kkm ? '<span class="pill pill-danger">Belum tuntas</span>' : '<span class="pill pill-success">Tuntas</span>') + '</td></tr>';
      }).join('') : '<tr><td colspan="6"><div class="empty">Tidak ada baris.</div></td></tr>') +
      '</tbody></table></div>' + pager(k.page, pages, rows.length, per, 'kPage') + '</section>' +
      '<p class="small muted">' + icon('info', 'ic-sm') + ' Nama file hasil: <b>' + esc(konvOutName()) + '</b>. Kolom yang diubah akan berisi angka tetap; lembar, format, dan rumus lain tidak berubah.</p></div>';
    const bar = '<div class="row">' + backBtn('#/ubah/3') + '<span class="muted tnum b" style="font-size:15px">' + quotaTxt + '</span></div>' +
      '<button class="btn btn-primary btn-xl" data-act="dlKonv">' + icon('download') + '<span>Unduh Excel</span></button>';
    return { main, bar };
  }
  const konvOutName = () => { const n = S.k.file.name; const m = n.match(/^(.*?)(\.xlsx|\.xlsm)$/i); return (m ? m[1] : n) + '_EduGrade' + (m ? m[2].toLowerCase() : '.xlsx'); };

  function ubahDone() {
    const main = '<div class="narrow stack"><section class="card stack" style="align-items:center;text-align:center;padding:40px">' +
      '<div class="icon-tile success" style="width:72px;height:72px;border-radius:50%">' + icon('check', 'ic-lg') + '</div><h1 class="h2">File sudah terunduh</h1>' +
      '<p class="lead">Cek folder <b>Unduhan (Downloads)</b> di komputer Anda.</p><div class="card-flat row" style="background:var(--page)"><span class="icon-tile sm success">' + icon('sheet') + '</span><b style="word-break:break-all">' + esc(konvOutName()) + '</b></div>' +
      '<div class="row wrap" style="justify-content:center"><button class="btn btn-secondary btn-lg" data-act="dlKonv">' + icon('download') + 'Unduh lagi (gratis ' + S.cfg.unduhUlangJam + ' jam)</button><a class="btn btn-primary btn-lg" href="#/erapor/1">Lanjut ke Isi e-Rapor ' + icon('arrow-right') + '</a></div>' +
      '<button class="link-btn" data-act="kEditAgain">Ubah pengaturan lagi</button></section>' +
      '<div class="info">' + icon('sparkles') + '<div>Nilai baru ini otomatis bisa dipakai sebagai <b>Nilai Rapor</b> di fitur Isi e-Rapor tanpa perlu mengunggah ulang.</div></div></div>';
    return { main };
  }

  async function downloadKonversi() {
    const k = S.k;
    if (kValidate().length) return U.toast('Periksa lagi pengaturan nilai.', 'error');
    let out;
    U.loading(true, 'Menyiapkan file Excel...');
    await tick();
    try {
      const targets = kCols().map(c => {
        const r = kResult(c.c);
        return { sheet: k.sheet, col: c.c, rows: k.an.rows.map((row, i) => ({ r: row.r, value: r.final[i] })) };
      });
      out = await E.buildKonversi(k.file.bytes, targets);
    } catch (e) {
      U.loading(false);
      return U.toast('Gagal menyiapkan file: ' + (e.message || e), 'error');
    }
    U.loading(false);
    const ok = await claimFlow('KONVERSI', [{ sidik: k.file.hash, nama: konvOutName(), siswa: k.an.rows.length }]);
    if (!ok) return;
    U.saveFile(out, konvOutName(), k.file.name.toLowerCase().endsWith('.xlsm') ? 'application/vnd.ms-excel.sheet.macroEnabled.12' : undefined);
    S.hist.push({ nama: konvOutName(), waktu: new Date().toISOString(), gratis: ok.data.dipakai === 0 });
    k.done = true;
    render();
    U.toast(ok.data.dipakai === 0 ? 'Diunduh ulang tanpa memotong kuota.' : 'Berhasil. 1 kuota terpakai.', 'success');
  }

  // Nilai hasil Ubah Nilai untuk dipakai di e-Rapor
  function konvSources() {
    const k = S.k;
    if (!k || !k.an || !k.an.ok) return [];
    return kCols().map(c => {
      const r = kResult(c.c);
      const by = new Map();
      k.an.rows.forEach((row, i) => { if (E.isNum(r.final[i])) by.set(E.norm(row.name), r.final[i]); });
      return { key: k.sheet + '|' + c.c, label: c.label, sheet: k.sheet, c: c.c, by };
    });
  }

  // ============================================
  // ISI E-RAPOR
  // ============================================
  const localDate = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const ER_STEPS = ['Template', 'Nilai & Kriteria', 'Cocokkan', 'Periksa', 'Unduh'];
  function ensureE() {
    if (!S.e) {
      const p = S.prefs;
      S.e = { tpls: [], src: (S.k && S.k.wb) ? 'konv' : 'file', file: null, wb: null, crit: { tMin: p.tMin, rMax: p.rMax }, tab: 0, filter: 'all', search: '', force: false, stuFilter: null, outputs: null, sel: null, bad: [] };
    }
    return S.e;
  }
  const teacherWb = () => { const e = S.e; if (!e) return null; if (e.src === 'konv' && S.k && S.k.wb) return S.k.wb; return e.wb; };

  async function loadTemplates(files) {
    const e = ensureE();
    U.loading(true, 'Membaca template e-Rapor...');
    await tick();
    e.bad = [];
    for (const f of Array.from(files)) {
      try {
        const file = await readFile(f);
        if (e.tpls.some(t => t.file.hash === file.hash)) { U.toast(f.name + ' sudah ada di daftar.', 'info'); continue; }
        const tpl = E.parseTemplate(file.bytes, file.name);
        if (!tpl.ok) { e.bad.push({ name: f.name, msg: tpl.error }); continue; }
        e.tpls.push({ id: file.hash.slice(0, 12), file, tpl, sheet: null, edits: {}, include: true });
      } catch (err) { e.bad.push({ name: f.name, msg: err.message || String(err) }); }
    }
    e.outputs = null;
    U.loading(false);
    render();
  }
  async function loadErTeacherFile(f) {
    const e = ensureE();
    U.loading(true, 'Membaca file nilai...');
    await tick();
    try {
      e.file = await readFile(f);
      e.wb = E.readWorkbook(e.file.bytes, e.file.name);
      e.src = 'file'; e.fileErr = null;
      e.tpls.forEach(m => { m.sheet = null; });
    } catch (err) { e.fileErr = err.message || String(err); e.wb = null; }
    U.loading(false);
    render();
  }

  // Siapkan pasangan mapel ↔ sheet, TP, siswa
  function prepare(m, force) {
    const wb = teacherWb();
    if (!wb) return;
    if (!m.sheet || force || !wb.Sheets[m.sheet]) {
      if (!m.sheet || !wb.Sheets[m.sheet]) {
        const ranked = E.matchMapelSheet(m.tpl.mapel, wb.SheetNames);
        m.sheet = null;
        for (const r of ranked.slice(0, 6)) { const ts = E.analyzeTpSheet(wb, r.name); if (ts.ok && ts.tps.length) { m.sheet = r.name; break; } }
        if (!m.sheet) m.sheet = ranked[0] ? ranked[0].name : wb.SheetNames[0];
      }
      m.ts = E.analyzeTpSheet(wb, m.sheet);
      m.edits = {};
      if (m.ts.ok) {
        const mt = E.matchTPs(m.tpl.tpCols, m.ts.tps);
        m.tpMap = mt.map(x => x.j); m.tpStatus = mt.map(x => x.status);
        const ms = E.matchStudents(m.tpl.students, m.ts.students);
        m.stuMap = ms.map(x => x.idx); m.stuStatus = ms.map(x => x.status);
      } else {
        m.tpMap = m.tpl.tpCols.map(() => null); m.tpStatus = m.tpl.tpCols.map(() => 'none');
        m.stuMap = m.tpl.students.map(() => null); m.stuStatus = m.tpl.students.map(() => 'none');
      }
      m.naSrc = defaultNa(m);
    }
  }
  function naOptions(m) {
    const opts = [];
    if (S.e.src === 'konv') konvSources().forEach(s => opts.push({ v: 'k:' + s.key, label: 'Hasil Ubah Nilai · ' + s.sheet + ' › ' + s.label, src: s }));
    if (m.ts && m.ts.ok) m.ts.finals.forEach(c => opts.push({ v: 'c:' + c.c, label: c.label + ' (kolom ' + c.letter + ', nilai asli)' }));
    return opts;
  }
  function defaultNa(m) {
    const opts = naOptions(m);
    const ks = opts.filter(o => o.src);
    const same = ks.find(o => o.src.sheet === m.sheet);
    if (same) return same.v;
    let best = null, bs = 0;
    ks.forEach(o => { const s = Math.max(E.dice(o.src.label, m.tpl.mapel), (function () { const ini = m.tpl.mapel.split(/\s+/).filter(w => w.length > 2 && !/^dan$/i.test(w)).map(w => w[0]).join('').toUpperCase(); const L = o.src.label.toUpperCase().replace(/[^A-Z]/g, ''); return L && ini.startsWith(L) ? 0.9 : 0; })()); if (s > bs) { bs = s; best = o; } });
    if (best && bs >= 0.6) return best.v;
    return m.ts && m.ts.ok && m.ts.naDefault != null ? 'c:' + m.ts.naDefault : (opts[0] ? opts[0].v : '');
  }
  function naValue(m, idx) {
    if (!m.naSrc || idx == null) return null;
    if (m.naSrc.startsWith('c:')) { const c = +m.naSrc.slice(2); const col = m.ts.columns.find(x => x.c === c); return col ? col.values[idx] : null; }
    const src = konvSources().find(s => 'k:' + s.key === m.naSrc);
    return src ? src.by.get(E.norm(m.ts.students[idx].name)) : null;
  }
  // Hitung baris hasil untuk satu mapel
  function erRows(m) {
    const crit = S.e.crit;
    return m.tpl.students.map((s, i) => {
      const idx = m.stuMap[i];
      const row = { i, name: s.name, nisn: s.nisn, r: s.r, idx };
      if (idx == null) return Object.assign(row, { skip: true, reason: 'Tidak ditemukan di file nilai' });
      const nilai = E.toRapor(naValue(m, idx));
      if (nilai == null) return Object.assign(row, { skip: true, reason: 'Nilai rapor kosong di file nilai' });
      const scores = m.tpMap.map(j => (j == null ? null : (v => (E.isNum(v) ? v : null))(m.ts.tps[j].values[idx])));
      const d = E.decideTR(scores, nilai, crit);
      const marks = m.edits[i] ? m.edits[i].slice() : d.marks;
      const auto = m.edits[i] ? marks.map(() => false) : d.auto;
      const v = E.validity(nilai, marks);
      return Object.assign(row, { nilai, scores, marks, auto, valid: v.valid, vReason: v.reason, warn: d.warn, edited: !!m.edits[i], mirip: m.stuStatus[i] === 'mirip' });
    });
  }
  function erSummary(m) {
    const rows = erRows(m);
    return { rows, valid: rows.filter(r => !r.skip && r.valid).length, invalid: rows.filter(r => !r.skip && !r.valid).length, skip: rows.filter(r => r.skip).length, auto: rows.reduce((a, r) => a + (r.auto ? r.auto.filter(Boolean).length : 0), 0) };
  }

  function viewErapor(step) {
    ensureE();
    const st = '<div class="stepper-bar">' + stepper(ER_STEPS, step, '#/erapor/') + '</div>';
    if (step >= 3) S.e.tpls.forEach(m => prepare(m));
    if (step === 1) return Object.assign(er1(), { stepper: st, title: 'Isi e-Rapor' });
    if (step === 2) return Object.assign(er2(), { stepper: st, title: 'Nilai & Kriteria' });
    if (step === 3) return Object.assign(er3(), { stepper: st, title: 'Cocokkan' });
    if (step === 4) return Object.assign(er4(), { stepper: st, title: 'Periksa T/R' });
    return Object.assign(er5(), { stepper: st, title: 'Unduh e-Rapor' });
  }

  // ---------- Langkah 1 ----------
  function er1() {
    const e = S.e;
    const main = '<div class="stack">' + pageHead('Unggah Template e-Rapor', 'Template diunduh dari dashboard e-Rapor, satu file per mapel. Anda bisa mengunggah beberapa mapel sekaligus.') +
      dropZone('tpl', 'Tarik satu atau beberapa file template e-Rapor ke sini', 'Format .xlsx, langsung dari menu impor nilai di dashboard e-Rapor. Jangan ganti nama filenya.', 'Tambah File Template', true, e.tpls.length > 0) +
      (e.bad.length ? e.bad.map(b => '<div class="info warning">' + icon('alert') + '<div><b>' + esc(b.name) + '</b><br>' + esc(b.msg) + '</div></div>').join('') : '') +
      (e.tpls.length ? '<section class="grid-3">' + e.tpls.map((m, i) => '<article class="card stack-sm"><div class="row" style="align-items:flex-start"><div class="icon-tile sm success">' + icon('sheet') + '</div><p class="b grow" style="word-break:break-all;font-size:15px">' + esc(m.file.name) + '</p><button class="icon-btn sm" data-act="tplRemove" data-i="' + i + '" aria-label="Hapus">' + icon('x', 'ic-sm') + '</button></div>' +
        '<div class="stack-xs"><h2 class="h3">' + esc(m.tpl.mapel) + '</h2><p class="muted">Kelas ' + esc(m.tpl.kelas || '-') + ' · ' + m.tpl.students.length + ' siswa · ' + m.tpl.tpCols.length + ' TP</p></div><div><span class="pill pill-success">' + icon('check-circle', 'ic-sm') + 'Siap</span></div></article>').join('') + '</section>' : '') +
      '<div class="info">' + icon('shield') + '<div>Nama file dan format template tidak akan diubah, sehingga bisa langsung diimpor kembali ke e-Rapor.</div></div></div>';
    const bar = backBtn('#/') + '<p class="hint">' + (e.tpls.length ? 'Berikutnya: pilih sumber nilai TP dan atur kriteria Tinggi (T) dan Rendah (R).' : 'Unggah minimal satu template e-Rapor.') + '</p>' + nextBtn('#/erapor/2', 'Lanjut', !e.tpls.length);
    return { main, bar };
  }

  // ---------- Langkah 2 ----------
  function critErr() {
    const c = S.e.crit, inR = v => v != null && v >= 0 && v <= 100;
    if (!inR(num(c.tMin)) || !inR(num(c.rMax))) return 'Batas T dan R harus antara 0 sampai 100.';
    if (+c.tMin < +c.rMax) return 'Batas T harus sama atau lebih besar dari batas R.';
    return '';
  }
  function er2() {
    const e = S.e, hasK = S.k && S.k.wb;
    if (!hasK && e.src === 'konv') e.src = 'file';
    const srcCard = '<section class="card stack-sm"><h2 class="h3">Sumber nilai siswa</h2>' +
      (hasK ? '<div class="choice choice-row ' + (e.src === 'konv' ? 'on' : '') + '" data-act="erSrc" data-v="konv"><input type="radio" class="check" ' + (e.src === 'konv' ? 'checked' : '') + ' tabindex="-1"><div class="stack-xs"><b>Dari hasil Ubah Nilai tadi</b><span class="pill pill-neutral" style="background:#fff;border:1px solid var(--border)">' + icon('sheet', 'ic-sm t-success') + esc(S.k.file.name) + '</span><span class="small muted">Nilai TP diambil dari file ini, Nilai Rapor bisa memakai hasil Ubah Nilai.</span></div></div>' : '') +
      '<div class="choice choice-row ' + (e.src === 'file' ? 'on' : '') + '" data-act="erSrc" data-v="file"><input type="radio" class="check" ' + (e.src === 'file' ? 'checked' : '') + ' tabindex="-1"><div class="stack-xs"><b>Unggah file nilai (.xlsx)</b><span class="small muted">File yang memuat nilai per TP tiap siswa.</span></div></div>' +
      (e.src === 'file' ? (e.file ? '<div class="card-flat row" style="background:var(--page)"><span class="icon-tile sm ' + (e.wb ? 'success' : 'danger') + '">' + icon('sheet') + '</span><div class="grow stack-xs"><b style="word-break:break-all">' + esc(e.file.name) + '</b><span class="small muted">' + (e.wb ? e.wb.SheetNames.length + ' lembar terbaca' : '') + '</span></div><label class="btn btn-outline btn-sm">Ganti<input type="file" class="sr-only" accept=".xlsx,.xlsm" data-ch="file" data-target="erFile"></label></div>' +
        (e.fileErr ? '<div class="info danger">' + icon('alert-circle') + '<div>' + esc(e.fileErr) + '</div></div>' : '') : dropZone('erFile', 'Tarik file nilai ke sini', 'Format .xlsx', 'Pilih File Nilai', false, true)) : '') +
      '</section>';
    const c = e.crit, ce = critErr();
    const inp = (lbl, key, help) => '<label class="row-between" style="gap:16px"><span>' + lbl + (help ? '<br><span class="small muted">' + help + '</span>' : '') + '</span><input class="input big" style="width:96px;text-align:center;font-size:20px" type="number" min="0" max="100" data-in="crit" data-k="' + key + '" value="' + esc(c[key]) + '"></label>';
    const critCard = '<section class="card stack-sm"><div class="row-between"><h2 class="h3">Kriteria T dan R</h2><button class="link-btn" data-act="critReset">Kembalikan ke bawaan</button></div>' +
      '<p class="small muted"><b>T (Tinggi)</b> = TP yang dicapai sangat baik. <b>R (Rendah)</b> = TP yang perlu ditingkatkan.</p>' +
      inp('<b>T</b> jika nilai TP mulai dari', 'tMin') + inp('<b>R</b> jika nilai TP di bawah', 'rMax') +
      '<div class="card-flat stack-xs" style="background:var(--page)"><b>Jumlah T dan R yang ditulis</b><span class="small muted">Bila TP yang memenuhi syarat lebih dari 1: lebih dari 50% jumlah TP → ditulis <b>2</b> (nilai paling tinggi/rendah); selain itu → ditulis <b>1</b>.</span><span class="small muted">Contoh 6 TP: 3 TP ≥ 90 → 1 T; 4 TP ≥ 90 → 2 T.</span></div>' +
      '<div id="critErr">' + (ce ? '<div class="err-msg">' + icon('alert-circle') + esc(ce) + '</div>' : '') + '</div>' +
      '<div class="info">' + icon('sparkles') + '<div>EduGrade mengatur otomatis agar aturan e-Rapor terpenuhi: nilai di bawah 100 wajib ada R, nilai 100 tidak boleh ada R. Bila tidak ada TP yang memenuhi batas, TP tertinggi/terendah ditandai otomatis.</div></div>' +
      '<p class="small muted">Nilai TP yang dipakai: nilai TP asli.</p></section>';
    const main = '<div class="stack">' + pageHead('Sumber Nilai dan Kriteria T / R', 'Pilih file nilai siswa dan tentukan batas nilai Tinggi (T) serta Rendah (R).') + '<div class="split">' + srcCard + critCard + '</div></div>';
    const ok = teacherWb() && !ce;
    const bar = backBtn('#/erapor/1') + '<p class="hint" id="hintE2">' + (ok ? 'Berikutnya: cocokkan nama siswa dan Tujuan Pembelajaran (TP) dengan template.' : (ce || 'Pilih sumber nilai terlebih dahulu.')) + '</p>' + nextBtn('#/erapor/3', 'Lanjut', !ok);
    return { main, bar };
  }

  // ---------- Langkah 3 ----------
  const mapelTabs = (act, withCount) => '<div class="tabs">' + S.e.tpls.map((m, i) => {
    let cnt = '';
    if (withCount) { const s = erSummary(m); const tot = s.valid + s.invalid; cnt = '<span class="cnt ' + (s.invalid ? 'bad' : '') + ' tnum">' + s.valid + '/' + tot + '</span>'; }
    return '<button class="tab ' + (i === S.e.tab ? 'on' : '') + '" data-act="' + act + '" data-i="' + i + '">' + esc(m.tpl.mapel) + cnt + '</button>';
  }).join('') + '</div>';
  const statusPill2 = s => s === 'ok' ? '<span class="pill pill-success">Cocok</span>' : s === 'mirip' ? '<span class="pill pill-warning">Mirip, mohon cek</span>' : s === 'skip' ? '<span class="pill pill-neutral">Dilewati</span>' : '<span class="pill pill-danger">Tidak ketemu</span>';

  function er3() {
    const e = S.e;
    if (e.tab >= e.tpls.length) e.tab = 0;
    const m = e.tpls[e.tab], wb = teacherWb();
    const ranked = E.matchMapelSheet(m.tpl.mapel, wb.SheetNames);
    const nOk = m.stuStatus.filter(s => s === 'ok').length, nMirip = m.stuStatus.filter(s => s === 'mirip').length, nNone = m.stuStatus.filter(s => s === 'none' || s === 'skip').length;
    const tpOk = m.tpMap.filter(j => j != null).length;
    const used = new Set(m.stuMap.filter(x => x != null));
    if (e.stuFilter == null) e.stuFilter = (nMirip + nNone) ? 'check' : 'all';
    const naOpts = naOptions(m);
    const sheetCard = '<section class="card stack-sm"><div class="grid-2" style="gap:16px">' +
      '<label class="field"><span class="field-label">Lembar nilai untuk mapel ini</span><select class="select" data-ch="erSheet">' + ranked.map((r, i) => '<option value="' + esc(r.name) + '" ' + (r.name === m.sheet ? 'selected' : '') + '>' + esc(r.name) + (i === 0 ? ' (disarankan)' : '') + '</option>').join('') + '</select></label>' +
      '<label class="field"><span class="field-label">Nilai Rapor diambil dari</span><select class="select" data-ch="erNa">' + (naOpts.length ? naOpts.map(o => '<option value="' + esc(o.v) + '" ' + (o.v === m.naSrc ? 'selected' : '') + '>' + esc(o.label) + '</option>').join('') : '<option>Tidak ada kolom nilai</option>') + '</select></label></div>' +
      (!m.ts.ok ? '<div class="info danger">' + icon('alert-circle') + '<div>Lembar ini tidak memuat daftar nama dan nilai. Pilih lembar lain.</div></div>' : !m.ts.tps.length ? '<div class="info warning">' + icon('alert') + '<div>Kolom nilai per TP tidak ditemukan di lembar ini. Fitur T/R membutuhkan nilai per TP.</div></div>' : '') + '</section>';
    const tpCard = '<section class="card p0"><div class="card-pad row-between" style="border-bottom:1px solid var(--border)"><h2 class="h3">Tujuan Pembelajaran (TP)</h2><span class="muted small">' + tpOk + ' dari ' + m.tpl.tpCols.length + ' TP berpasangan</span></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Di template e-Rapor</th><th style="width:30px"></th><th style="min-width:240px">Di file nilai Anda</th><th>Status</th></tr></thead><tbody>' +
      m.tpl.tpCols.map((t, k) => '<tr class="' + (m.tpStatus[k] === 'mirip' ? 'warn' : '') + '"><td><b>' + esc(t.code) + '</b><div class="small muted" style="max-width:460px">' + esc(t.desc) + '</div></td><td class="muted">' + icon('arrow-right', 'ic-sm') + '</td><td><select class="select sm" data-ch="erTp" data-k="' + k + '"><option value="">— Tidak dipakai —</option>' +
        (m.ts.ok ? m.ts.tps.map((g, j) => '<option value="' + j + '" ' + (m.tpMap[k] === j ? 'selected' : '') + '>' + esc(g.label + (g.desc ? ' · ' + g.desc.slice(0, 60) : '')) + '</option>').join('') : '') + '</select></td><td>' + statusPill2(m.tpMap[k] == null ? 'none' : m.tpStatus[k]) + '</td></tr>').join('') + '</tbody></table></div></section>';
    let list = m.tpl.students.map((s, i) => ({ s, i, st: m.stuStatus[i] }));
    if (e.stuFilter === 'check') list = list.filter(x => x.st !== 'ok');
    const stuCard = '<section class="card p0"><div class="card-pad row-between" style="border-bottom:1px solid var(--border)"><h2 class="h3">Siswa</h2><div class="chips"><button class="chip ' + (e.stuFilter === 'check' ? 'on' : '') + '" data-act="stuFilter" data-f="check">Perlu dicek (' + (nMirip + nNone) + ')</button><button class="chip ' + (e.stuFilter === 'all' ? 'on' : '') + '" data-act="stuFilter" data-f="all">Semua (' + m.tpl.students.length + ')</button></div></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nama di template e-Rapor</th><th style="width:30px"></th><th style="min-width:240px">Nama di file nilai Anda</th><th>Status &amp; tindakan</th></tr></thead><tbody>' +
      (list.length ? list.map(x => {
        const idx = m.stuMap[x.i];
        return '<tr class="' + (x.st === 'mirip' ? 'warn' : x.st !== 'ok' ? 'skip' : '') + '"><td class="b">' + esc(x.s.name) + '</td><td class="muted">' + icon('arrow-right', 'ic-sm') + '</td><td><select class="select sm" data-ch="erStu" data-i="' + x.i + '"><option value="">— Lewati siswa ini —</option>' +
          (m.ts.ok ? m.ts.students.map((g, j) => '<option value="' + j + '" ' + (idx === j ? 'selected' : '') + (used.has(j) && idx !== j ? ' disabled' : '') + '>' + esc(g.name) + '</option>').join('') : '') + '</select></td><td><div class="row wrap">' +
          statusPill2(idx == null ? (x.st === 'skip' ? 'skip' : 'none') : x.st) + (x.st === 'mirip' ? '<button class="btn btn-primary btn-xs" data-act="stuOk" data-i="' + x.i + '">Ya, ini benar</button>' : '') + '</div></td></tr>';
      }).join('') : '<tr><td colspan="4"><div class="empty">' + icon('check-circle', 'ic-lg t-success') + 'Semua nama sudah cocok.</div></td></tr>') + '</tbody></table></div></section>';
    const main = '<div class="stack">' + pageHead('Cocokkan Data dengan Template', 'Pastikan setiap TP dan nama siswa di template sudah cocok dengan file nilai Anda. Yang ragu kami tandai kuning.') +
      mapelTabs('erTab') + '<div class="info">' + icon('info') + '<b class="tnum">' + nOk + ' cocok, ' + nMirip + ' mirip perlu dicek, ' + nNone + ' tidak ketemu (dilewati, barisnya tidak diubah)</b></div>' + sheetCard + tpCard + stuCard + '</div>';
    const bar = backBtn('#/erapor/2') + '<p class="hint">Berikutnya: periksa dan sesuaikan isian T (Tinggi) dan R (Rendah) per siswa.</p>' + nextBtn('#/erapor/4', 'Lanjut');
    return { main, bar };
  }

  // ---------- Langkah 4 ----------
  function er4() {
    const e = S.e, m = e.tpls[e.tab] || e.tpls[0];
    const sm = erSummary(m);
    let rows = sm.rows;
    if (e.filter === 'bad') rows = rows.filter(r => !r.skip && !r.valid);
    if (e.filter === 'auto') rows = rows.filter(r => r.auto && r.auto.some(Boolean));
    const q = e.search.trim().toLowerCase();
    if (q) rows = rows.filter(r => r.name.toLowerCase().includes(q));
    const totals = e.tpls.map(erSummary);
    const anyInvalid = totals.some(t => t.invalid > 0);
    const nAutoRows = sm.rows.filter(r => r.auto && r.auto.some(Boolean)).length;
    const c = e.crit;
    const main = '<div class="stack">' + pageHead('Periksa Isian T (Tinggi) dan R (Rendah)', 'Klik kotak T atau R untuk mengubahnya. Pastikan semua siswa berstatus Valid sebelum diunduh.') +
      mapelTabs('erTab4', true) +
      '<section class="grid-3"><div class="info success" style="justify-content:space-between"><b class="tnum" style="font-size:17px">' + sm.valid + ' Valid</b>' + icon('check-circle') + '</div>' +
      '<div class="info ' + (sm.invalid ? 'warning' : '') + '" style="justify-content:space-between;' + (sm.invalid ? '' : 'background:#fff;border:1px solid var(--border);color:var(--muted)') + '"><b class="tnum" style="font-size:17px">' + sm.invalid + ' Perlu diperbaiki</b>' + icon('alert') + '</div>' +
      '<div class="info" style="justify-content:space-between;background:#fff;border:1px solid var(--border);color:var(--muted)"><b class="tnum" style="font-size:17px">' + sm.skip + ' Dilewati</b>' + icon('minus-circle') + '</div></section>' +
      '<div class="card-flat row-between"><div class="row wrap"><span>T mulai ' + fmt(c.tMin) + ', R di bawah ' + fmt(c.rMax) + ', ditulis 1 atau 2 (2 bila lebih dari 50% TP memenuhi)</span><a class="link-btn" href="#/erapor/2">Ubah kriteria</a></div>' +
      '<div class="legend"><span class="row" style="gap:6px"><span class="tr sm T">T</span>Tinggi</span><span class="row" style="gap:6px"><span class="tr sm R">R</span>Rendah</span><span class="row" style="gap:6px"><span class="tr sm">–</span>Kosong</span><span class="row" style="gap:6px"><span class="tr sm R auto">R</span>Diisi otomatis</span></div></div>' +
      '<div class="row-between"><div class="chips">' + [['all', 'Semua (' + sm.rows.length + ')'], ['bad', 'Perlu perhatian (' + sm.invalid + ')'], ['auto', 'Diisi otomatis (' + nAutoRows + ')']].map(f => '<button class="chip ' + (e.filter === f[0] ? 'on' : '') + '" data-act="erFilter" data-f="' + f[0] + '">' + f[1] + '</button>').join('') + '</div>' +
      '<div class="row wrap"><div class="search">' + icon('search') + '<input class="input" type="search" placeholder="Cari nama siswa..." data-in="erSearch" value="' + esc(e.search) + '"></div>' + (Object.keys(m.edits).length ? '<button class="link-btn" data-act="erReset">' + icon('refresh', 'ic-sm') + ' Kembalikan otomatis</button>' : '') + '</div></div>' +
      '<section class="card p0"><div class="tbl-wrap"><table class="tbl sticky-head"><thead><tr><th class="sticky-col" style="width:56px">No</th><th class="sticky-col2" style="min-width:200px">Nama</th><th class="c">Nilai Rapor</th>' +
      m.tpl.tpCols.map(t => '<th class="c" title="' + esc(t.code + ': ' + t.desc) + '">' + esc(t.code) + '<div class="small muted" style="font-weight:400;max-width:120px;white-space:normal;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">' + esc(t.desc) + '</div></th>').join('') + '<th>Status</th></tr></thead><tbody>' +
      (rows.length ? rows.map(r => {
        if (r.skip) return '<tr class="skip"><td class="sticky-col tnum" style="background:var(--page)">' + (r.i + 1) + '</td><td class="sticky-col2" style="background:var(--page)">' + esc(r.name) + '</td><td class="c">–</td>' + m.tpl.tpCols.map(() => '<td class="c">–</td>').join('') + '<td class="small">' + esc(r.reason) + '</td></tr>';
        return '<tr class="' + (r.valid ? '' : 'bad') + '"><td class="sticky-col tnum muted">' + (r.i + 1) + '</td><td class="sticky-col2 b">' + esc(r.name) + (r.mirip ? ' <span class="pill pill-warning" title="Nama mirip, sudah dipasangkan">mirip</span>' : '') + '</td><td class="c tnum b">' + r.nilai + '</td>' +
          r.marks.map((mk, k) => {
            const sc = r.scores[k];
            return '<td class="c"><button class="tr ' + (mk || '') + (r.auto[k] ? ' auto' : '') + '" data-act="cycle" data-i="' + r.i + '" data-k="' + k + '" title="Nilai TP: ' + (sc == null ? 'kosong' : fmt(sc)) + (r.auto[k] ? ' · ditandai otomatis agar valid' : '') + '">' + (mk || '–') + '</button><div class="small muted tnum" style="margin-top:2px">' + (sc == null ? '' : fmt(sc)) + '</div></td>';
          }).join('') +
          '<td>' + (r.valid ? '<span class="pill pill-success">Valid</span>' : '<div class="stack-xs" style="gap:2px"><span class="pill pill-danger">Tidak Valid</span><span class="small t-danger">' + esc(r.vReason) + '</span></div>') + (r.warn ? '<div class="small t-warning">' + esc(r.warn) + '</div>' : '') + '</td></tr>';
      }).join('') : '<tr><td colspan="' + (m.tpl.tpCols.length + 4) + '"><div class="empty">Tidak ada baris.</div></td></tr>') + '</tbody></table></div></section></div>';
    const nFiles = e.tpls.length;
    const bar = '<div class="row wrap">' + backBtn('#/erapor/3') + '<label class="row" style="gap:10px;cursor:pointer"><input type="checkbox" class="check" data-ch="force" ' + (e.force ? 'checked' : '') + '><span>Tetap unduh walau ada yang Tidak Valid</span></label></div>' +
      '<div class="row wrap"><span class="muted b tnum" style="font-size:15px">' + (anyInvalid && !e.force ? 'Masih ada ' + totals.reduce((a, t) => a + t.invalid, 0) + ' baris Tidak Valid' : nFiles + ' file siap') + '</span>' + nextBtn('#/erapor/5', 'Lanjut ke Unduh', anyInvalid && !e.force) + '</div>';
    return { main, bar };
  }

  // ---------- Langkah 5 ----------
  function er5() {
    const e = S.e;
    if (!e.sel) e.sel = e.tpls.map(m => m.id);
    e.sel = e.sel.filter(id => e.tpls.some(m => m.id === id));
    const chosen = e.tpls.filter(m => e.sel.includes(m.id));
    if (e.outputs) {
      const main = '<div class="narrow stack"><section class="card stack" style="align-items:center;text-align:center;padding:36px">' +
        '<div class="icon-tile success" style="width:72px;height:72px;border-radius:50%">' + icon('check', 'ic-lg') + '</div><h1 class="h2">' + e.outputs.length + ' file siap</h1><p class="lead">File sudah diunduh ke folder <b>Unduhan (Downloads)</b>. Nama file sama persis dengan template asli.</p></section>' +
        '<section class="card p0"><div class="card-pad row-between" style="border-bottom:1px solid var(--border)"><h2 class="h3">File hasil</h2><button class="btn btn-primary" data-act="dlZip">' + icon('download') + 'Unduh semua (ZIP)</button></div>' +
        e.outputs.map((o, i) => '<div class="card-pad row-between" style="border-bottom:1px solid var(--border)"><span class="row grow"><span class="icon-tile sm success">' + icon('sheet') + '</span><span class="b" style="word-break:break-all">' + esc(o.name) + '</span></span><button class="btn btn-secondary btn-sm" data-act="dlOne" data-i="' + i + '">' + icon('download', 'ic-sm') + 'Unduh</button></div>').join('') + '</section>' +
        '<section class="card stack-sm"><h2 class="h3">Cara memasukkan ke e-Rapor</h2><ol style="margin:0;padding-left:22px;line-height:30px"><li>Buka dashboard e-Rapor, masuk ke menu <b>Impor Nilai</b> pada mapel dan kelas yang sesuai.</li><li>Pilih file hasil dari folder Unduhan. <b>Jangan mengganti nama file.</b></li><li>Tekan Unggah/Impor, lalu periksa nilai yang tampil.</li></ol></section>' +
        '<div class="info warning">' + icon('alert') + '<div>Coba dulu pada satu kelas uji sebelum dipakai untuk semua kelas. Bila impor gagal, <a href="' + U.waLink(S.cfg.wa, 'Halo Admin EduGrade, file e-Rapor saya gagal diimpor.') + '" target="_blank" rel="noopener"><b>hubungi admin lewat WhatsApp</b></a>; kuota akan diganti.</div></div></div>';
      return { main, bar: backBtn('#/erapor/4', 'Kembali ke Periksa') + '<p class="hint">Unduh ulang file yang sama dalam ' + S.cfg.unduhUlangJam + ' jam tidak memotong kuota.</p><a class="btn btn-outline btn-lg" href="#/">Selesai</a>' };
    }
    const main = '<div class="narrow stack">' + pageHead('Unduh File e-Rapor', 'Pilih file yang ingin diunduh. Setiap file memakai 1 kuota.') +
      '<section class="card p0">' + e.tpls.map(m => {
        const s = erSummary(m), on = e.sel.includes(m.id);
        return '<label class="card-pad row-between" style="border-bottom:1px solid var(--border);cursor:pointer"><span class="row grow"><input type="checkbox" class="check" data-ch="selOut" data-id="' + m.id + '" ' + (on ? 'checked' : '') + '><span class="stack-xs"><b style="word-break:break-all">' + esc(m.file.name) + '</b><span class="small muted">' + esc(m.tpl.mapel) + ' · ' + s.valid + ' valid' + (s.invalid ? ', ' + s.invalid + ' tidak valid' : '') + (s.skip ? ', ' + s.skip + ' dilewati' : '') + '</span></span></span>' + (s.invalid ? '<span class="pill pill-warning">Ada Tidak Valid</span>' : '<span class="pill pill-success">Valid</span>') + '</label>';
      }).join('') + '</section>' +
      '<div class="info">' + icon('info') + '<div class="tnum">Unduh <b>' + chosen.length + ' file</b> e-Rapor. ' + (S.code ? 'Memakai ' + chosen.length + ' dari sisa ' + S.code.sisa + ' kuota' : 'Memakai ' + chosen.length + ' kuota') + ' (file yang sudah diunduh dalam ' + S.cfg.unduhUlangJam + ' jam terakhir gratis).</div></div>' +
      '<div class="info warning">' + icon('alert') + '<div>Jangan mengganti nama file hasil. e-Rapor mengenali mapel dari nama dan isi file.</div></div></div>';
    const bar = backBtn('#/erapor/4') + '<p class="hint">Kode diminta saat menekan Unduh.</p><button class="btn btn-primary btn-xl" data-act="dlErapor" ' + (chosen.length ? '' : 'disabled') + '>' + icon('download') + '<span>Unduh ' + chosen.length + ' File e-Rapor' + (chosen.length > 1 ? ' (ZIP)' : '') + '</span></button>';
    return { main, bar };
  }

  async function downloadErapor() {
    const e = S.e;
    const chosen = e.tpls.filter(m => e.sel.includes(m.id));
    if (!chosen.length) return;
    const outs = [];
    U.loading(true, 'Menyiapkan file e-Rapor...');
    await tick();
    try {
      for (const m of chosen) {
        prepare(m);
        const rows = erRows(m).filter(r => !r.skip).map(r => ({ r: r.r, nilai: r.nilai, marks: r.marks }));
        const bytes = await E.buildErapor(m.file.bytes, m.tpl, rows);
        outs.push({ name: m.file.name, data: bytes, sidik: m.file.hash, siswa: rows.length });
      }
    } catch (err) {
      U.loading(false);
      return U.toast('Gagal menyiapkan file: ' + (err.message || err), 'error');
    }
    U.loading(false);
    const ok = await claimFlow('EREPORT', outs.map(o => ({ sidik: o.sidik, nama: o.name, siswa: o.siswa })));
    if (!ok) return;
    e.outputs = outs.map(o => ({ name: o.name, data: o.data }));
    if (outs.length === 1) U.saveFile(outs[0].data, outs[0].name);
    else U.saveFile(await E.zipFiles(e.outputs), 'e-Rapor_EduGrade_' + localDate() + '.zip', 'application/zip');
    outs.forEach(o => S.hist.push({ nama: o.name, waktu: new Date().toISOString() }));
    render();
    U.toast(ok.data.dipakai ? 'Berhasil. ' + ok.data.dipakai + ' kuota terpakai.' : 'Diunduh ulang tanpa memotong kuota.', 'success');
  }

  // ============================================
  // KODE: MODAL & KLAIM KUOTA
  // ============================================
  function setCode(info) {
    S.code = info ? { kode: info.kode, sisa: info.sisa, total: info.total, status: info.status, berlakuSampai: info.berlakuSampai, masaJam: info.masaJam, paket: info.paket } : null;
    LS.set('rp_code', S.code);
    renderTop(parseRoute());
  }
  const codeInputHtml = val => '<div class="field"><label class="field-label" for="kodeIn">Kode pembelian</label><div class="row"><input id="kodeIn" class="input code grow" placeholder="EG-XXXX-XXXX" autocomplete="off" spellcheck="false" value="' + esc(val || '') + '"><button class="btn btn-outline" style="height:56px" data-m="paste">' + icon('paste', 'ic-sm') + 'Tempel</button></div><p class="small muted">Huruf besar/kecil tidak masalah. Tanda strip dibantu otomatis.</p></div>';
  const modalHead = (title, ic, tone) => '<div class="modal-head"><div class="row"><div class="icon-tile sm ' + (tone || '') + '">' + icon(ic || 'key') + '</div><h2 class="h2">' + title + '</h2></div><button class="icon-btn" data-close aria-label="Tutup">' + icon('x') + '</button></div>';
  const quotaNote = () => '<div class="info">' + icon('shield') + '<div>Kuota hanya terpakai saat file diunduh. Unduh ulang file yang sama dalam ' + S.cfg.unduhUlangJam + ' jam gratis.</div></div>';
  const modalFoot = () => '<div class="row-between" style="border-top:1px solid var(--border);padding-top:14px"><a class="link-btn" href="#/beli" data-close>Belum punya kode? Cara Beli</a><a class="small muted" target="_blank" rel="noopener" href="' + U.waLink(S.cfg.wa, 'Halo Admin EduGrade, saya butuh bantuan soal kode.') + '">Bermasalah? Hubungi penjual</a></div>';
  const formatCode = v => { const s = String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^EG/, '').slice(0, 8); return s.length ? 'EG-' + s.slice(0, 4) + (s.length > 4 ? '-' + s.slice(4) : '') : ''; };

  // Buka dialog kode. Mengembalikan info kode (bila berhasil) atau null.
  function openCodeModal(purpose) {
    return new Promise(resolve => {
      let done = false;
      const finish = v => { if (!done) { done = true; resolve(v); } };
      const md = U.modal('', { onClose: () => finish(null) });
      const showInput = (val, errHtml) => {
        md.set(modalHead('Masukkan Kode Anda') + '<p class="muted">Gunakan kode dari penjual (lewat email atau WhatsApp). Format: <b class="mono">EG-XXXX-XXXX</b></p>' + codeInputHtml(val) + (errHtml || '') +
          '<button class="btn btn-primary btn-lg btn-block" data-m="check">' + icon('search') + 'Periksa Kode Sekarang</button>' + quotaNote() + modalFoot());
        const inp = md.el.querySelector('#kodeIn');
        inp.focus();
        inp.addEventListener('input', () => { const p = inp.selectionStart, before = inp.value.length; inp.value = formatCode(inp.value); const d = inp.value.length - before; try { inp.setSelectionRange(p + d, p + d); } catch (e) { /* */ } });
        inp.addEventListener('keydown', ev => { if (ev.key === 'Enter') check(); });
        md.el.querySelector('[data-m="check"]').addEventListener('click', check);
        md.el.querySelector('[data-m="paste"]').addEventListener('click', async () => { try { inp.value = formatCode(await navigator.clipboard.readText()); inp.focus(); } catch (e) { U.toast('Tempel manual dengan Ctrl+V.', 'info'); } });
      };
      const check = async () => {
        const val = formatCode(md.el.querySelector('#kodeIn').value);
        if (!/^EG-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(val)) return showInput(val, '<div class="err-msg">' + icon('alert-circle') + 'Kode harus 8 huruf/angka, contoh EG-7KQ2-M9XD.</div>');
        md.set(modalHead('Masukkan Kode Anda') + '<div class="row" style="justify-content:center;padding:24px 0;gap:14px"><div class="spinner"></div><b>Sedang memeriksa...</b></div>');
        const r = await A.call('checkCode', { kode: val });
        if (r.success) {
          setCode(r.data);
          const pct = r.data.total ? (r.data.sisa / r.data.total) * 100 : 0;
          md.set(modalHead('Kode benar', 'check', 'success') + '<div class="card-flat stack-sm" style="background:var(--page)"><div class="row-between"><span class="mono b" style="font-size:20px">' + esc(r.data.kode) + '</span>' + statusPill(r.data.status) + '</div><div class="row-between tnum"><span>Sisa kuota <b>' + r.data.sisa + '</b> dari ' + r.data.total + '</span><span class="muted small">' + esc(r.data.paket || '') + '</span></div><div class="progress"><div style="width:' + pct + '%"></div></div>' +
            '<span class="small muted">' + (r.data.berlakuSampai ? 'Berlaku sampai ' + U.tglJam(r.data.berlakuSampai) : 'Masa berlaku ' + U.masa(r.data.masaJam) + ' dimulai sejak unduhan pertama') + '</span></div>' +
            '<p class="small muted">' + icon('lock', 'ic-sm') + ' Kode disimpan di browser ini agar tidak perlu diketik ulang.</p>' +
            '<button class="btn btn-primary btn-lg btn-block" data-m="ok">' + (purpose === 'download' ? 'Lanjut mengunduh' : 'Selesai') + icon('arrow-right') + '</button>');
          md.el.querySelector('[data-m="ok"]').addEventListener('click', () => { finish(r.data); md.close(); });
        } else if (r.data && (r.code === 'EXPIRED' || r.code === 'NONAKTIF')) {
          setCode(null);
          showError(val, r.message);
        } else {
          showInput(val, '<div class="info danger">' + icon('alert-circle') + '<div>' + esc(r.message || 'Kode tidak bisa diperiksa.') + '</div></div>');
        }
      };
      const showError = (val, msg) => {
        md.set(modalHead('Kode tidak bisa dipakai', 'alert-circle', 'danger') + '<div class="info danger">' + icon('alert-circle') + '<div>' + esc(msg) + '</div></div>' +
          '<div class="row wrap"><a class="btn btn-primary" target="_blank" rel="noopener" href="' + U.waLink(S.cfg.wa, 'Halo Admin EduGrade, kode saya ' + val + ' tidak bisa dipakai.') + '">' + icon('chat', 'ic-sm') + 'Hubungi penjual lewat WhatsApp</a><button class="btn btn-outline" data-m="again">Masukkan kode lain</button></div>');
        md.el.querySelector('[data-m="again"]').addEventListener('click', () => showInput(''));
      };
      if (S.code && purpose !== 'download') {
        const c = S.code, pct = c.total ? (c.sisa / c.total) * 100 : 0;
        md.set(modalHead('Kode Saya') + '<div class="card-flat stack-sm" style="background:var(--page)"><div class="row-between"><span class="mono b" style="font-size:20px">' + esc(c.kode) + '</span>' + statusPill(c.status) + '</div><div class="row-between tnum"><span>Sisa kuota <b>' + c.sisa + '</b> dari ' + c.total + '</span><span class="small muted">' + esc(c.paket || '') + '</span></div><div class="progress"><div style="width:' + pct + '%"></div></div><span class="small muted">' + (c.berlakuSampai ? 'Berlaku sampai ' + U.tglJam(c.berlakuSampai) : 'Masa berlaku dimulai sejak unduhan pertama') + '</span></div>' +
          (S.hist.length ? '<div class="stack-xs"><b>Unduhan sesi ini</b>' + S.hist.slice(-6).reverse().map(h => '<span class="small row" style="gap:6px">' + icon('sheet', 'ic-sm t-success') + esc(h.nama) + '</span>').join('') + '</div>' : '') +
          '<div class="row wrap"><button class="btn btn-secondary" data-m="refresh">' + icon('refresh', 'ic-sm') + 'Perbarui sisa kuota</button><button class="btn btn-outline" data-m="change">Ganti kode</button><button class="link-btn" data-m="forget">Hapus dari browser ini</button></div>' + quotaNote());
        md.el.querySelector('[data-m="refresh"]').addEventListener('click', async () => { md.el.querySelector('[data-m="refresh"]').innerHTML = '<span class="spinner"></span>Memeriksa...'; const r = await A.call('checkCode', { kode: c.kode }); if (r.success || r.data) { setCode(r.data); U.toast(r.success ? 'Sisa kuota diperbarui.' : r.message, r.success ? 'success' : 'warning'); } else U.toast(r.message, 'error'); md.close(); render(); });
        md.el.querySelector('[data-m="change"]').addEventListener('click', () => showInput(''));
        md.el.querySelector('[data-m="forget"]').addEventListener('click', () => { setCode(null); md.close(); render(); });
      } else showInput(S.code ? S.code.kode : '');
    });
  }

  // Alur klaim: pastikan kode ada, klaim di server (idempoten), tangani galat
  async function claimFlow(jenis, files) {
    if (S.cfg.perawatan) { U.toast('Unduhan sedang ditutup sebentar untuk perawatan. Coba lagi nanti.', 'warning'); return null; }
    if (!A.hasServer()) { showProblem('Server belum diatur', 'Alamat server belum diisi di file js/config.js. Hubungi pengelola aplikasi.'); return null; }
    if (!S.code) { const info = await openCodeModal('download'); if (!info) return null; }
    const reqId = A.uuid();
    for (;;) {
      U.loading(true, 'Memeriksa kode dan kuota...');
      const r = await A.call('claim', { kode: S.code.kode, request_id: reqId, jenis, files }, { retries: 3 });
      U.loading(false);
      if (r.success) { if (r.data.kode) setCode(r.data.kode); return r; }
      if (r.code === 'QUOTA') {
        if (r.data) setCode(r.data);
        showQuota(r.data || {}, files.length);
        return null;
      }
      if (r.code === 'NOTFOUND' || r.code === 'EXPIRED' || r.code === 'NONAKTIF') {
        setCode(null);
        const again = await U.confirmBox('Kode tidak bisa dipakai', r.message + ' Masukkan kode lain?', 'Masukkan kode lain');
        if (!again) return null;
        const info = await openCodeModal('download');
        if (!info) return null;
        continue;
      }
      if (r.code === 'NETWORK' || r.code === 'BUSY') {
        const again = await U.confirmBox('Koneksi bermasalah', r.message + ' Kuota tidak akan terpotong dua kali bila Anda mencoba lagi.', 'Coba lagi');
        if (again) continue;
        return null;
      }
      showProblem('Belum bisa mengunduh', r.message || 'Terjadi kesalahan.');
      return null;
    }
  }
  function showQuota(d, need) {
    const md = U.modal(modalHead('Kuota tidak cukup', 'alert', 'warning') +
      '<div class="info warning">' + icon('alert') + '<div class="tnum">Unduhan ini butuh <b>' + (d.butuh || need) + ' kuota</b>, sisa kuota Anda <b>' + (d.sisa != null ? d.sisa : 0) + '</b>. Tidak ada kuota yang terpotong.</div></div>' +
      '<div class="row wrap"><a class="btn btn-primary" href="#/beli" data-close>' + icon('plus', 'ic-sm') + 'Beli kuota tambahan</a>' +
      (parseRoute().page === 'erapor' ? '<button class="btn btn-outline" data-close>Kurangi file yang diunduh</button>' : '<button class="btn btn-outline" data-close>Tutup</button>') + '</div>' +
      '<p class="small muted">Atau <a target="_blank" rel="noopener" href="' + U.waLink(S.cfg.wa, 'Halo Admin EduGrade, saya ingin menambah kuota untuk kode ' + (S.code ? S.code.kode : '') + '.') + '">hubungi admin lewat WhatsApp</a> untuk menambah kuota.</p>');
    return md;
  }
  function showProblem(title, msg) {
    U.modal(modalHead(title, 'alert-circle', 'danger') + '<div class="info danger">' + icon('alert-circle') + '<div>' + esc(msg) + '</div></div><div class="row wrap"><a class="btn btn-primary" target="_blank" rel="noopener" href="' + U.waLink(S.cfg.wa, 'Halo Admin EduGrade, saya mengalami kendala: ' + msg) + '">' + icon('chat', 'ic-sm') + 'Hubungi admin</a><button class="btn btn-outline" data-close>Tutup</button></div>');
  }

  // ============================================
  // CARA BELI
  // ============================================
  function viewBeli() {
    const ps = S.cfg.paket || [];
    const waText = p => 'Halo Admin EduGrade, saya ingin membeli ' + p.nama + ' (' + rupiah(p.harga) + ', ' + p.kuota + ' kuota).\n\nNama: \nSekolah: \nEmail: ' + (S.ref ? '\nKode referensi: ' + S.ref : '');
    const card = p => '<article class="card paket ' + (p.populer ? 'pop' : '') + '">' + (p.populer ? '<span class="pill pill-solid ribbon">Paling dipilih</span>' : '') +
      '<div class="stack-sm"><h2 class="h3 ' + (p.populer ? 't-primary' : '') + '">' + esc(p.nama) + '</h2><p class="price">' + rupiah(p.harga) + '</p><div class="stack-xs"><b>' + p.kuota + ' kuota unduhan</b><span class="muted">Berlaku ' + U.masa(p.jam) + ' sejak unduhan pertama</span></div>' +
      '<ul class="checklist">' + [p.keterangan, 'Bisa untuk Ubah Nilai dan Isi e-Rapor', 'Unduh ulang ' + S.cfg.unduhUlangJam + ' jam gratis'].filter(Boolean).map(t => '<li>' + icon('check') + '<span>' + esc(t) + '</span></li>').join('') + '</ul></div>' +
      (canPay() ? '<div class="stack-xs"><a class="btn btn-primary btn-lg btn-block" href="#/pesan/' + encodeURIComponent(p.id) + '">' + icon('receipt') + '<span>Beli Sekarang</span></a><a class="link-btn center small" target="_blank" rel="noopener" href="' + U.waLink(S.cfg.wa, waText(p)) + '">Tanya dulu lewat WhatsApp</a></div>'
        : '<a class="btn btn-primary btn-lg btn-block" target="_blank" rel="noopener" href="' + U.waLink(S.cfg.wa, waText(p)) + '">' + icon('chat') + '<span>Pesan lewat WhatsApp</span></a>') + '</article>';
    const faq = [
      ['Apakah data nilai siswa saya aman?', 'Ya. Seluruh file Excel dibaca dan diproses di komputer Anda sendiri. Nama dan nilai siswa tidak pernah dikirim ke server.'],
      ['Apa arti kuota?', '1 kuota dipakai setiap kali Anda mengunduh 1 file hasil (1 file Ubah Nilai atau 1 file template e-Rapor). Mencoba dan melihat hasil selalu gratis.'],
      ['Bagaimana jika saya salah mengunduh atau ingin memperbaiki?', 'Anda bisa mengunduh ulang file yang sama dalam ' + S.cfg.unduhUlangJam + ' jam tanpa memotong kuota, walaupun pengaturannya diubah.'],
      ['Bagaimana bila file gagal diimpor ke e-Rapor?', 'Hubungi admin lewat WhatsApp. Kuota yang terpakai untuk file gagal akan diganti.'],
      ['Apakah perlu membuat akun?', 'Tidak perlu. Cukup masukkan kode pembelian saat ingin mengunduh file hasil.']
    ];
    const main = '<div class="stack" style="gap:44px;max-width:1080px;margin:0 auto">' +
      '<section class="center stack-sm" style="align-items:center"><h1 class="h1">Cara Pembelian Kode EduGrade</h1><p class="lead" style="max-width:600px">Pilih paket sesuai kebutuhan. Tanpa langganan bulanan, cukup bayar sekali saat butuh.</p></section>' +
      (S.cfg.banner ? '<div class="info">' + icon('info') + '<div>' + esc(S.cfg.banner) + '</div></div>' : '') +
      '<section class="grid-3" style="gap:24px;align-items:stretch">' + ps.map(card).join('') + '</section>' +
      '<section class="info" style="padding:22px">' + icon('info') + '<div class="stack-xs"><b class="h3">Apa itu kuota?</b><span>1 kuota dipakai setiap kali Anda mengunduh 1 file hasil. Mencoba, mengunggah, dan melihat pratinjau selalu gratis. Unduh ulang file yang sama dalam ' + S.cfg.unduhUlangJam + ' jam tidak memotong kuota.</span></div></section>' +
      '<section class="stack-sm"><h2 class="h2 center">4 langkah mudah membeli kode</h2><div class="grid-4">' +
      (canPay() ? [['Pilih paket', 'Klik Beli Sekarang dan isi nama, sekolah, serta nomor WhatsApp.'], ['Bayar', 'Transfer ke rekening atau scan QRIS sesuai total yang tertera.'], ['Konfirmasi', 'Kirim bukti bayar lewat tombol WhatsApp di halaman pembayaran.'], ['Terima kode', 'Kode dikirim ke email dan WhatsApp, dan juga tampil di halaman pesanan.']]
        : [['Pilih paket', 'Klik tombol Pesan lewat WhatsApp pada paket yang sesuai.'], ['Kirim pesan', 'Admin membalas dengan total biaya dan nomor rekening.'], ['Bayar dan konfirmasi', 'Kirim bukti transfer di chat WhatsApp yang sama.'], ['Terima kode', 'Kode dikirim ke email dan WhatsApp Anda, siap dipakai.']]).map((s, i) => '<div class="card-flat stack-sm"><span class="step-num tnum">' + (i + 1) + '</span><h3 class="h3">' + s[0] + '</h3><p class="muted">' + s[1] + '</p></div>').join('') + '</div></section>' +
      '<section class="card-flat stack-sm" style="max-width:520px;margin:0 auto;width:100%"><label class="label" for="refIn">Kode referensi (jika ada)</label><div class="row"><input id="refIn" class="input grow" placeholder="Contoh: IBUANI10" style="text-transform:uppercase" value="' + esc(S.ref) + '"><button class="btn btn-secondary" style="height:48px" data-act="setRef">Pasang</button></div>' + (S.ref ? '<span class="small t-success">' + icon('check', 'ic-sm') + ' Kode referensi ' + esc(S.ref) + ' akan ikut di pesan WhatsApp.</span>' : '') + '</section>' +
      '<section class="stack-sm" style="max-width:820px;margin:0 auto;width:100%"><h2 class="h2 center">Pertanyaan yang sering diajukan</h2><div class="card p0">' + faq.map((f, i) => '<details class="faq" ' + (i === 0 ? 'open' : '') + '><summary><span>' + f[0] + '</span>' + icon('chev-down', 'muted') + '</summary><p>' + f[1] + '</p></details>').join('') + '</div></section>' +
      '<p class="center small muted">EduGrade tidak berafiliasi dengan Kemendikdasmen. Template e-Rapor milik masing-masing pengguna.</p></div>';
    return { main, title: 'Cara Beli Kode' };
  }


  // ============================================
  // PESANAN & PEMBAYARAN
  // ============================================
  const payCfg = () => S.cfg.bayar || { rekening: [], qris: '', kodeUnik: false, instruksi: '' };
  const canPay = () => { const b = payCfg(); return S.cfg.fromServer && ((b.rekening && b.rekening.length) || b.qris); };
  const myOrders = () => LS.get('rp_orders', []);
  function rememberOrder(o) {
    const list = myOrders().filter(x => x.id !== o.id);
    list.unshift({ id: o.id, wa: o.wa, total: o.total, paket: o.paket, status: o.status, tanggal: o.tanggal });
    LS.set('rp_orders', list.slice(0, 10));
  }
  function pendingOrderStrip() {
    const p = myOrders().filter(o => o.status === 'MENUNGGU');
    if (!p.length) return '';
    const o = p[0];
    return '<div class="info warning row-between" style="align-items:center">' + '<span class="row">' + icon('receipt') + '<span>Anda punya pesanan <b>' + esc(o.paket) + '</b> (' + rupiah(o.total) + ') yang menunggu pembayaran atau verifikasi.</span></span><a class="btn btn-secondary btn-sm" href="#/bayar/' + encodeURIComponent(o.id) + '">Lihat pesanan</a></div>';
  }
  const methods = () => {
    const b = payCfg(), out = [];
    (b.rekening || []).forEach(r => out.push({ v: 'Transfer ' + r.bank, label: 'Transfer ' + r.bank, sub: r.nomor + ' · a.n. ' + r.nama, ic: 'receipt' }));
    if (b.qris) out.push({ v: 'QRIS', label: 'QRIS', sub: 'Scan dari m-banking atau e-wallet (DANA, OVO, GoPay, ShopeePay)', ic: 'sparkles' });
    return out;
  };

  function viewPesan(pid) {
    const p = (S.cfg.paket || []).find(x => x.id === pid);
    if (!p) return { main: '<div class="narrow stack"><div class="info warning">' + icon('alert') + '<div>Paket tidak ditemukan. <a href="#/beli">Kembali ke daftar paket</a>.</div></div></div>' };
    if (!canPay()) return { main: '<div class="narrow stack"><div class="info">' + icon('info') + '<div>Pembelian langsung belum tersedia. Silakan <a target="_blank" rel="noopener" href="' + U.waLink(S.cfg.wa, 'Halo Admin EduGrade, saya ingin membeli ' + p.nama + '.') + '"><b>pesan lewat WhatsApp</b></a>.</div></div></div>' };
    const ms = methods();
    S.pesan = S.pesan && S.pesan.pid === pid ? S.pesan : { pid, metode: ms[0].v };
    const last = LS.get('rp_buyer', {});
    const main = '<div class="stack" style="max-width:1080px;margin:0 auto">' + '<a class="link-btn" href="#/beli" style="align-self:flex-start">' + icon('arrow-left', 'ic-sm') + ' Kembali ke daftar paket</a>' +
      pageHead('Pesan ' + esc(p.nama), 'Isi data singkat di bawah. Kode dikirim ke email dan WhatsApp setelah pembayaran diperiksa.') +
      '<form id="orderForm" class="split" data-form="order" novalidate><div class="stack">' +
      '<section class="card stack-sm"><h2 class="h3">1. Data pemesan</h2><div class="grid-2" style="gap:16px">' +
      '<label class="field"><span class="field-label">Nama lengkap *</span><input class="input" name="nama" required value="' + esc(last.nama || '') + '" placeholder="Contoh: Sri Wahyuni, S.Pd."></label>' +
      '<label class="field"><span class="field-label">Nama sekolah</span><input class="input" name="sekolah" value="' + esc(last.sekolah || '') + '" placeholder="Contoh: SDN 1 Bojonegoro"></label>' +
      '<label class="field"><span class="field-label">Nomor WhatsApp *</span><input class="input" name="wa" inputmode="tel" required value="' + esc(last.wa || '') + '" placeholder="0812xxxxxxxx"></label>' +
      '<label class="field"><span class="field-label">Email <span class="small muted">(disarankan)</span></span><input class="input" name="email" type="email" value="' + esc(last.email || '') + '" placeholder="nama@contoh.com"></label></div>' +
      '<label class="field"><span class="field-label">Kode referensi <span class="small muted">(jika ada)</span></span><input class="input" name="ref" style="text-transform:uppercase" value="' + esc(S.ref) + '" placeholder="Contoh: IBUANI10"></label>' +
      '<input type="text" name="website" tabindex="-1" autocomplete="off" class="sr-only" aria-hidden="true"></section>' +
      '<section class="card stack-sm"><h2 class="h3">2. Pilih cara bayar</h2><div class="stack-sm">' +
      ms.map(m => '<div class="choice choice-row ' + (S.pesan.metode === m.v ? 'on' : '') + '" role="radio" tabindex="0" data-act="payPick" data-v="' + esc(m.v) + '"><span class="tick">' + icon('check', 'ic-sm') + '</span><span class="icon-tile sm">' + icon(m.ic) + '</span><span class="stack-xs"><b>' + esc(m.label) + '</b><span class="small muted">' + esc(m.sub) + '</span></span></div>').join('') + '</div></section></div>' +
      '<aside class="sticky-side"><div class="card stack-sm"><h2 class="h3">Ringkasan pesanan</h2><dl class="kv" style="grid-template-columns:110px 1fr"><dt>Paket</dt><dd>' + esc(p.nama) + '</dd><dt>Kuota</dt><dd>' + p.kuota + ' unduhan</dd><dt>Masa berlaku</dt><dd>' + U.masa(p.jam) + ' sejak unduhan pertama</dd><dt>Harga</dt><dd class="tnum">' + rupiah(p.harga) + '</dd></dl>' +
      (payCfg().kodeUnik ? '<p class="small muted">Total akhir ditambah kode unik 1–299 rupiah agar pembayaran Anda mudah dikenali.</p>' : '') +
      '<div id="orderErr"></div><button class="btn btn-primary btn-lg btn-block" type="submit">' + icon('check') + 'Buat Pesanan</button>' +
      '<p class="small muted center">Dengan memesan, Anda setuju kode hanya dipakai untuk keperluan sendiri/sekolah Anda.</p></div></aside></form></div>';
    return { main, title: 'Pesan ' + p.nama };
  }

  async function submitOrder(form) {
    const f = new FormData(form), btn = form.querySelector('[type=submit]');
    const d = { paket_id: S.pesan.pid, nama: f.get('nama'), sekolah: f.get('sekolah'), wa: f.get('wa'), email: f.get('email'), ref: f.get('ref'), metode: S.pesan.metode, website: f.get('website') };
    const err = m => { $('#orderErr').innerHTML = '<div class="err-msg">' + icon('alert-circle') + esc(m) + '</div>'; };
    if (!String(d.nama || '').trim()) return err('Nama wajib diisi.');
    if (String(d.wa || '').replace(/[^0-9]/g, '').length < 9) return err('Nomor WhatsApp belum benar. Contoh: 081234567890.');
    btn.disabled = true; btn.innerHTML = '<span class="spinner" style="border-top-color:#fff"></span> Membuat pesanan...';
    const r = await A.call('order', d, { retries: 1 });
    btn.disabled = false; btn.innerHTML = icon('check') + 'Buat Pesanan';
    if (!r.success) return err(r.message || 'Pesanan gagal dibuat.');
    LS.set('rp_buyer', { nama: d.nama, sekolah: d.sekolah, wa: d.wa, email: d.email });
    if (d.ref) { S.ref = String(d.ref).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16); LS.set('rp_ref', S.ref); }
    S.orders = S.orders || {}; S.orders[r.data.id] = r.data;
    rememberOrder(r.data);
    go('#/bayar/' + encodeURIComponent(r.data.id));
  }

  async function refreshOrder(id, silent) {
    const saved = myOrders().find(o => o.id === id);
    if (!saved) return null;
    const r = await A.call('orderStatus', { id, wa: saved.wa }, { retries: 1 });
    if (r.success) {
      const prev = S.orders && S.orders[id];
      S.orders = S.orders || {}; S.orders[id] = r.data; rememberOrder(r.data);
      if (!silent && prev && prev.status === r.data.status) U.toast(r.data.status === 'MENUNGGU' ? 'Pembayaran belum diverifikasi. Mohon tunggu sebentar.' : 'Status diperbarui.', 'info');
      return r.data;
    }
    if (!silent) U.toast(r.message, 'error');
    return null;
  }

  function viewBayar(id) {
    const o = S.orders && S.orders[id];
    if (!o) {
      const saved = myOrders().find(x => x.id === id);
      if (!saved) return { main: '<div class="narrow stack"><div class="info warning">' + icon('alert') + '<div>Pesanan tidak ditemukan di browser ini. <a href="#/beli">Buat pesanan baru</a> atau hubungi admin.</div></div></div>' };
      return { main: '<div class="narrow card"><div class="skeleton"></div><div class="skeleton mt-sm"></div><div class="skeleton mt-sm" style="width:60%"></div></div>', after: async () => { if (await refreshOrder(id, true)) render(); else $('#main').innerHTML = '<div class="container"><div class="narrow info danger">' + icon('alert-circle') + '<div>Pesanan tidak bisa dimuat. Periksa internet Anda lalu muat ulang halaman.</div></div></div>'; } };
    }
    const b = payCfg();
    const head = '<a class="link-btn" href="#/beli" style="align-self:flex-start">' + icon('arrow-left', 'ic-sm') + ' Daftar paket</a>';
    if (o.status === 'LUNAS') {
      return {
        main: '<div class="narrow stack">' + head + '<section class="card stack" style="align-items:center;text-align:center;padding:36px"><div class="icon-tile success" style="width:72px;height:72px;border-radius:50%">' + icon('check', 'ic-lg') + '</div><h1 class="h2">Pembayaran diterima</h1><p class="lead">Terima kasih, ' + esc(o.nama) + '. Ini kode Anda:</p><div class="code-box" style="width:100%">' + esc(o.kode) + '</div>' +
          '<div class="row wrap" style="justify-content:center"><button class="btn btn-outline" data-act="copy" data-v="' + esc(o.kode) + '">' + icon('copy', 'ic-sm') + 'Salin kode</button><button class="btn btn-primary btn-lg" data-act="useOrderCode" data-v="' + esc(o.kode) + '">' + icon('key') + 'Pakai kode ini</button></div>' +
          '<p class="small muted">Kode juga dikirim ke ' + (o.email ? 'email ' + esc(o.email) + ' dan ' : '') + 'WhatsApp Anda. Simpan baik-baik.</p></section></div>', title: 'Pesanan ' + o.id
      };
    }
    if (o.status === 'BATAL') {
      return { main: '<div class="narrow stack">' + head + '<div class="info danger">' + icon('alert-circle') + '<div><b>Pesanan ' + esc(o.id) + ' dibatalkan.</b>' + (o.catatan ? '<br>' + esc(o.catatan) : '') + '<br>Bila Anda sudah membayar, <a target="_blank" rel="noopener" href="' + U.waLink(S.cfg.wa, 'Halo Admin EduGrade, pesanan saya ' + o.id + ' dibatalkan padahal saya sudah membayar.') + '">hubungi admin lewat WhatsApp</a>.</div></div><a class="btn btn-primary" href="#/beli">Buat pesanan baru</a></div>', title: 'Pesanan dibatalkan' };
    }
    const isQris = /^QRIS/.test(o.metode);
    const rek = (b.rekening || []).find(r => o.metode === 'Transfer ' + r.bank);
    const methodBox = isQris && b.qris ? '<div class="stack-sm" style="align-items:center"><img src="' + esc(b.qris) + '" alt="Kode QRIS EduGrade" style="width:100%;max-width:320px;border-radius:16px;border:1px solid var(--border);background:#fff" referrerpolicy="no-referrer"><a class="link-btn small" href="' + esc(b.qris) + '" target="_blank" rel="noopener">Buka gambar QRIS ukuran penuh</a><p class="small muted center">Buka m-banking atau e-wallet, pilih Scan QRIS, lalu masukkan nominal <b>' + rupiah(o.total) + '</b>.</p></div>'
      : rek ? '<div class="card-flat stack-sm" style="background:var(--page)"><span class="small muted">Transfer ke rekening</span><b class="h3">' + esc(rek.bank) + '</b><div class="row wrap"><span class="mono b" style="font-size:22px">' + esc(rek.nomor) + '</span><button class="btn btn-outline btn-sm" data-act="copy" data-v="' + esc(rek.nomor) + '">' + icon('copy', 'ic-sm') + 'Salin</button></div><span>a.n. <b>' + esc(rek.nama) + '</b></span></div>'
        : '<div class="info warning">' + icon('alert') + '<div>Metode ' + esc(o.metode) + ' sudah tidak tersedia. Pilih cara bayar lain di bawah.</div></div>';
    const others = methods().filter(m => m.v !== o.metode);
    const waMsg = 'Halo Admin EduGrade, saya sudah membayar pesanan.\n\nNo. pesanan: ' + o.id + '\nNama: ' + o.nama + (o.sekolah ? '\nSekolah: ' + o.sekolah : '') + '\nPaket: ' + o.paket + '\nTotal: ' + rupiah(o.total) + '\nMetode: ' + o.metode + '\n\n(Bukti bayar saya lampirkan)';
    const main = '<div class="stack" style="max-width:1000px;margin:0 auto">' + head +
      pageHead('Selesaikan Pembayaran', 'No. pesanan <b class="mono">' + esc(o.id) + '</b> · ' + esc(o.paket), '<span class="pill pill-warning">Menunggu pembayaran</span>') +
      (o.beliSendiri ? '<div class="info">' + icon('info') + '<div>Kode referensi yang dipakai milik Anda sendiri, jadi pembelian ini tidak menghasilkan komisi.</div></div>' : '') +
      '<div class="split"><div class="stack">' +
      '<section class="card stack-sm" style="text-align:center;align-items:center"><span class="muted">Total yang harus dibayar</span><div class="row" style="justify-content:center"><span class="tnum" style="font-size:40px;line-height:48px;font-weight:700">' + rupiah(o.total) + '</span><button class="icon-btn" data-act="copy" data-v="' + o.total + '" title="Salin nominal">' + icon('copy') + '</button></div>' +
      (o.kodeUnik ? '<span class="small muted tnum">' + rupiah(o.harga) + ' + kode unik ' + o.kodeUnik + '</span><div class="info warning" style="text-align:left">' + icon('alert') + '<div>Transfer <b>tepat ' + rupiah(o.total) + '</b> sampai 3 angka terakhir agar pembayaran langsung dikenali.</div></div>' : '') + '</section>' +
      '<section class="card stack-sm"><h2 class="h3">' + esc(o.metode) + '</h2>' + methodBox +
      (others.length ? '<details class="adv"><summary>Pakai cara bayar lain</summary><div class="stack-sm mt-sm">' + others.map(m => m.v === 'QRIS' ? '<div class="card-flat row-between"><span><b>QRIS</b><br><span class="small muted">' + esc(m.sub) + '</span></span><a class="btn btn-outline btn-sm" href="' + esc(b.qris) + '" target="_blank" rel="noopener">Lihat QRIS</a></div>' : '<div class="card-flat row-between"><span><b>' + esc(m.label) + '</b><br><span class="mono">' + esc(m.sub) + '</span></span><button class="btn btn-outline btn-sm" data-act="copy" data-v="' + esc(m.sub.split(' · ')[0]) + '">' + icon('copy', 'ic-sm') + 'Salin</button></div>').join('') + '<p class="small muted">Sebutkan cara bayar yang Anda pakai saat konfirmasi.</p></div></details>' : '') + '</section></div>' +
      '<aside class="stack"><section class="card stack-sm"><h2 class="h3">Langkah berikutnya</h2>' +
      [['Bayar', 'Bayar sesuai total di sebelah kiri.'], ['Konfirmasi', 'Kirim bukti bayar lewat WhatsApp.'], ['Terima kode', 'Kode dikirim ke email dan WhatsApp, juga tampil di halaman ini.']].map((x, i) => '<div class="row" style="align-items:flex-start"><span class="step-num tnum" style="width:32px;height:32px;font-size:15px;flex:none">' + (i + 1) + '</span><div class="stack-xs"><b>' + x[0] + '</b><span class="small muted">' + x[1] + '</span></div></div>').join('') +
      (b.instruksi ? '<p class="small muted">' + esc(b.instruksi) + '</p>' : '') +
      '<a class="btn btn-primary btn-lg btn-block" target="_blank" rel="noopener" href="' + U.waLink(S.cfg.wa, waMsg) + '">' + icon('chat') + 'Saya sudah bayar · Konfirmasi lewat WhatsApp</a>' +
      '<button class="btn btn-outline btn-block" data-act="orderRefresh" data-v="' + esc(o.id) + '">' + icon('refresh', 'ic-sm') + 'Cek status pembayaran</button></section>' +
      '<p class="small muted">Simpan nomor pesanan <b class="mono">' + esc(o.id) + '</b>. Halaman ini juga bisa dibuka lagi dari Beranda di browser yang sama.</p></aside></div></div>';
    return { main, title: 'Pembayaran ' + o.id };
  }

  // ============================================
  // JADI AFFILIATE
  // ============================================
  function viewAff() {
    const a = S.cfg.affiliate || { terbuka: false, persen: 0 };
    const pct = a.persen || 0;
    const contoh = (S.cfg.paket || []).find(p => p.populer) || (S.cfg.paket || [])[0];
    const main = '<div class="stack" style="gap:40px;max-width:1080px;margin:0 auto">' +
      '<section class="card" style="background:linear-gradient(120deg,#1D5BD6,#1546A8);color:#fff;border:0;padding:40px"><div class="stack-sm" style="max-width:640px"><span class="pill" style="background:rgba(255,255,255,.18);color:#fff;align-self:flex-start">Program Affiliate EduGrade</span>' +
      '<h1 class="h1">Bantu sesama guru, dapatkan komisi ' + pct + '%</h1><p style="opacity:.92;font-size:17px">Bagikan EduGrade ke rekan guru, KKG/MGMP, atau grup sekolah. Setiap pembelian lewat kode referral Anda menghasilkan komisi, dicatat otomatis dan bisa Anda pantau di dasbor sendiri.</p>' +
      '<div class="row wrap mt-sm"><a class="btn btn-lg" style="background:#fff;color:var(--primary)" href="#daftar-aff" data-act="scrollAff">' + icon('users') + 'Daftar sekarang</a><a class="btn btn-lg" style="border-color:rgba(255,255,255,.6);color:#fff" href="admin.html">Sudah terdaftar? Masuk</a></div></div></section>' +
      '<section class="grid-3">' + [['receipt', 'Komisi ' + pct + '% tiap penjualan', contoh ? 'Contoh: ' + contoh.nama + ' ' + rupiah(contoh.harga) + ' → komisi ' + rupiah(contoh.harga * pct / 100) + '.' : 'Dihitung otomatis dari harga paket.'], ['dashboard', 'Dasbor pribadi', 'Lihat penjualan, komisi, dan status pembayaran komisi kapan saja.'], ['share', 'Tanpa modal', 'Cukup bagikan tautan dan kode referral. Tidak perlu stok atau mengurus pembayaran.']]
        .map(x => '<div class="card stack-sm"><div class="icon-tile">' + icon(x[0], 'ic-lg') + '</div><h2 class="h3">' + x[1] + '</h2><p class="muted">' + x[2] + '</p></div>').join('') + '</section>' +
      '<section class="stack-sm"><h2 class="h2 center">Cara kerjanya</h2><div class="grid-4">' + [['Daftar', 'Isi formulir di bawah. Admin memeriksa dan mengirim akun Anda.'], ['Bagikan', 'Sebarkan tautan atau kode referral Anda ke rekan guru.'], ['Guru membeli', 'Guru memesan dengan kode referral Anda.'], ['Terima komisi', 'Komisi tercatat otomatis dan dibayarkan admin.']].map((x, i) => '<div class="card-flat stack-sm"><span class="step-num tnum">' + (i + 1) + '</span><h3 class="h3">' + x[0] + '</h3><p class="muted">' + x[1] + '</p></div>').join('') + '</div></section>' +
      '<section class="grid-2"><div class="card stack-sm"><h2 class="h3">Cocok untuk</h2><ul class="checklist" style="border:0;padding:0">' + ['Guru yang aktif di grup WhatsApp sekolah', 'Pengurus KKG / MGMP', 'Operator sekolah dan pembuat konten pendidikan', 'Siapa pun yang sering membantu guru soal e-Rapor'].map(t => '<li>' + icon('check') + '<span>' + t + '</span></li>').join('') + '</ul></div>' +
      '<div class="card stack-sm"><h2 class="h3">Ketentuan singkat</h2><ul class="checklist" style="border:0;padding:0">' + ['Komisi dihitung dari harga paket yang dibayar pembeli', 'Pembelian untuk diri sendiri dengan kode sendiri tidak mendapat komisi', 'Komisi dibayarkan admin secara berkala', 'Dilarang menjanjikan hal yang tidak benar tentang EduGrade'].map(t => '<li>' + icon('info') + '<span>' + t + '</span></li>').join('') + '</ul></div></section>' +
      '<section id="daftar-aff" class="card stack" style="max-width:720px;margin:0 auto;width:100%">' + (a.terbuka ? '<div class="stack-xs"><h2 class="h2">Formulir pendaftaran affiliate</h2><p class="muted">Admin akan memeriksa dan mengirim info akun lewat email dan WhatsApp.</p></div>' +
        '<form class="stack-sm" data-form="aff" novalidate><div class="grid-2" style="gap:16px"><label class="field"><span class="field-label">Nama lengkap *</span><input class="input" name="nama" required></label><label class="field"><span class="field-label">Nomor WhatsApp *</span><input class="input" name="wa" inputmode="tel" required placeholder="0812xxxxxxxx"></label></div>' +
        '<label class="field"><span class="field-label">Email * <span class="small muted">(untuk masuk ke dasbor)</span></span><input class="input" type="email" name="email" required></label>' +
        '<label class="field"><span class="field-label">Sekolah / komunitas</span><input class="input" name="sekolah" placeholder="Contoh: KKG Gugus 3 Kudus"></label>' +
        '<label class="field"><span class="field-label">Bagaimana Anda akan membagikan EduGrade?</span><textarea class="textarea" name="alasan" style="min-height:90px" placeholder="Contoh: grup WA guru SD se-kecamatan (±200 anggota)"></textarea></label>' +
        '<input type="text" name="website" tabindex="-1" autocomplete="off" class="sr-only" aria-hidden="true"><div id="affErr"></div><button class="btn btn-primary btn-lg" type="submit">' + icon('check') + 'Kirim Pendaftaran</button></form>'
        : '<div class="info">' + icon('info') + '<div>Pendaftaran affiliate sedang ditutup. <a target="_blank" rel="noopener" href="' + U.waLink(S.cfg.wa, 'Halo Admin EduGrade, saya tertarik menjadi affiliate.') + '">Hubungi admin lewat WhatsApp</a> bila tertarik.</div></div>') + '</section></div>';
    return { main, title: 'Jadi Affiliate' };
  }
  async function submitAff(form) {
    const f = new FormData(form), btn = form.querySelector('[type=submit]');
    const d = { nama: f.get('nama'), wa: f.get('wa'), email: f.get('email'), sekolah: f.get('sekolah'), alasan: f.get('alasan'), website: f.get('website') };
    const err = m => { $('#affErr').innerHTML = '<div class="err-msg">' + icon('alert-circle') + esc(m) + '</div>'; };
    if (!String(d.nama || '').trim()) return err('Nama wajib diisi.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(d.email || '').trim())) return err('Email belum benar.');
    if (String(d.wa || '').replace(/[^0-9]/g, '').length < 9) return err('Nomor WhatsApp belum benar.');
    btn.disabled = true; btn.innerHTML = '<span class="spinner" style="border-top-color:#fff"></span> Mengirim...';
    const r = await A.call('affApply', d, { retries: 1 });
    if (!r.success) { btn.disabled = false; btn.innerHTML = icon('check') + 'Kirim Pendaftaran'; return err(r.message); }
    form.parentElement.innerHTML = '<div class="stack" style="align-items:center;text-align:center;padding:12px"><div class="icon-tile success" style="width:64px;height:64px;border-radius:50%">' + icon('check', 'ic-lg') + '</div><h2 class="h2">Pendaftaran terkirim</h2><p class="muted">' + esc(r.message) + '</p><a class="btn btn-secondary" href="#/">Kembali ke Beranda</a></div>';
  }

  function showHelp() {
    U.modal(modalHead('Bantuan singkat', 'help') + '<div class="stack-sm">' +
      [['KKM', 'Batas nilai tuntas. Siswa dengan nilai di bawah KKM dianggap belum tuntas.'], ['Nilai terendah dan tertinggi', 'Rentang nilai baru yang Anda inginkan. Nilai asli terendah menjadi nilai terendah baru, dan seterusnya.'], ['TP', 'Tujuan Pembelajaran. Di template e-Rapor tiap TP punya kode seperti TP.125.'], ['T dan R', 'T (Tinggi) untuk TP yang dicapai sangat baik, R (Rendah) untuk TP yang perlu ditingkatkan.'], ['Kuota', '1 file yang diunduh = 1 kuota. Unduh ulang file yang sama dalam ' + S.cfg.unduhUlangJam + ' jam gratis.']]
        .map(x => '<div><b>' + x[0] + '</b><p class="muted">' + x[1] + '</p></div>').join('') + '</div>' +
      '<a class="btn btn-primary btn-block" target="_blank" rel="noopener" href="' + U.waLink(S.cfg.wa, 'Halo Admin EduGrade, saya butuh bantuan.') + '">' + icon('chat') + 'Chat admin lewat WhatsApp</a>', { wide: true });
  }

  // ============================================
  // EVENT (delegasi)
  // ============================================
  const ACT = {
    nav: el => go(el.dataset.href),
    goStep: el => go(el.dataset.href),
    menu: () => $('#nav').classList.toggle('open'),
    help: showHelp,
    openCode: async () => { await openCodeModal('view'); render(); },
    payPick: el => { S.pesan.metode = el.dataset.v; document.querySelectorAll('[data-act="payPick"]').forEach(x => x.classList.toggle('on', x === el)); },
    copy: el => U.copyText(el.dataset.v),
    orderRefresh: async el => { el.innerHTML = '<span class="spinner"></span>Memeriksa...'; await refreshOrder(el.dataset.v); render(); },
    useOrderCode: async el => { el.disabled = true; const r = await A.call('checkCode', { kode: el.dataset.v }); if (r.success) { setCode(r.data); U.toast('Kode siap dipakai. Sisa kuota ' + r.data.sisa + '.', 'success'); go('#/'); } else { U.toast(r.message, 'error'); el.disabled = false; } },
    scrollAff: () => { const t = document.getElementById('daftar-aff'); if (t) t.scrollIntoView({ behavior: 'smooth' }); },
    setRef: () => { S.ref = ($('#refIn').value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16); LS.set('rp_ref', S.ref); render(); if (S.ref) U.toast('Kode referensi dipasang.', 'success'); },
    // Ubah Nilai
    kMethod: el => { S.k.method = el.dataset.m; S.k.overrides = {}; render(); liveUbah2(); },
    kkmMode: el => { S.k.kkmMode = el.dataset.m; S.k.overrides = {}; $('#cardC').innerHTML = kkmCardInner(); liveUbah2(); },
    kkmStep: el => { S.k.kkm = Math.max(0, Math.min(100, (+S.k.kkm || 0) + (+el.dataset.d))); const i = document.querySelector('[data-in="kKkm"]'); if (i) i.value = S.k.kkm; S.k.overrides = {}; liveUbah2(); },
    bulkApply: () => { const v = num($('#bulkVal').value); if (v == null || v < 0 || v > 100) return U.toast('KKM harus antara 0 sampai 100.', 'error'); S.k.bulk.forEach(c => { S.k.perKkm[c] = v; }); U.toast('KKM ' + v + ' diterapkan ke ' + S.k.bulk.length + ' mapel.', 'success'); S.k.bulk = []; S.k.overrides = {}; $('#cardC').innerHTML = kkmCardInner(); liveUbah2(); },
    bulkClear: () => { S.k.bulk = []; $('#cardC').innerHTML = kkmCardInner(); },
    allApply: () => { const v = num($('#allVal').value); if (v == null || v < 0 || v > 100) return U.toast('KKM harus antara 0 sampai 100.', 'error'); kCols().forEach(c => { S.k.perKkm[c.c] = v; }); S.k.kkm = v; S.k.overrides = {}; $('#cardC').innerHTML = kkmCardInner(); liveUbah2(); },
    perH: () => { S.k.perH = !S.k.perH; S.k.overrides = {}; $('#cardD').innerHTML = hCardInner(); liveUbah2(); },
    kTab: el => { S.k.tab = +el.dataset.c; S.k.page = 0; render(); },
    kTab3: el => { S.k.tab = +el.dataset.c; S.k.page = 0; render(); },
    kTab4: el => { S.k.tab = +el.dataset.c; S.k.page = 0; render(); },
    kPage: el => { S.k.page = Math.max(0, +el.dataset.p); render(); },
    kFilter: el => { S.k.filter = el.dataset.f; S.k.page = 0; render(); },
    kReset: () => { delete S.k.overrides[S.k.tab]; render(); },
    dlKonv: downloadKonversi,
    kEditAgain: () => { S.k.done = false; go('#/ubah/2'); },
    // e-Rapor
    tplRemove: el => { S.e.tpls.splice(+el.dataset.i, 1); S.e.outputs = null; S.e.tab = 0; render(); },
    erSrc: el => { S.e.src = el.dataset.v; S.e.tpls.forEach(m => { m.sheet = null; }); render(); },
    critReset: () => { S.e.crit = { tMin: DEF_PREFS.tMin, rMax: DEF_PREFS.rMax }; Object.assign(S.prefs, S.e.crit); savePrefs(); render(); },
    erTab: el => { S.e.tab = +el.dataset.i; S.e.stuFilter = null; render(); },
    erTab4: el => { S.e.tab = +el.dataset.i; render(); },
    stuFilter: el => { S.e.stuFilter = el.dataset.f; render(); },
    stuOk: el => { const m = S.e.tpls[S.e.tab]; m.stuStatus[+el.dataset.i] = 'ok'; render(); },
    erFilter: el => { S.e.filter = el.dataset.f; render(); },
    erReset: () => { S.e.tpls[S.e.tab].edits = {}; render(); },
    cycle: el => {
      const m = S.e.tpls[S.e.tab], i = +el.dataset.i, k = +el.dataset.k;
      const row = erRows(m).find(r => r.i === i);
      const marks = row.marks.slice();
      marks[k] = marks[k] === 'T' ? 'R' : marks[k] === 'R' ? '' : 'T';
      m.edits[i] = marks;
      S.e.outputs = null;
      const y = window.scrollY; render(); window.scrollTo(0, y);
    },
    dlErapor: downloadErapor,
    dlZip: async () => U.saveFile(await E.zipFiles(S.e.outputs), 'e-Rapor_EduGrade_' + localDate() + '.zip', 'application/zip'),
    dlOne: el => { const o = S.e.outputs[+el.dataset.i]; U.saveFile(o.data, o.name); }
  };
  const INPUT = {
    kKkm: el => { S.k.kkm = el.value; S.k.overrides = {}; liveUbah2(); },
    kH1: el => { S.k.h1 = el.value; S.k.overrides = {}; liveUbah2(); },
    kH2: el => { S.k.h2 = el.value; S.k.overrides = {}; liveUbah2(); },
    kT: el => { S.k.t = el.value === '' ? null : el.value; S.k.overrides = {}; liveUbah2(); },
    kN: el => { S.k.n = el.value; S.k.overrides = {}; liveUbah2(); },
    perKkm: el => { S.k.perKkm[+el.dataset.c] = el.value === '' ? null : el.value; S.k.overrides = {}; liveUbah2(); },
    perH1: el => { S.k.perH1[+el.dataset.c] = el.value; S.k.overrides = {}; liveUbah2(); },
    perH2: el => { S.k.perH2[+el.dataset.c] = el.value; S.k.overrides = {}; liveUbah2(); },
    kSearch: el => { S.k.search = el.value; S.k.page = 0; debounceRender(el); },
    kSearch4: el => { S.k.search = el.value; S.k.page = 0; debounceRender(el); },
    erSearch: el => { S.e.search = el.value; debounceRender(el); },
    crit: el => {
      S.e.crit[el.dataset.k] = el.value; Object.assign(S.prefs, S.e.crit); savePrefs();
      const ce = critErr(), box = $('#critErr'); if (box) box.innerHTML = ce ? '<div class="err-msg">' + icon('alert-circle') + esc(ce) + '</div>' : '';
      const nb = $('#nextBtn'); if (nb) nb.disabled = !!ce || !teacherWb();
      S.e.tpls.forEach(m => { m.edits = {}; }); S.e.outputs = null;
    }
  };
  const CHANGE = {
    file: el => { onFiles(el.dataset.target, el.files); },
    kSheet: el => { setKSheet(el.value); render(); },
    kCol: el => { const c = +el.dataset.c; const k = S.k; k.selected = el.checked ? k.selected.concat(c).sort((a, b) => a - b) : k.selected.filter(x => x !== c); k.overrides = {}; render(); },
    kDec: el => { S.k.dec = +el.value; S.k.overrides = {}; liveUbah2(); },
    kTab: el => { S.k.tab = +el.value; const pv = $('#preview'); if (pv) pv.innerHTML = previewInner(); },
    bulkAll: el => { S.k.bulk = el.checked ? kCols().map(c => c.c) : []; $('#cardC').innerHTML = kkmCardInner(); },
    bulkOne: el => { const c = +el.dataset.c; S.k.bulk = el.checked ? S.k.bulk.concat(c) : S.k.bulk.filter(x => x !== c); $('#cardC').innerHTML = kkmCardInner(); },
    kEdit: el => {
      const v = num(el.value), i = +el.dataset.i, c = S.k.tab;
      if (v == null || v < 0 || v > 100) { U.toast('Nilai harus antara 0 sampai 100.', 'error'); render(); return; }
      const auto = kResult(c).auto[i];
      S.k.overrides[c] = S.k.overrides[c] || {};
      if (Math.abs(v - auto) < 1e-9) delete S.k.overrides[c][i]; else S.k.overrides[c][i] = v;
      const y = window.scrollY; render(); window.scrollTo(0, y);
    },
    erSheet: el => { const m = S.e.tpls[S.e.tab]; m.sheet = el.value; prepare(m, true); S.e.stuFilter = null; S.e.outputs = null; render(); },
    erNa: el => { S.e.tpls[S.e.tab].naSrc = el.value; S.e.outputs = null; render(); },
    erTp: el => { const m = S.e.tpls[S.e.tab], k = +el.dataset.k; const j = el.value === '' ? null : +el.value; m.tpMap = m.tpMap.map((x, kk) => (kk !== k && x === j && j != null ? null : x)); m.tpMap[k] = j; m.tpStatus[k] = 'ok'; m.edits = {}; S.e.outputs = null; render(); },
    erStu: el => { const m = S.e.tpls[S.e.tab], i = +el.dataset.i; const j = el.value === '' ? null : +el.value; m.stuMap[i] = j; m.stuStatus[i] = j == null ? 'skip' : 'ok'; delete m.edits[i]; S.e.outputs = null; const y = window.scrollY; render(); window.scrollTo(0, y); },
    force: el => { S.e.force = el.checked; render(); },
    selOut: el => { const id = el.dataset.id; S.e.sel = el.checked ? S.e.sel.concat(id) : S.e.sel.filter(x => x !== id); render(); }
  };
  let dTimer = null;
  function debounceRender(el) {
    clearTimeout(dTimer);
    const key = el.dataset.in;
    dTimer = setTimeout(() => {
      const pos = el.selectionStart; render();
      const ne = document.querySelector('[data-in="' + key + '"]');
      if (ne) { ne.focus(); try { ne.setSelectionRange(pos, pos); } catch (e) { /* */ } }
    }, 250);
  }

  function bindGlobal() {
    document.addEventListener('click', ev => {
      const el = ev.target.closest('[data-act]');
      if (!el || el.disabled) return;
      const f = ACT[el.dataset.act];
      if (f) { ev.preventDefault(); f(el, ev); }
    });
    document.addEventListener('keydown', ev => {
      if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches('.choice[data-act]')) { ev.preventDefault(); ev.target.click(); }
    });
    document.addEventListener('input', ev => { const el = ev.target; if (el.dataset && el.dataset.in && INPUT[el.dataset.in]) INPUT[el.dataset.in](el); });
    document.addEventListener('submit', ev => {
      const f = ev.target;
      if (f.dataset.form === 'order') { ev.preventDefault(); submitOrder(f); }
      if (f.dataset.form === 'aff') { ev.preventDefault(); submitAff(f); }
    });
    document.addEventListener('change', ev => { const el = ev.target; if (el.dataset && el.dataset.ch && CHANGE[el.dataset.ch]) CHANGE[el.dataset.ch](el); });
    // Seret-lepas file
    ['dragenter', 'dragover'].forEach(t => document.addEventListener(t, ev => { const z = ev.target.closest && ev.target.closest('[data-drop]'); if (z) { ev.preventDefault(); z.classList.add('over'); } }));
    ['dragleave', 'drop'].forEach(t => document.addEventListener(t, ev => { const z = ev.target.closest && ev.target.closest('[data-drop]'); if (z) z.classList.remove('over'); }));
    document.addEventListener('drop', ev => {
      const z = ev.target.closest && ev.target.closest('[data-drop]');
      if (!z) { if (ev.dataTransfer && ev.dataTransfer.files.length) ev.preventDefault(); return; }
      ev.preventDefault();
      onFiles(z.dataset.drop, ev.dataTransfer.files);
    });
    window.addEventListener('dragover', ev => ev.preventDefault());
    window.addEventListener('hashchange', () => { const n = $('#nav'); if (n) n.classList.remove('open'); render(); });
    window.addEventListener('beforeunload', ev => {
      if ((S.k && S.k.file && !S.k.done) || (S.e && S.e.tpls.length && !S.e.outputs)) { ev.preventDefault(); ev.returnValue = ''; }
    });
  }

  // ============================================
  // INIT
  // ============================================
  async function init() {
    const ref = new URLSearchParams(location.search).get('ref');
    if (ref) { S.ref = ref.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16); LS.set('rp_ref', S.ref); }
    bindGlobal();
    render();
    const cfg = await A.getConfig();
    if (cfg) {
      S.cfg = Object.assign(S.cfg, cfg, { fromServer: true });
      if (!cfg.paket || !cfg.paket.length) S.cfg.paket = C.PAKET_CADANGAN;
      render();
    }
    // Segarkan status pesanan yang masih menunggu
    for (const o of myOrders().filter(x => x.status === 'MENUNGGU').slice(0, 3)) await refreshOrder(o.id, true);
    if (parseRoute().page === 'home') render();
    // Segarkan sisa kuota kode tersimpan (diam-diam)
    if (S.code && A.hasServer()) {
      const r = await A.call('checkCode', { kode: S.code.kode }, { retries: 1 });
      if (r.success || r.data) { setCode(r.data); if (parseRoute().page === 'home') render(); }
    }
  }
  document.addEventListener('DOMContentLoaded', init);
  window.__RP = S; // untuk pengujian
})();
