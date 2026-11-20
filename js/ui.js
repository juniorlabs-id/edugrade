/* ============================================================
 * EduGrade — Komponen UI bersama (ikon, toast, modal, format)
 * ============================================================ */
(function () {
  // Ikon garis (gaya Lucide), 24x24
  const P = {
    'check': '<path d="M20 6 9 17l-5-5"/>',
    'arrow-right': '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    'arrow-left': '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    'key': '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.3-9.3"/><path d="m16 7 3 3"/><path d="m19 4 2 2"/>',
    'help': '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
    'sheet': '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/><path d="M14 2v5h6"/><path d="M8 13h2"/><path d="M14 13h2"/><path d="M8 17h2"/><path d="M14 17h2"/>',
    'clipboard': '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
    'info': '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    'lock': '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    'upload': '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
    'download': '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    'x': '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    'plus': '<path d="M5 12h14"/><path d="M12 5v14"/>',
    'minus': '<path d="M5 12h14"/>',
    'search': '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    'alert': '<path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    'alert-circle': '<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
    'check-circle': '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    'minus-circle': '<circle cx="12" cy="12" r="10"/><path d="M8 12h8"/>',
    'chat': '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z"/>',
    'pencil': '<path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
    'eye': '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12"/><circle cx="12" cy="12" r="3"/>',
    'eye-off': '<path d="m2 2 20 20"/><path d="M6.7 6.7A10.8 10.8 0 0 0 2 12s3 7 10 7a9.7 9.7 0 0 0 5.3-1.7"/><path d="M10.7 5.1A10 10 0 0 1 12 5c7 0 10 7 10 7a13.2 13.2 0 0 1-1.7 2.7"/>',
    'files': '<path d="M15.5 2H8.6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h9.8a2 2 0 0 0 2-2V6.5z"/><path d="M3 7.6v12.8A1.6 1.6 0 0 0 4.6 22h9.8"/><path d="M15 2v5h5"/>',
    'sparkles': '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3z"/>',
    'refresh': '<path d="M3 12a9 9 0 0 1 9-9 9.8 9.8 0 0 1 6.7 2.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.8 9.8 0 0 1-6.7-2.7L3 16"/><path d="M8 16H3v5"/>',
    'copy': '<rect x="8" y="8" width="14" height="14" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    'logout': '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    'dashboard': '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    'receipt': '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8H8"/><path d="M16 12H8"/><path d="M13 16H8"/>',
    'users': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/>',
    'package': '<path d="m7.5 4.3 9 5.2"/><path d="M21 8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7Z"/><path d="M3.3 7 12 12l8.7-5"/><path d="M12 22V12"/>',
    'settings': '<path d="M12.2 2h-.4a2 2 0 0 0-2 2v.2a2 2 0 0 1-1 1.7l-.4.3a2 2 0 0 1-2 0l-.2-.1a2 2 0 0 0-2.7.7l-.2.4a2 2 0 0 0 .7 2.7l.2.1a2 2 0 0 1 1 1.7v.5a2 2 0 0 1-1 1.8l-.2.1a2 2 0 0 0-.7 2.7l.2.4a2 2 0 0 0 2.7.7l.2-.1a2 2 0 0 1 2 0l.4.3a2 2 0 0 1 1 1.7v.2a2 2 0 0 0 2 2h.4a2 2 0 0 0 2-2v-.2a2 2 0 0 1 1-1.7l.4-.3a2 2 0 0 1 2 0l.2.1a2 2 0 0 0 2.7-.7l.2-.4a2 2 0 0 0-.7-2.7l-.2-.1a2 2 0 0 1-1-1.7v-.5a2 2 0 0 1 1-1.7l.2-.1a2 2 0 0 0 .7-2.7l-.2-.4a2 2 0 0 0-2.7-.7l-.2.1a2 2 0 0 1-2 0l-.4-.3a2 2 0 0 1-1-1.7V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    'history': '<path d="M3 12a9 9 0 1 0 9-9 9.8 9.8 0 0 0-6.7 2.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
    'bell': '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
    'chev-right': '<path d="m9 18 6-6-6-6"/>',
    'chev-down': '<path d="m6 9 6 6 6-6"/>',
    'trash': '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
    'link': '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.8 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    'menu': '<path d="M4 12h16"/><path d="M4 6h16"/><path d="M4 18h16"/>',
    'cap': '<path d="M21.4 10.9a1 1 0 0 0 0-1.8L12.8 5.2a2 2 0 0 0-1.6 0L2.6 9.1a1 1 0 0 0 0 1.8l8.6 3.9a2 2 0 0 0 1.6 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
    'folder': '<path d="m6 14 1.5-2.9A2 2 0 0 1 9.2 10H20a2 2 0 0 1 1.9 2.5l-1.5 6a2 2 0 0 1-2 1.5H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.9a2 2 0 0 1 1.7.9l.8 1.2a2 2 0 0 0 1.7.9H18a2 2 0 0 1 2 2v2"/>',
    'shield': '<path d="M20 13c0 5-3.5 7.5-7.7 9a1 1 0 0 1-.7 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    'paste': '<path d="M15 2H9a1 1 0 0 0-1 1v2c0 .6.4 1 1 1h6c.6 0 1-.4 1-1V3c0-.6-.4-1-1-1Z"/><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2M16 4h2a2 2 0 0 1 2 2v2M11 14h10"/><path d="m17 10 4 4-4 4"/>',
    'calendar': '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
    'share': '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4"/><path d="m15.4 6.5-6.8 4"/>',
    'mail': '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>'
  };
  const icon = (name, cls) => '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (P[name] || '') + '</svg>';

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nf1 = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  const nf0 = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });
  const fmt1 = v => (v == null || isNaN(v) ? '–' : nf1.format(v));
  const fmt = v => (v == null || isNaN(v) ? '–' : nf0.format(v));
  const rupiah = v => 'Rp ' + new Intl.NumberFormat('id-ID').format(Math.round(+v || 0));
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const tgl = iso => { if (!iso) return '–'; const d = new Date(iso); if (isNaN(d)) return String(iso); return d.getDate() + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear(); };
  const tglJam = iso => { if (!iso) return '–'; const d = new Date(iso); if (isNaN(d)) return String(iso); return tgl(iso) + ', ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  const masa = jam => (!jam ? '–' : jam % 24 === 0 ? (jam / 24) + ' hari' : jam + ' jam');

  // Toast
  function toast(msg, type) {
    type = type || 'success';
    let box = document.querySelector('.toasts');
    if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    const ic = { success: 'check-circle', error: 'alert-circle', warning: 'alert', info: 'info' }[type] || 'info';
    el.innerHTML = icon(ic) + '<div>' + esc(msg) + '</div>';
    box.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 320); }, type === 'error' ? 7000 : 5000);
  }

  // Modal sederhana. render(close) mengembalikan HTML; bind(el, close) memasang event.
  function modal(html, opts) {
    opts = opts || {};
    const back = document.createElement('div');
    back.className = 'modal-back';
    back.innerHTML = '<div class="modal ' + (opts.wide ? 'wide' : '') + '" role="dialog" aria-modal="true">' + html + '</div>';
    document.body.appendChild(back);
    const close = () => { back.remove(); document.removeEventListener('keydown', onKey); opts.onClose && opts.onClose(); };
    const onKey = e => { if (e.key === 'Escape' && !opts.locked) close(); };
    document.addEventListener('keydown', onKey);
    back.addEventListener('click', e => { if (e.target === back && !opts.locked) close(); if (e.target.closest('[data-close]')) close(); });
    const m = back.querySelector('.modal');
    const f = m.querySelector('input, textarea, select');
    if (f && opts.focus !== false) setTimeout(() => f.focus(), 50);
    return { el: m, close, set: h => { m.innerHTML = h; } };
  }

  function confirmBox(title, text, okLabel, danger) {
    return new Promise(res => {
      const md = modal('<div class="modal-head"><h2 class="h3">' + esc(title) + '</h2><button class="icon-btn sm" data-close>' + icon('x', 'ic-sm') + '</button></div><p class="muted">' + esc(text) + '</p><div class="row" style="justify-content:flex-end"><button class="btn btn-outline" data-close>Batal</button><button class="btn ' + (danger ? 'btn-danger' : 'btn-primary') + '" data-ok>' + esc(okLabel || 'Ya, lanjut') + '</button></div>', { onClose: () => res(false) });
      md.el.querySelector('[data-ok]').addEventListener('click', () => { res(true); md.close(); });
    });
  }

  function loading(on, text) {
    let el = document.querySelector('.loading-cover');
    if (!on) { el && el.remove(); return; }
    if (!el) { el = document.createElement('div'); el.className = 'loading-cover'; document.body.appendChild(el); }
    el.innerHTML = '<div class="spinner lg"></div><div>' + esc(text || 'Memproses...') + '</div>';
  }

  // Unduh berkas dari memori browser
  function saveFile(bytes, name, mime) {
    const blob = bytes instanceof Blob ? bytes : new Blob([bytes], { type: mime || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  async function copyText(t) {
    try { await navigator.clipboard.writeText(t); toast('Tersalin.', 'success'); return true; } catch (e) {
      const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast('Tersalin.', 'success'); } catch (e2) { toast('Gagal menyalin. Salin manual ya.', 'error'); }
      ta.remove();
    }
  }

  const waLink = (num, text) => 'https://wa.me/' + String(num || '').replace(/[^0-9]/g, '') + (text ? '?text=' + encodeURIComponent(text) : '');

  // Grafik garis SVG sederhana
  function lineChart(points, opts) {
    opts = opts || {};
    const W = 560, H = 170, pad = 24;
    if (!points.length) return '<div class="empty">Belum ada data.</div>';
    const max = Math.max(1, ...points.map(p => p.v));
    const step = (W - pad * 2) / Math.max(1, points.length - 1);
    const xy = points.map((p, i) => [pad + i * step, H - pad - (p.v / max) * (H - pad * 2)]);
    const line = xy.map(p => p.join(',')).join(' ');
    const area = 'M' + xy[0][0] + ',' + (H - pad) + ' L' + line.replace(/ /g, ' L') + ' L' + xy[xy.length - 1][0] + ',' + (H - pad) + ' Z';
    const labels = points.map((p, i) => (i % Math.ceil(points.length / 6) === 0 || i === points.length - 1) ? '<text x="' + xy[i][0] + '" y="' + (H - 4) + '" font-size="11" text-anchor="middle" fill="#46566E">' + esc(p.l) + '</text>' : '').join('');
    return '<svg class="svg-chart" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" role="img" aria-label="' + esc(opts.label || 'Grafik') + '">' +
      '<defs><linearGradient id="gf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1D5BD6" stop-opacity=".18"/><stop offset="1" stop-color="#1D5BD6" stop-opacity="0"/></linearGradient></defs>' +
      [0.25, 0.5, 0.75].map(f => '<line x1="' + pad + '" x2="' + (W - pad) + '" y1="' + (pad + f * (H - pad * 2)) + '" y2="' + (pad + f * (H - pad * 2)) + '" stroke="#D9E2EF" stroke-dasharray="4 4"/>').join('') +
      '<line x1="' + pad + '" x2="' + (W - pad) + '" y1="' + (H - pad) + '" y2="' + (H - pad) + '" stroke="#D9E2EF"/>' +
      '<path d="' + area + '" fill="url(#gf)"/><polyline points="' + line + '" fill="none" stroke="#1D5BD6" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>' +
      labels + '</svg>';
  }

  window.RPUI = { icon, esc, fmt, fmt1, rupiah, tgl, tglJam, masa, toast, modal, confirmBox, loading, saveFile, copyText, waLink, lineChart };
})();
