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

