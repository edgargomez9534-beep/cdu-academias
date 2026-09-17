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

