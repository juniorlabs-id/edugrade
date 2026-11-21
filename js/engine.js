/* ============================================================
 * EduGrade — Mesin pengolah Excel (berjalan di browser guru)
 * - Membaca file (SheetJS), menebak sheet/kolom
 * - Konversi nilai (Merata / Jaga KKM / Naik sekian poin)
 * - Penentuan T/R e-Rapor (FR-E4)
 * - Menulis hasil dengan menyunting XML di dalam file .xlsx
 *   (JSZip) agar format, rumus lain, proteksi, dan nama file tetap.
 * Data siswa TIDAK PERNAH dikirim ke server.
 * ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('xlsx'), require('jszip'));
  } else {
    root.RPEngine = factory(root.XLSX, root.JSZip);
  }
})(typeof self !== 'undefined' ? self : this, function (XLSX, JSZip) {
  'use strict';

  // ============================================
  // UTILITAS UMUM
  // ============================================
  const norm = s => String(s == null ? '' : s)
    .toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();

  const STOP = new Set(['dan', 'nilai', 'daftar', 'kelas', 'semester', 'mapel', 'mata', 'pelajaran', 'the', 'of']);
  const tokens = s => norm(s).split(' ').filter(t => t && !STOP.has(t));

  function bigrams(s) {
    const t = ' ' + norm(s) + ' ';
    const m = new Map();
    for (let i = 0; i < t.length - 1; i++) {
      const g = t.substr(i, 2);
      m.set(g, (m.get(g) || 0) + 1);
    }
    return m;
  }
  // Kemiripan Dice (0..1) — tahan salah ketik kecil
  function dice(a, b) {
    if (!a || !b) return 0;
    const A = bigrams(a), B = bigrams(b);
    let inter = 0, na = 0, nb = 0;
    A.forEach(v => { na += v; });
    B.forEach(v => { nb += v; });
    A.forEach((v, g) => { if (B.has(g)) inter += Math.min(v, B.get(g)); });
    return (2 * inter) / (na + nb || 1);
  }

  const colLetter = c => { let s = ''; c++; while (c > 0) { const m = (c - 1) % 26; s = String.fromCharCode(65 + m) + s; c = Math.floor((c - 1) / 26); } return s; };
  const colIndex = L => { let n = 0; for (const ch of L) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; };
  const addr = (r, c) => colLetter(c) + (r + 1);
  const isNum = v => typeof v === 'number' && isFinite(v);
  const roundTo = (v, d) => { const p = Math.pow(10, d || 0); return Math.round(v * p + 1e-9) / p; };
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const escXml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // ============================================
  // MEMBACA FILE
  // ============================================
  function readWorkbook(bytes, fileName) {
    const name = String(fileName || '').toLowerCase();
    if (/\.xls$/.test(name)) {
      throw new Error('File ini berformat .xls lama. Buka di Excel, pilih Simpan Sebagai, lalu pilih .xlsx, kemudian unggah lagi.');
    }
    if (fileName && !/\.(xlsx|xlsm)$/.test(name)) {
      throw new Error('File ini bukan file Excel (.xlsx). Silakan pilih file nilai dari Excel.');
    }
    const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    // File .xlsx selalu diawali "PK" (zip). File berpassword berupa CFB.
    if (!(u8[0] === 0x50 && u8[1] === 0x4b)) {
      if (u8[0] === 0xd0 && u8[1] === 0xcf) throw new Error('File ini dikunci dengan password atau berformat lama. Buka kunci di Excel, simpan sebagai .xlsx, lalu unggah lagi.');
      throw new Error('File ini tidak bisa dibaca sebagai Excel. Coba buka di Excel lalu simpan ulang sebagai .xlsx.');
    }
    try {
      return XLSX.read(u8, { type: 'array', cellFormula: true, cellHTML: false, cellText: false, cellStyles: false, cellDates: false });
    } catch (e) {
      throw new Error('File ini tidak bisa dibaca. Coba buka di Excel, tekan Simpan, lalu unggah lagi.');
    }
  }

  // Ambil isi sheet sebagai matriks nilai + info rumus belum dihitung
  function sheetMatrix(ws) {
    if (!ws || !ws['!ref']) return { rows: [], uncached: new Set(), range: null };
    const range = XLSX.utils.decode_range(ws['!ref']);
    const rows = [];
    const uncached = new Set();
    const maxR = Math.min(range.e.r, 5000), maxC = Math.min(range.e.c, 200);
    for (let r = 0; r <= maxR; r++) {
      const row = [];
      for (let c = 0; c <= maxC; c++) {
        const cell = ws[addr(r, c)];
        if (!cell || cell.t === 'e') { row.push(null); continue; }
        if (cell.f && (cell.v === undefined || cell.v === null)) uncached.add(addr(r, c));
        row.push(cell.v === undefined ? null : cell.v);
      }
      rows.push(row);
    }
    return { rows, uncached, range };
  }

  const NAME_RE = /^(nama|nama siswa|nama peserta didik|nama lengkap|nama murid|peserta didik)$/;
  const SKIP_HDR = /^(no|no urut|nomor|nis|nisn|nipd|nik|peringkat|rank|ranking|rangking|kkm|jk|l p|kelas|absen)$/;
  const SUM_HDR = /(jumlah|total)/;

  // Analisis satu sheet: baris judul, kolom nama, baris siswa, kolom angka
  function analyzeSheet(wb, sheetName) {
    const ws = wb.Sheets[sheetName];
    const { rows, uncached } = sheetMatrix(ws);
    const out = { sheet: sheetName, ok: false, rows: [], columns: [], headerRow: -1, nameCol: -1, uncachedCount: 0, matrix: rows };
    // 1) Cari baris judul yang memuat "NAMA"
    let headerRow = -1, nameCol = -1;
    for (let r = 0; r < Math.min(rows.length, 40) && headerRow < 0; r++) {
      for (let c = 0; c < rows[r].length; c++) {
        if (typeof rows[r][c] === 'string' && NAME_RE.test(norm(rows[r][c]))) { headerRow = r; nameCol = c; break; }
      }
    }
    if (headerRow < 0) return out;
    out.headerRow = headerRow; out.nameCol = nameCol;
    const H = rows[headerRow] || [];
    const sub = rows[headerRow + 1] || [];
    const subIsHeader = !(typeof sub[nameCol] === 'string' && norm(sub[nameCol]).length > 1);

    // 2) Baris siswa: setelah judul, nama berupa teks, berhenti pada nama kosong pertama
    let r0 = headerRow + 1;
    if (subIsHeader) r0 = headerRow + 2;
    const studentRows = [];
    let started = false;
    for (let r = r0; r < rows.length; r++) {
      const nm = rows[r] ? rows[r][nameCol] : null;
      const ok = typeof nm === 'string' && norm(nm).length > 1 && !NAME_RE.test(norm(nm));
      if (!ok) { if (started) break; else continue; }
      started = true;
      studentRows.push({ r, name: String(nm).trim() });
    }
    out.rows = studentRows;
    if (!studentRows.length) return out;

    // 3) Label kolom: judul (diisi dari kiri bila sel gabungan) + sub-judul
    const maxC = Math.max(...rows.slice(headerRow, headerRow + 2).map(x => (x || []).length), ...studentRows.slice(0, 5).map(s => rows[s.r].length));
    let lastGroup = '';
    for (let c = 0; c < maxC; c++) {
      const h = H[c] != null && String(H[c]).trim() !== '' ? String(H[c]).trim() : '';
      if (c === nameCol || c === 0) lastGroup = '';
      else if (h) lastGroup = h;
      const group = h || (subIsHeader && sub[c] != null && String(sub[c]).trim() !== '' ? lastGroup : '');
      const subLbl = subIsHeader && sub[c] != null && String(sub[c]).trim() !== '' ? String(sub[c]).trim() : '';
      if (c === nameCol) continue;
      const vals = studentRows.map(s => rows[s.r][c]);
      const numeric = vals.filter(isNum);
      const filled = vals.filter(v => v !== null && v !== '').length;
      let unc = 0;
      studentRows.forEach(s => { if (uncached.has(addr(s.r, c))) unc++; });
      if (numeric.length === 0 && unc === 0) continue;
      if ((numeric.length + unc) < Math.max(1, Math.ceil(studentRows.length * 0.5))) continue;
      if (filled > 0 && numeric.length < filled * 0.6 && unc === 0) continue;
      const label = (h ? h + (subLbl ? ' ' + subLbl : '') : (group ? group + ' ' + subLbl : (subLbl || colLetter(c)))).replace(/\s+/g, ' ');
      const n = norm(h || group);
      const col = {
        c, letter: colLetter(c), label, group: group || h, sub: subLbl,
        values: vals.map(v => (isNum(v) ? v : null)),
        samples: numeric.slice(0, 3).map(v => roundTo(v, 1)),
        count: numeric.length, uncached: unc, disabled: false, hidden: false, note: ''
      };
      if (SKIP_HDR.test(n)) col.hidden = true;
      else if (SUM_HDR.test(n)) { col.disabled = true; col.note = 'Kolom jumlah, tidak diubah'; }
      else if (numeric.some(v => v > 100 || v < 0)) { col.disabled = true; col.note = 'Ada nilai di luar 0–100, tidak diubah'; }
      out.columns.push(col);
      out.uncachedCount += unc;
    }
    out.columns = out.columns.filter(c => !c.hidden);
    out.ok = out.columns.length > 0;
    return out;
  }

  const FINAL_RE = /^(na|n a|nilai akhir|nilai rapor|nilai raport|nr|rapor|raport|nilai rapot|akhir)$/;
  const AVG_RE = /(rata|rerata|average)/;
  const TP_GROUP_RE = /^(tp|tujuan pembelajaran|tujuan)/;

  // Kolom yang dicentang bawaan
  function defaultSelected(an) {
    const maxCount = Math.max(0, ...an.columns.map(c => c.count));
    const usable = an.columns.filter(c => !c.disabled && c.count >= maxCount * 0.9);
    const finals = usable.filter(c => FINAL_RE.test(norm(c.label)) || FINAL_RE.test(norm(c.group)));
    if (finals.length) return finals.map(c => c.c);
    const nonTp = usable.filter(c => !TP_GROUP_RE.test(norm(c.group)) && !AVG_RE.test(norm(c.label)));
    if (nonTp.length) return nonTp.map(c => c.c);
    return usable.slice(-1).map(c => c.c);
  }

  // Urutkan sheet berdasarkan kecocokan sebagai sheet nilai akhir
  function rankSheets(wb) {
    const list = wb.SheetNames.map(name => {
      let an;
      try { an = analyzeSheet(wb, name); } catch (e) { an = { ok: false }; }
      let score = 0;
      if (an.ok) {
        const usable = an.columns.filter(c => !c.disabled);
        const named = usable.filter(c => /[a-z]{2,}/.test(norm(c.label))).length;
        score = Math.min(named, 8) + Math.min(an.rows.length, 60) / 20;
        if (usable.some(c => FINAL_RE.test(norm(c.label)))) score += 6;
        const nn = norm(name);
        if (/rapor|raport|akhir|rekap/.test(nn)) score += 30;
        if (/^nilai\b/.test(nn)) score += 5;
        if (/analisis|sas|pts|catatan|kehadiran|absen|per tp/.test(nn)) score -= 30;
      }
      return { name, ok: !!an.ok, score, students: an.ok ? an.rows.length : 0 };
    });
    return list.filter(x => x.ok).sort((a, b) => b.score - a.score);
  }

  // ============================================
  // KONVERSI NILAI (FR-G5)
  // ============================================
  function convertSeries(values, o) {
    const nums = values.filter(isNum);
    const out = { values: values.map(() => null), notes: [] };
    if (!nums.length) return out;
    const min = Math.min(...nums), max = Math.max(...nums);
    const H1 = +o.h1, H2 = +o.h2, K = +o.kkm, dec = o.decimals || 0;
    let f;
    if (o.method === 'kkm') {
      const T = clamp(o.t != null && o.t !== '' ? +o.t : defaultT(K, H1, H2), H1, H2);
      f = n => {
        if (max === min) return (H1 + H2) / 2;
        if (n <= K) return K === min ? T : H1 + (n - min) / (K - min) * (T - H1);
        return max === K ? T : T + (n - K) / (max - K) * (H2 - T);
      };
      if (min > K) out.notes.push('Semua nilai asli sudah di atas KKM; nilai terendah tidak sampai ke batas terendah.');
    } else if (o.method === 'poin') {
      const N = +o.n || 0;
      f = n => clamp(n + N, H1, H2);
      out.notes.push('Batas terendah dan tertinggi bisa membuat beberapa nilai menjadi sama.');
    } else {
      f = n => (max === min ? (H1 + H2) / 2 : H1 + (n - min) / (max - min) * (H2 - H1));
      if (max === min) out.notes.push('Semua nilai asli sama, jadi semua diberi nilai tengah.');
    }
    // Nilai tidak pernah turun (kecuali dipotong batas tertinggi H2); urutan tetap terjaga
    const p10 = Math.pow(10, dec);
    out.values = values.map(v => {
      if (!isNum(v)) return null;
      const floor = Math.min(v, H2);
      const x = clamp(Math.max(f(v), floor), 0, 100);
      let r = roundTo(x, dec);
      if (r < floor - 1e-9) r = Math.min(Math.ceil(x * p10 - 1e-9) / p10, Math.max(H2, floor));
      return r;
    });
    out.min = min; out.max = max;
    return out;
  }
  // Nilai hasil bawaan untuk siswa tepat di KKM (metode Jaga KKM)
  function defaultT(K, H1, H2) {
    if (K >= H1 && K <= H2) return Math.round(K);
    return Math.round(clamp(H1 + (H2 - H1) / 4, H1, H2));
  }

  function stats(values, names, kkm) {
    const list = [];
    values.forEach((v, i) => { if (isNum(v)) list.push({ v, name: names[i], i }); });
    if (!list.length) return { n: 0, avg: 0, max: null, min: null, below: [], top: [] };
    const sum = list.reduce((a, b) => a + b.v, 0);
    const sorted = list.slice().sort((a, b) => b.v - a.v || a.i - b.i);
    const below = list.filter(x => x.v < kkm).sort((a, b) => a.v - b.v);
    return {
      n: list.length, avg: sum / list.length,
      max: sorted[0], min: sorted[sorted.length - 1],
      top: sorted.slice(0, 10), below, belowPct: below.length / list.length * 100
    };
  }

  const BINS = [{ l: '< 50', lo: -Infinity, hi: 50 }, { l: '50–59', lo: 50, hi: 60 }, { l: '60–69', lo: 60, hi: 70 }, { l: '70–79', lo: 70, hi: 80 }, { l: '80–89', lo: 80, hi: 90 }, { l: '90–100', lo: 90, hi: Infinity }];
  function bins(values) {
    const counts = BINS.map(() => 0);
    values.forEach(v => { if (isNum(v)) { const i = BINS.findIndex(b => v >= b.lo && v < b.hi); counts[i < 0 ? BINS.length - 1 : i]++; } });
    return BINS.map((b, i) => ({ label: b.l, lo: b.lo, hi: b.hi, count: counts[i] }));
  }

  // ============================================
  // PENULISAN XLSX (sunting XML langsung)
  // ============================================
  async function openZip(bytes) { return JSZip.loadAsync(bytes); }

  async function sheetPaths(zip) {
    const wbXml = await zip.file('xl/workbook.xml').async('string');
    const relsXml = await zip.file('xl/_rels/workbook.xml.rels').async('string');
    const rels = {};
    relsXml.replace(/<Relationship\b([^>]*)\/?>/g, (m, a) => {
      const id = (a.match(/\bId="([^"]+)"/) || [])[1];
      const tg = (a.match(/\bTarget="([^"]+)"/) || [])[1];
      if (id && tg) rels[id] = tg;
      return m;
    });
    const map = {};
    wbXml.replace(/<sheet\b([^>]*)\/?>/g, (m, a) => {
      const nm = (a.match(/\bname="([^"]+)"/) || [])[1];
      const rid = (a.match(/\br:id="([^"]+)"/) || a.match(/\bid="([^"]+)"/) || [])[1];
      if (nm && rid && rels[rid]) {
        let t = rels[rid].replace(/^\//, '');
        if (!t.startsWith('xl/')) t = 'xl/' + t;
        map[unescXml(nm)] = t;
      }
      return m;
    });
    return map;
  }
  const unescXml = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

  // Geser referensi relatif pada rumus (untuk rumus bersama/shared)
  function shiftFormula(f, dr, dc) {
    let out = '', i = 0;
    const parts = f.split('"'); // bagian ganjil = teks dalam tanda kutip
    for (i = 0; i < parts.length; i++) {
      if (i % 2 === 1) { out += '"' + parts[i] + '"'; continue; }
      out += parts[i].replace(/(^|[^A-Za-z0-9_.$'])(\$?)([A-Z]{1,3})(\$?)(\d+)(?![A-Za-z0-9_(])/g,
        (m, pre, cAbs, col, rAbs, row) => {
          let nc = col, nr = row;
          if (!cAbs) nc = colLetter(colIndex(col) + dc);
          if (!rAbs) nr = String(+row + dr);
          return pre + cAbs + nc + rAbs + nr;
        });
    }
    return out;
  }

  /*
   * edits: { "G7": {num: 80} | {sst: 12} | {empty: true} | {cache: 3, str: false} }
   */
  function applyCellEdits(xml, edits) {
    const parseRef = ref => { const m = ref.match(/^([A-Z]+)(\d+)$/); return { c: colIndex(m[1]), r: +m[2] - 1 }; };
    // 1) Kumpulkan rumus bersama yang master-nya akan ditimpa
    const brokenMasters = {}; // si -> {ref, formula}
    xml.replace(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g, (m, attrs, inner) => {
      const ref = (attrs.match(/\br="([A-Z]+\d+)"/) || [])[1];
      if (!ref || !inner || !edits[ref] || edits[ref].cache !== undefined) return m;
      const fm = inner.match(/<f\b([^>]*)>([\s\S]*?)<\/f>/);
      if (fm && /t="shared"/.test(fm[1]) && /\bref="/.test(fm[1])) {
        const si = (fm[1].match(/\bsi="(\d+)"/) || [])[1];
        if (si != null) brokenMasters[si] = { ref, formula: unescXml(fm[2]) };
      }
      return m;
    });
    const hasBroken = Object.keys(brokenMasters).length > 0;

    return xml.replace(/<c\b([^>]*?)(\/>|>([\s\S]*?)<\/c>)/g, (m, attrs, close, inner) => {
      const ref = (attrs.match(/\br="([A-Z]+\d+)"/) || [])[1];
      if (!ref) return m;
      const ed = edits[ref];
      if (!ed) {
        // Sel lain yang memakai rumus bersama dari master yang ditimpa -> tulis rumus lengkap
        if (hasBroken && inner) {
          const fm = inner.match(/<f\b([^>]*?)(?:\/>|>([\s\S]*?)<\/f>)/);
          if (fm && /t="shared"/.test(fm[1])) {
            const si = (fm[1].match(/\bsi="(\d+)"/) || [])[1];
            const ms = brokenMasters[si];
            if (ms && !/\bref="/.test(fm[1])) {
              const a = parseRef(ms.ref), b = parseRef(ref);
              const nf = shiftFormula(ms.formula, b.r - a.r, b.c - a.c);
              return '<c' + attrs + '>' + inner.replace(fm[0], '<f>' + escXml(nf) + '</f>') + '</c>';
            }
          }
        }
        return m;
      }
      const baseAttrs = attrs.replace(/\s+t="[^"]*"/, '');
      if (ed.cache !== undefined) {
        const f = inner ? (inner.match(/<f\b[^>]*?(?:\/>|>[\s\S]*?<\/f>)/) || [''])[0] : '';
        const v = ed.str ? escXml(ed.cache) : ed.cache;
        return '<c' + baseAttrs + (ed.str ? ' t="str"' : '') + '>' + f + '<v>' + v + '</v></c>';
      }
      if (ed.empty) return '<c' + baseAttrs + '/>';
      if (ed.sst !== undefined) return '<c' + baseAttrs + ' t="s"><v>' + ed.sst + '</v></c>';
      if (ed.inline !== undefined) return '<c' + baseAttrs + ' t="inlineStr"><is><t>' + escXml(ed.inline) + '</t></is></c>';
      return '<c' + baseAttrs + '><v>' + ed.num + '</v></c>';
    });
  }

  // Hapus calcChain dan minta Excel menghitung ulang saat dibuka
  async function finalizeWorkbook(zip) {
    if (zip.file('xl/calcChain.xml')) {
      zip.remove('xl/calcChain.xml');
      const ct = zip.file('[Content_Types].xml');
      if (ct) zip.file('[Content_Types].xml', (await ct.async('string')).replace(/<Override\b[^>]*calcChain[^>]*\/>/g, ''));
      const rel = zip.file('xl/_rels/workbook.xml.rels');
      if (rel) zip.file('xl/_rels/workbook.xml.rels', (await rel.async('string')).replace(/<Relationship\b[^>]*calcChain[^>]*\/>/g, ''));
    }
    let wb = await zip.file('xl/workbook.xml').async('string');
    if (/<calcPr\b/.test(wb)) {
      wb = wb.replace(/<calcPr\b([^>]*?)(\/?)>/, (m, a, sl) => /fullCalcOnLoad/.test(a) ? m : '<calcPr' + a + ' fullCalcOnLoad="1"' + sl + '>');
    } else {
      // Urutan elemen workbook ketat: calcPr setelah definedNames (bila ada) atau setelah sheets
      if (/<\/definedNames>/.test(wb)) wb = wb.replace(/<\/definedNames>/, '</definedNames><calcPr fullCalcOnLoad="1"/>');
      else wb = wb.replace(/<\/sheets>/, '</sheets><calcPr fullCalcOnLoad="1"/>');
    }
    zip.file('xl/workbook.xml', wb);
  }

  async function generate(zip) {
    return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  }

  // targets: [{sheet, col (index), rows: [{r, value}]}]
  async function buildKonversi(bytes, targets) {
    const zip = await openZip(bytes);
    const paths = await sheetPaths(zip);
    const bySheet = {};
    targets.forEach(t => { (bySheet[t.sheet] = bySheet[t.sheet] || []).push(t); });
    for (const sheet of Object.keys(bySheet)) {
      const p = paths[sheet];
      if (!p || !zip.file(p)) throw new Error('Sheet "' + sheet + '" tidak ditemukan saat menyimpan.');
      const edits = {};
      bySheet[sheet].forEach(t => t.rows.forEach(x => { if (isNum(x.value)) edits[addr(x.r, t.col)] = { num: x.value }; }));
      const xml = await zip.file(p).async('string');
      zip.file(p, applyCellEdits(xml, edits));
    }
    await finalizeWorkbook(zip);
    return generate(zip);
  }

  // ============================================
  // E-RAPOR: TEMPLATE
  // ============================================
  function parseTemplate(bytes, fileName) {
    const wb = readWorkbook(bytes, fileName);
    const sheetName = wb.SheetNames[0];
    const { rows } = sheetMatrix(wb.Sheets[sheetName]);
    const title = String((rows[0] || [])[0] || '');
    const bad = { ok: false, error: 'File ini bukan template e-Rapor. Unduh template dari dashboard e-Rapor Anda.' };
    if (!/format import nilai rapor/i.test(title)) return bad;
    // Cari baris judul kolom
    let hr = -1;
    for (let r = 0; r < Math.min(rows.length, 15); r++) {
      const nr = (rows[r] || []).map(norm);
      if (nr.includes('nama siswa') && nr.some(x => x === 'nilai rapor')) { hr = r; break; }
    }
    if (hr < 0) return bad;
    const H = rows[hr].map(norm);
    const nameCol = H.indexOf('nama siswa');
    const nilaiCol = H.indexOf('nilai rapor');
    const nisnCol = H.indexOf('nisn');
    const tpStart = H.findIndex(x => /ketercapaian/.test(x));
    const valCol = H.indexOf('validasi');
    if (nameCol < 0 || nilaiCol < 0 || tpStart < 0 || valCol < 0) return bad;
    // Baris kode TP (TP.xxx / TR / OP / NILAI)
    let codeRow = -1;
    for (let r = hr + 1; r < Math.min(rows.length, hr + 6); r++) {
      if ((rows[r] || []).some(v => /^tp\./i.test(String(v || '')) || norm(v) === 'tr')) { codeRow = r; break; }
    }
    if (codeRow < 0) return bad;
    const CR = rows[codeRow];
    const tpCols = [];
    for (let c = tpStart; c < valCol; c++) {
      const code = String(CR[c] || '').trim();
      if (!code) continue;
      let desc = '';
      for (let r = codeRow - 1; r > hr; r--) { const v = rows[r][c]; if (typeof v === 'string' && v.trim().length > 3 && !/^[0-9a-f-]{30,}$/i.test(v.trim())) { desc = v.trim(); break; } }
      tpCols.push({ c, letter: colLetter(c), code, desc });
    }
    const trCol = CR.findIndex((v, i) => i >= valCol && norm(v) === 'tr');
    const opCol = CR.findIndex((v, i) => i >= valCol && norm(v) === 'op');
    const okCol = CR.findIndex((v, i) => i >= valCol && norm(v) === 'nilai');
    const students = [];
    for (let r = codeRow + 1; r < rows.length; r++) {
      const nm = rows[r] && rows[r][nameCol];
      if (typeof nm !== 'string' || !nm.trim()) { if (students.length) break; else continue; }
      students.push({ r, no: rows[r][0], nisn: nisnCol >= 0 ? String(rows[r][nisnCol] || '') : '', name: nm.trim() });
    }
    const tm = title.match(/format import nilai rapor\s+(.*?)\s*,?\s*kelas\s+(.*)$/i);
    const mapel = tm ? tm[1].replace(/\s*,\s*$/, '').trim() : title.replace(/format import nilai rapor/i, '').trim();
    const kelas = tm ? tm[2].trim() : '';
    if (!tpCols.length || !students.length) return bad;
    return { ok: true, fileName, sheetName, mapel: titleCase(mapel), kelas, nameCol, nilaiCol, tpCols, trCol, opCol, valCol: okCol >= 0 ? okCol : -1, students };
  }
  const titleCase = s => s.toLowerCase().replace(/\b([a-z])/g, m => m.toUpperCase()).replace(/\bDan\b/g, 'dan');

  // ============================================
  // E-RAPOR: FILE NILAI GURU (sheet per mapel)
  // ============================================
  const initials = s => tokens(s).filter(t => !/^\d+$/.test(t)).map(t => t[0]).join('');
  function mapelSheetScore(mapel, sheetName) {
    const a = tokens(mapel), b = tokens(sheetName);
    if (!b.length) return 0;
    const inter = b.filter(t => a.includes(t)).length;
    let s = inter / Math.max(1, Math.min(a.length, b.length));
    const ini = initials(mapel), bj = b.join('');
    if (ini && b.some(t => t === ini || (t.length >= 2 && ini.startsWith(t) && t.length >= ini.length - 1))) s = Math.max(s, 0.9);
    if (ini && bj === ini) s = Math.max(s, 0.95);
    s = Math.max(s, dice(a.join(' '), b.join(' ')) * 0.9);
    // Utamakan sheet "NILAI ..." dibanding "ANALISIS ..." / "SAS ..."
    const nn = norm(sheetName);
    if (/^nilai\b/.test(nn)) s += 0.05;
    if (/analisis|sas|pts|per tp/.test(nn)) s -= 0.2;
    return s;
  }
  function matchMapelSheet(mapel, sheetNames) {
    return sheetNames.map(n => ({ name: n, score: mapelSheetScore(mapel, n) })).sort((a, b) => b.score - a.score);
  }

  // Cari tabel deskripsi TP ("NO | TP" di bawah daftar siswa)
  function findTpDescriptions(matrix) {
    const map = {};
    for (let r = 0; r < matrix.length; r++) {
      const row = matrix[r] || [];
      for (let c = 1; c < row.length; c++) {
        const h = norm(row[c]);
        if ((h === 'tp' || h === 'tujuan pembelajaran' || h === 'deskripsi tp') && /^no/.test(norm(row[c - 1]))) {
          for (let k = r + 1; k < matrix.length; k++) {
            const key = matrix[k] && matrix[k][c - 1];
            const d = matrix[k] && matrix[k][c];
            if (key == null || key === '' || typeof d !== 'string' || !d.trim()) break;
            map[norm(key)] = d.trim();
          }
          if (Object.keys(map).length) return map;
        }
      }
    }
    return map;
  }

  const isTpCol = c => !c.disabled && !AVG_RE.test(norm(c.sub)) && !/^rt/i.test(c.sub || '') &&
    (TP_GROUP_RE.test(norm(c.group)) || (!c.group && /^\d+[a-z]?$/i.test(String(c.sub || '').trim())));

  function analyzeTpSheet(wb, sheetName) {
    const an = analyzeSheet(wb, sheetName);
    if (!an.ok) return { ok: false, sheet: sheetName };
    const descs = findTpDescriptions(an.matrix);
    let tps = an.columns.filter(isTpCol)
      .map(c => ({ key: norm(c.sub || c.label), cols: [c.c], label: 'TP ' + (c.sub || c.letter) + ' (kolom ' + c.letter + ')', desc: descs[norm(c.sub)] || '', values: c.values }));
    // Sub-TP (1a, 1b, 2a…) -> digabung per nomor TP (rata-rata) sebagai pilihan tambahan
    const groups = {};
    tps.forEach(t => { const m = t.key.match(/^(\d+)\s*[a-z]/); if (m) (groups[m[1]] = groups[m[1]] || []).push(t); });
    const gkeys = Object.keys(groups);
    if (gkeys.length) {
      gkeys.forEach(k => {
        const parts = groups[k];
        const vals = parts[0].values.map((_, i) => {
          const xs = parts.map(p => p.values[i]).filter(isNum);
          return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
        });
        tps.push({ key: k, cols: parts.reduce((a, p) => a.concat(p.cols), []), label: 'TP ' + k + ' (rata-rata ' + parts.map(p => p.key).join(', ') + ')', desc: descs[k] || '', values: vals, agg: true });
      });
    }
    const finals = an.columns.filter(c => !c.disabled && !isTpCol(c));
    const naDefault = (finals.find(c => FINAL_RE.test(norm(c.label))) || finals[finals.length - 1] || null);
    return { ok: true, sheet: sheetName, students: an.rows, tps, finals, naDefault: naDefault ? naDefault.c : null, columns: an.columns, uncachedCount: an.uncachedCount };
  }

  // Pasangkan TP template ↔ TP guru lewat deskripsi. Hasil: indeks pada teacherTPs (j)
  function matchTPs(tplTPs, teacherTPs) {
    const res = tplTPs.map(() => ({ j: null, score: 0, status: 'none' }));
    if (!teacherTPs.length) return res;
    const pairs = [];
    tplTPs.forEach((t, i) => teacherTPs.forEach((g, j) => {
      if (g.desc) pairs.push({ i, j, s: dice(t.desc, g.desc) });
    }));
    pairs.sort((a, b) => b.s - a.s);
    const usedI = new Set(), usedJ = new Set();
    pairs.forEach(p => {
      if (usedI.has(p.i) || usedJ.has(p.j) || p.s < 0.45) return;
      usedI.add(p.i); usedJ.add(p.j);
      res[p.i] = { j: p.j, score: p.s, status: p.s >= 0.8 ? 'ok' : 'mirip' };
    });
    if (usedI.size) {
      // Sisa yang belum berpasangan: pasangkan berurutan bila jumlah sisanya sama (perlu dicek)
      const useAgg = [...usedJ].some(j => teacherTPs[j].agg);
      const leftT = tplTPs.map((t, i) => i).filter(i => !usedI.has(i));
      const leftG = teacherTPs.map((g, j) => j).filter(j => !usedJ.has(j) && !!teacherTPs[j].agg === useAgg);
      if (leftT.length && leftT.length === leftG.length) leftT.forEach((i, k) => { res[i] = { j: leftG[k], score: 0.5, status: 'mirip' }; });
      return res;
    }
    // Tanpa deskripsi: pasangkan berurutan bila jumlahnya sama (guru wajib memeriksa)
    const plain = teacherTPs.map((g, j) => ({ g, j })).filter(x => !x.g.agg);
    const agg = teacherTPs.map((g, j) => ({ g, j })).filter(x => x.g.agg);
    const pool = agg.length === tplTPs.length ? agg : (plain.length === tplTPs.length ? plain : null);
    if (pool) tplTPs.forEach((t, i) => { res[i] = { j: pool[i].j, score: 0.5, status: 'mirip' }; });
    return res;
  }

  function nameScore(a, b) {
    const na = norm(a), nb = norm(b);
    if (!na || !nb) return 0;
    if (na === nb) return 1;
    const ta = na.split(' '), tb = nb.split(' ');
    const [sm, lg] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
    if (sm.every(t => lg.includes(t))) return 0.9; // nama singkat termuat di nama panjang
    return dice(na, nb);
  }
  // Pasangkan siswa template ↔ siswa file guru (satu-satu)
  function matchStudents(tplStudents, teacherStudents) {
    const res = tplStudents.map(() => ({ idx: null, score: 0, status: 'none' }));
    const pairs = [];
    tplStudents.forEach((t, i) => teacherStudents.forEach((g, j) => {
      const s = nameScore(t.name, g.name);
      if (s >= 0.7) pairs.push({ i, j, s });
    }));
    pairs.sort((a, b) => b.s - a.s);
    const ui = new Set(), uj = new Set();
    pairs.forEach(p => {
      if (ui.has(p.i) || uj.has(p.j)) return;
      ui.add(p.i); uj.add(p.j);
      res[p.i] = { idx: p.j, score: p.s, status: p.s === 1 ? 'ok' : 'mirip' };
    });
    return res;
  }

  // ============================================
  // E-RAPOR: ATURAN T/R (FR-E4)
  // ============================================
  // scores: array nilai per TP (urut template; null = tidak ada nilai)
  // crit: {tMin, rMax}
  // Jumlah T/R yang ditulis: bila TP yang memenuhi syarat lebih dari 1,
  //   lebih dari 50% jumlah TP template -> 2, selain itu -> 1.
  //   Bila 0 atau 1, dipakai apa adanya (0 -> ditandai otomatis bila wajib).
  function trCount(cand, nTp) {
    if (cand <= 1) return cand;
    return cand > nTp * 0.5 ? 2 : 1;
  }
  function decideTR(scores, nilai, crit) {
    const n = scores.length;
    const marks = Array(n).fill(''), auto = Array(n).fill(false);
    const idx = scores.map((v, i) => ({ v, i })).filter(x => isNum(x.v));
    let warn = '';
    if (!idx.length) return { marks, auto, warn: 'Tidak ada nilai TP untuk siswa ini.' };
    const desc = idx.slice().sort((a, b) => b.v - a.v || a.i - b.i);
    const asc = idx.slice().sort((a, b) => a.v - b.v || a.i - b.i);
    const candT = desc.filter(x => x.v >= crit.tMin);
    const candR = asc.filter(x => x.v < crit.rMax);
    if (nilai >= 100) {
      let T = candT.slice(0, trCount(candT.length, n));
      if (!T.length) { T = [desc[0]]; auto[desc[0].i] = true; }
      T.forEach(x => { marks[x.i] = 'T'; });
    } else {
      let R = candR.slice(0, trCount(candR.length, n));
      if (!R.length) { R = [asc[0]]; auto[asc[0].i] = true; }
      R.forEach(x => { marks[x.i] = 'R'; });
      const rest = desc.filter(x => marks[x.i] !== 'R');
      const ct = candT.filter(x => marks[x.i] !== 'R');
      let T = ct.slice(0, trCount(ct.length, n));
      if (!T.length && rest.length) { T = [rest[0]]; auto[rest[0].i] = true; }
      T.forEach(x => { marks[x.i] = 'T'; });
    }
    if (idx.length < 2) warn = 'Hanya 1 TP yang punya nilai.';
    return { marks, auto, warn };
  }

  // Sama persis dengan rumus kolom VALIDASI di template
  function validity(nilai, marks) {
    const nR = marks.filter(m => m === 'R').length, nT = marks.filter(m => m === 'T').length;
    if (nilai === null || nilai === '' || nilai === undefined) return { valid: false, nR, nT, reason: 'Nilai rapor kosong' };
    if (nilai >= 100) {
      if (nR > 0) return { valid: false, nR, nT, reason: 'Nilai 100 tidak boleh ada R' };
      if (nR + nT === 0) return { valid: false, nR, nT, reason: 'Perlu minimal 1 T' };
      return { valid: true, nR, nT, reason: '' };
    }
    if (nR === 0) return { valid: false, nR, nT, reason: 'Perlu minimal 1 R' };
    return { valid: true, nR, nT, reason: '' };
  }

  const toRapor = v => (isNum(v) ? clamp(Math.round(v), 1, 100) : null);

  // rowsData: [{r, nilai, marks:[...urut tpCols]}]
  async function buildErapor(bytes, tpl, rowsData) {
    const zip = await openZip(bytes);
    const paths = await sheetPaths(zip);
    const p = paths[tpl.sheetName];
    let xml = await zip.file(p).async('string');
    // Shared strings untuk "T" dan "R"
    const sstFile = zip.file('xl/sharedStrings.xml');
    const idx = {};
    let sst = null;
    if (sstFile) {
      sst = await sstFile.async('string');
      const sis = sst.match(/<si>[\s\S]*?<\/si>/g) || [];
      sis.forEach((si, i) => {
        const txt = unescXml(si.replace(/<rPh\b[\s\S]*?<\/rPh>/g, '').replace(/<[^>]+>/g, ''));
        if ((txt === 'T' || txt === 'R') && idx[txt] === undefined) idx[txt] = i;
      });
      let n = sis.length, added = false;
      ['T', 'R'].forEach(k => { if (idx[k] === undefined) { idx[k] = n++; sst = sst.replace(/<\/sst>/, '<si><t>' + k + '</t></si></sst>'); added = true; } });
      if (added) {
        sst = sst.replace(/\buniqueCount="\d+"/, 'uniqueCount="' + n + '"');
        zip.file('xl/sharedStrings.xml', sst);
      }
    }
    const edits = {};
    rowsData.forEach(d => {
      const r = d.r;
      edits[addr(r, tpl.nilaiCol)] = { num: d.nilai };
      tpl.tpCols.forEach((t, k) => {
        const m = d.marks[k];
        edits[addr(r, t.c)] = m ? (sst ? { sst: idx[m] } : { inline: m }) : { empty: true };
      });
      const v = validity(d.nilai, d.marks);
      if (tpl.trCol >= 0) edits[addr(r, tpl.trCol)] = { cache: v.nR };
      if (tpl.opCol >= 0) edits[addr(r, tpl.opCol)] = { cache: v.nT };
      if (tpl.valCol >= 0) edits[addr(r, tpl.valCol)] = { cache: v.valid ? 'Valid' : 'Tidak Valid', str: true };
    });
    zip.file(p, applyCellEdits(xml, edits));
    await finalizeWorkbook(zip);
    return generate(zip);
  }

  // Bungkus banyak file menjadi satu ZIP (nama file asli)
  async function zipFiles(files) {
    const z = new JSZip();
    files.forEach(f => z.file(f.name, f.data));
    return z.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
  }

  // ============================================
  // SIDIK FILE (SHA-256) — tidak bisa dibalik
  // ============================================
  async function sha256(bytes) {
    const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const h = await crypto.subtle.digest('SHA-256', u8);
      return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    return require('crypto').createHash('sha256').update(Buffer.from(u8)).digest('hex');
  }

  return {
    norm, dice, colLetter, colIndex, addr, isNum, roundTo, clamp,
    readWorkbook, analyzeSheet, defaultSelected, rankSheets,
    convertSeries, defaultT, stats, bins,
    applyCellEdits, shiftFormula, buildKonversi,
    parseTemplate, matchMapelSheet, analyzeTpSheet, matchTPs, matchStudents, nameScore,
    decideTR, trCount, validity, toRapor, buildErapor, zipFiles, sha256
  };
});
