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



// Save to localStorage when browser/tab closes
window.addEventListener('beforeunload', () => {
  guardarTodoLocal();
});

