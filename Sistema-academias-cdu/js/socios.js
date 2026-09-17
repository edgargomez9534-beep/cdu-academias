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

