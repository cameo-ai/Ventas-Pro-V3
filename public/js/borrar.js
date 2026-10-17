/* borrar.js — Botones de eliminar (tacho rojo) con confirmación propia (sin confirm() del sistema, que congela la app) */
(function () {
  'use strict';

  var st = document.createElement('style');
  st.textContent =
    '#bc-fondo{position:fixed;inset:0;z-index:2147483600;background:rgba(0,0,0,.6);display:none;align-items:center;justify-content:center;padding:24px}' +
    '#bc-caja{width:100%;max-width:340px;background:#1b2030;color:#e9ecf3;border-radius:16px;padding:22px;font-family:system-ui,sans-serif;box-shadow:0 10px 40px rgba(0,0,0,.5)}' +
    '#bc-caja p{margin:0 0 20px;font-size:19px;line-height:1.35}' +
    '#bc-botones{display:flex;gap:10px}' +
    '#bc-botones button{flex:1;border:0;border-radius:12px;padding:14px;font:600 18px system-ui,sans-serif}' +
    '#bc-no{background:#2a303d;color:#e9ecf3}#bc-si{background:#ef4444;color:#fff}';
  document.head.appendChild(st);

  var accion = null;
  function preguntar(texto, siAcepta) {
    var f = document.getElementById('bc-fondo');
    if (!f) {
      f = document.createElement('div');
      f.id = 'bc-fondo';
      f.innerHTML = '<div id="bc-caja"><p id="bc-txt"></p><div id="bc-botones"><button type="button" id="bc-no">Cancelar</button><button type="button" id="bc-si">Eliminar</button></div></div>';
      document.body.appendChild(f);
      document.getElementById('bc-no').addEventListener('click', function () { f.style.display = 'none'; accion = null; });
      document.getElementById('bc-si').addEventListener('click', function () { f.style.display = 'none'; var a = accion; accion = null; if (a) a(); });
    }
    document.getElementById('bc-txt').textContent = texto;
    accion = siAcepta;
    f.style.display = 'flex';
  }

  function aviso(msg, tipo) {
    try { if (typeof showToast === 'function') return showToast(msg, tipo || ''); } catch (e) {}
  }

  window.addEventListener('click', function (e) {
    if (e.target && e.target.closest && e.target.closest('#bc-fondo')) return;
    if (typeof document.elementsFromPoint !== 'function') return;
    var capas = document.elementsFromPoint(e.clientX, e.clientY);
    var btn = null;
    for (var i = 0; i < capas.length; i++) {
      var b = capas[i].closest && capas[i].closest('.btn-del');
      if (b) { btn = b; break; }
    }
    if (!btn) return;
    var m = String(btn.getAttribute('onclick') || '').match(/^\s*(\w+)\(\s*'([^']*)'\s*\)/);
    if (!m || typeof window[m[1]] !== 'function') return;
    e.preventDefault();
    e.stopImmediatePropagation();
    preguntar('¿Eliminar este registro?', function () {
      try {
        var r = window[m[1]](m[2]);
        if (r && typeof r.catch === 'function') r.catch(function (er) { aviso('No se pudo eliminar: ' + er.message, 'error'); });
      } catch (er) { aviso('No se pudo eliminar: ' + er.message, 'error'); }
    });
  }, true);
})();
