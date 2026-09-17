// ═══════════════════════════ CLOCK ═══════════════════════════
function tick() {
  const now = new Date();
  document.getElementById('clock').textContent = now.toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  document.getElementById('date-label').textContent = now.toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long'});
}
setInterval(tick,1000); tick();

// ═══════════════════════════ HELPERS ═══════════════════════════


function fmt$(v){ return '$'+(parseFloat(v)||0).toLocaleString('es-MX',{minimumFractionDigits:0}); }

function getSeguroEstatus(s) {
  if (!s.SEGURO_VIGENCIA) return 'pendiente';
  const dias = Math.round((new Date(s.SEGURO_VIGENCIA) - new Date()) / 86400000);
  if (dias < 0) return 'vencido';
  return 'pagado';
}

function seguroBadge(s) {
  const est = getSeguroEstatus(s);
  if (est === 'pagado')   return `<span class="badge b-pagado">✅ Seguro Pagado</span>`;
  if (est === 'vencido')  return `<span class="badge b-vencido-seg">❌ Seguro Vencido</span>`;
  return `<span class="badge b-pendiente">⏳ Seguro Pendiente</span>`;
}
function iniciales(n){ if(!n)return'?'; const p=n.trim().split(' '); return (p[0]?.[0]||'')+(p[p.length-1]?.[0]||''); }
function cerrarMo(id){ document.getElementById(id).style.display='none'; }
function hoy(){ return new Date().toISOString().slice(0,10); }

function diasHastaVenc(s) {
  if (!s.VENCIMIENTO) return null;
  const d = new Date(s.VENCIMIENTO);
  if (isNaN(d)) return null;
  return Math.round((d - new Date()) / 86400000);
}

function getAcademias() {
  return [...new Set(socios.map(s=>s.ACADEMIA.trim()).filter(Boolean))].sort();
}

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

// ═══════════════════════════ ALERTAS ═══════════════════════════
function recalcularAlertas() { renderAlertas(); }

function renderAlertas() {
  const q=(document.getElementById('al-search')?.value||'').toLowerCase();
  const tipo=document.getElementById('al-tipo')?.value||'';
  const ac=document.getElementById('al-academia')?.value||'';

  const lista = socios.filter(s => {
    if(s.ACTIVO===false) return false;
    const d=diasHastaVenc(s);
    const segEst=getSeguroEstatus(s);
    // include if membresia alert OR seguro alert
    const membAlert = d!==null && d<=7;
    const segAlert  = segEst==='vencido' || segEst==='pendiente';
    if(!membAlert && !segAlert) return false;
    if(tipo==='vencido' && !(d!==null&&d<=0) && segEst!=='vencido') return false;
    if(tipo==='proximo' && !(d!==null&&d>0&&d<=7)) return false;
    if(tipo==='seguro' && segEst==='pagado') return false;
    if(q && !s.NOMBRE.toLowerCase().includes(q) && !s.NS.includes(q)) return false;
    if(ac && s.ACADEMIA.trim()!==ac) return false;
    return true;
  }).sort((a,b)=>diasHastaVenc(a)-diasHastaVenc(b));

  const cont=document.getElementById('alertas-container');
  if(!lista.length){
    cont.innerHTML=`<div class="empty"><div class="ei">✅</div><p>No hay alertas activas</p></div>`;
    return;
  }
  const items = lista.map(s=>{
    const d=diasHastaVenc(s);
    const chip = d===null ? '' : d<=0
      ? `<span class="alert-chip vencido">MEMBRESÍA VENCIDA ${Math.abs(d)}d</span>`
      : `<span class="alert-chip proximo">Membresía vence en ${d}d</span>`;
    const segEst2 = getSeguroEstatus(s);
    const segChip = segEst2==='vencido'
      ? `<span class="alert-chip vencido">SEGURO VENCIDO</span>`
      : segEst2==='pendiente' ? `<span class="alert-chip proximo">SEGURO PENDIENTE</span>` : '';
    return `<div class="alert-item" onclick="verSocio('${s.NS}')" style="cursor:pointer">
      <div>
        <div class="an">#${s.NS} — ${s.NOMBRE}</div>
        <div class="ad">${s.ACADEMIA||'—'} · ${s.CATEGORIA||'—'} · Vence: ${s.VENCIMIENTO||'—'} · Seguro: ${s.SEGURO_VIGENCIA||'Sin registrar'}</div>
      </div>
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
        ${chip}${segChip}
        <button class="btn btn-gold btn-sm" onclick="event.stopPropagation();abrirModalPago('${s.NS}')">💳 Pago</button>
        <button class="btn btn-blue btn-sm" onclick="event.stopPropagation();abrirModalSeguro('${s.NS}')">🛡 Seguro</button>
      </div>
    </div>`;
  }).join('');

  cont.innerHTML=`<div class="alerts-panel">
    <div class="alerts-panel-hdr">🔔 ${lista.length} socio${lista.length!==1?'s':''} con alerta</div>
    ${items}
  </div>`;
}

// ═══════════════════════════ BUSCAR ═══════════════════════════
function buscarSocio() {
  const q=document.getElementById('buscar-input').value.trim().toLowerCase();
  const div=document.getElementById('buscar-resultado');
  if(!q){div.innerHTML='';return;}
  const res=socios.filter(s=>s.NS===q||s.NS.includes(q)||s.NOMBRE.toLowerCase().includes(q)).slice(0,12);
  if(!res.length){div.innerHTML=`<div class="empty"><div class="ei">🔍</div><p>Sin resultados para "<strong>${q}</strong>"</p></div>`;return;}
  div.innerHTML=`<div class="tbl-wrap"><table>
    <thead><tr><th>N° Socio</th><th>Nombre</th><th>Academia</th><th>Categoría</th><th>Vencimiento</th><th>Estatus</th><th>Acciones</th></tr></thead>
    <tbody>${res.map(s=>{
      const d=diasHastaVenc(s);
      const vChip = d===null?'—':d<=0?`<span class="badge b-orange">Vencido</span>`:d<=7?`<span class="badge b-orange">${d}d</span>`:`<span style="color:var(--text3)">${s.VENCIMIENTO}</span>`;
      return `<tr onclick="verSocio('${s.NS}')">
        <td><strong style="color:var(--gold2)">#${s.NS}</strong></td>
        <td class="mc name-link" onclick="event.stopPropagation();verSocio('${s.NS}')">${s.NOMBRE}</td>
        <td><span class="badge b-gold">${s.ACADEMIA||'—'}</span></td>
        <td style="color:var(--text3)">${s.CATEGORIA||'—'}</td>
        <td>${vChip}</td>
        <td><span class="badge ${s.ACTIVO===false?'b-baja':'b-active'}">${s.ACTIVO===false?'BAJA':'ACTIVO'}</span></td>
        <td onclick="event.stopPropagation()"><div style="display:flex;gap:6px">
          <button class="btn btn-ghost btn-sm" onclick="verSocio('${s.NS}')">👁 Ver</button>
          <button class="btn btn-blue btn-sm" onclick="abrirModalPago('${s.NS}')">💳 Pago</button>
        </div></td>
      </tr>`;
    }).join('')}</tbody></table></div>`;
}

