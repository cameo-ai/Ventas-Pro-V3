/* borrar.js — Hace funcionar los botones de eliminar (tacho rojo) aunque una capa invisible quede encima */
(function () {
  'use strict';
  window.addEventListener('click', function (e) {
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
    if (!confirm('¿Eliminar este registro?')) return;
    try {
      var r = window[m[1]](m[2]);
      if (r && typeof r.catch === 'function') r.catch(function (er) { alert('No se pudo eliminar: ' + er.message); });
    } catch (er) { alert('No se pudo eliminar: ' + er.message); }
  }, true);
})();
