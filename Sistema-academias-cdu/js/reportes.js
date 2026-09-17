// ═══════════════════════════ REPORTES Y CORTES ═══════════════════════════


function setPeriodo(p) {
  periodoActual = p;
  ['hoy','semana','mes','custom'].forEach(x => {
    document.getElementById('pt-'+x)?.classList.toggle('active', x===p);
  });
  document.getElementById('custom-rango').style.display = p==='custom' ? '' : 'none';
  renderReportes();
}

function normalizarFecha(val) {
  if (!val) return '';
  const s = String(val).trim();
  // yyyy-mm-dd or yyyy-mm-dd HH:MM:SS
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0,10);
  // dd/mm/yyyy (Spanish locale format from toLocaleDateString)
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const [d,m,y] = s.split('/');
    return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
  }
  // mm/dd/yyyy
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const parts = s.split('/');
    return `${parts[2]}-${parts[0].padStart(2,'0')}-${parts[1].padStart(2,'0')}`;
  }
  return s.slice(0,10);
}

function getListaPeriodo() {
  const ahora = new Date();
  let desde, hasta;
  if (periodoActual === 'hoy') {
    desde = hasta = ahora.toISOString().slice(0,10);
  } else if (periodoActual === 'semana') {
    const d = new Date(ahora); d.setDate(d.getDate() - d.getDay());
    desde = d.toISOString().slice(0,10); hasta = ahora.toISOString().slice(0,10);
  } else if (periodoActual === 'mes') {
    desde = `${ahora.getFullYear()}-${String(ahora.getMonth()+1).padStart(2,'0')}-01`;
    hasta = ahora.toISOString().slice(0,10);
  } else {
    desde = document.getElementById('rango-desde')?.value || '';
    hasta = document.getElementById('rango-hasta')?.value || ahora.toISOString().slice(0,10);
  }
  return pagos.filter(p => {
    // Use FECHA_PAGO as primary source of truth (always filled)
    // Fall back to FECHA_REGISTRO for newer payments
    const raw = p.FECHA_PAGO || p.FECHA_REGISTRO || '';
    const f = normalizarFecha(raw);
    if (!f) return false;
    return f >= desde && f <= hasta;
  });
}

function getPeriodoLabel() {
  if (periodoActual==='hoy') return 'Hoy ' + new Date().toLocaleDateString('es-MX');
  if (periodoActual==='semana') return 'Esta semana';
  if (periodoActual==='mes') return new Date().toLocaleDateString('es-MX',{month:'long',year:'numeric'});
  return 'Período personalizado';
}

