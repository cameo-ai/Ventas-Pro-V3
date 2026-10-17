/* menu-lateral.js — Menú lateral estilo Kyte (oscuro, acentos naranjos) para el celular */
(function () {
  'use strict';

  var NARANJA = '#f97316';
  var ITEMS = [
    { t: 'Inicio', i: 'fa-house', p: 'inicio' },
    { t: 'Vender', i: 'fa-circle-check', a: 'vender' },
    { t: 'Pedidos', i: 'fa-bag-shopping', p: 'pedidos', badge: true },
    { t: 'Productos', i: 'fa-cube', p: 'productos' },
    { t: 'Ingreso productos', i: 'fa-barcode', a: 'ingreso' },
    { t: 'Clientes', i: 'fa-users', p: 'clientes' },
    { t: 'Ingresos', i: 'fa-piggy-bank', p: 'ingresos' },
    { t: 'Gastos', i: 'fa-credit-card', p: 'gastos' },
    { t: 'Informes', i: 'fa-chart-column', p: 'informes' },
    { t: 'Catálogo', i: 'fa-book-open', p: 'catalogo' },
    { t: 'Ajustes', i: 'fa-gear', p: 'ajustes' }
  ];
  var actual = 'inicio';

  var css =
    '#ml-btn{display:none;width:42px;height:42px;border:0;border-radius:10px;background:transparent;color:#e9ecf3;font-size:24px;margin-right:6px;flex:0 0 auto}' +
    '@media (max-width:900px){#ml-btn{display:flex;align-items:center;justify-content:center}}' +
    '#ml-fondo{position:fixed;inset:0;z-index:2147470000;background:rgba(0,0,0,.55);opacity:0;pointer-events:none;transition:opacity .2s}' +
    '#ml-fondo.on{opacity:1;pointer-events:auto}' +
    '#ml{position:fixed;top:0;bottom:0;left:0;width:78%;max-width:340px;z-index:2147470001;background:#1b2030;color:#e9ecf3;' +
      'transform:translateX(-102%);transition:transform .22s ease;display:flex;flex-direction:column;font-family:system-ui,sans-serif;box-shadow:4px 0 24px rgba(0,0,0,.4)}' +
    '#ml.on{transform:translateX(0)}' +
    '#ml-cab{padding:26px 22px 20px;border-bottom:1px solid #2a3142}' +
    '#ml-cab b{display:block;font-size:24px;font-weight:700}#ml-cab small{display:block;margin-top:6px;color:#8a93a6;font-size:15px}' +
    '#ml-lista{flex:1;overflow-y:auto;padding:6px 0}' +
    '.ml-item{display:flex;align-items:center;gap:18px;width:100%;border:0;background:transparent;color:#e9ecf3;font:500 19px system-ui,sans-serif;padding:15px 22px;text-align:left;position:relative}' +
    '.ml-item i{width:26px;text-align:center;font-size:20px;color:#aab2c3}' +
    '.ml-item.on{background:#262d3d}.ml-item.on::before{content:"";position:absolute;left:0;top:8px;bottom:8px;width:4px;border-radius:0 4px 4px 0;background:' + NARANJA + '}' +
    '.ml-item.on i{color:' + NARANJA + '}' +
    '.ml-badge{min-width:30px;height:24px;border-radius:12px;background:' + NARANJA + ';color:#fff;font:700 14px/24px system-ui;text-align:center;padding:0 7px;margin-left:-4px}' +
    '.ml-item .ml-badge+span{margin-left:-6px}';
  var st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  function nombreNegocio() {
    var el = document.querySelector('.logo-title-sm');
    return (el && el.textContent.trim()) || 'Mi Negocio';
  }

  function pendientes() {
    var l = (typeof pedidos !== 'undefined' && pedidos) || [];
    return l.filter(function (p) { return !/complet|entreg|pagad|anulad|cancel/i.test(String(p.estado || '')); }).length;
  }

  function construir() {
    if (document.getElementById('ml')) return;
    var fondo = document.createElement('div');
    fondo.id = 'ml-fondo';
    fondo.addEventListener('click', cerrar);
    var m = document.createElement('nav');
    m.id = 'ml';
    m.innerHTML = '<div id="ml-cab"><b id="ml-nom"></b><small>Ventas Pro</small></div><div id="ml-lista"></div>';
    document.body.appendChild(fondo);
    document.body.appendChild(m);
    document.getElementById('ml-lista').addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('.ml-item');
      if (b) elegir(ITEMS[+b.getAttribute('data-i')]);
    });
  }

  function pintar() {
    document.getElementById('ml-nom').textContent = nombreNegocio();
    var n = pendientes();
    document.getElementById('ml-lista').innerHTML = ITEMS.map(function (it, k) {
      var activo = it.p && it.p === actual;
      var ico = it.badge ? '<span class="ml-badge">' + n + '</span>' : '<i class="fa-solid ' + it.i + '"></i>';
      return '<button type="button" class="ml-item' + (activo ? ' on' : '') + '" data-i="' + k + '">' + ico + '<span>' + it.t + '</span></button>';
    }).join('');
  }

  function abrir() {
    construir();
    pintar();
    document.getElementById('ml').classList.add('on');
    document.getElementById('ml-fondo').classList.add('on');
    try { history.pushState({ ml: true }, ''); } catch (e) {}
  }

  function cerrar(sinHistorial) {
    var m = document.getElementById('ml');
    if (!m || !m.classList.contains('on')) return;
    m.classList.remove('on');
    document.getElementById('ml-fondo').classList.remove('on');
    if (sinHistorial !== true) { try { if (history.state && history.state.ml) history.back(); } catch (e) {} }
  }

  function elegir(it) {
    cerrar();
    setTimeout(function () {
      ['kc-carrito', 'kc-pagos', 'ip-lista', 'ip-form'].forEach(function (id) {
        var el = document.getElementById(id); if (el) el.style.display = 'none';
      });
      try { if (window.KyteScanner) window.KyteScanner.cerrar(false); } catch (e) {}
      if (it.a === 'vender') {
        var v = document.getElementById('btn-ventas-rapidas');
        if (v) v.click(); else if (typeof window.navigate === 'function') window.navigate('nuevo-pedido');
      } else if (it.a === 'ingreso') {
        if (window.IngresoProductos) window.IngresoProductos.abrir();
      } else if (typeof window.navigate === 'function') {
        window.navigate(it.p);
      }
    }, 180);
  }

  function ponerBoton() {
    var tl = document.querySelector('.topbar-left');
    if (!tl || document.getElementById('ml-btn')) return !!tl;
    var b = document.createElement('button');
    b.type = 'button';
    b.id = 'ml-btn';
    b.setAttribute('aria-label', 'Menú');
    b.innerHTML = '<i class="fa-solid fa-bars"></i>';
    b.addEventListener('click', abrir);
    tl.insertBefore(b, tl.firstChild);
    return true;
  }
  if (!ponerBoton()) { var n = 0, t = setInterval(function () { if (ponerBoton() || ++n > 40) clearInterval(t); }, 250); }

  var navPrevio = window.navigate;
  if (typeof navPrevio === 'function') {
    window.navigate = function (p) { actual = p; return navPrevio.apply(this, arguments); };
  }
  window.addEventListener('popstate', function () { cerrar(true); });

  window.MenuLateral = { abrir: abrir, cerrar: cerrar };
})();
