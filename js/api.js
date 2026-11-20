/* ============================================================
 * EduGrade — Koneksi ke backend Google Apps Script
 * POST wajib text/plain agar tidak memicu CORS preflight.
 * ============================================================ */
(function () {
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  function gasUrl() {
    const u = (window.RP_CONFIG && window.RP_CONFIG.GAS_URL) || '';
    if (!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec/.test(u) || /GANTI_DENGAN/.test(u)) return null;
    return u;
  }

  async function fetchJson(url, opts, timeoutMs) {
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const t = setTimeout(() => ctrl && ctrl.abort(), timeoutMs || 30000);
    try {
      const res = await fetch(url, Object.assign({ redirect: 'follow', signal: ctrl && ctrl.signal }, opts));
      const txt = await res.text();
      try { return JSON.parse(txt); } catch (e) { throw new Error('BAD_JSON'); }
    } finally { clearTimeout(t); }
  }

  // Panggil server; ulangi otomatis bila koneksi putus (aman karena klaim idempoten)
  async function call(action, data, opts) {
    opts = opts || {};
    const url = gasUrl();
    if (!url) return { success: false, code: 'NOCONFIG', message: 'Alamat server belum diatur di js/config.js.' };
    const body = JSON.stringify({ action, data: data || {}, token: opts.token || undefined });
    const tries = opts.retries != null ? opts.retries : 2;
    let lastErr;
    for (let i = 0; i <= tries; i++) {
      try {
        const r = await fetchJson(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body }, opts.timeout || 35000);
        if (r && r.code === 'BUSY' && i < tries) { await sleep(1500 * (i + 1)); continue; }
        return r;
      } catch (e) {
        lastErr = e;
        if (i < tries) await sleep(1000 * Math.pow(2, i));
      }
    }
    return { success: false, code: 'NETWORK', message: 'Tidak bisa terhubung ke server. Periksa internet Anda lalu coba lagi.', error: String(lastErr) };
  }

  async function getConfig() {
    const url = gasUrl();
    if (!url) return null;
    try {
      const r = await fetchJson(url + '?action=config', { method: 'GET' }, 20000);
      return r && r.success ? r.data : null;
    } catch (e) { return null; }
  }

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  window.RPApi = { call, getConfig, uuid, hasServer: () => !!gasUrl() };
})();
