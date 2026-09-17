// ═══════════════════════════ START ═══════════════════════════
async function start() {
  const el = document.getElementById('sync-status');

  // STEP 1 — Load from localStorage instantly (no network needed)
  const teníaLocal = cargarDesdeLocal();
  if (teníaLocal) {
    actualizarStats();
    renderInicio();
    const meta = getMeta();
    const ultima = meta.ultimaSync ? new Date(meta.ultimaSync).toLocaleString('es-MX') : 'desconocida';
    el.textContent = `💾 Local · última sync: ${ultima}`;
    el.style.color = 'var(--gold2)';
  } else {
    el.textContent = '⏳ Cargando...';
    el.style.color = 'var(--gold2)';
  }

  // STEP 2 — Sync with Sheets in background
  try {
    const [sd, pd] = await Promise.all([apiGet('getSocios'), apiGet('getPagos')]);
    let actualizado = false;

    if (sd && Array.isArray(sd) && sd.length > 0) {
      socios = sd.map(s => {
        const local = socios.find(x => x.NS === s.NS);
        return local ? { ...local, ...s } : s;
      });
      actualizado = true;
    }
    if (pd && Array.isArray(pd) && pd.length > 0) {
      const sheetsNS_Fecha = new Set(pd.map(p => p.NS + '|' + (p.FECHA_REGISTRO || p.FECHA_PAGO)));
      const soloLocales = pagos.filter(p => !sheetsNS_Fecha.has(p.NS + '|' + (p.FECHA_REGISTRO || p.FECHA_PAGO)));
      pagos = [...pd, ...soloLocales];
      actualizado = true;
    }
    // Load shared activity log from Sheets
    const ld = await apiGet('getLog');
    if (ld && Array.isArray(ld) && ld.length > 0) {
      // Merge: Sheets log + local log, deduplicate by timestamp+usuario
      const sheetsLogKeys = new Set(ld.map(l => l.usuario + '|' + l.fecha + '|' + l.hora));
      const soloLocalLog = activityLog.filter(l => !sheetsLogKeys.has(l.usuario + '|' + l.fecha + '|' + l.hora));
      activityLog = [...ld, ...soloLocalLog].slice(0, 500);
      lsGuardar(LS_LOG, activityLog.slice(0, 200));
    }

    if (actualizado) {
      guardarTodoLocal();
      dataCargada = true;
      actualizarStats(); // recalculates pendientes badge with fresh data
      renderInicio();
      // Refresh active views with fresh data
      if(document.getElementById('view-pendientes')?.classList.contains('active')) renderPendientes();
      if(document.getElementById('view-alertas')?.classList.contains('active')) renderAlertas();
      // Always recalculate alerts badge after fresh data load
      actualizarStats();
      el.textContent = '● Conectado a Sheets';
      el.style.color = 'var(--green2)';
    }
  } catch(e) {
    el.textContent = '💾 Sin conexión — usando datos locales';
    el.style.color = 'var(--orange)';
    dataCargada = true;
  }
}