// ═══════════════════════════ SOCIOS TABLE ═══════════════════════════
function getSociosFiltrados() {
  const q=(document.getElementById('socios-search')?.value||'').toLowerCase();
  const ac=document.getElementById('f-academia')?.value.trim()||'';
  const est=document.getElementById('f-estatus')?.value||'';
  return socios.filter(s=>{
    if(q && !s.NOMBRE.toLowerCase().includes(q) && !s.NS.includes(q)) return false;
    if(ac && s.ACADEMIA.trim()!==ac) return false;
    if(est==='activo' && s.ACTIVO===false) return false;
    if(est==='baja' && s.ACTIVO!==false) return false;
    return true;
  });
}

function renderSocios() {
  const filtered=getSociosFiltrados();
  const max=Math.ceil(filtered.length/PER)||1;
  if(pgSocios>max) pgSocios=max;
  const slice=filtered.slice((pgSocios-1)*PER, pgSocios*PER);
  document.getElementById('socios-count-lbl').textContent=`${filtered.length} socios`;
  const tbody=document.getElementById('tabla-socios');
  if(!slice.length){tbody.innerHTML=`<tr><td colspan="8"><div class="empty"><div class="ei">👤</div><p>Sin resultados</p></div></td></tr>`;} else {
    tbody.innerHTML=slice.map(s=>{
      const d=diasHastaVenc(s);
      const vChip=d===null?'<span style="color:var(--text3)">—</span>':d<=0?`<span class="badge b-orange">Vencido</span>`:d<=7?`<span class="badge b-orange">${d}d</span>`:`<span style="color:var(--text3);font-size:12px">${s.VENCIMIENTO}</span>`;
      return `<tr onclick="verSocio('${s.NS}')">
        <td><strong style="color:var(--gold2)">#${s.NS}</strong></td>
        <td class="mc name-link" onclick="event.stopPropagation();verSocio('${s.NS}')">${s.NOMBRE}</td>
        <td><span class="badge b-gold">${s.ACADEMIA||'—'}</span></td>
        <td style="color:var(--text3)">${s.CATEGORIA||'—'}</td>
        <td>${s.TIPO_SANGRE||'—'}</td>
        <td>${vChip}</td>
        <td>${seguroBadge(s)}</td>
        <td><span class="badge ${s.ACTIVO===false?'b-baja':'b-active'}">${s.ACTIVO===false?'BAJA':'ACTIVO'}</span></td>
        <td onclick="event.stopPropagation()"><div style="display:flex;gap:5px">
          <button class="btn btn-ghost btn-sm" onclick="verSocio('${s.NS}')">👁</button>
          <button class="btn btn-blue btn-sm" onclick="abrirModalPago('${s.NS}')">💳</button>
          ${s.ACTIVO===false
            ?`<button class="btn btn-green btn-sm" onclick="reactivar('${s.NS}')">✅</button>`
            :`<button class="btn btn-red btn-sm" onclick="pedirBaja('${s.NS}')">❌</button>`}
        </div></td>
      </tr>`;
    }).join('');
  }
  renderPag('pag-socios',pgSocios,max,p=>{pgSocios=p;renderSocios();});
}

// ═══════════════════════════ PAGOS TABLE ═══════════════════════════
function getPagosFiltrados() {
  const q=(document.getElementById('pagos-search')?.value||'').toLowerCase();
  const mes=document.getElementById('f-mes')?.value||'';
  const ac=document.getElementById('f-academia-p')?.value.trim()||'';
  return pagos.filter(p=>{
    if(q && !p.NOMBRE.toLowerCase().includes(q) && !p.NS.includes(q)) return false;
    if(mes && p.MES!==mes) return false;
    if(ac && p.ACADEMIA.trim()!==ac) return false;
    return true;
  });
}

