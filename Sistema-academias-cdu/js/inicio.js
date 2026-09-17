// ═══════════════════════════ NAVIGATION ═══════════════════════════
function showView(v) {
  document.querySelectorAll('.view').forEach(el=>el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el=>el.classList.remove('active'));
  document.getElementById('view-'+v).classList.add('active');
  document.getElementById('nav-'+v).classList.add('active');
  if(v==='socios') renderSocios();
  if(v==='pagos') renderPagos();
  if(v==='lockers') renderLockers();
  if(v==='alertas') renderAlertas();
  if(v==='inicio') renderInicio();
  if(v==='log') {
    // Refresh log from Sheets when opening
    apiGet('getLog').then(ld => {
      if(ld && Array.isArray(ld) && ld.length > 0) {
        const keys = new Set(ld.map(l => l.usuario+'|'+l.fecha+'|'+l.hora));
        const local = activityLog.filter(l => !keys.has(l.usuario+'|'+l.fecha+'|'+l.hora));
        activityLog = [...ld, ...local].slice(0, 500);
        lsGuardar(LS_LOG, activityLog.slice(0, 200));
        renderLog();
      }
    });
    renderLog();
  }
  if(v==='reportes') {
    // Restore tab UI for current period without resetting it
    ['hoy','semana','mes','custom'].forEach(x => {
      document.getElementById('pt-'+x)?.classList.toggle('active', x===periodoActual);
    });
    document.getElementById('custom-rango').style.display = periodoActual==='custom' ? '' : 'none';
    renderReportes(); // render immediately with cached data
    // Then silently refresh data in background
    apiGet('getPagos').then(pd => {
      if(pd && Array.isArray(pd) && pd.length > 0) {
        // Only update pagos if Sheets has MORE records (don't overwrite local new ones)
        if(pd.length >= pagos.length) pagos = pd;
        actualizarStats();
        renderReportes();
      }
    });
  }
  if(v==='pendientes') cargarYRenderPendientes();
  if(v==='prueba') renderPrueba();
  if(v==='cupos') renderCupos();
  if(v==='pendientes') { renderPendientes(); }
}

// ═══════════════════════════ STATS ═══════════════════════════
function calcAlertas() {
  return socios.filter(s => {
    if(s.ACTIVO===false) return false;
    const d = diasHastaVenc(s);
    const segEst = getSeguroEstatus(s);
    return (d !== null && d <= 7) || segEst === 'vencido' || segEst === 'pendiente';
  });
}

function actualizarStats() {
  const total   = socios.length;
  const activos = socios.filter(s=>s.ACTIVO!==false).length;
  const bajas   = socios.filter(s=>s.ACTIVO===false).length;
  const alrts   = calcAlertas().length;

  ['hdr-total','s-total'].forEach(id=>{ const el=document.getElementById(id); if(el) el.textContent=total; });
  ['hdr-activos','s-activos'].forEach(id=>{ const el=document.getElementById(id); if(el) el.textContent=activos; });
  ['hdr-alertas','s-alertas'].forEach(id=>{ const el=document.getElementById(id); if(el) el.textContent=alrts; });
  ['hdr-pagos','s-pagos'].forEach(id=>{ const el=document.getElementById(id); if(el) el.textContent=pagos.length; });
  ['badge-alertas'].forEach(id=>{ const el=document.getElementById(id); if(el) el.textContent=alrts; });
  const _mesAct=['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'][new Date().getMonth()];
  const _conPago=new Set(pagos.filter(p=>p.MES===_mesAct).map(p=>p.NS));
  const _nPend=socios.filter(s=>s.ACTIVO!==false&&!_conPago.has(s.NS)).length;
  const _bpend=document.getElementById('badge-pendientes'); if(_bpend)_bpend.textContent=_nPend;
  // Update pendientes badge
  const ahora=new Date();
  const mesAct=['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'][ahora.getMonth()];
  const conPago=new Set(pagos.filter(p=>p.MES===mesAct).map(p=>p.NS));
  const nPend=socios.filter(s=>s.ACTIVO!==false&&!conPago.has(s.NS)).length;
  const bpend=document.getElementById('badge-pendientes');
  if(bpend) bpend.textContent=nPend;

  // Populate filters
  const acads = getAcademias();
  ['f-academia','f-academia-p','al-academia'].forEach(id=>{
    const el=document.getElementById(id); if(!el) return;
    const cur=el.value;
    el.innerHTML='<option value="">Todas las academias</option>'+acads.map(a=>`<option value="${a}">${a}</option>`).join('');
    el.value=cur;
  });
  const fa=document.getElementById('f-academia-alta');
  if(fa) fa.innerHTML='<option value="">— Seleccionar —</option>'+acads.map(a=>`<option value="${a}">${a}</option>`).join('');

  const meses=[...new Set(pagos.map(p=>p.MES).filter(Boolean))];
  const fm=document.getElementById('f-mes');
  if(fm){ const cur=fm.value; fm.innerHTML='<option value="">Todos los meses</option>'+meses.map(m=>`<option>${m}</option>`).join(''); fm.value=cur; }
}

// ═══════════════════════════ INICIO ═══════════════════════════
function renderInicio() {
  actualizarStats();
  const counts={};
  socios.forEach(s=>{ const a=s.ACADEMIA.trim()||'Sin academia'; counts[a]=(counts[a]||0)+1; });
  const total=socios.length;
  const sorted=Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  document.getElementById('tbl-academias').innerHTML=sorted.map(([a,c])=>`
    <tr><td class="mc">${a}</td><td><span class="badge b-gold">${c}</span></td>
    <td style="color:var(--text3)">${Math.round(c/total*100)}%</td></tr>`).join('');

  const ult=[...pagos].slice(-8).reverse();
  document.getElementById('tbl-ultpagos').innerHTML=ult.map(p=>`
    <tr>
      <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer;color:var(--text);font-weight:500;text-decoration:underline;text-decoration-color:var(--border)" onclick="verSocio('${p.NS}')" title="Ver ficha">${p.NOMBRE}</td>
      <td style="color:var(--green2);font-weight:600">${fmt$(p.MONTO)}</td>
      <td style="color:var(--text3)">${p.MES||'—'}</td>
      <td>${p.REGISTRADO_POR?`<div style="display:flex;align-items:center;gap:5px" title="${p.FECHA_REGISTRO||''} ${p.HORA_REGISTRO||''}"><div style="width:20px;height:20px;border-radius:50%;background:var(--gold);color:#000;font-size:8px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0">${(p.REGISTRADO_POR||'?')[0]}</div><span style="font-size:11px;color:var(--text2)">${p.REGISTRADO_POR}</span></div>`:'<span style="color:var(--text3);font-size:11px">—</span>'}</td>
    </tr>`).join('');
}

// ═══════════════════════════ PAGINACIÓN ═══════════════════════════
function renderPag(id, cur, max, cb) {
  const el=document.getElementById(id);
  let btns='';
  for(let i=1;i<=max;i++){
    if(i===1||i===max||Math.abs(i-cur)<=2) btns+=`<button class="pbtn ${i===cur?'active':''}" onclick="(${cb})(${i})">${i}</button>`;
    else if(Math.abs(i-cur)===3) btns+=`<span style="color:var(--text3);padding:0 3px">…</span>`;
  }
  el.innerHTML=`<span class="info">Página ${cur} de ${max}</span>
    <div class="pages"><button class="pbtn" ${cur===1?'disabled':''} onclick="(${cb})(${cur-1})">‹</button>${btns}<button class="pbtn" ${cur===max?'disabled':''} onclick="(${cb})(${cur+1})">›</button></div>`;
}

