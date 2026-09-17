// ═══════════════════════════ USUARIOS Y ROLES ═══════════════════════════
const USUARIOS = [
  { user:'admin',    pass:'cdu2024',     nombre:'Administrador',  rol:'admin' },
  { user:'recep1',   pass:'recep123',    nombre:'Recepcionista 1',rol:'recepcionista' },
  { user:'recep2',   pass:'recep456',    nombre:'Recepcionista 2',rol:'recepcionista' },
  { user:'recep3',   pass:'recep1234',   nombre:'Recepcionista 3',rol:'recepcionista' },
  { user:'recep4',   pass:'recep12345',  nombre:'Recepcionista 4',rol:'recepcionista' },
  { user:'supervisor',pass:'super789',   nombre:'Supervisor',     rol:'supervisor' }
];

// Permisos por rol
const PERMISOS = {
  admin:         ['inicio','alertas','buscar','socios','pagos','alta','lockers','prueba','cupos','reportes','pendientes','log'],
  recepcionista: ['inicio','alertas','buscar','socios','pagos','alta','lockers','prueba','cupos'],
  supervisor:    ['inicio','alertas','buscar','socios','pagos','reportes','pendientes','log']
};

// Acciones permitidas por rol
const ACCIONES = {
  admin:         ['pago','alta','baja','reactivar','locker','exportar','verLog','eliminarPago','seguro'],
  recepcionista: ['pago','alta','baja','reactivar','locker','seguro'],
  supervisor:    ['verLog','seguro']
};



 // tracks if Sheets data has been loaded at least once

// ── Login ────────────────────────────────────────────
function doLogin() {
  const u = document.getElementById('login-user').value.trim().toLowerCase();
  const p = document.getElementById('login-pass').value;
  const found = USUARIOS.find(x => x.user === u && x.pass === p);
  if (!found) {
    const errEl = document.getElementById('login-err');
    errEl.textContent = '⚠ Usuario o contraseña incorrectos. Intenta de nuevo.';
    errEl.style.display = 'block';
    document.getElementById('login-pass').value = '';
    return;
  }
  sesionActual = found;
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('login-err').style.display = 'none';
  registrarLog('login', `Inicio de sesión`, null);
  aplicarPermisos();
  renderUserChip();
  // Only call start() on first login — after that data is already in memory
  if (!dataCargada) {
    start();
  } else {
    // Just refresh stats and inicio without reloading all data
    actualizarStats();
    renderInicio();
    // Silently sync in background
    apiGet('getPagos').then(pd => {
      if(pd && Array.isArray(pd) && pd.length > 0) { pagos = pd; actualizarStats(); renderInicio(); }
    });
  }
}

function cerrarSesion() {
  // No confirmation needed — just close session
  registrarLog('login', 'Cierre de sesión', null);
  guardarTodoLocal(); // save everything before logout
  sesionActual = null;
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('login-user').value = '';
  document.getElementById('login-pass').value = '';
}

// ── Permisos ─────────────────────────────────────────
function aplicarPermisos() {
  if (!sesionActual) return;
  const vistas = PERMISOS[sesionActual.rol] || [];

  // Mostrar/ocultar nav items
  ['inicio','alertas','buscar','socios','pagos','alta','lockers','prueba','cupos','reportes','pendientes','log'].forEach(v => {
    const el = document.getElementById('nav-'+v);
    if (el) el.style.display = vistas.includes(v) ? '' : 'none';
  });

  // Mostrar/ocultar botón de exportar según rol
  const btnExp = document.getElementById('btn-exportar');
  if (btnExp) btnExp.style.display = puedeHacer('exportar') ? '' : 'none';

  // Mostrar/ocultar botón eliminar pago según rol
  // (se maneja dinámicamente en renderPagos)

  // Ir a primera vista permitida
  showView(vistas[0] || 'inicio');
}

function puedeHacer(accion) {
  if (!sesionActual) return false;
  return ACCIONES[sesionActual.rol]?.includes(accion) || false;
}

function checkPermiso(accion, callback) {
  if (!puedeHacer(accion)) {
    alert('⛔ Tu rol no tiene permiso para realizar esta acción.');
    return;
  }
  callback();
}

// ── User chip ────────────────────────────────────────
function renderUserChip() {
  if (!sesionActual) return;
  const roleClass = { admin:'role-admin', recepcionista:'role-recep', supervisor:'role-super' }[sesionActual.rol];
  const roleLabel = { admin:'Administrador', recepcionista:'Recepcionista', supervisor:'Supervisor' }[sesionActual.rol];
  const permisosList = {
    admin: 'Acceso total al sistema',
    recepcionista: 'Altas · Bajas · Pagos · Lockers · Alertas',
    supervisor: 'Solo lectura · Log de actividad'
  }[sesionActual.rol];
  document.getElementById('user-chip-wrap').innerHTML = `
    <div class="user-chip" style="cursor:default">
      <div class="uc-av">${sesionActual.nombre[0]}</div>
      <span style="font-size:13px;font-weight:600;color:var(--text)">${sesionActual.nombre}</span>
    </div>`;
}