function renderPagos() {
  const filtered=getPagosFiltrados();
  const max=Math.ceil(filtered.length/PER)||1;
  if(pgPagos>max) pgPagos=max;
  const slice=filtered.slice((pgPagos-1)*PER, pgPagos*PER);
  document.getElementById('pagos-count-lbl').textContent=`${filtered.length} pagos`;
  const tbody=document.getElementById('tabla-pagos');
  if(!slice.length){tbody.innerHTML=`<tr><td colspan="9"><div class="empty"><div class="ei">💳</div><p>Sin resultados</p></div></td></tr>`;} else {
    tbody.innerHTML=slice.map(p=>`<tr>
      <td><strong style="color:var(--gold2)">#${p.NS}</strong></td>
      <td class="mc name-link" onclick="verSocio('${p.NS}')">${p.NOMBRE}</td>
      <td>${p.MES||'—'}</td>
      <td style="color:var(--green2);font-weight:600">${fmt$(p.MONTO)}</td>
      <td>${p.DESCUENTO&&p.DESCUENTO!=='NO APLICA'?`<span class="badge b-blue">${p.DESCUENTO}</span>`:'<span style="color:var(--text3)">—</span>'}</td>
      <td style="color:var(--text3);font-size:12px">${p.REFERENCIA||'—'}</td>
      <td style="color:var(--text3)">${p.FECHA_PAGO||'—'}</td>
      <td><span class="badge b-gold">${p.ACADEMIA||'—'}</span></td>
      <td>${p.REGISTRADO_POR?`<div style="display:flex;align-items:center;gap:6px"><div style="width:22px;height:22px;border-radius:50%;background:var(--gold);color:#000;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;font-family:'Bebas Neue',sans-serif;flex-shrink:0">${(p.REGISTRADO_POR||'?')[0]}</div><span style="color:var(--text2);font-size:12px">${p.REGISTRADO_POR}</span></div>`:'<span style="color:var(--text3)">—</span>'}</td>
      <td style="color:var(--text3);font-size:12px;white-space:nowrap">${p.FECHA_REGISTRO?p.FECHA_REGISTRO+' '+p.HORA_REGISTRO:'—'}</td>
      <td>${puedeHacer('eliminarPago')?`<button class="btn btn-red btn-sm" onclick="eliminarPago(${pagos.indexOf(p)})">🗑</button>`:'<span style="color:var(--text3)">—</span>'}</td>
    </tr>`).join('');
  }
  renderPag('pag-pagos',pgPagos,max,p=>{pgPagos=p;renderPagos();});
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

// ═══════════════════════════ VER SOCIO ═══════════════════════════
function verSocio(ns) {
  const s=socios.find(x=>x.NS===ns.toString()); if(!s) return;
  const ps=pagos.filter(p=>p.NS===ns.toString());
  const total=ps.reduce((a,p)=>a+(parseFloat(p.MONTO)||0),0);
  const d=diasHastaVenc(s);
  const vChip=d===null?'<span style="color:var(--text3)">Sin fecha</span>':d<=0?`<span class="badge b-orange">VENCIDO hace ${Math.abs(d)} días</span>`:d<=7?`<span class="badge b-orange">Vence en ${d} días</span>`:`<span style="color:var(--text2)">${s.VENCIMIENTO}</span>`;

  document.getElementById('mo-socio-title').textContent=`Ficha #${s.NS}`;
  document.getElementById('mo-socio-body').innerHTML=`
    <div class="scard-hdr">
      <div class="scard-av">${iniciales(s.NOMBRE)}</div>
      <div>
        <div style="font-size:18px;font-weight:700;margin-bottom:3px">${s.NOMBRE}</div>
        <div style="font-size:12px;color:var(--text3)">N° Socio: <strong style="color:var(--gold2)">#${s.NS}</strong> &nbsp;·&nbsp; <span class="badge ${s.ACTIVO===false?'b-baja':'b-active'}">${s.ACTIVO===false?'BAJA':'ACTIVO'}</span></div>
      </div>
    </div>
    <div class="igrid">
      <div class="iitem"><label>Academia</label><div class="iv"><span class="badge b-gold">${s.ACADEMIA||'—'}</span></div></div>
      <div class="iitem"><label>Categoría</label><div class="iv">${s.CATEGORIA||'—'}</div></div>
      <div class="iitem"><label>Fecha de Nacimiento</label><div class="iv">${s.FECHA_NAC||'—'}</div></div>
      <div class="iitem"><label>Tipo de Sangre</label><div class="iv" style="color:var(--red2);font-weight:700">${s.TIPO_SANGRE||'—'}</div></div>
      <div class="iitem"><label>Contacto de Emergencia</label><div class="iv">${s.CONTACTO_EMERGENCIA||'—'} (${s.PARENTESCO||'—'})</div></div>
      <div class="iitem"><label>Celular</label><div class="iv">${s.CELULAR||'—'}</div></div>
      <div class="iitem"><label>Vencimiento Membresía</label><div class="iv">${vChip}</div></div>
      <div class="iitem"><label>Total Pagado</label><div class="iv" style="color:var(--green2);font-weight:700">${fmt$(total)}</div></div>
    </div>
    <div class="seguro-card">
      <div class="seguro-card-hdr">
        <span class="seguro-card-title">🛡 Seguro Deportivo</span>
        ${seguroBadge(s)}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
        <div class="iitem"><label>Estatus</label><div class="iv">${getSeguroEstatus(s)==='pagado'?'Al corriente':getSeguroEstatus(s)==='vencido'?'<span style="color:var(--red2)">Vencido</span>':'<span style="color:var(--orange)">Sin registrar</span>'}</div></div>
        <div class="iitem"><label>Vigente hasta</label><div class="iv">${s.SEGURO_VIGENCIA||'—'}</div></div>
        <div class="iitem"><label>Monto pagado</label><div class="iv" style="color:var(--green2)">${s.SEGURO_MONTO?fmt$(s.SEGURO_MONTO):'—'}</div></div>
        <div class="iitem"><label>N° Referencia</label><div class="iv" style="color:var(--text2)">${s.SEGURO_REFERENCIA||'—'}</div></div>
      </div>
      <div style="margin-top:12px;display:flex;gap:8px">
        <button class="btn btn-gold btn-sm" onclick="cerrarMo('mo-socio');abrirModalSeguro('${s.NS}')">💳 Registrar Pago de Seguro</button>
      </div>
    </div>
    <div class="stitle">Historial de Pagos (${ps.length})</div>
    ${ps.length?`<div style="overflow-x:auto"><table class="pmini">
      <thead><tr><th>Mes</th><th>Monto</th><th>Inscripción</th><th>Seguro</th><th>Descuento</th><th>Ref.</th><th>Fecha</th><th>Registrado por</th><th>Hora</th></tr></thead>
      <tbody>${ps.map(p=>`<tr>
        <td>${p.MES||'—'}</td>
        <td style="color:var(--green2)">${fmt$(p.MONTO)}</td>
        <td>${p.INSCRIPCION&&p.INSCRIPCION!=='nan'&&p.INSCRIPCION!==''?fmt$(p.INSCRIPCION):'—'}</td>
        <td>${p.SEGURO&&p.SEGURO!=='nan'&&p.SEGURO!==''?fmt$(p.SEGURO):'—'}</td>
        <td>${p.DESCUENTO&&p.DESCUENTO!=='NO APLICA'?`<span class="badge b-blue" style="font-size:9px">${p.DESCUENTO}</span>`:'—'}</td>
        <td style="color:var(--text3)">${p.REFERENCIA||'—'}</td>
        <td style="color:var(--text3)">${p.FECHA_PAGO||'—'}</td>
      </tr>`).join('')}</tbody>
    </table></div>`:'<p style="color:var(--text3);font-size:13px">Sin pagos registrados.</p>'}`;

  document.getElementById('mo-socio-footer').innerHTML=`
    <button class="btn btn-ghost" onclick="cerrarMo('mo-socio')">Cerrar</button>
    <button class="btn btn-blue" onclick="cerrarMo('mo-socio');imprimirFicha('${s.NS}')">🖨 Imprimir Ficha</button>
    <button class="btn btn-gold" onclick="cerrarMo('mo-socio');abrirModalPago('${s.NS}')">💳 Registrar Pago</button>
    ${sesionActual?.rol==='admin'?`<button class="btn btn-orange" onclick="cerrarMo('mo-socio');abrirModalCategoria('${s.NS}')">✏️ Cambiar Categoría</button>`:''}
    ${['admin','recepcionista'].includes(sesionActual?.rol)?`<button class="btn btn-ghost" onclick="cerrarMo('mo-socio');abrirModalDisciplina('${s.NS}')">🏅 Agregar Disciplina</button>`:''}
    ${s.ACTIVO===false
      ?`<button class="btn btn-green" onclick="cerrarMo('mo-socio');reactivar('${s.NS}')">✅ Reactivar</button>`
      :`<button class="btn btn-red" onclick="cerrarMo('mo-socio');pedirBaja('${s.NS}')">❌ Baja</button>`}`;

  document.getElementById('mo-socio').style.display='flex';
}

// ═══════════════════════════ ALTA ═══════════════════════════
function darDeAlta() {
  const div       = document.getElementById('alta-alert');
  const nombre    = document.getElementById('f-nombre').value.trim();
  const ns        = document.getElementById('f-ns').value.trim();
  const fechaNac  = document.getElementById('f-fecha-nac').value.trim();
  const sangre    = document.getElementById('f-sangre').value.trim();
  const academia  = document.getElementById('f-academia-alta').value.trim();
  const categoria = document.getElementById('f-categoria').value.trim();
  const contactoNombreV   = document.getElementById('f-contacto-nombre')?.value.trim()||'';
  const contactoApellidoV = document.getElementById('f-contacto-apellido')?.value.trim()||'';
  const contacto = contactoNombreV + ' ' + contactoApellidoV;
  const celular   = document.getElementById('f-celular').value.trim();
  const parentesco= document.getElementById('f-parentesco').value.trim();
  const vencimiento = document.getElementById('f-vencimiento').value.trim();

  // Validate all required fields (NS is optional)
  if (!nombre)     { div.innerHTML='<div class="al al-err">⚠ El nombre completo es obligatorio.</div>'; return; }
  if (!fechaNac)   { div.innerHTML='<div class="al al-err">⚠ La fecha de nacimiento es obligatoria.</div>'; return; }
  if (!sangre)     { div.innerHTML='<div class="al al-err">⚠ El tipo de sangre es obligatorio.</div>'; return; }
  if (!academia)   { div.innerHTML='<div class="al al-err">⚠ La academia es obligatoria.</div>'; return; }
  if (!categoria)  { div.innerHTML='<div class="al al-err">⚠ La categoría es obligatoria.</div>'; return; }
  const contactoNombre   = document.getElementById('f-contacto-nombre').value.trim();
  const contactoApellido = document.getElementById('f-contacto-apellido').value.trim();
  if (!contactoNombre)   { div.innerHTML='<div class="al al-err">⚠ El nombre del contacto de emergencia es obligatorio.</div>'; return; }
  if (!contactoApellido) { div.innerHTML='<div class="al al-err">⚠ Los apellidos del contacto de emergencia son obligatorios.</div>'; return; }
  if (!celular)           { div.innerHTML='<div class="al al-err">⚠ El celular de contacto es obligatorio.</div>'; return; }
  if (celular.length !== 10) { div.innerHTML='<div class="al al-err">⚠ El celular debe tener exactamente 10 dígitos.</div>'; return; }
  if (!parentesco) { div.innerHTML='<div class="al al-err">⚠ El parentesco es obligatorio.</div>'; return; }
  if (!vencimiento){ div.innerHTML='<div class="al al-err">⚠ La fecha de vencimiento de membresía es obligatoria.</div>'; return; }
  if (ns && socios.find(s=>s.NS===ns)){ div.innerHTML='<div class="al al-err">⚠ Ya existe un socio con ese número.</div>'; return; }
  if (socios.find(s=>s.NOMBRE.trim().toUpperCase()===nombre.toUpperCase())){ div.innerHTML='<div class="al al-err">⚠ Ya existe un socio con ese nombre.</div>'; return; }
  const nuevoNS = ns || (Math.max(...socios.map(s=>parseInt(s.NS)||0))+1).toString();
  const nuevo = {
    NS:                  nuevoNS,
    NOMBRE:              nombre.toUpperCase(),
    FECHA_NAC:           fechaNac,
    TIPO_SANGRE:         sangre,
    ACADEMIA:            academia,
    CATEGORIA:           categoria.toUpperCase(),
    CONTACTO_EMERGENCIA: contacto.toUpperCase(),
    CELULAR:             celular,
    PARENTESCO:          parentesco.toUpperCase(),
    VENCIMIENTO:         vencimiento,
    SEGURO_VIGENCIA:     document.getElementById('f-seguro-vigencia').value||'',
    SEGURO_MONTO:        document.getElementById('f-seguro-monto').value||'',
    ACTIVO:              true
  };
  if(!puedeHacer('alta')){ div.innerHTML='<div class="al al-err">⛔ No tienes permiso para dar de alta socios.</div>'; return; }
  socios.push(nuevo);
  guardarTodoLocal();
  if(document.getElementById('view-cupos')?.classList.contains('active')) renderCupos();
  if(document.getElementById('view-cupos')?.classList.contains('active')) renderCupos();
  actualizarStats();
  registrarLog('alta', `Alta de socio: ${nuevo.NOMBRE}`, nuevoNS);
  div.innerHTML=`<div class="al al-ok">✅ Socio <strong>${nuevo.NOMBRE}</strong> registrado como #${nuevoNS}</div>`;
  limpiarAlta();
  setTimeout(()=>div.innerHTML='',4000);
  if(document.getElementById('view-socios')?.classList.contains('active')) renderSocios();
  if(document.getElementById('view-pendientes')?.classList.contains('active')) cargarYRenderPendientes();
  // Send to Sheets — no-cors so response is opaque, but data gets through
  apiPost({action:'addSocio', data:nuevo}).then(() => {
    syncMsg('✅ Socio guardado en Sheets');
  }).catch(() => {
    syncMsg('⚠ Sin conexión — guardado solo en local', false);
  });
}

function limpiarAlta(){['f-ns','f-nombre','f-fecha-nac','f-sangre','f-academia-alta','f-categoria','f-contacto','f-celular','f-parentesco','f-vencimiento'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=''});}

