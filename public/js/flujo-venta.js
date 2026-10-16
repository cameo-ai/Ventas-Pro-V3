/* flujo-venta.js — Inicio (Ventas) -> Escáner -> Resumen, en la app Android */
(function () {
  'use strict';

  var C = window.Capacitor;
  if (!(C && typeof C.isNativePlatform === 'function' && C.isNativePlatform())) return;

  var OCULTAR = ['Servicios', 'Informaciones adicionales', 'Descuento', 'IVA'];

  var css =
    '.fv-oculto{display:none!important}' +
    '#btn-scanner-camara.fv-ancho{left:16px!important;right:16px!important;width:auto!important;' +
      'border-radius:30px!important;font-size:20px!important;padding:16px!important;text-align:center!important}' +
    '#page-pedido-items .subpage-body{padding-bottom:180px!important}';
  var s = document.createElement('style');
  s.textContent = css;
  document.head.appendChild(s);

  function pagina() { return document.getElementById('page-pedido-items'); }
  function enPedido() { var p = pagina(); return !!(p && p.classList.contains('active')); }

  function simplificar() {
    var p = pagina();
    if (!p) return;
    p.querySelectorAll('.form-field-group').forEach(function (g) {
      var l = g.querySelector('label');
      if (l && OCULTAR.indexOf(l.textContent.trim()) !== -1) g.classList.add('fv-oculto');
    });
    p.querySelectorAll('[onclick*="showProductoPicker"]').forEach(function (el) { el.classList.add('fv-oculto'); });
  }

  function botonGuardar() {
    var p = pagina();
    if (!p) return null;
    var bs = p.querySelectorAll('button');
    for (var i = 0; i < bs.length; i++) if (bs[i].textContent.trim() === 'Guardar') return bs[i];
    return null;
  }

  function ubicarEscanear() {
    var b = document.getElementById('btn-scanner-camara');
    if (!b) return;
    if (!enPedido()) { b.classList.remove('fv-ancho'); return; }
    simplificar();
    b.classList.add('fv-ancho');
    var g = botonGuardar();
    if (g) {
      var r = g.getBoundingClientRect();
      if (r.height) b.style.setProperty('bottom', (window.innerHeight - r.top + 12) + 'px', 'important');
    }
  }

  window.addEventListener('click', function (e) {
    var t = e.target && e.target.closest && e.target.closest('#btn-ventas-rapidas');
    if (!t) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (typeof window.navigate === 'function') window.navigate('nuevo-pedido');
    setTimeout(function () {
      ubicarEscanear();
      if (window.KyteScanner) window.KyteScanner.abrir();
    }, 350);
  }, true);

  var navPrevio = window.navigate;
  if (typeof navPrevio === 'function') {
    window.navigate = function () {
      var r = navPrevio.apply(this, arguments);
      setTimeout(ubicarEscanear, 50);
      return r;
    };
  }
  window.addEventListener('resize', ubicarEscanear);
  window.addEventListener('popstate', function () { setTimeout(ubicarEscanear, 80); });
  setInterval(ubicarEscanear, 1000);
  ubicarEscanear();
})();