function renderReportes() {
  const lista = getListaPeriodo();
  const totalDinero  = lista.reduce((a,p)=>a+(parseFloat(p.MONTO)||0)+(parseFloat(p.INSCRIPCION)||0)+(parseFloat(p.SEGURO)||0),0);
  const totalMens    = lista.reduce((a,p)=>a+(parseFloat(p.MONTO)||0),0);
  const totalInsc    = lista.reduce((a,p)=>a+(parseFloat(p.INSCRIPCION)||0),0);
  const totalSeg     = lista.reduce((a,p)=>a+(parseFloat(p.SEGURO)||0),0);
  const conDescuento = lista.filter(p=>p.DESCUENTO&&p.DESCUENTO!=='NO APLICA').length;

  const cards = document.getElementById('rep-cards');
  if (!cards) return;
  // Update timestamp
  const lupd = document.getElementById('rep-last-update');
  if(lupd) lupd.textContent = 'Última actualización: ' + new Date().toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  cards.innerHTML = `
    <div class="rep-card gold"><div class="rv">${lista.length}</div><div class="rl">Pagos Registrados</div><div class="rsub">${getPeriodoLabel()}</div></div>
    <div class="rep-card green"><div class="rv">${fmt$(totalDinero)}</div><div class="rl">Total Ingresado</div><div class="rsub">Suma de todos los conceptos</div></div>
    <div class="rep-card blue"><div class="rv">${fmt$(totalMens)}</div><div class="rl">Mensualidades</div><div class="rsub">${lista.filter(p=>parseFloat(p.MONTO)>0).length} pagos</div></div>
    <div class="rep-card orange"><div class="rv">${conDescuento}</div><div class="rl">Con Descuento</div><div class="rsub">de ${lista.length} pagos totales</div></div>`;

  document.getElementById('rep-desglose').innerHTML = `
    ${[['💳 Mensualidades',fmt$(totalMens),lista.filter(p=>parseFloat(p.MONTO)>0).length+' pagos'],
       ['📋 Inscripciones',fmt$(totalInsc),lista.filter(p=>parseFloat(p.INSCRIPCION)>0).length+' pagos'],
       ['🛡 Seguros',fmt$(totalSeg),lista.filter(p=>parseFloat(p.SEGURO)>0).length+' pagos'],
       ['🎟 Con Descuento',conDescuento+' socios','—']
      ].map(([l,v,s])=>`<div class="corte-row"><div class="cr-lbl">${l}<br><span style="font-size:11px;color:var(--text3)">${s}</span></div><div class="cr-val">${v}</div></div>`).join('')}
    <div class="corte-total"><span class="ct-lbl">TOTAL DEL PERÍODO</span><span class="ct-val">${fmt$(totalDinero)}</span></div>`;

  const byAcad={};
  lista.forEach(p=>{const a=p.ACADEMIA?.trim()||'Sin academia';if(!byAcad[a]){byAcad[a]={count:0,total:0};}byAcad[a].count++;byAcad[a].total+=(parseFloat(p.MONTO)||0)+(parseFloat(p.INSCRIPCION)||0)+(parseFloat(p.SEGURO)||0);});
  document.getElementById('rep-academias').innerHTML = Object.entries(byAcad).sort((a,b)=>b[1].total-a[1].total).length
    ? Object.entries(byAcad).sort((a,b)=>b[1].total-a[1].total).map(([a,d])=>`<div class="corte-row"><div class="cr-lbl">${a}<br><span style="font-size:11px;color:var(--text3)">${d.count} pago${d.count!==1?'s':''}</span></div><div class="cr-val" style="color:var(--green2)">${fmt$(d.total)}</div></div>`).join('')
    : '<p style="color:var(--text3);font-size:13px;padding:8px 0">Sin pagos en este período</p>';

  document.getElementById('rep-lista').innerHTML = lista.length
    ? `<table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead><tr>
          <th style="padding:8px;border-bottom:1px solid var(--border);color:var(--text3);text-align:left">Socio</th>
          <th style="padding:8px;border-bottom:1px solid var(--border);color:var(--text3);text-align:left">Mes</th>
          <th style="padding:8px;border-bottom:1px solid var(--border);color:var(--text3);text-align:left">Total</th>
          <th style="padding:8px;border-bottom:1px solid var(--border);color:var(--text3);text-align:left">Registró</th>
        </tr></thead>
        <tbody>${lista.map(p=>`<tr style="border-bottom:1px solid var(--border)">
          <td style="padding:8px;cursor:pointer" onclick="verSocio('${p.NS}')"><div style="font-weight:600;color:var(--text)">${p.NOMBRE}</div><div style="font-size:10px;color:var(--text3)">#${p.NS}</div></td>
          <td style="padding:8px;color:var(--text2)">${p.MES||'—'}</td>
          <td style="padding:8px;color:var(--green2);font-weight:600">${fmt$((parseFloat(p.MONTO)||0)+(parseFloat(p.INSCRIPCION)||0)+(parseFloat(p.SEGURO)||0))}</td>
          <td style="padding:8px;color:var(--text3);font-size:11px">${p.REGISTRADO_POR||'—'}</td>
        </tr>`).join('')}</tbody>
      </table>`
    : '<div class="empty"><div class="ei">💳</div><p>Sin pagos en este período</p></div>';
}