// ═══════════════════════════ BAJA / REACTIVAR ═══════════════════════════
function pedirBaja(ns){bajaNS=ns;const s=socios.find(x=>x.NS===ns.toString());document.getElementById('baja-nombre').textContent=s?s.NOMBRE:ns;document.getElementById('mo-baja').style.display='flex';}
function confirmarBaja(){
  const s=socios.find(x=>x.NS===bajaNS.toString());
  if(s)s.ACTIVO=false;
  guardarTodoLocal(); // persist to localStorage immediately
  cerrarMo('mo-baja');
  actualizarStats();
  if(document.getElementById('view-socios')?.classList.contains('active')) renderSocios();
  if(document.getElementById('view-buscar')?.classList.contains('active')) buscarSocio();
  if(document.getElementById('view-alertas')?.classList.contains('active')) renderAlertas();
  if(document.getElementById('view-pendientes')?.classList.contains('active')) cargarYRenderPendientes();
  if(s) registrarLog('baja', `Baja de socio: ${s.NOMBRE}`, s.NS);
  if(s) apiPost({action:'updateSocio',data:{NS:s.NS,ACTIVO:false}}).then(r=>syncMsg(r&&r.ok?'✅ Baja guardada':'⚠ Error',r&&r.ok));
}
function reactivar(ns){
  const s=socios.find(x=>x.NS===ns.toString());
  if(s)s.ACTIVO=true;
  guardarTodoLocal(); // persist to localStorage immediately
  actualizarStats();
  if(document.getElementById('view-socios')?.classList.contains('active')) renderSocios();
  if(document.getElementById('view-buscar')?.classList.contains('active')) buscarSocio();
  if(document.getElementById('view-alertas')?.classList.contains('active')) renderAlertas();
  if(s) registrarLog('reactivar', `Reactivación: ${s.NOMBRE}`, s.NS);
  if(s) apiPost({action:'updateSocio',data:{NS:s.NS,ACTIVO:true}}).then(r=>syncMsg(r&&r.ok?'✅ Reactivado':'⚠ Error',r&&r.ok));
}

