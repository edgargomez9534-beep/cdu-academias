// ═══════════════════════════ STORAGE HYBRID ═══════════════════════════
// Every change saves to localStorage immediately + syncs to Sheets async
// On open: loads localStorage first (instant), then syncs with Sheets

const LS_SOCIOS  = 'cdu_socios_v1';
const LS_PAGOS   = 'cdu_pagos_v1';
const LS_LOCKERS = 'cdu_lockers_v1';
const LS_LOG     = 'cdu_log_v1';
const LS_META    = 'cdu_meta_v1';

function lsGuardar(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch(e) { console.warn('localStorage write error:', e); }
}

function lsLeer(key) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch(e) { return null; }
}

function guardarTodoLocal() {
  lsGuardar(LS_SOCIOS,  socios);
  lsGuardar(LS_PAGOS,   pagos);
  lsGuardar(LS_LOCKERS, lockers);
  lsGuardar(LS_LOG,     activityLog.slice(0, 200)); // keep last 200 entries
  lsGuardar(LS_META,    { ultimaSync: new Date().toISOString(), version: 1 });
}

function cargarDesdeLocal() {
  const s = lsLeer(LS_SOCIOS);
  const p = lsLeer(LS_PAGOS);
  const l = lsLeer(LS_LOCKERS);
  const lg = lsLeer(LS_LOG);
  if (s && s.length > 0) socios  = s;
  if (p && p.length > 0) pagos   = p;
  if (l && l.length > 0) lockers = l;
  if (lg && lg.length > 0) activityLog = lg;
  return !!(s && p); // returns true if local data existed
}

function getMeta() {
  return lsLeer(LS_META) || {};
}