function imprimirCorte() {
  const lista = getListaPeriodo();
  const totalDinero=lista.reduce((a,p)=>a+(parseFloat(p.MONTO)||0)+(parseFloat(p.INSCRIPCION)||0)+(parseFloat(p.SEGURO)||0),0);
  const totalMens=lista.reduce((a,p)=>a+(parseFloat(p.MONTO)||0),0);
  const totalInsc=lista.reduce((a,p)=>a+(parseFloat(p.INSCRIPCION)||0),0);
  const totalSeg=lista.reduce((a,p)=>a+(parseFloat(p.SEGURO)||0),0);
  const byAcad={};
  lista.forEach(p=>{const a=p.ACADEMIA?.trim()||'Sin academia';if(!byAcad[a]){byAcad[a]={count:0,total:0};}byAcad[a].count++;byAcad[a].total+=(parseFloat(p.MONTO)||0)+(parseFloat(p.INSCRIPCION)||0)+(parseFloat(p.SEGURO)||0);});
  const div=document.getElementById('recibo-print');
  div.innerHTML=`<div style="font-family:Arial,sans-serif;padding:32px;color:#000;background:#fff;max-width:720px;margin:auto">
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #000;padding-bottom:14px;margin-bottom:20px">
      <div><h1 style="font-size:20px;margin:0">ACADEMIAS DEPORTIVAS CDU</h1><p style="margin:4px 0 0;font-size:12px;color:#555">Universidad de Guadalajara</p></div>
      <div style="text-align:right"><p style="font-size:12px;color:#555;margin:0">CORTE DE CAJA</p><p style="font-size:16px;font-weight:bold;margin:4px 0 0">${getPeriodoLabel()}</p><p style="font-size:11px;color:#888;margin:4px 0 0">Generado: ${new Date().toLocaleString('es-MX')}</p>${sesionActual?`<p style="font-size:11px;color:#888;margin:2px 0 0">Por: ${sesionActual.nombre}</p>`:''}</div>
    </div>
    <h3 style="margin-bottom:10px;font-size:14px">RESUMEN GENERAL</h3>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:13px">
      ${[['Total de pagos',lista.length+' pagos'],['Mensualidades',fmt$(totalMens)],['Inscripciones',fmt$(totalInsc)],['Seguros',fmt$(totalSeg)]].map(([k,v])=>`<tr><td style="padding:7px 10px;border:1px solid #ddd;background:#f8f8f8;width:55%">${k}</td><td style="padding:7px 10px;border:1px solid #ddd;font-weight:600">${v}</td></tr>`).join('')}
      <tr style="background:#000"><td style="padding:10px;color:#fff;font-weight:bold">TOTAL INGRESADO</td><td style="padding:10px;color:#fff;font-weight:bold;font-size:16px">${fmt$(totalDinero)}</td></tr>
    </table>
    <h3 style="margin-bottom:10px;font-size:14px">POR ACADEMIA</h3>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:13px">
      <thead><tr>${['Academia','Pagos','Total'].map(h=>`<th style="padding:7px;border:1px solid #ddd;background:#333;color:#fff;text-align:left">${h}</th>`).join('')}</tr></thead>
      <tbody>${Object.entries(byAcad).sort((a,b)=>b[1].total-a[1].total).map(([a,d])=>`<tr><td style="padding:7px;border:1px solid #ddd">${a}</td><td style="padding:7px;border:1px solid #ddd">${d.count}</td><td style="padding:7px;border:1px solid #ddd;font-weight:600">${fmt$(d.total)}</td></tr>`).join('')}</tbody>
    </table>

    <p style="margin-top:20px;font-size:10px;color:#aaa;text-align:center">Academias Deportivas CDU · ${new Date().toLocaleDateString('es-MX',{day:'numeric',month:'long',year:'numeric'})}</p>
  </div>`;
  div.style.display='block'; window.print(); setTimeout(()=>div.style.display='none',1000);
  registrarLog('pago','Corte impreso: '+getPeriodoLabel(),null);
}

// ═══════════════════════════ SYNC + RENDER ═══════════════════════════
// Fetches fresh data from Sheets then renders — bridges multi-session gap
async function cargarYRenderReportes() {
  const lupd = document.getElementById('rep-last-update');
  if(lupd) lupd.textContent = '⏳ Actualizando desde Google Sheets...';

  const pd = await apiGet('getPagos');
  if(pd && Array.isArray(pd) && pd.length > 0) {
    if(pd.length >= pagos.length) pagos = pd; // only update if Sheets has same or more
  }

  actualizarStats();
  // Restore the active period tab UI without resetting periodoActual
  ['hoy','semana','mes','custom'].forEach(x => {
    document.getElementById('pt-'+x)?.classList.toggle('active', x===periodoActual);
  });
  document.getElementById('custom-rango').style.display = periodoActual==='custom' ? '' : 'none';
  renderReportes();
  syncMsg('✅ Datos actualizados');
}