// ═══════════════════════════ PAGOS ═══════════════════════════

function abrirModalPago(ns) {
  document.getElementById('pago-al').innerHTML='';
  document.getElementById('p-ns').value=ns||'';
  document.getElementById('p-monto').value='';
  document.getElementById('p-tipo').value='mensualidad';
  const _dsel=document.getElementById('p-descuento'); if(_dsel) _dsel.value='NO APLICA';
  document.getElementById('p-ref').value='';
  document.getElementById('p-fecha').value=hoy();
  document.getElementById('p-vencimiento').value='';
  if(ns) autoFillPago();
  else { document.getElementById('p-nombre').value=''; document.getElementById('p-academia').value=''; document.getElementById('p-cat').value=''; }
  const mesAct=MESES[new Date().getMonth()];
  [...document.getElementById('p-mes').options].forEach(o=>o.selected=o.value===mesAct);
  // Add 50% admin-only option
  const dsel = document.getElementById('p-descuento');
  const opt50 = dsel.querySelector('option[value="50% PERMISO ADMIN"]');
  if (sesionActual?.rol === 'admin' && !opt50) {
    const o = document.createElement('option');
    o.value = '50% PERMISO ADMIN'; o.text = '50% Permiso (Solo Admin)';
    dsel.appendChild(o);
  } else if (sesionActual?.rol !== 'admin' && opt50) {
    dsel.removeChild(opt50);
  }
  document.getElementById('mo-pago').style.display='flex';
}

function actualizarCamposPago() {
  const tipo = document.getElementById('p-tipo')?.value || 'mensualidad';
  const vencLabel = document.querySelector('label[for="p-vencimiento"]') ||
    [...document.querySelectorAll('label')].find(l => l.textContent.includes('Actualizar Vencimiento'));
  if (vencLabel) {
    if (tipo === 'seguro') vencLabel.textContent = 'Vigencia Seguro (hasta)';
    else vencLabel.textContent = 'Actualizar Vencimiento hasta';
  }
}

function autoFillPago(){
  const ns=document.getElementById('p-ns').value.trim();
  const s=socios.find(x=>x.NS===ns);
  if(s){
    document.getElementById('p-nombre').value=s.NOMBRE;
    document.getElementById('p-academia').value=s.ACADEMIA;
    document.getElementById('p-cat').value=s.CATEGORIA;
  } else {
    document.getElementById('p-nombre').value='';
    document.getElementById('p-academia').value='';
    document.getElementById('p-cat').value='';
  }
}

function guardarPago(imprimir=true) {
  const div   = document.getElementById('pago-al');
  const ns    = document.getElementById('p-ns').value.trim();
  const monto = document.getElementById('p-monto').value.trim();
  const ref   = document.getElementById('p-ref').value.trim();

  // Validate all required fields
  if (!ns)    { div.innerHTML='<div class="al al-err">⚠ El N° de socio es obligatorio.</div>'; return; }
  if (!monto) { div.innerHTML='<div class="al al-err">⚠ El monto es obligatorio.</div>'; return; }
  if (!ref)   { div.innerHTML='<div class="al al-err">⚠ El número de referencia es obligatorio.</div>'; return; }
  const s=socios.find(x=>x.NS===ns);
  const tipo = document.getElementById('p-tipo').value;
  const nuevo={
    NS:ns, NOMBRE:s?s.NOMBRE:document.getElementById('p-nombre').value,
    INSCRIPCION: tipo==='inscripcion' ? parseFloat(monto) : '',
    SEGURO:      tipo==='seguro'      ? parseFloat(monto).toFixed(2) : '',
    MES:document.getElementById('p-mes').value,
    MONTO:       (tipo==='mensualidad'||tipo==='uniforme') ? parseFloat(monto) : 0,
    REFERENCIA:ref,
    FECHA_PAGO:document.getElementById('p-fecha').value,
    DESCUENTO:document.getElementById('p-descuento').value||'NO APLICA',
    ACADEMIA:s?s.ACADEMIA:'',
    CATEGORIA:s?s.CATEGORIA:'',
    TIPO_PAGO: tipo.toUpperCase(),
    REGISTRADO_POR: sesionActual ? sesionActual.nombre : '—',
    ROL_REGISTRO: sesionActual ? sesionActual.rol : '—',
    FECHA_REGISTRO: new Date().toISOString().slice(0,10),
    HORA_REGISTRO: new Date().toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit',second:'2-digit'})
  };
  // If seguro type, also update SEGURO_VIGENCIA on socio
  if (tipo === 'seguro' && s) {
    s.SEGURO_VIGENCIA = document.getElementById('p-vencimiento').value || s.SEGURO_VIGENCIA;
    s.SEGURO_MONTO    = monto;
    guardarTodoLocal();
    apiPost({action:'updateSocio', data:{NS:s.NS, ACTIVO:s.ACTIVO, SEGURO_VIGENCIA:s.SEGURO_VIGENCIA, SEGURO_MONTO:monto}});
  }
  const venc=document.getElementById('p-vencimiento').value;
  if(venc && s){
    s.VENCIMIENTO=venc;
    guardarTodoLocal(); // persist updated vencimiento
    apiPost({action:'updateSocio', data:{NS:s.NS, ACTIVO:s.ACTIVO, VENCIMIENTO:venc}});
  }
  pagos.push(nuevo);
  guardarTodoLocal(); // persist to localStorage immediately
  actualizarStats();
  cerrarMo('mo-pago');
  renderPagos();
  // Refresh pendientes badge
  const _mA=['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'][new Date().getMonth()];
  const _cP=new Set(pagos.filter(p=>p.MES===_mA).map(p=>p.NS));
  const _nP=socios.filter(s=>s.ACTIVO!==false&&!_cP.has(s.NS)).length;
  const _bp=document.getElementById('badge-pendientes'); if(_bp)_bp.textContent=_nP;
  if(document.getElementById('view-pendientes')?.classList.contains('active')) cargarYRenderPendientes();
  if(document.getElementById('view-reportes')?.classList.contains('active')) cargarYRenderReportes();
  apiPost({action:'addPago',data:nuevo}).then(r=>syncMsg(r&&r.ok?'✅ Pago guardado':'⚠ Error',r&&r.ok));
  if(imprimir) setTimeout(()=>imprimirRecibo(nuevo),300);
}