// ── Log ──────────────────────────────────────────────
function registrarLog(tipo, descripcion, ns) {
  // auto-save log to localStorage after each entry
  activityLog.unshift({
    tipo, descripcion, ns: ns || '',
    usuario: sesionActual ? sesionActual.nombre : '—',
    rol: sesionActual ? sesionActual.rol : '—',
    fecha: new Date().toISOString().slice(0,10),
    hora: new Date().toLocaleTimeString('es-MX', {hour:'2-digit',minute:'2-digit',second:'2-digit'})
  });
  // Max 200 entradas in localStorage, 500 in memory
  if (activityLog.length > 500) activityLog.pop();
  lsGuardar(LS_LOG, activityLog.slice(0, 200));
  // Sync log entry to Sheets so all sessions see all activity
  const lastEntry = activityLog[0];
  if (lastEntry && lastEntry.tipo !== 'login') { // skip login entries to avoid spam
    apiPost({ action: 'addLog', data: lastEntry });
  }
  // Actualizar badge si hay log view activo
  renderLog();
}

function renderLog() {
  const cont = document.getElementById('log-container');
  if (!cont) return;

  const q = (document.getElementById('log-search')?.value || '').toLowerCase();
  const tipo = document.getElementById('log-tipo')?.value || '';
  const usr = document.getElementById('log-usuario')?.value || '';

  // Populate user filter
  const usuarios = [...new Set(activityLog.map(l => l.usuario))];
  const logUsr = document.getElementById('log-usuario');
  if (logUsr) {
    const cur = logUsr.value;
    logUsr.innerHTML = '<option value="">Todos los usuarios</option>' + usuarios.map(u => `<option>${u}</option>`).join('');
    logUsr.value = cur;
  }

  const filtered = activityLog.filter(l => {
    if (tipo && l.tipo !== tipo) return false;
    if (usr && l.usuario !== usr) return false;
    if (q && !l.descripcion.toLowerCase().includes(q) && !l.usuario.toLowerCase().includes(q) && !l.ns.includes(q)) return false;
    return true;
  });

  if (!filtered.length) {
    cont.innerHTML = '<div class="empty"><div class="ei">📋</div><p>Sin actividad registrada</p></div>';
    return;
  }

  cont.innerHTML = filtered.map(l => `
    <div class="log-item">
      <div class="log-dot ${l.tipo}"></div>
      <div style="flex:1">
        <div style="color:var(--text);font-weight:500">${l.descripcion}${l.ns ? ` <span style="color:var(--gold2);cursor:pointer;text-decoration:underline" onclick="verSocio('${l.ns}')">· #${l.ns}</span>` : ''}</div>
        <div class="log-meta">
          <strong>${l.usuario}</strong>
          <span class="role-badge ${{ admin:'role-admin', recepcionista:'role-recep', supervisor:'role-super' }[l.rol] || ''}" style="margin:0 6px">${l.rol}</span>
          · ${l.fecha} ${l.hora}
        </div>
      </div>
    </div>`).join('');
}

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

// ═══════════════════════════ PAGOS PENDIENTES ═══════════════════════════
function renderPendientes() {
  const ahora=new Date();
  const mesSelEl=document.getElementById('pend-mes');
  const mesActual=['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'][ahora.getMonth()];
  const mesBuscar=mesSelEl?.value||mesActual;
  const q=(document.getElementById('pend-search')?.value||'').toLowerCase();
  const ac=document.getElementById('pend-academia')?.value.trim()||'';
  const sociosConPago=new Set(pagos.filter(p=>p.MES===mesBuscar).map(p=>p.NS));
  const pendientes=socios.filter(s=>{
    if(s.ACTIVO===false) return false;
    if(sociosConPago.has(s.NS)) return false;
    if(q&&!s.NOMBRE.toLowerCase().includes(q)&&!s.NS.includes(q)) return false;
    if(ac&&s.ACADEMIA.trim()!==ac) return false;
    return true;
  });
  const badge=document.getElementById('badge-pendientes');
  if(badge) badge.textContent=pendientes.length;
  const lbl=document.getElementById('pend-lbl');
  if(lbl) lbl.textContent=`${pendientes.length} socios sin pago en ${mesBuscar}`;
  const meses=['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
  if(mesSelEl){const cur=mesSelEl.value;mesSelEl.innerHTML='<option value="">Mes actual ('+mesActual+')</option>'+meses.map(m=>`<option value="${m}">${m}</option>`).join('');mesSelEl.value=cur;}
  const pendAcadEl=document.getElementById('pend-academia');
  if(pendAcadEl){const acads=getAcademias();const cur=pendAcadEl.value;pendAcadEl.innerHTML='<option value="">Todas las academias</option>'+acads.map(a=>`<option value="${a}">${a}</option>`).join('');pendAcadEl.value=cur;}
  const cont=document.getElementById('pend-container');
  if(!cont) return;
  if(!pendientes.length){cont.innerHTML=`<div class="empty"><div class="ei">✅</div><p>Todos los socios activos han pagado en <strong>${mesBuscar}</strong></p></div>`;return;}
  cont.innerHTML=`
    <div style="padding:12px 16px;background:var(--bg3);border-bottom:1px solid var(--border);font-size:12px;color:var(--text3)">
      ${pendientes.length} socios pendientes · Mes: <strong style="color:var(--gold2)">${mesBuscar}</strong>
    </div>
    <table style="width:100%;border-collapse:collapse">
      <thead><tr>${['N° Socio','Nombre','Academia','Categoría','Último Pago','Acción'].map(h=>`<th style="padding:11px 14px;text-align:left;font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid var(--border);background:var(--bg3)">${h}</th>`).join('')}</tr></thead>
      <tbody>${pendientes.map(s=>{
        const ultP=pagos.filter(p=>p.NS===s.NS).slice(-1)[0];
        return `<tr style="border-bottom:1px solid var(--border);cursor:pointer" onclick="verSocio('${s.NS}')">
          <td style="padding:11px 14px"><strong style="color:var(--gold2)">#${s.NS}</strong></td>
          <td style="padding:11px 14px;color:var(--text);font-weight:500;cursor:pointer;text-decoration:underline;text-decoration-color:var(--border)" onclick="event.stopPropagation();verSocio('${s.NS}')">${s.NOMBRE}</td>
          <td style="padding:11px 14px"><span class="badge b-gold">${s.ACADEMIA||'—'}</span></td>
          <td style="padding:11px 14px;color:var(--text3)">${s.CATEGORIA||'—'}</td>
          <td style="padding:11px 14px;color:var(--text3);font-size:12px">${ultP?`${ultP.MES} · ${ultP.FECHA_PAGO||'—'}`:'Sin pagos'}</td>
          <td style="padding:11px 14px" onclick="event.stopPropagation()">
            <button class="btn btn-gold btn-sm" onclick="abrirModalPago('${s.NS}')">💳 Registrar Pago</button>
          </td>
        </tr>`;}).join('')}</tbody>
    </table>`;
}

// ═══════════════════════════ SEGURO ═══════════════════════════

function abrirModalSeguro(ns) {
  seguroNS = ns;
  const s = socios.find(x => x.NS === ns.toString());
  if (!s) return;
  document.getElementById('seguro-nombre-lbl').textContent = `#${s.NS} — ${s.NOMBRE}`;
  document.getElementById('seg-vigencia').value = s.SEGURO_VIGENCIA    || '';
  document.getElementById('seg-monto').value    = s.SEGURO_MONTO        || '';
  document.getElementById('seg-ref').value      = s.SEGURO_REFERENCIA   || '';
  document.getElementById('seg-notas').value    = s.SEGURO_NOTAS        || '';
  document.getElementById('seguro-al').innerHTML = '';
  document.getElementById('mo-seguro').style.display = 'flex';
}

function guardarSeguro() {
  const div      = document.getElementById('seguro-al');
  const vigencia = document.getElementById('seg-vigencia').value.trim();
  const monto    = document.getElementById('seg-monto').value.trim();
  const notas    = document.getElementById('seg-notas').value.trim();
  const ref      = document.getElementById('seg-ref').value.trim();

  if (!vigencia) { div.innerHTML = '<div class="al al-err">⚠ La fecha de vigencia es obligatoria.</div>'; return; }
  if (!monto)    { div.innerHTML = '<div class="al al-err">⚠ El monto del seguro es obligatorio.</div>'; return; }
  if (!ref)      { div.innerHTML = '<div class="al al-err">⚠ El número de referencia del seguro es obligatorio.</div>'; return; }
  const s = socios.find(x => x.NS === seguroNS.toString());
  if (!s) return;

  // Update socio fields
  s.SEGURO_VIGENCIA     = vigencia;
  s.SEGURO_MONTO        = monto;
  s.SEGURO_NOTAS        = notas;
  s.SEGURO_REFERENCIA   = ref;
  guardarTodoLocal(); // persist socio seguro changes to localStorage

  // Register as payment entry so it shows in pagos/reportes
  const mesActual = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'][new Date().getMonth()];
  const pagSeguro = {
    NS:             s.NS,
    NOMBRE:         s.NOMBRE,
    INSCRIPCION:    '',
    SEGURO:         parseFloat(monto).toFixed(2),
    MES:            mesActual,
    MONTO:          0,
    REFERENCIA:     ref || notas || 'Pago de seguro deportivo',
    FECHA_PAGO:     hoy(),
    DESCUENTO:      'NO APLICA',
    ACADEMIA:       s.ACADEMIA,
    CATEGORIA:      s.CATEGORIA,
    REGISTRADO_POR: sesionActual ? sesionActual.nombre : '—',
    ROL_REGISTRO:   sesionActual ? sesionActual.rol    : '—',
    FECHA_REGISTRO: new Date().toISOString().slice(0,10),
    HORA_REGISTRO:  new Date().toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit',second:'2-digit'})
  };
  pagos.push(pagSeguro);
  guardarTodoLocal(); // persist to localStorage immediately
  actualizarStats();
  cerrarMo('mo-seguro');
  // Refresh pendientes and reportes if open
  if(document.getElementById('view-pendientes')?.classList.contains('active')) cargarYRenderPendientes();
  if(document.getElementById('view-reportes')?.classList.contains('active')) cargarYRenderReportes();
  else {
    const _mA2=['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'][new Date().getMonth()];
    const _cP2=new Set(pagos.filter(p=>p.MES===_mA2).map(p=>p.NS));
    const _nP2=socios.filter(s=>s.ACTIVO!==false&&!_cP2.has(s.NS)).length;
    const _bp2=document.getElementById('badge-pendientes'); if(_bp2)_bp2.textContent=_nP2;
  }
  registrarLog('pago', `Seguro pagado · ${fmt$(monto)} · Vigente hasta ${vigencia}`, s.NS);
  syncMsg('✅ Seguro registrado correctamente');

  // Sync to Sheets
  apiPost({ action: 'updateSocio', data: { NS: s.NS, ACTIVO: s.ACTIVO, SEGURO_VIGENCIA: s.SEGURO_VIGENCIA, SEGURO_MONTO: s.SEGURO_MONTO } });
  apiPost({ action: 'addPago', data: pagSeguro });

  // Reopen updated ficha
  setTimeout(() => verSocio(seguroNS), 250);
}


// Auto-refresh every 60s — only pulls pagos data, never resets selected period
setInterval(async () => {
  if(document.getElementById('view-reportes')?.classList.contains('active')) {
    const pd = await apiGet('getPagos');
    if(pd && Array.isArray(pd) && pd.length > 0) pagos = pd;
    actualizarStats();
    renderReportes(); // uses periodoActual as-is
  }
  if(document.getElementById('view-pendientes')?.classList.contains('active')) {
    cargarYRenderPendientes();
  }
}, 60000);

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

// ═══════════════════════════ AGREGAR DISCIPLINA ═══════════════════════════


function abrirModalDisciplina(ns) {
  disciplinaNS = ns;
  const s = socios.find(x => x.NS === ns.toString());
  if (!s) return;
  document.getElementById('disc-nombre').textContent = `#${s.NS} — ${s.NOMBRE}`;
  document.getElementById('disc-categoria').value = '';
  document.getElementById('disc-monto').value = '';
  document.getElementById('disc-ref').value = '';
  document.getElementById('disc-vencimiento').value = '';
  const sel = document.getElementById('disc-academia');
  sel.innerHTML = '<option value="">— Seleccionar —</option>' + getAcademias().map(a=>`<option value="${a}">${a}</option>`).join('');
  document.getElementById('mo-disciplina').style.display = 'flex';
}

function guardarDisciplina() {
  const academia  = document.getElementById('disc-academia').value.trim();
  const categoria = document.getElementById('disc-categoria').value.trim().toUpperCase();
  const ref       = document.getElementById('disc-ref').value.trim();
  const monto     = document.getElementById('disc-monto').value || '0';
  const venc      = document.getElementById('disc-vencimiento').value;
  if (!academia)  { alert('⚠ Selecciona la academia.'); return; }
  if (!categoria) { alert('⚠ Ingresa la categoría.'); return; }
  if (!ref)       { alert('⚠ El número de referencia es obligatorio.'); return; }

  const s = socios.find(x => x.NS === disciplinaNS.toString());
  if (!s) return;

  // Register as a payment entry (inscripcion)
  const mesActual = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'][new Date().getMonth()];
  const pagDisc = {
    NS: s.NS, NOMBRE: s.NOMBRE,
    INSCRIPCION: parseFloat(monto), SEGURO: '', MES: mesActual,
    MONTO: 0, REFERENCIA: ref,
    FECHA_PAGO: hoy(), DESCUENTO: 'NO APLICA',
    ACADEMIA: academia, CATEGORIA: categoria,
    REGISTRADO_POR: sesionActual?.nombre||'—', ROL_REGISTRO: sesionActual?.rol||'',
    FECHA_REGISTRO: new Date().toISOString().slice(0,10),
    HORA_REGISTRO: new Date().toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit',second:'2-digit'}),
    TIPO_PAGO: 'INSCRIPCION DISCIPLINA ADICIONAL'
  };
  pagos.push(pagDisc);
  guardarTodoLocal();
  actualizarStats();
  apiPost({action:'addPago', data:pagDisc});
  registrarLog('alta', `Nueva disciplina: ${s.NOMBRE} → ${academia} · ${categoria}`, s.NS);
  cerrarMo('mo-disciplina');
  renderPagos();
  syncMsg('✅ Disciplina agregada y pago registrado');
}

// ═══════════════════════════ CAMBIO DE CATEGORÍA ═══════════════════════════


function abrirModalCategoria(ns) {
  if (sesionActual?.rol !== 'admin') { alert('⛔ Solo el administrador puede cambiar categorías.'); return; }
  categoriaNS = ns;
  const s = socios.find(x => x.NS === ns.toString());
  if (!s) return;
  document.getElementById('cat-nombre').textContent = `#${s.NS} — ${s.NOMBRE}`;
  document.getElementById('cat-academia-actual').value = s.ACADEMIA || '';
  document.getElementById('cat-actual').value = s.CATEGORIA || '';
  document.getElementById('cat-nueva').value = '';
  document.getElementById('mo-categoria').style.display = 'flex';
}

function guardarCategoria() {
  const nueva = document.getElementById('cat-nueva').value.trim().toUpperCase();
  if (!nueva) { alert('⚠ Ingresa la nueva categoría.'); return; }
  const s = socios.find(x => x.NS === categoriaNS.toString());
  if (!s) return;
  const anterior = s.CATEGORIA;
  s.CATEGORIA = nueva;
  guardarTodoLocal();
  actualizarStats();
  if (document.getElementById('view-socios')?.classList.contains('active')) renderSocios();
  registrarLog('alta', `Cambio de categoría: ${s.NOMBRE} · ${anterior} → ${nueva}`, s.NS);
  apiPost({ action: 'updateSocio', data: { NS: s.NS, ACTIVO: s.ACTIVO, CATEGORIA: nueva } });
  cerrarMo('mo-categoria');
  syncMsg('✅ Categoría actualizada');
  setTimeout(() => verSocio(categoriaNS), 200);
}

// ═══════════════════════════ CLASES DE PRUEBA ═══════════════════════════


function renderPrueba() {
  const tbody = document.getElementById('tabla-prueba');
  if (!tbody) return;
  if (!clasesPrueba.length) {
    tbody.innerHTML = '<tr><td colspan="7"><div class="empty"><div class="ei">🎯</div><p>Sin clases de prueba registradas</p></div></td></tr>';
    return;
  }
  tbody.innerHTML = [...clasesPrueba].reverse().map((c, i) => `<tr>
    <td style="color:var(--text3)">${c.FECHA||'—'}</td>
    <td class="mc">${c.NOMBRE}</td>
    <td><span class="badge b-gold">${c.ACADEMIA||'—'}</span></td>
    <td><span class="badge ${c.DOCS==='SÍ'?'b-active':'b-baja'}">${c.DOCS==='SÍ'?'✅ Completa':'❌ Pendiente'}</span></td>
    <td style="color:var(--green2);font-weight:600">$${parseFloat(c.MONTO||0).toLocaleString('es-MX')}</td>
    <td style="color:var(--text3);font-size:12px">${c.REGISTRADO_POR||'—'}</td>
    <td><button class="btn btn-red btn-sm" onclick="eliminarPrueba(${clasesPrueba.length-1-i})">🗑</button></td>
  </tr>`).join('');
}

function abrirModalPrueba() {
  document.getElementById('prueba-al').innerHTML = '';
  document.getElementById('pr-nombre').value = '';
  document.getElementById('pr-monto').value = '';
  document.getElementById('pr-fecha').value = hoy();
  document.getElementById('pr-docs').value = 'SÍ';
  // Populate academias
  const sel = document.getElementById('pr-academia');
  sel.innerHTML = '<option value="">— Seleccionar —</option>' + getAcademias().map(a=>`<option>${a}</option>`).join('');
  document.getElementById('mo-prueba').style.display = 'flex';
}

function guardarPrueba() {
  const div     = document.getElementById('prueba-al');
  const nombre  = document.getElementById('pr-nombre').value.trim();
  const academia= document.getElementById('pr-academia').value.trim();
  const monto   = document.getElementById('pr-monto').value.trim();
  const fecha   = document.getElementById('pr-fecha').value;
  if (!nombre)  { div.innerHTML='<div class="al al-err">⚠ El nombre es obligatorio.</div>'; return; }
  if (!academia){ div.innerHTML='<div class="al al-err">⚠ La academia es obligatoria.</div>'; return; }
  if (!monto)   { div.innerHTML='<div class="al al-err">⚠ El monto es obligatorio.</div>'; return; }
  const nueva = {
    NOMBRE: nombre.toUpperCase(), ACADEMIA: academia,
    FECHA: fecha, MONTO: parseFloat(monto),
    DOCS: document.getElementById('pr-docs').value,
    REGISTRADO_POR: sesionActual?.nombre || '—',
    HORA: new Date().toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'})
  };
  clasesPrueba.push(nueva);
  localStorage.setItem('cdu_prueba_v1', JSON.stringify(clasesPrueba));
  registrarLog('pago', `Clase de prueba: ${nueva.NOMBRE} · ${nueva.ACADEMIA}`, null);
  // Sync to Sheets
  apiPost({ action: 'addPago', data: {
    NS: 'PRUEBA', NOMBRE: nueva.NOMBRE, MES: nueva.FECHA,
    MONTO: nueva.MONTO, REFERENCIA: `CLASE PRUEBA · DOCS: ${nueva.DOCS}`,
    FECHA_PAGO: nueva.FECHA, DESCUENTO: 'CLASE DE PRUEBA',
    ACADEMIA: nueva.ACADEMIA, CATEGORIA: 'CLASE DE PRUEBA',
    REGISTRADO_POR: nueva.REGISTRADO_POR, ROL_REGISTRO: sesionActual?.rol||'',
    FECHA_REGISTRO: nueva.FECHA, HORA_REGISTRO: nueva.HORA
  }});
  cerrarMo('mo-prueba');
  renderPrueba();
  syncMsg('✅ Clase de prueba registrada');
}

function exportarPrueba() {
  if (!clasesPrueba.length) { alert('No hay clases de prueba registradas.'); return; }
  const hdrs = ['FECHA','NOMBRE','ACADEMIA','DOCUMENTACION','MONTO','REGISTRADO_POR','HORA'];
  const rows = clasesPrueba.map(c => hdrs.map(h => `"${String(c[h]||'').replace(/"/g,'""')}"`).join(','));
  const csv  = [hdrs.join(','), ...rows].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8'}));
  a.download = `clases_prueba_${hoy()}.csv`; a.click();
  syncMsg('✅ Excel descargado');
}

function eliminarPrueba(idx) {
  if (!confirm('¿Eliminar este registro?')) return;
  clasesPrueba.splice(idx, 1);
  localStorage.setItem('cdu_prueba_v1', JSON.stringify(clasesPrueba));
  renderPrueba();
}

// ═══════════════════════════ CUPOS ═══════════════════════════
const OFERTA={"VOLEIBOL DE SALA":[{"categoria":"CAT 2012-2013","edad":"12-13 Años","horarios":"L,M,V 4:00-6:00PM","cupos":20,"mensualidad":650,"nuevos":0,"desc_est":520},{"categoria":"CAT 2010-2011","edad":"14-15 Años","horarios":"L,M,V 6:00-8:00PM","cupos":20,"mensualidad":650,"nuevos":0,"desc_est":520},{"categoria":"CAT 2008-2009 Varonil","edad":"16-17 Años","horarios":"L,M,V 4:00-6:00PM","cupos":20,"mensualidad":650,"nuevos":0,"desc_est":520},{"categoria":"CAT 2008-2009 Femenil","edad":"16-17 Años","horarios":"L,M,V 6:00-8:00PM","cupos":20,"mensualidad":650,"nuevos":0,"desc_est":520},{"categoria":"Principiantes","edad":"9-12 Años","horarios":"M,J 3:00-4:30PM","cupos":50,"mensualidad":400,"nuevos":0,"desc_est":320},{"categoria":"Intermedios A","edad":"13-17 Años","horarios":"M,J 4:00-5:30PM","cupos":50,"mensualidad":400,"nuevos":0,"desc_est":320},{"categoria":"Intermedios B","edad":"13-17 Años","horarios":"M,J 5:00-6:30PM","cupos":50,"mensualidad":400,"nuevos":0,"desc_est":320},{"categoria":"Avanzados","edad":"18+ Años","horarios":"M,J 7:00-9:00PM","cupos":50,"mensualidad":400,"nuevos":0,"desc_est":320}],"PADEL":[{"categoria":"Turno 1 M,J","edad":"Todos","horarios":"M,J 3:00-4:00PM","cupos":10,"mensualidad":450,"nuevos":1540,"desc_est":360},{"categoria":"Turno 2 M,J","edad":"Todos","horarios":"M,J 4:00-5:00PM","cupos":10,"mensualidad":450,"nuevos":1540,"desc_est":360},{"categoria":"Turno 3 M,J","edad":"Todos","horarios":"M,J 5:00-6:00PM","cupos":10,"mensualidad":450,"nuevos":1540,"desc_est":360},{"categoria":"Turno 4 M,J","edad":"Todos","horarios":"M,J 6:00-7:00PM","cupos":10,"mensualidad":450,"nuevos":1540,"desc_est":360},{"categoria":"Turno L,M,V Matutino","edad":"Todos","horarios":"L,M,V 3:00-4:00PM","cupos":10,"mensualidad":550,"nuevos":1640,"desc_est":440},{"categoria":"Turno L,M,V Vespertino","edad":"Todos","horarios":"L,M,V 4:00-5:00PM","cupos":10,"mensualidad":550,"nuevos":1640,"desc_est":440},{"categoria":"Avanzado L,M,V","edad":"Todos","horarios":"L,M,V 5:00-7:00PM","cupos":10,"mensualidad":550,"nuevos":1640,"desc_est":440}],"BALONCESTO":[{"categoria":"Pigui","edad":"4-7 Años","horarios":"L,M 5:30-6:30PM","cupos":20,"mensualidad":400,"nuevos":1490,"desc_est":320},{"categoria":"Micro","edad":"8-10 Años","horarios":"L,M 4:00-5:30PM","cupos":20,"mensualidad":400,"nuevos":1490,"desc_est":320},{"categoria":"Mini","edad":"<12 Años","horarios":"L,M 5:30-6:30PM","cupos":20,"mensualidad":400,"nuevos":1490,"desc_est":320},{"categoria":"Juvenil A","edad":"12-14 Años","horarios":"M,J,V 3:00-5:00PM","cupos":20,"mensualidad":600,"nuevos":1690,"desc_est":480},{"categoria":"Juvenil B","edad":"14-17 Años","horarios":"M,J,V 5:00-7:00PM","cupos":20,"mensualidad":600,"nuevos":1690,"desc_est":480},{"categoria":"Juvenil C","edad":"17+ Años","horarios":"M,J,V 7:00-9:00PM","cupos":20,"mensualidad":600,"nuevos":0,"desc_est":480}],"BOX":[{"categoria":"Turno Matutino","edad":"12+ Años","horarios":"L-V 9:00-2:00PM","cupos":50,"mensualidad":650,"nuevos":1740,"desc_est":520},{"categoria":"Turno Vespertino","edad":"Todos","horarios":"L-V 1:00-8:00PM","cupos":50,"mensualidad":650,"nuevos":1740,"desc_est":520}],"GIMNASIA":[{"categoria":"Iniciacion A","edad":"3-5 Años","horarios":"M,J 3:00-4:00PM","cupos":15,"mensualidad":650,"nuevos":1740,"desc_est":520},{"categoria":"Iniciacion B","edad":"4-6 Años","horarios":"M,J 4:00-5:00PM","cupos":15,"mensualidad":650,"nuevos":1740,"desc_est":520},{"categoria":"Iniciacion C","edad":"5-7 Años","horarios":"M,J 5:00-6:00PM","cupos":15,"mensualidad":650,"nuevos":1740,"desc_est":520},{"categoria":"Iniciacion D","edad":"6-14 Años","horarios":"M,J 5:00-7:00PM","cupos":15,"mensualidad":650,"nuevos":1740,"desc_est":520},{"categoria":"Intermedias 1","edad":"Todos","horarios":"M,J 5:00-7:00PM","cupos":15,"mensualidad":650,"nuevos":1740,"desc_est":520},{"categoria":"Intermedias 2","edad":"Todos","horarios":"L,M,V 3:00-5:00PM","cupos":15,"mensualidad":650,"nuevos":1740,"desc_est":520},{"categoria":"Avanzadas 1","edad":"Todos","horarios":"L-V 3:00-5:00PM","cupos":15,"mensualidad":800,"nuevos":1890,"desc_est":640},{"categoria":"Avanzadas 2","edad":"Todos","horarios":"L-V 5:00-7:00PM","cupos":15,"mensualidad":800,"nuevos":1890,"desc_est":640}],"ATLETISMO":[{"categoria":"Principiantes","edad":"Todos","horarios":"L-V","cupos":30,"mensualidad":500,"nuevos":1140,"desc_est":400},{"categoria":"Intermedios","edad":"Todos","horarios":"Todos","cupos":30,"mensualidad":500,"nuevos":1140,"desc_est":400},{"categoria":"Avanzados","edad":"Todos","horarios":"L-S 3:00-5:00PM","cupos":30,"mensualidad":500,"nuevos":1140,"desc_est":400}],"PORRAS Y ACROBACIA":[{"categoria":"Open Mixto","edad":"14+ Años","horarios":"M,J 6:30-8:00PM","cupos":20,"mensualidad":350,"nuevos":1440,"desc_est":280},{"categoria":"Junior Femenil","edad":"6-16 Años","horarios":"L,M,V","cupos":20,"mensualidad":500,"nuevos":1590,"desc_est":400}],"ZUMBA FITNESS":[{"categoria":"Clase Basico","edad":"9+ Años","horarios":"Varios","cupos":40,"mensualidad":450,"nuevos":1540,"desc_est":360},{"categoria":"Clase L,M,V","edad":"Todos","horarios":"L,M,V 5:00-6:00PM","cupos":40,"mensualidad":550,"nuevos":1640,"desc_est":440},{"categoria":"Clase Avanzado","edad":"Todos","horarios":"Varios","cupos":40,"mensualidad":800,"nuevos":1890,"desc_est":640}],"PESAS Y TONIFICACION":[{"categoria":"Turno Matutino LAV","edad":"Todos","horarios":"L,M,V 6:00-8:00PM","cupos":30,"mensualidad":450,"nuevos":1540,"desc_est":360},{"categoria":"Turno Vespertino","edad":"Todos","horarios":"7:00-2:00PM","cupos":30,"mensualidad":450,"nuevos":1540,"desc_est":360}]};



function renderCupos() {
  var isAdmin = sesionActual && sesionActual.rol === 'admin';
  var col = document.getElementById('cupos-col-accion');
  if (col) col.style.display = isAdmin ? '' : 'none';
  // Count inscritos per academia+categoria
  var counts = {};
  socios.filter(function(s){ return s.ACTIVO !== false; }).forEach(function(s) {
    var key = (s.ACADEMIA||'').trim() + '||' + (s.CATEGORIA||'').trim();
    counts[key] = (counts[key]||0) + 1;
  });
  var tbody = document.getElementById('tabla-cupos');
  if (!tbody) return;
  var rows = '';
  Object.keys(OFERTA).forEach(function(acad) {
    // Academia header
    rows += '<tr style="background:var(--bg3)"><td colspan="' + (isAdmin?8:7) + '" style="padding:10px 14px;font-family:Bebas Neue,sans-serif;font-size:15px;letter-spacing:1px;color:var(--gold2)">🏅 ' + acad + '</td></tr>';
    OFERTA[acad].forEach(function(cat) {
      var key = acad + '||' + cat.categoria;
      var inscritos = counts[key] || 0;
      var maximo = cuposCustom[key] !== undefined ? cuposCustom[key] : (cat.cupos||0);
      var disp = maximo > 0 ? Math.max(0, maximo - inscritos) : '—';
      var pct  = maximo > 0 ? Math.round(inscritos/maximo*100) : 0;
      var barC = pct>=100?'var(--red2)':pct>=80?'var(--orange)':'var(--green2)';
      var dispC= disp===0?'var(--red2)':(typeof disp==='number'&&disp<=5)?'var(--orange)':'var(--green2)';
      var mens = cat.mensualidad ? '$'+cat.mensualidad.toLocaleString('es-MX') : '—';
      var editBtn = isAdmin ? '<button class="btn btn-ghost btn-sm" onclick="abrirModalCupos(\'' + key.replace(/\\/g,'\\\\').replace(/'/g,"\\'") + '\')">✏️</button>' : '';
      rows += '<tr>' +
        '<td style="padding-left:24px;color:var(--text2);font-size:13px">' + cat.categoria + '</td>' +
        '<td style="color:var(--text3);font-size:12px">' + (cat.edad||'—') + '</td>' +
        '<td style="color:var(--text3);font-size:12px">' + (cat.horarios||'—') + '</td>' +
        '<td style="text-align:center">' + (maximo||'—') + '</td>' +
        '<td style="text-align:center;font-weight:600">' + inscritos + '</td>' +
        '<td style="text-align:center;font-weight:700;color:'+dispC+'">' + disp + '</td>' +
        '<td style="color:var(--green2);font-weight:600">' + mens + '</td>' +
        (isAdmin ? '<td>' + editBtn + '</td>' : '') +
        '</tr>';
    });
  });
  tbody.innerHTML = rows;
  var lbl = document.getElementById('cupos-lbl');
  if (lbl) lbl.textContent = Object.keys(OFERTA).length + ' academias · ' + Object.values(OFERTA).reduce(function(a,c){return a+c.length;},0) + ' categorias';
}


function abrirModalCupos(key) {
  if (!sesionActual || sesionActual.rol !== 'admin') return;
  cuposEditKey = key;
  var parts = key.split('||');
  document.getElementById('cupos-academia-lbl').textContent = parts[0] + ' — ' + parts[1];
  // Find base cupo from OFERTA
  var base = 0;
  if (OFERTA[parts[0]]) {
    var cat = OFERTA[parts[0]].find(function(c){ return c.categoria === parts[1]; });
    if (cat) base = cat.cupos || 0;
  }
  document.getElementById('cupos-max').value = cuposCustom[key] !== undefined ? cuposCustom[key] : base;
  document.getElementById('mo-cupos').style.display = 'flex';
}

function guardarCupos() {
  var max = parseInt(document.getElementById('cupos-max').value);
  if (!max || max < 1) { alert('Ingresa un numero valido.'); return; }
  cuposCustom[cuposEditKey] = max;
  localStorage.setItem('cdu_cupos_v1', JSON.stringify(cuposCustom));
  registrarLog('alta', 'Cupos: ' + cuposEditKey + ' = ' + max, null);
  cerrarMo('mo-cupos');
  renderCupos();
  syncMsg('Cupos actualizados');
}

// Show login on load
document.getElementById('login-screen').style.display='flex';

// Save to localStorage when browser/tab closes
window.addEventListener('beforeunload', () => {
  guardarTodoLocal();
});