async function cargarYRenderPendientes() {
  const [sd, pd] = await Promise.all([apiGet('getSocios'), apiGet('getPagos')]);
  if(sd && Array.isArray(sd) && sd.length > 0) socios = sd;
  if(pd && Array.isArray(pd) && pd.length > 0) pagos  = pd;
  actualizarStats();
  renderPendientes();
}

// Force full sync from Sheets (admin tool)
async function forzarSyncSheets() {
  const btn = document.getElementById('btn-sync');
  if(btn){ btn.textContent='⏳ Sincronizando...'; btn.disabled=true; }
  const [sd, pd] = await Promise.all([apiGet('getSocios'), apiGet('getPagos')]);
  if(sd && Array.isArray(sd) && sd.length > 0) socios = sd;
  if(pd && Array.isArray(pd) && pd.length > 0) pagos  = pd;
  guardarTodoLocal();
  actualizarStats();
  renderInicio();
  syncMsg('✅ Sync completo desde Sheets');
  if(btn){ btn.textContent='🔄 Forzar Sync Sheets'; btn.disabled=false; }
}

// ─── EXPORTAR EXCEL CORTE ───────────────────────────
function exportarExcelCorte() {
  const lista = getListaPeriodo();
  if (!lista.length) {
    alert('No hay pagos en el período seleccionado.');
    return;
  }

  const periodo = getPeriodoLabel();
  const totalDinero   = lista.reduce((a,p)=>a+(parseFloat(p.MONTO)||0)+(parseFloat(p.INSCRIPCION)||0)+(parseFloat(p.SEGURO)||0),0);
  const totalMens     = lista.reduce((a,p)=>a+(parseFloat(p.MONTO)||0),0);
  const totalInsc     = lista.reduce((a,p)=>a+(parseFloat(p.INSCRIPCION)||0),0);
  const totalSeg      = lista.reduce((a,p)=>a+(parseFloat(p.SEGURO)||0),0);

  // Build CSV with BOM for Excel Spanish compatibility
  const filas = [
    // Title rows
    [`ACADEMIAS DEPORTIVAS CDU — CORTE DE CAJA`],
    [`Período: ${periodo}`],
    [`Generado: ${new Date().toLocaleString('es-MX')}`],
    [`Generado por: ${sesionActual?.nombre || '—'}`],
    [],
    // Summary
    [`RESUMEN`],
    [`Total de pagos`, lista.length],
    [`Mensualidades`, totalMens],
    [`Inscripciones`, totalInsc],
    [`Seguros`, totalSeg],
    [`TOTAL INGRESADO`, totalDinero],
    [],
    // Detail header
    [`N° SOCIO`,`NOMBRE`,`ACADEMIA`,`CATEGORÍA`,`MES`,`MENSUALIDAD`,`INSCRIPCIÓN`,`SEGURO`,`DESCUENTO`,`REFERENCIA`,`FECHA PAGO`,`REGISTRADO POR`,`HORA REGISTRO`],
    // Detail rows
    ...lista.map(p => [
      p.NS,
      p.NOMBRE,
      p.ACADEMIA || '',
      p.CATEGORIA || '',
      p.MES || '',
      parseFloat(p.MONTO) || 0,
      parseFloat(p.INSCRIPCION) || 0,
      parseFloat(p.SEGURO) || 0,
      p.DESCUENTO || 'NO APLICA',
      p.REFERENCIA || '',
      p.FECHA_PAGO || '',
      p.REGISTRADO_POR || '',
      p.HORA_REGISTRO || ''
    ])
  ];

  const csv = filas.map(fila =>
    fila.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
  ).join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const fecha = new Date().toISOString().slice(0,10);
  a.href     = url;
  a.download = `corte_cdu_${periodoActual}_${fecha}.csv`;
  a.click();
  URL.revokeObjectURL(url);

  registrarLog('pago', `Excel exportado: ${periodo} · ${lista.length} pagos · $${totalDinero.toLocaleString()}`, null);
  syncMsg('✅ Excel descargado');
}