function eliminarPago(idx){
  if(!puedeHacer('eliminarPago')){alert('⛔ No tienes permiso para eliminar pagos.');return;}
  if(!confirm('¿Eliminar este pago?'))return;
  pagos.splice(idx,1);
  guardarTodoLocal(); // persist to localStorage immediately
  actualizarStats();
  renderPagos();
  const _mA=['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'][new Date().getMonth()];
  const _cP=new Set(pagos.filter(p=>p.MES===_mA).map(p=>p.NS));
  const _nP=socios.filter(s=>s.ACTIVO!==false&&!_cP.has(s.NS)).length;
  const _bp=document.getElementById('badge-pendientes'); if(_bp)_bp.textContent=_nP;
  if(document.getElementById('view-pendientes')?.classList.contains('active')) cargarYRenderPendientes();
  if(document.getElementById('view-reportes')?.classList.contains('active')) cargarYRenderReportes();
}

// ═══════════════════════════ IMPRIMIR FICHA ═══════════════════════════
function imprimirFicha(ns) {
  const s=socios.find(x=>x.NS===ns.toString()); if(!s) return;
  const ps=pagos.filter(p=>p.NS===ns.toString());
  const total=ps.reduce((a,p)=>a+(parseFloat(p.MONTO)||0),0);
  const div=document.getElementById('recibo-print');
  div.innerHTML=`<div style="font-family:Arial,sans-serif;padding:32px;color:#000;background:#fff;max-width:700px;margin:auto">
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #000;padding-bottom:14px;margin-bottom:20px">
      <div><h1 style="font-size:22px;margin:0">ACADEMIAS CDU</h1><p style="margin:4px 0 0;font-size:13px;color:#555">UNIVERSIDAD DE GUADALAJARA</p></div>
      <div style="text-align:right"><p style="font-size:12px;color:#555">Ficha del Socio</p><p style="font-size:20px;font-weight:bold">N° ${s.NS}</p></div>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
      ${[['Nombre completo',s.NOMBRE],['Academia',s.ACADEMIA],['Categoría',s.CATEGORIA],['Fecha de nacimiento',s.FECHA_NAC||'—'],['Tipo de sangre',s.TIPO_SANGRE||'—'],['Vencimiento membresía',s.VENCIMIENTO||'—'],['Contacto de emergencia',`${s.CONTACTO_EMERGENCIA||'—'} (${s.PARENTESCO||'—'})`],['Celular contacto',s.CELULAR||'—']].map(([k,v])=>`<tr><td style="padding:7px 10px;border:1px solid #ddd;background:#f8f8f8;font-weight:600;width:40%">${k}</td><td style="padding:7px 10px;border:1px solid #ddd">${v}</td></tr>`).join('')}
    </table>
    <h3 style="margin-bottom:10px">Historial de Pagos — Total: $${total.toLocaleString('es-MX')}</h3>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead><tr>${['Mes','Monto','Inscripción','Descuento','Referencia','Fecha'].map(h=>`<th style="padding:7px;border:1px solid #ddd;background:#333;color:#fff;text-align:left">${h}</th>`).join('')}</tr></thead>
      <tbody>${ps.map(p=>`<tr>${[p.MES,'$'+(parseFloat(p.MONTO)||0).toLocaleString(),p.INSCRIPCION&&p.INSCRIPCION!=='nan'?'$'+p.INSCRIPCION:'—',p.DESCUENTO||'—',p.REFERENCIA||'—',p.FECHA_PAGO||'—'].map(v=>`<td style="padding:6px;border:1px solid #ddd">${v}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>
    <p style="margin-top:24px;font-size:11px;color:#888;text-align:center">Generado el ${new Date().toLocaleDateString('es-MX',{day:'numeric',month:'long',year:'numeric'})}</p>
  </div>`;
  div.style.display='block';
  window.print();
  setTimeout(()=>div.style.display='none',1000);
}

// ═══════════════════════════ IMPRIMIR RECIBO ═══════════════════════════
function imprimirRecibo(pago) {
  const div = document.getElementById('recibo-print');
  const totalPago = (parseFloat(pago.MONTO)||0) + (parseFloat(pago.INSCRIPCION)||0) + (parseFloat(pago.SEGURO)||0);
  const tieneInsc = pago.INSCRIPCION && pago.INSCRIPCION !== 'nan' && parseFloat(pago.INSCRIPCION) > 0;
  const tieneSeg  = pago.SEGURO && pago.SEGURO !== 'nan' && parseFloat(pago.SEGURO) > 0;
  const tieneDesc = pago.DESCUENTO && pago.DESCUENTO !== 'NO APLICA';
  const fechaLarga = new Date().toLocaleDateString('es-MX', {day:'numeric', month:'long', year:'numeric'});
  const folio = pago.REFERENCIA || '—';
  const registrador = pago.REGISTRADO_POR || sesionActual?.nombre || '—';

  div.innerHTML = `
  <style>
    @media print {
      body * { visibility: hidden !important; }
      #recibo-print, #recibo-print * { visibility: visible !important; }
      #recibo-print { position: fixed; top: 0; left: 0; width: 100%; }
    }
  </style>
  <div style="font-family:'Arial',sans-serif;max-width:520px;margin:0 auto;background:#fff;color:#1a1a1a;border:1px solid #ccc;border-radius:4px;overflow:hidden">

    <!-- HEADER UdeG -->
    <div style="background:#1a1a2e;padding:18px 24px;display:flex;align-items:center;gap:16px">
      <img src="data:image/png;base64,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CvlTZJZqjXWo6PTslbofksm5rJoiODmPYW69hBWM7UxW5Tg6SnYyphn0So/X+mxVAUt2eO0FbHp2sdr8CFE5R0c0kR9Jji0qVbPTrJWe5n81s6v/AIVPPOlkWO7MRfUbQ2aPopNebXt+qiim2b2+sr4qUUcDpixzt4A8tdFF6qy3SlgdPPSPZG3TUkjhx071RSSN7NEyX+qKCodcJJGsVW85xseFWbjrejsdGzn900/PiqwDtVatqG5aqNvdAz9lTXL3EM/oRmZ5XL5GHoserY77LcxUsi1kLmtaN7eBOvgFIJ42PjfFIwOY9paW+BUKuWW173vhpGR07Q4gO9J3cvjY8jqaWrL66omqGP8AS16x17CArC00itypuafqG2U0i0zc4cu6+B4MltUtpuJjJ34XkmJw7u4+I4L74ndKO2VkktXHK7eaA1zG67vHU/yXqyLIWXOjNKKANGu82R7ySPEAaaKOAdizWMdJGiPOHrKiCjuHbUTtSIuU2Jpc8wgbTFtDFJ0zuTpWaNb8Oahs8r5pnzSu3pJDvPd3nvXzI1XIVTIGx8GNcb1U3FyLMvHh4HZERXzUhERQEUIiKSQiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIBomgRFAPpDPPBqIZpIweYa7TVd6yrqazozUzySuY3dBcddAvgihGl/4qbR2epdPl4HUDRTG0ZVRx0kEFVBKx0bQ1z29YHTt05qIIrckLZEwpm2y71Fuc50K8n3vUkU92qJ4HOdHK7eaXN0OnuWSxC60lsqZ3VZcGyRgNIGvEHVYUjVcPCl8SPZpUs09wlp6r4lmNWVX03J4cxtDeTak/oH+qx1/yWhuFslpYo52ufpoXNGnPXvUVaFyRqrDKNrVybmq6tr6mJYnKmF2Oo4LP1OV3J8TYqdsNM0NA1a3ecdB3lYHTxTRZL2I7k0cNwqKXPZOVM8nPPifS7SiIqm7GJnVuEREQKuAiIiBECIikBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBF6Ll/+Rqv+8/8AzFedAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREARFYto/8AxNH/ANhn+UID/9k=" style="width:56px;height:56px;border-radius:50%;border:2px solid #d4a017;flex-shrink:0">
      <div>
        <div style="color:#d4a017;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Universidad de Guadalajara</div>
        <div style="color:#fff;font-size:17px;font-weight:700;margin:2px 0">Academias Deportivas CDU</div>
        <div style="color:#9aa0b4;font-size:11px">Comprobante de Pago</div>
      </div>
      <div style="margin-left:auto;text-align:right">
        <div style="background:#d4a017;color:#000;padding:4px 12px;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:1px">RECIBO</div>
        <div style="color:#9aa0b4;font-size:10px;margin-top:4px"># ${folio}</div>
      </div>
    </div>

    <!-- SOCIO INFO -->
    <div style="background:#f8f9fc;padding:14px 24px;border-bottom:2px solid #d4a017;display:flex;justify-content:space-between;align-items:center">
      <div>
        <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:1px">Socio</div>
        <div style="font-size:15px;font-weight:700;color:#1a1a2e">${pago.NOMBRE}</div>
        <div style="font-size:12px;color:#555;margin-top:2px">${pago.ACADEMIA} · ${pago.CATEGORIA}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:1px">N° Socio</div>
        <div style="font-size:22px;font-weight:700;color:#d4a017">#${pago.NS}</div>
      </div>
    </div>

    <!-- DETALLE DE PAGO -->
    <div style="padding:20px 24px">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #eee;color:#666;width:55%">Mes que cubre</td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;font-weight:600;text-align:right">${pago.MES}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #eee;color:#666">Mensualidad</td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;font-weight:600;text-align:right">$${(parseFloat(pago.MONTO)||0).toLocaleString('es-MX')}</td>
        </tr>
        ${tieneInsc ? `<tr>
          <td style="padding:8px 0;border-bottom:1px solid #eee;color:#666">Inscripción</td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;font-weight:600;text-align:right">$${(parseFloat(pago.INSCRIPCION)||0).toLocaleString('es-MX')}</td>
        </tr>` : ''}
        ${tieneSeg ? `<tr>
          <td style="padding:8px 0;border-bottom:1px solid #eee;color:#666">Seguro deportivo</td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;font-weight:600;text-align:right">$${(parseFloat(pago.SEGURO)||0).toLocaleString('es-MX')}</td>
        </tr>` : ''}
        ${tieneDesc ? `<tr>
          <td style="padding:8px 0;border-bottom:1px solid #eee;color:#666">Descuento</td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;font-weight:600;text-align:right;color:#2ecc71">${pago.DESCUENTO}</td>
        </tr>` : ''}
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #eee;color:#666">Fecha de pago</td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;font-weight:600;text-align:right">${pago.FECHA_PAGO || hoy()}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#666">Atendió</td>
          <td style="padding:8px 0;font-weight:600;text-align:right">${registrador}</td>
        </tr>
      </table>

      <!-- TOTAL -->
      <div style="background:#1a1a2e;border-radius:6px;padding:14px 18px;margin-top:16px;display:flex;justify-content:space-between;align-items:center">
        <div style="color:#9aa0b4;font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:700">Total Pagado</div>
        <div style="color:#d4a017;font-size:22px;font-weight:700">$${totalPago.toLocaleString('es-MX', {minimumFractionDigits:2})}</div>
      </div>
    </div>

    <!-- FOOTER -->
    <div style="background:#f8f9fc;border-top:1px solid #eee;padding:12px 24px;text-align:center">
      <div style="font-size:10px;color:#aaa;margin-bottom:3px">Este documento es comprobante oficial de pago</div>
      <div style="font-size:10px;color:#888">${fechaLarga} · Folio: ${folio}</div>
    </div>

  </div>`;

  div.style.display = 'block';
  window.print();
  setTimeout(() => div.style.display = 'none', 1500);
}

// ═══════════════════════════ LOCKERS ═══════════════════════════
function switchLockerTab(g){
  lockerTab=g;
  document.querySelectorAll('.ltab').forEach(el=>el.classList.remove('active'));
  document.getElementById('ltab-'+g).classList.add('active');
  renderLockers();
}

function renderLockers(){
  const q=(document.getElementById('locker-search')?.value||'').toLowerCase();
  const est=document.getElementById('f-locker-est')?.value||'';
  const lista=lockers.filter(l=>{
    if(l.GENERO!==lockerTab) return false;
    if(est && l.ESTATUS!==est) return false;
    if(q && !l.NL.includes(q) && !l.NOMBRE.toLowerCase().includes(q) && !l.NS.includes(q)) return false;
    return true;
  });
  const libres=lista.filter(l=>l.ESTATUS==='LIBRE').length;
  const ocupados=lista.filter(l=>l.ESTATUS==='OCUPADO').length;
  document.getElementById('lockers-stat-lbl').textContent=`${lockerTab==='H'?'Hombres':'Mujeres'} · ${ocupados} ocupados · ${libres} libres`;
  document.getElementById('lockers-grid').innerHTML=`<div class="locker-grid">${lista.map(l=>`
    <div class="locker-box ${l.ESTATUS==='OCUPADO'?'ocupado':'libre'}" onclick="abrirModalLocker('${l.NL}','${l.GENERO}')">
      <div class="ln">${l.NL}</div>
      <div class="ls">${l.ESTATUS==='OCUPADO'?'OCUPADO':'LIBRE'}</div>
      ${l.NOMBRE?`<div class="ln-name">${l.NOMBRE}</div>`:''}
    </div>`).join('')}</div>`;
}

function abrirModalLocker(nl, genero=lockerTab) {
  const l=nl?lockers.find(x=>x.NL===nl&&x.GENERO===genero):null;
  const titulo=l?`Locker N° ${l.NL} — ${genero==='H'?'Hombres':'Mujeres'}`:`Asignar Nuevo Locker`;
  document.getElementById('mo-locker-title').textContent=titulo;
  document.getElementById('mo-locker-body').innerHTML=`
    <div class="fgrid">
      <div class="fg"><label>N° Locker *</label><input type="text" id="lk-nl" placeholder="Número de locker" value="${l?.NL||''}"></div>
      <div class="fg"><label>Género</label>
        <select class="fs" id="lk-genero"><option value="H" ${genero==='H'?'selected':''}>Hombres</option><option value="M" ${genero==='M'?'selected':''}>Mujeres</option></select>
      </div>
      <div class="fg"><label>N° Socio</label><input type="text" id="lk-ns" placeholder="Número de socio" value="${l?.NS||''}" oninput="autoFillLocker()"></div>
      <div class="fg"><label>Nombre</label><input type="text" id="lk-nombre" placeholder="Nombre del asignatario" value="${l?.NOMBRE||''}"></div>
      <div class="fg"><label>Estatus</label>
        <select class="fs" id="lk-estatus"><option value="OCUPADO" ${l?.ESTATUS==='OCUPADO'?'selected':''}>OCUPADO</option><option value="LIBRE" ${!l||l.ESTATUS==='LIBRE'?'selected':''}>LIBRE</option></select>
      </div>
      <div class="fg"><label>Mes Inicio de Renta</label><input type="text" id="lk-mes" placeholder="Ej. ENERO" value="${l?.MES_INICIO||''}"></div>
      <div class="fg"><label>Fecha Pago 1</label><input type="date" id="lk-fecha" value="${l?.FECHA_PAGO1||''}"></div>
    </div>`;
  document.getElementById('mo-locker-footer').innerHTML=`
    <button class="btn btn-ghost" onclick="cerrarMo('mo-locker')">Cancelar</button>
    ${l?`<button class="btn btn-red" onclick="liberarLocker('${l.NL}','${l.GENERO}')">🔓 Liberar</button>`:''}
    <button class="btn btn-gold" onclick="guardarLocker('${l?.NL||''}','${l?.GENERO||''}')">💾 Guardar</button>`;
  document.getElementById('mo-locker').style.display='flex';
  lockerEdit=l;
}

function autoFillLocker(){
  const ns=document.getElementById('lk-ns').value.trim();
  const s=socios.find(x=>x.NS===ns);
  if(s) document.getElementById('lk-nombre').value=s.NOMBRE;
}

function guardarLocker(oldNL, oldG){
  const nl=document.getElementById('lk-nl').value.trim();
  const genero=document.getElementById('lk-genero').value;
  const ns=document.getElementById('lk-ns').value.trim();
  const nombre=document.getElementById('lk-nombre').value.trim();
  const estatus=document.getElementById('lk-estatus').value;
  const mes=document.getElementById('lk-mes').value.trim();
  const fecha=document.getElementById('lk-fecha').value;
  if(!nl){alert('El número de locker es obligatorio');return;}
  const existing=lockers.findIndex(x=>x.NL===oldNL&&x.GENERO===oldG);
  const obj={NC:nl,NL:nl,NS:ns,NOMBRE:nombre,ESTATUS:estatus,MES_INICIO:mes,FECHA_PAGO1:fecha,GENERO:genero};
  if(existing>=0) lockers[existing]=obj;
  else lockers.push(obj);
  guardarTodoLocal(); // persist to localStorage immediately
  cerrarMo('mo-locker');
  if(document.getElementById('view-lockers')?.classList.contains('active')) renderLockers();
  registrarLog('locker', `Locker ${nl} (${genero==='H'?'Hombres':'Mujeres'}) actualizado`, ns||'');
}

function liberarLocker(nl,genero){
  const idx=lockers.findIndex(x=>x.NL===nl&&x.GENERO===genero);
  if(idx>=0){lockers[idx].ESTATUS='LIBRE';lockers[idx].NS='';lockers[idx].NOMBRE='';lockers[idx].MES_INICIO='';lockers[idx].FECHA_PAGO1='';}
  guardarTodoLocal(); // persist to localStorage immediately
  cerrarMo('mo-locker');renderLockers();
}

// ═══════════════════════════ EXPORT ═══════════════════════════
function exportarCSV(){
  if(!puedeHacer('exportar')){ alert('⛔ Solo el Administrador puede exportar la base de datos.'); return; }
  const hdrs=['NS','NOMBRE','FECHA_NAC','CONTACTO_EMERGENCIA','CELULAR','PARENTESCO','TIPO_SANGRE','ACADEMIA','CATEGORIA','VENCIMIENTO','ACTIVO'];
  const rows=socios.map(s=>hdrs.map(h=>`"${(s[h]||'').toString().replace(/"/g,'""')}"`).join(','));
  const csv=[hdrs.join(','),...rows].join('\n');
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}));
  a.download='socios_cdu.csv';a.click();
}

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

