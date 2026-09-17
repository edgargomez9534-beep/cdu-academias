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

