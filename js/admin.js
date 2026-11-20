/* ============================================================
 * EduGrade — Panel Admin & Portal Affiliate
 * ============================================================ */
(function () {
  'use strict';
  const U = window.RPUI, A = window.RPApi;
  const { icon, esc, rupiah, tgl, tglJam } = U;
  const $ = s => document.querySelector(s);
  const LS = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* */ } }
  };
  const S = { sess: LS.get('rp_sess'), cache: {}, kodeQ: { q: '', status: '', paket: '', aff: '' }, kodeSel: [], jualQ: { q: '', tab: 'all', aff: '' }, jualSel: [], role: 'admin' };
  if (S.sess && S.sess.exp < Date.now()) S.sess = null;

  async function api(action, data) {
    const r = await A.call(action, data, { token: S.sess && S.sess.token, retries: 1 });
    if (r.code === 'AUTH') { logout(true); }
    return r;
  }
  function logout(expired) {
    S.sess = null; LS.set('rp_sess', null); S.cache = {};
    if (expired) U.toast('Sesi berakhir. Silakan masuk lagi.', 'warning');
    location.hash = '#/';
    render();
  }

  // ============================================
  // LOGIN
  // ============================================
  function viewLogin() {
    $('#root').innerHTML = '<div class="login-wrap"><div class="card login-card stack" style="padding:32px">' +
      '<div class="row"><img class="brand-mark" src="assets/icon-192.png" alt=""><div><b style="font-size:18px">EduGrade</b><div class="small muted">Portal pengelola</div></div></div>' +
      '<h1 class="h2">Masuk</h1>' +
      '<div class="seg"><button data-role="admin" class="' + (S.role === 'admin' ? 'on' : '') + '">Admin</button><button data-role="affiliate" class="' + (S.role === 'affiliate' ? 'on' : '') + '">Affiliate</button></div>' +
      '<form id="lf" class="stack-sm">' +
      (S.role === 'affiliate' ? '<label class="field"><span class="field-label">Email</span><input class="input" type="email" name="email" autocomplete="username" required></label>' : '') +
      '<label class="field"><span class="field-label">Kata sandi</span><div class="row"><input class="input grow" type="password" name="password" autocomplete="current-password" required><button type="button" class="icon-btn" style="height:48px;width:48px" id="eye" aria-label="Lihat sandi">' + icon('eye') + '</button></div></label>' +
      '<div id="lerr"></div><button class="btn btn-primary btn-lg btn-block" type="submit">Masuk ' + icon('arrow-right') + '</button></form>' +
      (S.role === 'affiliate' ? '<p class="small muted">Lupa sandi? Minta admin untuk mengatur ulang.</p>' : '<p class="small muted">Lupa sandi admin? Jalankan fungsi <b>resetAdminPassword</b> di editor Apps Script.</p>') +
      '<a class="link-btn" href="index.html">' + icon('arrow-left', 'ic-sm') + ' Kembali ke aplikasi guru</a></div></div>';
    document.querySelectorAll('[data-role]').forEach(b => b.addEventListener('click', () => { S.role = b.dataset.role; viewLogin(); }));
    $('#eye').addEventListener('click', () => { const i = $('#lf [name=password]'); i.type = i.type === 'password' ? 'text' : 'password'; });
    $('#lf').addEventListener('submit', async ev => {
      ev.preventDefault();
      const f = new FormData(ev.target), btn = ev.target.querySelector('[type=submit]');
      btn.disabled = true; btn.innerHTML = '<span class="spinner" style="border-top-color:#fff"></span> Memeriksa...';
      const r = await A.call('login', { role: S.role, email: f.get('email'), password: f.get('password') }, { retries: 1 });
      if (r.success) {
        S.sess = { token: r.data.token, role: r.data.role, nama: r.data.nama, exp: Date.now() + 8 * 3600000 };
        LS.set('rp_sess', S.sess);
        location.hash = r.data.role === 'admin' ? '#/ringkasan' : '#/';
        render();
      } else {
        $('#lerr').innerHTML = '<div class="err-msg">' + icon('alert-circle') + esc(r.message) + '</div>';
        btn.disabled = false; btn.innerHTML = 'Masuk ' + icon('arrow-right');
      }
    });
  }

  // ============================================
  // KERANGKA ADMIN
  // ============================================
  const NAV = [['ringkasan', 'dashboard', 'Ringkasan'], ['kode', 'key', 'Kode'], ['penjualan', 'receipt', 'Penjualan'], ['affiliate', 'users', 'Affiliate'], ['paket', 'package', 'Paket & Harga'], ['pengaturan', 'settings', 'Pengaturan'], ['log', 'history', 'Log Aktivitas']];
  function shell(page, title, content, badges) {
    badges = badges || S.badges || {};
    $('#root').innerHTML = '<div class="admin"><aside class="sidebar"><div><div class="brandbar"><img class="brand-mark" style="width:34px;height:34px" src="assets/icon-192.png" alt=""><span class="lbl">EduGrade Admin</span></div><nav>' +
      NAV.map(n => '<a href="#/' + n[0] + '" class="' + (page === n[0] ? 'on' : '') + '" title="' + n[2] + '"><span class="l">' + icon(n[1]) + '<span class="lbl">' + n[2] + '</span></span>' + (badges[n[0]] ? '<span class="badge ' + (n[0] === 'penjualan' ? 'warn' : '') + '">' + badges[n[0]] + '</span>' : '') + '</a>').join('') +
      '</nav></div><div class="out"><button id="logout">' + icon('logout') + '<span class="lbl">Keluar</span></button></div></aside>' +
      '<div class="admin-main"><header class="admin-top"><div class="row small"><span class="muted">Admin</span>' + icon('chev-right', 'ic-sm muted') + '<b>' + esc(title) + '</b></div><div class="row"><a class="btn btn-outline btn-sm" href="index.html" target="_blank">' + icon('eye', 'ic-sm') + 'Lihat aplikasi guru</a><span class="row" style="gap:8px"><span class="rank" style="background:var(--primary-tint);color:var(--primary);width:34px;height:34px">AU</span><b class="small">Admin</b></span></div></header>' +
      '<div class="admin-content" id="content">' + content + '</div></div></div>';
    $('#logout').addEventListener('click', () => logout());
  }
  const skeleton = () => '<div class="grid-4">' + '<div class="stat"><div class="skeleton" style="width:60%"></div><div class="skeleton" style="height:28px;margin-top:10px"></div></div>'.repeat(4) + '</div><div class="card"><div class="skeleton"></div><div class="skeleton mt-sm"></div><div class="skeleton mt-sm" style="width:70%"></div></div>';
  const head = (title, sub, actions) => '<div class="row-between"><div class="stack-xs"><h1 class="h1">' + title + '</h1>' + (sub ? '<p class="muted">' + sub + '</p>' : '') + '</div><div class="row wrap">' + (actions || '') + '</div></div>';
  const stat = (lbl, val, chip, extra) => '<div class="stat"><span class="small muted">' + lbl + '</span><div class="row-between" style="gap:8px"><span class="v">' + val + '</span>' + (chip || '') + '</div>' + (extra || '') + '</div>';
  const kodeStatus = st => '<span class="pill ' + ({ BARU: 'pill-primary', AKTIF: 'pill-success', HABIS: 'pill-neutral', KEDALUWARSA: 'pill-warning', NONAKTIF: 'pill-danger' }[st] || 'pill-neutral') + '">' + esc(st) + '</span>';
  const komisiStatus = st => st === 'BELUM' ? '<span class="pill pill-warning">Belum dibayar</span>' : st === 'DIBAYAR' ? '<span class="pill pill-success">Sudah dibayar</span>' : '<span class="pill pill-neutral">Tanpa komisi</span>';
  const errBox = r => '<div class="info danger">' + icon('alert-circle') + '<div>' + esc(r.message || 'Gagal memuat data.') + ' <button class="link-btn" onclick="location.reload()">Coba lagi</button></div></div>';
  const bar = (used, total) => '<div class="stack-xs" style="min-width:120px"><span class="small tnum"><b>' + used + ' / ' + total + '</b> terpakai</span><div class="progress"><div style="width:' + (total ? Math.min(100, used / total * 100) : 0) + '%"></div></div></div>';

  // ============================================
  // RINGKASAN
  // ============================================
  async function pRingkasan() {
    shell('ringkasan', 'Ringkasan', skeleton());
    const r = await api('admin.dashboard');
    if (!r.success) return ($('#content').innerHTML = errBox(r));
    const d = r.data, k = d.kartu;
    S.badges = { kode: k.kodeAktif, penjualan: k.komisiBelumMitra || '', affiliate: '' };
    const maxJ = Math.max(1, d.perJenis.EREPORT + d.perJenis.KONVERSI);
    shell('ringkasan', 'Ringkasan', head('Ringkasan Penjualan', 'Pantau penjualan kode, pemakaian kuota, dan komisi mitra.', '<a class="btn btn-secondary" href="#/penjualan">' + icon('receipt', 'ic-sm') + 'Lihat penjualan</a><a class="btn btn-primary" href="#/buat">' + icon('plus', 'ic-sm') + 'Buat Kode Baru</a>') +
      '<section class="grid-5">' + stat('Kode terjual bulan ini', k.terjualBulan) + stat('Pendapatan bulan ini', rupiah(k.pendapatanBulan)) + stat('Kode aktif', k.kodeAktif, '<span class="pill pill-primary">Siap pakai</span>') +
      stat('Kuota terpakai', k.kuotaTerpakai + ' / ' + k.kuotaTotal, '', '<div class="progress"><div style="width:' + (k.kuotaTotal ? k.kuotaTerpakai / k.kuotaTotal * 100 : 0) + '%"></div></div>') +
      stat('Komisi belum dibayar', rupiah(k.komisiBelum), k.komisiBelumMitra ? '<span class="pill pill-warning">' + k.komisiBelumMitra + ' mitra</span>' : '') + '</section>' +
      '<section class="split"><div class="card stack-sm"><div class="row-between"><h2 class="h3">Penjualan 30 hari</h2><span class="small muted">Total ' + rupiah(d.hari.reduce((a, x) => a + x.total, 0)) + '</span></div>' + U.lineChart(d.hari.map(x => ({ l: x.tgl, v: x.total })), { label: 'Penjualan 30 hari' }) + '</div>' +
      '<div class="card stack-sm"><div class="row-between"><h2 class="h3">Unduhan per jenis</h2><span class="small muted">Bulan ini · ' + k.unduhanBulan + ' file</span></div>' +
      [['Isi e-Rapor (T/R)', d.perJenis.EREPORT, 'var(--primary)'], ['Ubah Nilai', d.perJenis.KONVERSI, 'var(--sidebar-accent)']].map(x => '<div class="stack-xs mt-sm"><div class="row-between small"><b>' + x[0] + '</b><b class="tnum">' + x[1] + ' (' + Math.round(x[1] / maxJ * 100) + '%)</b></div><div class="progress" style="height:14px"><div style="width:' + (x[1] / maxJ * 100) + '%;background:' + x[2] + '"></div></div></div>').join('') +
      '<h3 class="label mt">Penjualan per affiliate</h3>' + (d.perAffiliate.length ? d.perAffiliate.slice(0, 5).map(a => '<div class="row-between small"><span>' + esc(a.nama) + '</span><b class="tnum">' + rupiah(a.total) + '</b></div>').join('') : '<p class="small muted">Belum ada penjualan lewat affiliate.</p>') + '</div></section>' +
      '<section class="split"><div class="card p0"><div class="card-pad row-between" style="border-bottom:1px solid var(--border)"><h2 class="h3">Kode hampir habis atau kedaluwarsa</h2><a class="link-btn" href="#/kode">Lihat semua</a></div>' +
      (d.hampirHabis.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Kode</th><th>Pembeli</th><th>Sisa</th><th>Berlaku</th><th class="r">Aksi</th></tr></thead><tbody>' + d.hampirHabis.map(x => '<tr><td class="mono b">' + esc(x.kode) + '</td><td><b>' + esc(x.nama) + '</b><div class="small muted">' + esc(x.sekolah) + '</div></td><td><span class="pill ' + (x.sisa ? 'pill-warning' : 'pill-danger') + ' tnum">' + x.sisa + ' / ' + x.total + '</span></td><td class="small">' + tglJam(x.berlaku) + '</td><td class="r"><a class="btn btn-outline btn-xs" href="#/kode/' + esc(x.kode_id) + '">Detail</a></td></tr>').join('') + '</tbody></table></div>' : '<div class="empty">' + icon('check-circle', 'ic-lg t-success') + 'Tidak ada kode yang perlu perhatian.</div>') + '</div>' +
      '<div class="card p0"><div class="card-pad row-between" style="border-bottom:1px solid var(--border)"><h2 class="h3">Penjualan terbaru</h2><a class="link-btn" href="#/penjualan">Semua</a></div>' +
      (d.terbaru.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Pembeli</th><th class="r">Nominal</th><th>Komisi</th></tr></thead><tbody>' + d.terbaru.map(x => '<tr><td><b>' + esc(x.nama) + '</b><div class="small muted">' + tglJam(x.tanggal) + '</div></td><td class="r tnum b">' + rupiah(x.harga) + '</td><td>' + komisiStatus(x.statusKomisi) + '</td></tr>').join('') + '</tbody></table></div>' : '<div class="empty">Belum ada penjualan.<a class="btn btn-primary btn-sm" href="#/buat">Catat penjualan pertama</a></div>') + '</div></section>');
  }

  // ============================================
  // KODE
  // ============================================
  async function pKode() {
    shell('kode', 'Kode', skeleton());
    const [r, ra] = await Promise.all([api('admin.kodeList'), api('admin.paketList')]);
    if (!r.success) return ($('#content').innerHTML = errBox(r));
    S.cache.kode = r.data; S.cache.paket = ra.success ? ra.data : [];
    renderKode();
  }
  function renderKode() {
    const all = S.cache.kode || [], q = S.kodeQ;
    const list = all.filter(k => (!q.status || k.status === q.status) && (!q.paket || k.paket_id === q.paket) && (!q.aff || (q.aff === '-' ? !k.affiliate : k.affiliate === q.aff)) &&
      (!q.q || [k.kode, k.nama, k.sekolah, k.email, k.wa].join(' ').toLowerCase().includes(q.q.toLowerCase())));
    const affs = [...new Set(all.map(k => k.affiliate).filter(Boolean))];
    const perhatian = all.filter(k => k.status === 'AKTIF' && (k.sisa <= 2 || (k.berlaku && new Date(k.berlaku) - Date.now() < 48 * 3600000))).length;
    S.kodeSel = S.kodeSel.filter(id => list.some(k => k.kode_id === id));
    const sel = S.kodeSel;
    shell('kode', 'Kode', head('Kode dan Kuota Unduhan', 'Kelola kode, pantau sisa kuota dan masa berlaku.', '<button class="btn btn-outline" id="csv">' + icon('download', 'ic-sm') + 'Ekspor CSV</button><a class="btn btn-primary" href="#/buat">' + icon('plus', 'ic-sm') + 'Buat Kode Baru</a>') +
      '<section class="grid-4">' + stat('Total kode', all.length) + stat('Aktif / baru', all.filter(k => k.status === 'AKTIF' || k.status === 'BARU').length) + stat('Kuota terpakai', all.reduce((a, k) => a + k.terpakai, 0) + ' / ' + all.reduce((a, k) => a + k.total, 0)) + stat('Perlu perhatian', perhatian, perhatian ? '<span class="pill pill-warning">Cek</span>' : '') + '</section>' +
      '<div class="card-flat row wrap"><div class="search grow" style="width:auto">' + icon('search') + '<input class="input" id="fq" placeholder="Cari kode, pembeli, sekolah, email, WA" value="' + esc(q.q) + '"></div>' +
      '<select class="select" style="width:auto" id="fs"><option value="">Semua status</option>' + ['BARU', 'AKTIF', 'HABIS', 'KEDALUWARSA', 'NONAKTIF'].map(s => '<option ' + (q.status === s ? 'selected' : '') + '>' + s + '</option>').join('') + '</select>' +
      '<select class="select" style="width:auto" id="fp"><option value="">Semua paket</option>' + (S.cache.paket || []).map(p => '<option value="' + esc(p.id) + '" ' + (q.paket === p.id ? 'selected' : '') + '>' + esc(p.nama) + '</option>').join('') + '</select>' +
      '<select class="select" style="width:auto" id="fa"><option value="">Semua mitra</option><option value="-" ' + (q.aff === '-' ? 'selected' : '') + '>Langsung (tanpa mitra)</option>' + affs.map(a => '<option ' + (q.aff === a ? 'selected' : '') + '>' + esc(a) + '</option>').join('') + '</select></div>' +
      (sel.length ? '<div class="bulkbar"><b>' + sel.length + ' kode dipilih</b><div class="row wrap"><button class="btn btn-outline btn-sm" data-bulk="email">' + icon('mail', 'ic-sm') + 'Kirim ulang email</button><button class="btn btn-outline btn-sm" data-bulk="wa">' + icon('copy', 'ic-sm') + 'Salin daftar kode</button><button class="btn btn-outline btn-sm" data-bulk="kuota">' + icon('plus', 'ic-sm') + 'Tambah kuota</button><button class="btn btn-outline btn-sm" data-bulk="nonaktif">Nonaktifkan</button><button class="link-btn" data-bulk="clear">Batal pilih</button></div></div>' : '') +
      '<section class="card p0"><div class="tbl-wrap"><table class="tbl"><thead><tr><th style="width:40px"><input type="checkbox" class="check" id="selAll" ' + (sel.length && sel.length === list.length ? 'checked' : '') + '></th><th>Kode</th><th>Paket</th><th>Pembeli &amp; sekolah</th><th>Konsumsi kuota</th><th>Masa berlaku</th><th>Mitra</th><th>Status</th><th class="r">Aksi</th></tr></thead><tbody>' +
      (list.length ? list.slice(0, 300).map(k => {
        const exp = k.berlaku ? new Date(k.berlaku) : null, soon = exp && exp - Date.now() < 48 * 3600000;
        return '<tr><td><input type="checkbox" class="check" data-sel="' + esc(k.kode_id) + '" ' + (sel.includes(k.kode_id) ? 'checked' : '') + '></td><td><span class="mono b">' + esc(k.kode) + '</span> <button class="icon-btn sm" style="display:inline-grid;width:26px;height:26px" data-copy="' + esc(k.kode) + '" title="Salin">' + icon('copy', 'ic-sm') + '</button><div class="small muted">' + tgl(k.dibuat) + '</div></td>' +
          '<td><span class="pill pill-neutral">' + esc(k.paket) + '</span></td><td><b>' + esc(k.nama) + '</b><div class="small muted">' + esc(k.sekolah) + (k.wa ? ' · ' + esc(k.wa) : '') + '</div></td><td>' + bar(k.terpakai, k.total) + '</td>' +
          '<td class="small ' + (soon && k.status !== 'KEDALUWARSA' ? 't-danger b' : '') + '">' + (k.berlaku ? tglJam(k.berlaku) : '<span class="muted">' + U.masa(k.masaJam) + ' sejak dipakai</span>') + '</td>' +
          '<td class="small">' + (k.affiliate ? esc(k.affiliate) : '<span class="muted">Langsung</span>') + '</td><td>' + kodeStatus(k.status) + '</td><td class="r"><a class="btn btn-outline btn-xs" href="#/kode/' + esc(k.kode_id) + '">Detail ' + icon('chev-right', 'ic-sm') + '</a></td></tr>';
      }).join('') : '<tr><td colspan="9"><div class="empty">' + (all.length ? 'Tidak ada kode yang cocok dengan saringan.' : 'Belum ada kode.<a class="btn btn-primary btn-sm" href="#/buat">Buat kode pertama</a>') + '</div></td></tr>') +
      '</tbody></table></div><div class="tbl-foot"><span class="tnum">Menampilkan ' + Math.min(300, list.length) + ' dari ' + list.length + ' kode</span></div></section>');
    const rer = () => { S.kodeQ = { q: $('#fq').value, status: $('#fs').value, paket: $('#fp').value, aff: $('#fa').value }; renderKode(); const f = $('#fq'); f.focus(); f.setSelectionRange(f.value.length, f.value.length); };
    let t; $('#fq').addEventListener('input', () => { clearTimeout(t); t = setTimeout(rer, 250); });
    ['#fs', '#fp', '#fa'].forEach(s => $(s).addEventListener('change', rer));
    $('#selAll').addEventListener('change', e => { S.kodeSel = e.target.checked ? list.map(k => k.kode_id) : []; renderKode(); });
    document.querySelectorAll('[data-sel]').forEach(c => c.addEventListener('change', () => { const id = c.dataset.sel; S.kodeSel = c.checked ? S.kodeSel.concat(id) : S.kodeSel.filter(x => x !== id); renderKode(); }));
    document.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', () => U.copyText(b.dataset.copy)));
    $('#csv').addEventListener('click', () => exportCsv('kode_edugrade.csv', ['kode', 'paket', 'nama', 'sekolah', 'email', 'wa', 'terpakai', 'total', 'status', 'berlaku', 'affiliate', 'harga', 'dibuat'], list));
    document.querySelectorAll('[data-bulk]').forEach(b => b.addEventListener('click', () => bulkKode(b.dataset.bulk, all.filter(k => S.kodeSel.includes(k.kode_id)))));
  }
  async function bulkKode(op, items) {
    if (op === 'clear') { S.kodeSel = []; return renderKode(); }
    if (op === 'wa') return U.copyText(items.map(k => k.kode + ' — ' + k.nama + (k.sekolah ? ' (' + k.sekolah + ')' : '')).join('\n'));
    let extra = {};
    if (op === 'kuota') {
      const n = prompt('Tambah berapa kuota untuk ' + items.length + ' kode?', '1');
      if (!n) return;
      extra = { jumlah: +n, alasan: 'tambah massal' };
    }
    if (op === 'nonaktif' && !(await U.confirmBox('Nonaktifkan ' + items.length + ' kode?', 'Kode yang dinonaktifkan tidak bisa dipakai guru sampai diaktifkan lagi.', 'Nonaktifkan', true))) return;
    U.loading(true, 'Memproses ' + items.length + ' kode...');
    let ok = 0, fail = [];
    for (const k of items) {
      const r = await api('admin.kodeAction', Object.assign({ kode_id: k.kode_id, op: op === 'email' ? 'kirimEmail' : op === 'kuota' ? 'tambahKuota' : 'nonaktif' }, extra));
      if (r.success) ok++; else fail.push(k.kode + ': ' + r.message);
    }
    U.loading(false);
    U.toast(ok + ' kode berhasil diproses.' + (fail.length ? ' ' + fail.length + ' gagal.' : ''), fail.length ? 'warning' : 'success');
    if (fail.length) console.warn(fail);
    S.kodeSel = []; pKode();
  }

  // ---------- Detail kode ----------
  async function pKodeDetail(id) {
    shell('kode', 'Detail Kode', skeleton());
    const r = await api('admin.kodeDetail', { kode_id: id });
    if (!r.success) return ($('#content').innerHTML = errBox(r));
    const k = r.data.kode, j = r.data.penjualan;
    const sq = Array.from({ length: Math.min(k.total, 60) }, (_, i) => '<i class="' + (i < k.terpakai ? 'used' : '') + '"></i>').join('');
    shell('kode', 'Detail Kode', '<div class="row-between"><div class="row wrap"><a class="btn btn-outline btn-sm" href="#/kode">' + icon('arrow-left', 'ic-sm') + 'Daftar kode</a><span class="mono b" style="font-size:24px">' + esc(k.kode) + '</span><button class="icon-btn sm" data-copy="' + esc(k.kode) + '">' + icon('copy', 'ic-sm') + '</button>' + kodeStatus(k.status) + '</div>' +
      '<div class="row wrap"><button class="btn btn-outline" data-a="kirimEmail" ' + (k.email ? '' : 'disabled') + '>' + icon('mail', 'ic-sm') + 'Kirim ulang email</button><button class="btn btn-secondary" id="copyWa">' + icon('copy', 'ic-sm') + 'Salin pesan WA</button>' + (k.wa ? '<a class="btn btn-primary" target="_blank" rel="noopener" href="' + U.waLink(k.wa, r.data.waText) + '">' + icon('chat', 'ic-sm') + 'Buka WhatsApp</a>' : '') + '</div></div>' +
      '<section class="split"><div class="card stack-sm"><h2 class="h3">Informasi pembeli dan paket</h2><dl class="kv">' +
      [['Nama pembeli', esc(k.nama)], ['Sekolah', esc(k.sekolah || '-')], ['Email', esc(k.email || '-')], ['WhatsApp', esc(k.wa || '-')], ['Paket', esc(k.paket)], ['Harga', rupiah(k.harga) + (j ? ' · ' + (j.statusBayar === 'LUNAS' ? '<span class="pill pill-success">LUNAS</span>' : '<span class="pill pill-warning">MENUNGGU</span> <button class="link-btn" id="lunas">Tandai lunas</button>') : '')],
      ['Affiliate', k.affiliate ? esc(k.affiliate) + (j ? ' · komisi ' + rupiah(j.komisi) + ' ' + komisiStatus(j.statusKomisi) : '') : 'Langsung'], ['Dibuat', tglJam(k.dibuat)], ['Pertama dipakai', tglJam(k.dipakai)], ['Berlaku sampai', k.berlaku ? tglJam(k.berlaku) : U.masa(k.masaJam) + ' sejak unduhan pertama'], ['Catatan', esc(k.catatan || '-')]]
        .map(x => '<dt>' + x[0] + '</dt><dd>' + x[1] + '</dd>').join('') + '</dl><button class="link-btn" style="align-self:flex-start" data-a="editPembeli">' + icon('pencil', 'ic-sm') + ' Ubah data pembeli</button></div>' +
      '<div class="stack"><div class="card stack-sm"><div class="row-between"><h2 class="h3">Kuota</h2><span class="pill pill-primary tnum">Sisa ' + k.sisa + '</span></div><div class="row" style="align-items:baseline;gap:8px"><span style="font-size:36px;font-weight:700" class="tnum">' + k.terpakai + ' / ' + k.total + '</span><span class="muted">file terpakai</span></div><div class="quota-squares">' + sq + '</div></div>' +
      '<div class="card stack-sm"><h2 class="h3">Tindakan</h2>' +
      [['tambahKuota', 'plus', 'Tambah kuota', 'Misalnya guru salah unggah template atau impor gagal.'], ['perpanjang', 'calendar', 'Perpanjang masa berlaku', 'Tambah hari tanpa mengubah kuota.'], ['ganti', 'refresh', 'Ganti kode', 'Sisa kuota dipindah ke kode baru, kode lama dinonaktifkan.'], [k.status === 'NONAKTIF' ? 'aktifkan' : 'nonaktif', k.status === 'NONAKTIF' ? 'check-circle' : 'x', k.status === 'NONAKTIF' ? 'Aktifkan lagi' : 'Nonaktifkan kode', k.status === 'NONAKTIF' ? 'Kode bisa dipakai lagi.' : 'Blokir bila ada penyalahgunaan.']]
        .map(a => '<button class="card-flat row" style="text-align:left;cursor:pointer;' + (a[0] === 'nonaktif' ? 'background:var(--danger-bg);border-color:#f3c6c1' : '') + '" data-a="' + a[0] + '"><span class="icon-tile sm ' + (a[0] === 'nonaktif' ? 'danger' : '') + '">' + icon(a[1]) + '</span><span class="stack-xs grow"><b>' + a[2] + '</b><span class="small muted">' + a[3] + '</span></span>' + icon('chev-right', 'muted') + '</button>').join('') + '</div></div></section>' +
      '<section class="card p0"><div class="card-pad row-between" style="border-bottom:1px solid var(--border)"><h2 class="h3">Riwayat unduhan</h2><span class="small muted">' + r.data.riwayat.length + ' catatan</span></div>' +
      (r.data.riwayat.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Waktu</th><th>Fitur</th><th>Nama file</th><th class="r">Siswa</th><th>Kuota</th></tr></thead><tbody>' + r.data.riwayat.map(u => '<tr><td class="small">' + tglJam(u.waktu) + '</td><td><span class="pill ' + (u.jenis === 'EREPORT' ? 'pill-primary' : 'pill-neutral') + '">' + (u.jenis === 'EREPORT' ? 'Isi e-Rapor' : 'Ubah Nilai') + '</span></td><td style="word-break:break-all">' + esc(u.nama) + '</td><td class="r tnum">' + u.siswa + '</td><td>' + (u.kuota ? '<span class="pill pill-ink">−' + u.kuota + '</span>' : '<span class="pill pill-success">Gratis</span>') + '</td></tr>').join('') + '</tbody></table></div>' : '<div class="empty">Belum ada unduhan.</div>') + '</section>');
    document.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', () => U.copyText(b.dataset.copy)));
    $('#copyWa').addEventListener('click', () => U.copyText(r.data.waText));
    if ($('#lunas')) $('#lunas').addEventListener('click', async () => { const x = await api('admin.bayarLunas', { id: j.id }); U.toast(x.message, x.success ? 'success' : 'error'); pKodeDetail(id); });
    document.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => kodeAction(k, b.dataset.a)));
  }
  function kodeAction(k, op) {
    const run = async (data, md) => {
      const btn = md && md.el.querySelector('[data-ok]');
      if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner" style="border-top-color:#fff"></span>'; }
      const r = await api('admin.kodeAction', Object.assign({ kode_id: k.kode_id, op }, data));
      if (md) md.close();
      U.toast(r.message, r.success ? 'success' : 'error');
      if (r.success && op === 'ganti') {
        U.modal('<div class="modal-head"><h2 class="h2">Kode baru dibuat</h2><button class="icon-btn" data-close>' + icon('x') + '</button></div><div class="code-box">' + esc(r.data.kodeBaru) + '</div><p class="muted">' + esc(r.message) + '</p><div class="row wrap"><button class="btn btn-secondary" id="cpk">' + icon('copy', 'ic-sm') + 'Salin pesan WA</button><a class="btn btn-primary" href="#/kode/' + esc(r.data.kode_id) + '" data-close>Lihat kode baru</a></div>');
        $('#cpk').addEventListener('click', () => U.copyText(r.data.waText));
        return;
      }
      if (r.success) pKodeDetail(k.kode_id);
    };
    const form = (title, body, okLbl, danger) => U.modal('<div class="modal-head"><h2 class="h3">' + title + '</h2><button class="icon-btn sm" data-close>' + icon('x', 'ic-sm') + '</button></div>' + body + '<div class="row" style="justify-content:flex-end"><button class="btn btn-outline" data-close>Batal</button><button class="btn ' + (danger ? 'btn-danger' : 'btn-primary') + '" data-ok>' + okLbl + '</button></div>');
    if (op === 'kirimEmail') return run({});
    if (op === 'aktifkan') return run({});
    if (op === 'tambahKuota') {
      const md = form('Tambah kuota · ' + k.kode, '<div class="chips">' + [1, 2, 4, 8].map(n => '<button class="chip" data-n="' + n + '">+' + n + ' file</button>').join('') + '</div><label class="field"><span class="field-label">Jumlah</span><input class="input" type="number" id="mj" value="1" min="1"></label><label class="field"><span class="field-label">Alasan (untuk catatan)</span><input class="input" id="ma" placeholder="Contoh: impor e-Rapor gagal"></label><p class="small muted">Kuota total menjadi ' + k.total + ' + jumlah di atas.</p>', 'Simpan');
      md.el.querySelectorAll('[data-n]').forEach(c => c.addEventListener('click', () => { md.el.querySelector('#mj').value = c.dataset.n; }));
      md.el.querySelector('[data-ok]').addEventListener('click', () => run({ jumlah: +md.el.querySelector('#mj').value, alasan: md.el.querySelector('#ma').value }, md));
    } else if (op === 'perpanjang') {
      const md = form('Perpanjang masa berlaku', '<div class="chips">' + [1, 3, 7, 14, 30].map(n => '<button class="chip" data-n="' + n + '">+' + n + ' hari</button>').join('') + '</div><label class="field"><span class="field-label">Tambah hari</span><input class="input" type="number" id="mh" value="7" min="1"></label>', 'Terapkan');
      md.el.querySelectorAll('[data-n]').forEach(c => c.addEventListener('click', () => { md.el.querySelector('#mh').value = c.dataset.n; }));
      md.el.querySelector('[data-ok]').addEventListener('click', () => run({ hari: +md.el.querySelector('#mh').value }, md));
    } else if (op === 'ganti') {
      const md = form('Ganti kode', '<div class="info warning">' + icon('alert') + '<div>Kode <b class="mono">' + esc(k.kode) + '</b> akan dinonaktifkan. Kode baru dibuat dengan sisa <b>' + Math.max(1, k.sisa) + ' kuota</b> dan data pembeli yang sama.</div></div><label class="row" style="gap:10px"><input type="checkbox" class="check" id="me" ' + (k.email ? 'checked' : 'disabled') + '>Kirim kode baru ke email pembeli</label>', 'Ganti kode', true);
      md.el.querySelector('[data-ok]').addEventListener('click', () => run({ kirimEmail: md.el.querySelector('#me').checked }, md));
    } else if (op === 'nonaktif') {
      const md = form('Nonaktifkan kode', '<p class="muted">Guru tidak bisa memakai kode ini sampai diaktifkan lagi.</p><label class="field"><span class="field-label">Alasan</span><input class="input" id="ma"></label>', 'Nonaktifkan', true);
      md.el.querySelector('[data-ok]').addEventListener('click', () => run({ alasan: md.el.querySelector('#ma').value }, md));
    } else if (op === 'editPembeli') {
      const md = form('Ubah data pembeli', ['nama_pembeli|Nama|' + k.nama, 'sekolah|Sekolah|' + k.sekolah, 'email|Email|' + k.email, 'wa|WhatsApp|' + k.wa].map(x => { const [f, l, v] = x.split('|'); return '<label class="field"><span class="field-label">' + l + '</span><input class="input" data-f="' + f + '" value="' + esc(v) + '"></label>'; }).join(''), 'Simpan');
      md.el.querySelector('[data-ok]').addEventListener('click', () => { const d = {}; md.el.querySelectorAll('[data-f]').forEach(i => { d[i.dataset.f] = i.value; }); run(d, md); });
    }
  }

  // ---------- Buat kode ----------
  async function pBuat() {
    shell('kode', 'Buat Kode', skeleton());
    const [rp, ra, rs] = await Promise.all([api('admin.paketList'), api('admin.affList'), api('admin.settingsGet')]);
    if (!rp.success) return ($('#content').innerHTML = errBox(rp));
    const paket = rp.data.filter(p => p.aktif), affs = (ra.data || []).filter(a => a.aktif);
    const st = {}; (rs.data || []).forEach(x => { st[x.key] = x.value; });
    let pid = (paket.find(p => p.populer) || paket[0] || {}).id;
    shell('kode', 'Buat Kode', '<a class="btn btn-outline btn-sm" style="align-self:flex-start" href="#/kode">' + icon('arrow-left', 'ic-sm') + 'Kembali ke daftar kode</a>' + head('Buat Kode dan Catat Penjualan', 'Kode dikirim otomatis ke email pembeli. Pesan WhatsApp bisa disalin.') +
      '<form id="bf" class="split"><div class="stack">' +
      '<section class="card stack-sm"><h2 class="h3">1. Data pembeli</h2><div class="grid-2" style="gap:16px">' +
      '<label class="field"><span class="field-label">Nama guru / pemesan *</span><input class="input" name="nama" required placeholder="Ibu Sri Wahyuni, S.Pd."></label>' +
      '<label class="field"><span class="field-label">Sekolah</span><input class="input" name="sekolah" placeholder="SDN 1 Bojonegoro"></label>' +
      '<label class="field"><span class="field-label">Email</span><input class="input" type="email" name="email" placeholder="nama@contoh.com"></label>' +
      '<label class="field"><span class="field-label">WhatsApp</span><input class="input" name="wa" placeholder="0812..."></label></div></section>' +
      '<section class="card stack-sm"><h2 class="h3">2. Paket dan kuota</h2><div class="grid-3" style="gap:12px">' + paket.map(p => '<div class="choice ' + (p.id === pid ? 'on' : '') + '" data-pid="' + esc(p.id) + '"><span class="tick">' + icon('check', 'ic-sm') + '</span><b>' + esc(p.nama) + '</b><span class="h3 tnum">' + rupiah(p.harga) + '</span><span class="small muted">' + p.kuota + ' kuota · ' + U.masa(p.jam) + '</span></div>').join('') + '</div>' +
      '<div class="grid-3" style="gap:16px"><label class="field"><span class="field-label">Kuota</span><input class="input" type="number" name="kuota" min="1"></label><label class="field"><span class="field-label">Masa berlaku (jam)</span><input class="input" type="number" name="masa_jam" min="1"></label><label class="field"><span class="field-label">Harga (Rp)</span><input class="input" type="number" name="harga" min="0"></label></div>' +
      '<p class="small muted">Masa berlaku dihitung sejak unduhan pertama.</p></section>' +
      '<section class="card stack-sm"><h2 class="h3">3. Asal penjualan</h2><label class="field"><span class="field-label">Mitra / kode referral</span><select class="select" name="affiliate_id"><option value="">Langsung (tanpa mitra)</option>' + affs.map(a => '<option value="' + esc(a.id) + '">' + esc(a.nama) + ' · ' + esc(a.ref) + ' (' + a.persen + '%)</option>').join('') + '</select></label>' +
      '<div class="grid-2" style="gap:16px"><div class="field"><span class="field-label">Status pembayaran</span><div class="seg"><button type="button" class="on" data-lunas="1">Lunas</button><button type="button" data-lunas="0">Menunggu</button></div></div><div class="field"><span class="field-label">Jumlah kode</span><input class="input" type="number" name="jumlah" value="1" min="1" max="50"></div></div></section>' +
      '<section class="card stack-sm"><h2 class="h3">4. Pengiriman</h2><label class="row" style="gap:10px"><input type="checkbox" class="check" name="kirimEmail" checked>Kirim kode ke email pembeli secara otomatis</label><label class="field"><span class="field-label">Catatan (opsional)</span><input class="input" name="catatan"></label></section></div>' +
      '<aside class="sticky-side stack"><div class="card stack-sm"><h2 class="h3">Ringkasan</h2><div id="sum"></div><button class="btn btn-primary btn-lg btn-block" type="submit">' + icon('check') + 'Simpan dan Buat Kode</button><a class="btn btn-outline btn-block" href="#/kode">Batal</a></div>' +
      '<div class="card stack-sm"><h2 class="h3 row">' + icon('chat') + 'Pratinjau pesan WhatsApp</h2><div class="wa-bubble" id="wap"></div><p class="small muted">Kode asli muncul setelah disimpan.</p></div></aside></form>');
    const f = $('#bf');
    let lunas = true;
    const setPaket = id => {
      pid = id; const p = paket.find(x => x.id === id); if (!p) return;
      f.kuota.value = p.kuota; f.masa_jam.value = p.jam; f.harga.value = p.harga;
      f.querySelectorAll('[data-pid]').forEach(c => c.classList.toggle('on', c.dataset.pid === id));
      upd();
    };
    const upd = () => {
      const p = paket.find(x => x.id === pid) || {}, a = affs.find(x => x.id === f.affiliate_id.value), harga = +f.harga.value || 0, n = Math.max(1, +f.jumlah.value || 1);
      const kom = a ? Math.round(harga * a.persen / 100) : 0;
      $('#sum').innerHTML = '<dl class="kv" style="grid-template-columns:120px 1fr">' + [['Penerima', esc(f.nama.value || '-')], ['Paket', esc(p.nama || '-') + ' · ' + (f.kuota.value || 0) + ' kuota'], ['Masa berlaku', U.masa(+f.masa_jam.value)], ['Jumlah kode', n], ['Total bayar', '<b>' + rupiah(harga * n) + '</b> ' + (lunas ? '<span class="pill pill-success">LUNAS</span>' : '<span class="pill pill-warning">MENUNGGU</span>')], ['Komisi mitra', a ? rupiah(kom * n) + ' (' + a.persen + '%)' : '-'], ['Bersih', rupiah((harga - kom) * n)]].map(x => '<dt>' + x[0] + '</dt><dd>' + x[1] + '</dd>').join('') + '</dl>';
      const masa = U.masa(+f.masa_jam.value) + ' sejak unduhan pertama';
      $('#wap').textContent = String(st.WA_TEMPLATE || '').replace(/\{NAMA_GURU\}/g, f.nama.value || 'Bapak/Ibu').replace(/\{SEKOLAH\}/g, f.sekolah.value).replace(/\{KODE\}/g, 'EG-XXXX-XXXX').replace(/\{PAKET\}/g, p.nama || '').replace(/\{KUOTA\}/g, f.kuota.value).replace(/\{MASA_BERLAKU\}/g, masa).replace(/\{LINK_WEB\}/g, st.LINK_WEB || '');
    };
    f.querySelectorAll('[data-pid]').forEach(c => c.addEventListener('click', () => setPaket(c.dataset.pid)));
    f.querySelectorAll('[data-lunas]').forEach(b => b.addEventListener('click', () => { lunas = b.dataset.lunas === '1'; f.querySelectorAll('[data-lunas]').forEach(x => x.classList.toggle('on', x === b)); upd(); }));
    f.addEventListener('input', upd); f.addEventListener('change', upd);
    setPaket(pid);
    f.addEventListener('submit', async ev => {
      ev.preventDefault();
      const btn = f.querySelector('[type=submit]');
      btn.disabled = true; btn.innerHTML = '<span class="spinner" style="border-top-color:#fff"></span> Menyimpan...';
      const d = { paket_id: pid, nama: f.nama.value, sekolah: f.sekolah.value, email: f.email.value, wa: f.wa.value, kuota: f.kuota.value, masa_jam: f.masa_jam.value, harga: f.harga.value, affiliate_id: f.affiliate_id.value, lunas, jumlah: f.jumlah.value, kirimEmail: f.kirimEmail.checked, catatan: f.catatan.value };
      const r = await api('admin.kodeCreate', d);
      btn.disabled = false; btn.innerHTML = icon('check') + 'Simpan dan Buat Kode';
      if (!r.success) return U.toast(r.message, 'error');
      const x = r.data;
      const md = U.modal('<div class="modal-head"><div class="row"><span class="icon-tile sm success">' + icon('check') + '</span><h2 class="h2">' + esc(r.message) + '</h2></div><button class="icon-btn" data-close>' + icon('x') + '</button></div>' +
        x.codes.map(c => '<div class="code-box">' + esc(c) + '</div>').join('') +
        '<div class="row wrap">' + (d.email && d.kirimEmail ? (x.emailSent ? '<span class="pill pill-success">' + icon('mail', 'ic-sm') + 'Email terkirim</span>' : '<span class="pill pill-danger">Email gagal: ' + esc(x.emailError) + '</span>') : '') + (x.komisi ? '<span class="pill pill-primary">Komisi ' + rupiah(x.komisi) + ' tercatat</span>' : '') + '</div>' +
        '<div class="row wrap"><button class="btn btn-outline" id="cc">' + icon('copy', 'ic-sm') + 'Salin kode</button><button class="btn btn-secondary" id="cw">' + icon('copy', 'ic-sm') + 'Salin pesan WA</button>' + (x.wa ? '<a class="btn btn-primary" target="_blank" rel="noopener" href="' + U.waLink(x.wa, x.waText) + '">' + icon('chat', 'ic-sm') + 'Kirim lewat WhatsApp</a>' : '') + '</div>' +
        '<div class="row-between" style="border-top:1px solid var(--border);padding-top:14px"><a class="link-btn" href="#/kode/' + esc(x.kode_id) + '" data-close>Lihat detail kode</a><button class="btn btn-outline btn-sm" data-close id="again">Buat kode lagi</button></div>', { onClose: () => { if (location.hash.startsWith('#/buat')) pBuat(); } });
      md.el.querySelector('#cc').addEventListener('click', () => U.copyText(x.codes.join('\n')));
      md.el.querySelector('#cw').addEventListener('click', () => U.copyText(x.waText));
    });
  }

  // ============================================
  // PENJUALAN
  // ============================================
  async function pPenjualan() {
    shell('penjualan', 'Penjualan', skeleton());
    const r = await api('admin.penjualanList');
    if (!r.success) return ($('#content').innerHTML = errBox(r));
    S.cache.jual = r.data; renderJual();
  }
  function renderJual() {
    const all = S.cache.jual || [], q = S.jualQ;
    const list = all.filter(j => (q.tab === 'all' || (q.tab === 'belum' && j.statusKomisi === 'BELUM') || (q.tab === 'dibayar' && j.statusKomisi === 'DIBAYAR') || (q.tab === 'tanpa' && j.statusKomisi === 'TANPA') || (q.tab === 'menunggu' && j.statusBayar !== 'LUNAS')) &&
      (!q.aff || j.affiliate === q.aff) && (!q.q || [j.kode, j.nama, j.sekolah, j.id].join(' ').toLowerCase().includes(q.q.toLowerCase())));
    const affs = [...new Set(all.map(j => j.affiliate).filter(Boolean))];
    S.jualSel = S.jualSel.filter(id => list.some(j => j.id === id && j.statusKomisi === 'BELUM'));
    const selTot = all.filter(j => S.jualSel.includes(j.id)).reduce((a, j) => a + j.komisi, 0);
    const tot = all.reduce((a, j) => a + j.harga, 0), kom = all.reduce((a, j) => a + j.komisi, 0), belum = all.filter(j => j.statusKomisi === 'BELUM').reduce((a, j) => a + j.komisi, 0);
    const cnt = t => all.filter(j => t === 'belum' ? j.statusKomisi === 'BELUM' : t === 'dibayar' ? j.statusKomisi === 'DIBAYAR' : t === 'tanpa' ? j.statusKomisi === 'TANPA' : t === 'menunggu' ? j.statusBayar !== 'LUNAS' : true).length;
    shell('penjualan', 'Penjualan', head('Penjualan dan Komisi Mitra', 'Catatan setiap kode yang dibuat beserta komisi affiliate.', '<button class="btn btn-outline" id="csv">' + icon('download', 'ic-sm') + 'Ekspor CSV</button><a class="btn btn-primary" href="#/buat">' + icon('plus', 'ic-sm') + 'Catat Penjualan</a>') +
      '<section class="grid-4">' + stat('Total penjualan', rupiah(tot), '', '<span class="small muted">' + all.length + ' transaksi</span>') + stat('Total komisi mitra', rupiah(kom)) + stat('Kas bersih', rupiah(tot - kom)) + stat('Komisi belum dibayar', rupiah(belum), cnt('belum') ? '<span class="pill pill-warning">' + cnt('belum') + '</span>' : '') + '</section>' +
      '<div class="card-flat stack-sm"><div class="row wrap"><div class="search grow" style="width:auto">' + icon('search') + '<input class="input" id="jq" placeholder="Cari kode, pembeli, sekolah" value="' + esc(q.q) + '"></div><select class="select" style="width:auto" id="ja"><option value="">Semua mitra</option>' + affs.map(a => '<option ' + (q.aff === a ? 'selected' : '') + '>' + esc(a) + '</option>').join('') + '</select></div>' +
      '<div class="chips">' + [['all', 'Semua'], ['belum', 'Belum bayar komisi'], ['dibayar', 'Komisi selesai'], ['tanpa', 'Tanpa komisi'], ['menunggu', 'Pembayaran menunggu']].map(t => '<button class="chip ' + (q.tab === t[0] ? 'on' : '') + '" data-tab="' + t[0] + '">' + t[1] + ' (' + cnt(t[0]) + ')</button>').join('') + '</div></div>' +
      (S.jualSel.length ? '<div class="bulkbar" style="background:var(--ink);color:#fff;border:0"><b>' + S.jualSel.length + ' transaksi dipilih · subtotal komisi ' + rupiah(selTot) + '</b><div class="row"><button class="btn btn-primary btn-sm" id="paid">' + icon('check', 'ic-sm') + 'Tandai komisi sudah dibayar</button><button class="link-btn" style="color:#fff" id="unsel">Batal</button></div></div>' : '') +
      '<section class="card p0"><div class="tbl-wrap"><table class="tbl"><thead><tr><th style="width:40px"></th><th>Tanggal</th><th>Pembeli</th><th>Paket &amp; kode</th><th class="r">Nominal</th><th>Mitra</th><th class="r">Komisi</th><th>Status komisi</th></tr></thead><tbody>' +
      (list.length ? list.map(j => '<tr><td>' + (j.statusKomisi === 'BELUM' ? '<input type="checkbox" class="check" data-sel="' + esc(j.id) + '" ' + (S.jualSel.includes(j.id) ? 'checked' : '') + '>' : '') + '</td><td class="small">' + tglJam(j.tanggal) + '<div class="muted">' + esc(j.id) + '</div></td><td><b>' + esc(j.nama) + '</b><div class="small muted">' + esc(j.sekolah) + '</div></td><td>' + esc(j.paket) + '<div><a class="mono small" href="#/kode/' + esc(j.kode_id) + '">' + esc(j.kode) + '</a></div></td><td class="r tnum b">' + rupiah(j.harga) + (j.statusBayar !== 'LUNAS' ? '<div><span class="pill pill-warning">Menunggu</span></div>' : '') + '</td><td class="small">' + (j.affiliate ? esc(j.affiliate) + ' · ' + j.persen + '%' : '<span class="muted">Langsung</span>') + '</td><td class="r tnum">' + (j.komisi ? rupiah(j.komisi) : '–') + '</td><td>' + komisiStatus(j.statusKomisi) + (j.tanggalBayarKomisi ? '<div class="small muted">' + tgl(j.tanggalBayarKomisi) + '</div>' : '') + '</td></tr>').join('') : '<tr><td colspan="8"><div class="empty">Belum ada transaksi.</div></td></tr>') +
      '</tbody></table></div></section>');
    const rer = () => { S.jualQ.q = $('#jq').value; S.jualQ.aff = $('#ja').value; renderJual(); const f = $('#jq'); f.focus(); f.setSelectionRange(f.value.length, f.value.length); };
    let t; $('#jq').addEventListener('input', () => { clearTimeout(t); t = setTimeout(rer, 250); });
    $('#ja').addEventListener('change', rer);
    document.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { S.jualQ.tab = b.dataset.tab; renderJual(); }));
    document.querySelectorAll('[data-sel]').forEach(c => c.addEventListener('change', () => { const id = c.dataset.sel; S.jualSel = c.checked ? S.jualSel.concat(id) : S.jualSel.filter(x => x !== id); renderJual(); }));
    if ($('#unsel')) $('#unsel').addEventListener('click', () => { S.jualSel = []; renderJual(); });
    if ($('#paid')) $('#paid').addEventListener('click', async () => {
      if (!(await U.confirmBox('Tandai komisi dibayar?', S.jualSel.length + ' transaksi senilai ' + rupiah(selTot) + ' akan ditandai sudah dibayar.', 'Ya, sudah dibayar'))) return;
      const r = await api('admin.komisiBayar', { ids: S.jualSel });
      U.toast(r.message, r.success ? 'success' : 'error'); S.jualSel = []; pPenjualan();
    });
    $('#csv').addEventListener('click', () => exportCsv('penjualan_edugrade.csv', ['id', 'tanggal', 'nama', 'sekolah', 'paket', 'kode', 'harga', 'statusBayar', 'affiliate', 'persen', 'komisi', 'statusKomisi', 'tanggalBayarKomisi'], list));
  }

  // ============================================
  // AFFILIATE (kelola)
  // ============================================
  async function pAffiliate() {
    shell('affiliate', 'Affiliate', skeleton());
    const r = await api('admin.affList');
    if (!r.success) return ($('#content').innerHTML = errBox(r));
    const list = r.data;
    shell('affiliate', 'Affiliate', head('Affiliate', 'Mitra yang menjual kode dan mendapat komisi.', '<button class="btn btn-primary" id="add">' + icon('plus', 'ic-sm') + 'Tambah Affiliate</button>') +
      '<section class="grid-4">' + stat('Mitra aktif', list.filter(a => a.aktif).length) + stat('Penjualan lewat mitra', list.reduce((a, x) => a + x.penjualan, 0)) + stat('Komisi terkumpul', rupiah(list.reduce((a, x) => a + x.komisi, 0))) + stat('Komisi belum dibayar', rupiah(list.reduce((a, x) => a + x.sisa, 0))) + '</section>' +
      '<section class="card p0"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nama</th><th>Kode referral</th><th class="r">Komisi</th><th class="r">Penjualan</th><th class="r">Komisi terkumpul</th><th class="r">Sudah dibayar</th><th class="r">Sisa</th><th>Status</th><th class="r">Aksi</th></tr></thead><tbody>' +
      (list.length ? list.map((a, i) => '<tr><td><b>' + esc(a.nama) + '</b><div class="small muted">' + esc(a.email) + (a.wa ? ' · ' + esc(a.wa) : '') + '</div></td><td><span class="mono b">' + esc(a.ref) + '</span></td><td class="r tnum">' + a.persen + '%</td><td class="r tnum">' + a.penjualan + '</td><td class="r tnum">' + rupiah(a.komisi) + '</td><td class="r tnum">' + rupiah(a.dibayar) + '</td><td class="r tnum b">' + rupiah(a.sisa) + '</td><td>' + (a.aktif ? '<span class="pill pill-success">Aktif</span>' : '<span class="pill pill-neutral">Nonaktif</span>') + '</td><td class="r"><div class="row" style="justify-content:flex-end;gap:6px">' + (a.sisa ? '<a class="btn btn-tint btn-xs" href="#/penjualan" data-aff="' + esc(a.nama) + '">Bayar komisi</a>' : '') + '<button class="btn btn-outline btn-xs" data-edit="' + i + '">' + icon('pencil', 'ic-sm') + 'Ubah</button></div></td></tr>').join('') : '<tr><td colspan="9"><div class="empty">' + icon('users', 'ic-lg') + 'Belum ada affiliate.</div></td></tr>') + '</tbody></table></div></section>' +
      '<div class="info">' + icon('info') + '<div>Perubahan persen komisi berlaku untuk penjualan berikutnya. Affiliate masuk lewat <b>admin.html</b> dengan email dan sandinya sendiri.</div></div>');
    $('#add').addEventListener('click', () => affForm(null));
    document.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => affForm(list[+b.dataset.edit])));
    document.querySelectorAll('[data-aff]').forEach(b => b.addEventListener('click', () => { S.jualQ = { q: '', tab: 'belum', aff: b.dataset.aff }; }));
  }
  function affForm(a) {
    const md = U.modal('<div class="modal-head"><h2 class="h3">' + (a ? 'Ubah affiliate' : 'Tambah affiliate') + '</h2><button class="icon-btn sm" data-close>' + icon('x', 'ic-sm') + '</button></div>' +
      '<label class="field"><span class="field-label">Nama</span><input class="input" id="an" value="' + esc(a ? a.nama : '') + '"></label><label class="field"><span class="field-label">Email (untuk masuk)</span><input class="input" type="email" id="ae" value="' + esc(a ? a.email : '') + '"></label>' +
      '<div class="grid-2" style="gap:12px"><label class="field"><span class="field-label">WhatsApp</span><input class="input" id="aw" value="' + esc(a ? a.wa : '') + '"></label><label class="field"><span class="field-label">Persen komisi</span><input class="input" type="number" id="ap" value="' + (a ? a.persen : 20) + '" min="0" max="90"></label></div>' +
      (a ? '<p class="small muted">Kode referral: <b class="mono">' + esc(a.ref) + '</b></p><label class="row" style="gap:10px"><input type="checkbox" class="check" id="aa" ' + (a.aktif ? 'checked' : '') + '>Aktif</label><label class="row" style="gap:10px"><input type="checkbox" class="check" id="ar">Atur ulang sandi (sandi baru tampil setelah disimpan)</label>' : '<label class="field"><span class="field-label">Kode referral (boleh kosong, dibuat otomatis)</span><input class="input" id="af" style="text-transform:uppercase" placeholder="GURUMAJU"></label>') +
      '<div class="row" style="justify-content:flex-end"><button class="btn btn-outline" data-close>Batal</button><button class="btn btn-primary" data-ok>Simpan</button></div>');
    md.el.querySelector('[data-ok]').addEventListener('click', async () => {
      const g = id => md.el.querySelector(id);
      const d = { id: a ? a.id : '', nama: g('#an').value, email: g('#ae').value, wa: g('#aw').value, persen: g('#ap').value };
      if (a) { d.aktif = g('#aa').checked; d.resetSandi = g('#ar').checked; } else d.ref = g('#af').value;
      const r = await api('admin.affSave', d);
      if (!r.success) return U.toast(r.message, 'error');
      md.close();
      if (r.data && r.data.sandiBaru) {
        const t = 'Akun affiliate EduGrade\nAlamat: ' + location.href.split('#')[0] + '\nEmail: ' + d.email + '\nSandi: ' + r.data.sandiBaru;
        const m2 = U.modal('<div class="modal-head"><h2 class="h3">Sandi affiliate</h2><button class="icon-btn sm" data-close>' + icon('x', 'ic-sm') + '</button></div><p class="muted">Kirim info masuk ini ke affiliate. Sandi hanya tampil sekali.</p><div class="wa-bubble">' + esc(t) + '</div><div class="row wrap"><button class="btn btn-secondary" id="cp">' + icon('copy', 'ic-sm') + 'Salin</button>' + (d.wa ? '<a class="btn btn-primary" target="_blank" rel="noopener" href="' + U.waLink(d.wa.replace(/^0/, '62'), t) + '">' + icon('chat', 'ic-sm') + 'Kirim lewat WhatsApp</a>' : '') + '</div>', { onClose: pAffiliate });
        m2.el.querySelector('#cp').addEventListener('click', () => U.copyText(t));
      } else { U.toast(r.message, 'success'); pAffiliate(); }
    });
  }

  // ============================================
  // PAKET
  // ============================================
  async function pPaket() {
    shell('paket', 'Paket & Harga', skeleton());
    const r = await api('admin.paketList');
    if (!r.success) return ($('#content').innerHTML = errBox(r));
    shell('paket', 'Paket & Harga', head('Paket dan Harga', 'Tampil di halaman Cara Beli Kode dan dipakai saat membuat kode.', '<button class="btn btn-primary" id="addp">' + icon('plus', 'ic-sm') + 'Tambah Paket</button>') +
      '<section class="grid-3">' + r.data.map((p, i) => '<article class="card paket ' + (p.populer ? 'pop' : '') + '" style="padding:24px">' + (p.populer ? '<span class="pill pill-solid ribbon">Paling dipilih</span>' : '') +
        '<div class="stack-sm"><div class="row-between"><h2 class="h3">' + esc(p.nama) + '</h2>' + (p.aktif ? '<span class="pill pill-success">Tampil</span>' : '<span class="pill pill-neutral">Disembunyikan</span>') + '</div><p class="price">' + rupiah(p.harga) + '</p><dl class="kv" style="grid-template-columns:120px 1fr"><dt>Kuota</dt><dd>' + p.kuota + ' unduhan</dd><dt>Masa berlaku</dt><dd>' + U.masa(p.jam) + '</dd><dt>Per file</dt><dd>' + rupiah(p.harga / p.kuota) + '</dd><dt>Terjual</dt><dd>' + p.terjual + ' kode</dd></dl><p class="small muted">' + esc(p.keterangan) + '</p></div>' +
        '<button class="btn btn-secondary btn-block" data-ep="' + i + '">' + icon('pencil', 'ic-sm') + 'Ubah paket</button></article>').join('') + '</section>' +
      '<div class="info">' + icon('info') + '<div>Perubahan harga atau kuota tidak mengubah kode yang sudah dibuat.</div></div>');
    document.querySelectorAll('[data-ep]').forEach(b => b.addEventListener('click', () => paketForm(r.data[+b.dataset.ep])));
    $('#addp').addEventListener('click', () => paketForm(null));
  }
  function paketForm(p) {
    const md = U.modal('<div class="modal-head"><h2 class="h3">' + (p ? 'Ubah paket' : 'Tambah paket') + '</h2><button class="icon-btn sm" data-close>' + icon('x', 'ic-sm') + '</button></div>' +
      '<label class="field"><span class="field-label">Nama paket</span><input class="input" id="pn" value="' + esc(p ? p.nama : '') + '"></label>' +
      '<div class="grid-3" style="gap:12px"><label class="field"><span class="field-label">Harga (Rp)</span><input class="input" type="number" id="ph" value="' + (p ? p.harga : '') + '"></label><label class="field"><span class="field-label">Kuota</span><input class="input" type="number" id="pk" value="' + (p ? p.kuota : '') + '"></label><label class="field"><span class="field-label">Berlaku (hari)</span><input class="input" type="number" id="pj" value="' + (p ? p.jam / 24 : '') + '" step="0.5"></label></div>' +
      '<label class="field"><span class="field-label">Keterangan singkat</span><input class="input" id="pt" value="' + esc(p ? p.keterangan : '') + '"></label>' +
      '<label class="row" style="gap:10px"><input type="checkbox" class="check" id="pa" ' + (!p || p.aktif ? 'checked' : '') + '>Tampilkan di halaman Cara Beli</label><label class="row" style="gap:10px"><input type="checkbox" class="check" id="pp" ' + (p && p.populer ? 'checked' : '') + '>Tandai "Paling dipilih"</label>' +
      '<div class="row" style="justify-content:flex-end"><button class="btn btn-outline" data-close>Batal</button><button class="btn btn-primary" data-ok>Simpan</button></div>');
    md.el.querySelector('[data-ok]').addEventListener('click', async () => {
      const g = id => md.el.querySelector(id);
      const r = await api('admin.paketSave', { id: p ? p.id : '', nama: g('#pn').value, harga: g('#ph').value, kuota: g('#pk').value, jam: Math.round(+g('#pj').value * 24), keterangan: g('#pt').value, aktif: g('#pa').checked, populer: g('#pp').checked, urutan: p ? p.urutan : 0 });
      U.toast(r.message, r.success ? 'success' : 'error');
      if (r.success) { md.close(); pPaket(); }
    });
  }

  // ============================================
  // PENGATURAN
  // ============================================
  const SET_LABEL = { WA_ADMIN: 'Nomor WhatsApp admin', NAMA_PENGIRIM: 'Nama pengirim email', LINK_WEB: 'Alamat aplikasi guru', BANNER: 'Pengumuman di halaman Cara Beli', UNDUH_ULANG_JAM: 'Unduh ulang gratis (jam)', KODE_BARU_KEDALUWARSA_HARI: 'Kode belum dipakai kedaluwarsa setelah (hari, 0 = tidak)', MODE_PERAWATAN: 'Mode perawatan', EMAIL_SUBJECT: 'Subjek email', EMAIL_BODY: 'Isi email', WA_TEMPLATE: 'Pesan WhatsApp' };
  async function pPengaturan() {
    shell('pengaturan', 'Pengaturan', skeleton());
    const r = await api('admin.settingsGet');
    if (!r.success) return ($('#content').innerHTML = errBox(r));
    const v = {}; r.data.forEach(x => { v[x.key] = x.value; });
    const inp = k => '<label class="field"><span class="field-label">' + SET_LABEL[k] + '</span><input class="input" data-k="' + k + '" value="' + esc(v[k] || '') + '"></label>';
    const chips = ['NAMA_GURU', 'SEKOLAH', 'KODE', 'PAKET', 'KUOTA', 'MASA_BERLAKU', 'LINK_WEB'].map(c => '<button type="button" class="chip" data-var="{' + c + '}">{' + c + '}</button>').join('');
    shell('pengaturan', 'Pengaturan', head('Pengaturan', 'Kontak, aturan unduhan, dan template pesan.', '<button class="btn btn-primary" id="save">' + icon('check', 'ic-sm') + 'Simpan semua perubahan</button>') +
      '<section class="split"><div class="stack"><div class="card stack-sm"><h2 class="h3">Kontak penjual</h2>' + inp('WA_ADMIN') + inp('NAMA_PENGIRIM') + inp('LINK_WEB') + '<label class="field"><span class="field-label">' + SET_LABEL.BANNER + '</span><textarea class="textarea" style="min-height:80px" data-k="BANNER">' + esc(v.BANNER || '') + '</textarea></label></div>' +
      '<div class="card stack-sm"><h2 class="h3">Aturan unduhan</h2>' + inp('UNDUH_ULANG_JAM') + inp('KODE_BARU_KEDALUWARSA_HARI') +
      '<label class="row-between card-flat" style="cursor:pointer"><span class="stack-xs"><b>Mode perawatan</b><span class="small muted">Tutup unduhan sementara. Guru tetap bisa mencoba.</span></span><input type="checkbox" class="check" id="maint" ' + (/^ya$/i.test(v.MODE_PERAWATAN || '') ? 'checked' : '') + '></label></div>' +
      '<div class="card stack-sm"><h2 class="h3">Keamanan</h2><div class="row wrap"><button class="btn btn-outline" id="chpw">' + icon('lock', 'ic-sm') + 'Ubah sandi admin</button></div></div></div>' +
      '<div class="card stack-sm"><h2 class="h3">Template pesan</h2><p class="small muted">Klik kata kunci untuk menyisipkannya di posisi kursor.</p><div class="chips">' + chips + '</div>' + inp('EMAIL_SUBJECT') +
      '<label class="field"><span class="field-label">' + SET_LABEL.EMAIL_BODY + '</span><textarea class="textarea" style="min-height:240px" data-k="EMAIL_BODY">' + esc(v.EMAIL_BODY || '') + '</textarea></label>' +
      '<label class="field"><span class="field-label">' + SET_LABEL.WA_TEMPLATE + '</span><textarea class="textarea" style="min-height:160px" data-k="WA_TEMPLATE">' + esc(v.WA_TEMPLATE || '') + '</textarea></label>' +
      '<div class="row wrap"><input class="input grow" id="testTo" placeholder="Email tujuan uji coba (kosong = email Anda)"><button class="btn btn-outline" id="test">' + icon('mail', 'ic-sm') + 'Kirim email uji coba</button></div></div></section>');
    let lastFocus = null;
    document.querySelectorAll('[data-k]').forEach(el => el.addEventListener('focus', () => { lastFocus = el; }));
    document.querySelectorAll('[data-var]').forEach(b => b.addEventListener('click', () => {
      const el = lastFocus || document.querySelector('[data-k="EMAIL_BODY"]');
      const s = el.selectionStart || el.value.length; el.value = el.value.slice(0, s) + b.dataset.var + el.value.slice(el.selectionEnd || s); el.focus();
    }));
    $('#save').addEventListener('click', async () => {
      const values = {}; document.querySelectorAll('[data-k]').forEach(el => { values[el.dataset.k] = el.value; });
      values.MODE_PERAWATAN = $('#maint').checked ? 'YA' : 'TIDAK';
      const x = await api('admin.settingsSave', { values }); U.toast(x.message, x.success ? 'success' : 'error');
    });
    $('#test').addEventListener('click', async () => { const x = await api('admin.testEmail', { email: $('#testTo').value }); U.toast(x.message, x.success ? 'success' : 'error'); });
    $('#chpw').addEventListener('click', () => {
      const md = U.modal('<div class="modal-head"><h2 class="h3">Ubah sandi admin</h2><button class="icon-btn sm" data-close>' + icon('x', 'ic-sm') + '</button></div><label class="field"><span class="field-label">Sandi lama</span><input class="input" type="password" id="pl"></label><label class="field"><span class="field-label">Sandi baru (min. 8 karakter)</span><input class="input" type="password" id="pb"></label><div class="row" style="justify-content:flex-end"><button class="btn btn-outline" data-close>Batal</button><button class="btn btn-primary" data-ok>Simpan</button></div>');
      md.el.querySelector('[data-ok]').addEventListener('click', async () => { const x = await api('admin.changePassword', { lama: md.el.querySelector('#pl').value, baru: md.el.querySelector('#pb').value }); U.toast(x.message, x.success ? 'success' : 'error'); if (x.success) md.close(); });
    });
  }

  async function pLog() {
    shell('log', 'Log Aktivitas', skeleton());
    const r = await api('admin.logList');
    if (!r.success) return ($('#content').innerHTML = errBox(r));
    shell('log', 'Log Aktivitas', head('Log Aktivitas', '300 peristiwa terakhir (tanpa data siswa).', '<button class="btn btn-outline" id="csv">' + icon('download', 'ic-sm') + 'Ekspor CSV</button>') +
      '<section class="card p0"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Waktu</th><th>Pelaku</th><th>Aksi</th><th>Detail</th></tr></thead><tbody>' +
      (r.data.length ? r.data.map(x => '<tr><td class="small">' + tglJam(x.waktu) + '</td><td>' + esc(x.pelaku) + '</td><td><span class="pill pill-neutral">' + esc(x.aksi) + '</span></td><td class="small" style="word-break:break-word">' + esc(x.detail) + '</td></tr>').join('') : '<tr><td colspan="4"><div class="empty">Belum ada aktivitas.</div></td></tr>') + '</tbody></table></div></section>');
    $('#csv').addEventListener('click', () => exportCsv('log_edugrade.csv', ['waktu', 'pelaku', 'aksi', 'detail'], r.data));
  }

  // ============================================
  // AFFILIATE: DASBOR
  // ============================================
  async function pAff() {
    $('#root').innerHTML = '<div class="login-wrap"><div class="spinner lg"></div></div>';
    const r = await api('aff.dashboard');
    if (!r.success) { $('#root').innerHTML = '<div class="container" style="padding:32px">' + errBox(r) + '</div>'; return; }
    const d = r.data, k = d.kartu;
    const maxK = Math.max(1, ...d.bulan.map(b => b.komisi));
    const waShare = 'Bapak/Ibu guru, ada aplikasi untuk mengubah nilai di Excel dan mengisi T/R e-Rapor otomatis. Data siswa tetap di laptop sendiri. Coba di sini: ' + d.link;
    $('#root').innerHTML = '<header class="topbar"><div class="topbar-in"><span class="brand"><img class="brand-mark" src="assets/icon-192.png" alt="">EduGrade <span class="pill pill-primary">Affiliate</span></span><div class="row"><span class="b small">' + esc(d.nama) + '</span><button class="btn btn-outline btn-sm" id="out">' + icon('logout', 'ic-sm') + 'Keluar</button></div></div></header>' +
      '<main><div class="container stack">' +
      '<section class="card stack-sm" style="background:linear-gradient(120deg,#1D5BD6,#1546A8);color:#fff;border:0"><span class="small" style="opacity:.85">Halo,</span><h1 class="h1">' + esc(d.nama) + '</h1><p style="opacity:.9">Bagikan tautan Anda. Setiap pembelian lewat kode referral Anda memberi komisi <b>' + d.persen + '%</b>.</p>' +
      '<div class="row wrap" style="background:rgba(255,255,255,.12);padding:12px 14px;border-radius:12px"><span class="mono b">' + esc(d.ref) + '</span><span class="grow" style="word-break:break-all;opacity:.9;flex:1 1 260px">' + esc(d.link) + '</span><button class="btn btn-sm" style="background:#fff;color:var(--primary)" id="cpl">' + icon('copy', 'ic-sm') + 'Salin tautan</button><a class="btn btn-sm" style="background:#fff;color:var(--primary)" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(waShare) + '">' + icon('share', 'ic-sm') + 'Bagikan ke WA</a></div></section>' +
      '<section class="grid-4 keep2">' + stat('Penjualan bulan ini', k.penjualanBulan) + stat('Komisi bulan ini', rupiah(k.komisiBulan)) + stat('Komisi belum dibayar', rupiah(k.belum), k.belum ? '<span class="pill pill-warning">Menunggu</span>' : '') + stat('Total komisi', rupiah(k.total), '', '<span class="small muted">Sudah dibayar ' + rupiah(k.dibayar) + '</span>') + '</section>' +
      '<section class="split"><div class="card stack-sm"><h2 class="h3">Komisi per bulan</h2><div class="chart" style="grid-template-columns:repeat(6,1fr)">' + d.bulan.map(b => '<div class="col"><div class="bars"><div class="bar" style="height:' + (b.komisi / maxK * 100) + '%"><span>' + (b.komisi ? Math.round(b.komisi / 1000) + 'rb' : '') + '</span></div></div></div>').join('') + '</div><div class="chart-x" style="grid-template-columns:repeat(6,1fr)">' + d.bulan.map(b => '<span>' + esc(b.label) + '</span>').join('') + '</div></div>' +
      '<div class="card stack-sm"><h2 class="h3">Cara kerja komisi</h2><ol style="margin:0;padding-left:20px;line-height:28px"><li>Bagikan tautan atau kode referral Anda.</li><li>Guru menyebut kode Anda saat membeli lewat WhatsApp admin.</li><li>Komisi ' + d.persen + '% tercatat otomatis dan dibayarkan admin.</li></ol><a class="btn btn-secondary" target="_blank" rel="noopener" href="' + U.waLink(d.wa, 'Halo Admin EduGrade, saya affiliate ' + d.ref + '.') + '">' + icon('chat', 'ic-sm') + 'Hubungi admin</a></div></section>' +
      '<section class="card p0"><div class="card-pad row-between" style="border-bottom:1px solid var(--border)"><h2 class="h3">Penjualan saya</h2><span class="small muted">' + d.penjualan.length + ' transaksi</span></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Tanggal</th><th>Pembeli</th><th>Paket</th><th class="r">Nominal</th><th class="r">Komisi</th><th>Status</th></tr></thead><tbody>' +
      (d.penjualan.length ? d.penjualan.map(j => '<tr><td class="small">' + tgl(j.tanggal) + '</td><td><b>' + esc(j.nama) + '</b><div class="small muted">' + esc(j.sekolah) + '</div></td><td>' + esc(j.paket) + '</td><td class="r tnum">' + rupiah(j.harga) + '</td><td class="r tnum b">' + rupiah(j.komisi) + '</td><td>' + komisiStatus(j.status) + '</td></tr>').join('') : '<tr><td colspan="6"><div class="empty">' + icon('share', 'ic-lg') + 'Belum ada penjualan. Mulai bagikan tautan Anda.</div></td></tr>') + '</tbody></table></div></section>' +
      '<section class="card stack-sm"><h2 class="h3">Bahan promosi</h2><div class="wa-bubble">' + esc(waShare) + '</div><button class="btn btn-outline" id="cps" style="align-self:flex-start">' + icon('copy', 'ic-sm') + 'Salin teks promosi</button></section>' +
      '</div></main>';
    $('#out').addEventListener('click', () => logout());
    $('#cpl').addEventListener('click', () => U.copyText(d.link));
    $('#cps').addEventListener('click', () => U.copyText(waShare));
  }

  // ============================================
  // UTIL & ROUTER
  // ============================================
  function exportCsv(name, cols, rows) {
    const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const csv = '﻿' + cols.join(',') + '\n' + rows.map(r => cols.map(c => q(r[c])).join(',')).join('\n');
    U.saveFile(new Blob([csv], { type: 'text/csv;charset=utf-8' }), name);
  }
  function render() {
    if (!A.hasServer()) { $('#root').innerHTML = '<div class="login-wrap"><div class="card login-card stack"><h1 class="h2">Server belum diatur</h1><p class="muted">Isi <b>GAS_URL</b> di file <b>js/config.js</b> dengan URL Web App Apps Script, lalu unggah ulang.</p></div></div>'; return; }
    if (!S.sess) return viewLogin();
    if (S.sess.role === 'affiliate') return pAff();
    const h = location.hash.replace(/^#\/?/, '').split('/');
    const page = h[0] || 'ringkasan';
    if (page === 'kode' && h[1]) return pKodeDetail(h[1]);
    ({ ringkasan: pRingkasan, kode: pKode, buat: pBuat, penjualan: pPenjualan, affiliate: pAffiliate, paket: pPaket, pengaturan: pPengaturan, log: pLog }[page] || pRingkasan)();
  }
  window.addEventListener('hashchange', render);
  document.addEventListener('DOMContentLoaded', render);
})();
