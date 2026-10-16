/* kyte-vender.js — Pantalla "Vender" estilo Kyte (Ventas Pro III, app Android) */
(function () {
  'use strict';

  var C = window.Capacitor;
  if (!(C && typeof C.isNativePlatform === 'function' && C.isNativePlatform())) return;

  var MULTIPLOS = [1, 2, 3, 5, 10];
  var MAX_TILES = 300;

  var visible = false, categoria = 'TODOS', busqueda = '', multiplo = 1, modoLista = false;

  function datos() {
    return {
      ped: (typeof pedidoV2 !== 'undefined') ? pedidoV2 : null,
      prods: ((typeof productos !== 'undefined') ? productos : []) || []
    };
  }

  function dinero(n) {
    n = Math.round(Number(n) || 0);
    try { if (typeof fmtNum === 'function') return '$ ' + fmtNum(n); } catch (e) {}
    return '$ ' + n.toLocaleString('es-CL');
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function catDe(p) {
    var c = p.categoria || p.category || p.grupo || p.familia || '';
    return String(c).trim().toUpperCase();
  }

  function refrescarApp() {
    try { if (typeof renderProductosAgregados === 'function') renderProductosAgregados(); } catch (e) {}
    try { if (typeof recalcularTotal === 'function') recalcularTotal(); } catch (e) {}
  }

  function estilos() {
    if (document.getElementById('kv-css')) return;
    var css =
      '#kv{position:fixed;inset:0;z-index:2147482000;display:none;flex-direction:column;background:#12151d;color:#e9ecf3;font-family:system-ui,sans-serif}' +
      '#kv-top{display:flex;align-items:center;gap:8px;padding:10px 12px;background:#161a23;border-bottom:1px solid #262b38}' +
      '#kv-top h2{flex:1;margin:0 0 0 4px;font-size:21px;font-weight:600}' +
      '.kv-ico{min-width:44px;height:42px;border:0;border-radius:8px;background:transparent;color:#e9ecf3;font:600 16px system-ui,sans-serif;padding:0 8px}' +
      '#kv-volver{font-size:26px}' +
      '#kv-barra{display:flex;align-items:center;justify-content:space-between;padding:6px 10px;background:#161a23}' +
      '#kv-barra svg{width:28px;height:28px;stroke:#e9ecf3;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;display:block}' +
      '#kv-mult{border:2px solid #e9ecf3;border-radius:6px;min-width:52px;height:34px;font-size:17px}' +
      '#kv-buscar{display:none;padding:0 12px 8px;background:#161a23}' +
      '#kv-buscar input{width:100%;box-sizing:border-box;height:42px;border:1px solid #3a4152;border-radius:10px;background:#1f2431;color:#e9ecf3;font-size:17px;padding:0 12px}' +
      '#kv-tabs{display:flex;overflow-x:auto;background:#161a23;border-bottom:1px solid #262b38;scrollbar-width:none}' +
      '#kv-tabs::-webkit-scrollbar{display:none}' +
      '.kv-tab{flex:1 0 auto;min-width:40%;padding:13px 16px;border:0;border-bottom:3px solid transparent;background:transparent;color:#8a93a6;font:600 16px system-ui,sans-serif;letter-spacing:.5px}' +
      '.kv-tab.on{color:#2ecc9a;border-bottom-color:#2ecc9a}' +
      '#kv-grilla{flex:1;overflow-y:auto;padding:10px;display:grid;grid-template-columns:repeat(3,1fr);gap:10px;align-content:start;-webkit-overflow-scrolling:touch}' +
      '#kv-grilla.lista{grid-template-columns:1fr;gap:0;padding:0}' +
      '.kv-tile{position:relative;aspect-ratio:1/1.1;border-radius:8px;overflow:hidden;background:#3b4253;border:0;padding:0;color:#fff;text-align:left;display:flex;flex-direction:column}' +
      '.kv-foto{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;background:#4a5266;overflow:hidden}' +
      '.kv-foto img{width:100%;height:100%;object-fit:cover;display:block}' +
      '.kv-foto span{font-size:22px;font-weight:700;color:#c3c9d6;padding:4px;text-align:center;word-break:break-word}' +
      '.kv-pie{padding:6px 8px 8px;background:#3b4253}' +
      '.kv-nombre{font-size:15px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.kv-precio{font-size:15px;margin-top:2px}' +
      '.kv-badge{position:absolute;top:6px;right:6px;min-width:26px;height:26px;border-radius:13px;background:#f97316;color:#fff;font:700 14px/26px system-ui,sans-serif;text-align:center;padding:0 6px;box-sizing:border-box}' +
      '.kv-nuevo{aspect-ratio:1/1.1;border-radius:8px;border:2px dashed #3a4152;background:transparent;color:#8a93a6;font-size:54px;font-weight:300}' +
      '#kv-grilla.lista .kv-tile{aspect-ratio:auto;flex-direction:row;align-items:center;border-radius:0;background:#161a23;border-bottom:1px solid #262b38;min-height:64px}' +
      '#kv-grilla.lista .kv-foto{flex:0 0 52px;height:52px;margin:6px 10px;border-radius:6px}' +
      '#kv-grilla.lista .kv-foto span{font-size:14px}' +
      '#kv-grilla.lista .kv-pie{flex:1;background:transparent;display:flex;justify-content:space-between;gap:8px;padding-right:44px}' +
      '#kv-grilla.lista .kv-badge{top:50%;transform:translateY(-50%);right:10px}' +
      '#kv-grilla.lista .kv-nuevo{aspect-ratio:auto;height:56px;margin:10px;font-size:30px}' +
      '#kv-vacio{grid-column:1/-1;padding:30px 10px;text-align:center;color:#8a93a6;font-size:16px}' +
      '#kv-pieb{padding:12px;background:#12151d;border-top:1px solid #262b38}' +
      '#kv-total{width:100%;border:2px solid #2ecc9a;border-radius:12px;background:transparent;color:#2ecc9a;font:600 21px system-ui,sans-serif;padding:14px}' +
      '#kv-total.lleno{background:#2ecc9a;color:#fff}' +
      '#kv-toast{position:absolute;left:50%;bottom:92px;transform:translateX(-50%);background:rgba(0,0,0,.8);color:#fff;padding:8px 16px;border-radius:14px;font:600 15px system-ui,sans-serif;display:none;white-space:nowrap}';
    var s = document.createElement('style');
    s.id = 'kv-css';
    s.textContent = css;
    document.head.appendChild(s);
  }

  var SVG_BUSCAR = '<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/></svg>';
  var SVG_CODIGO = '<svg viewBox="0 0 24 24"><path d="M3 7V4h3M18 4h3v3M21 17v3h-3M6 20H3v-3"/><path d="M7 8v8M10 8v8M12.5 8v8M15 8v8M17 8v8"/></svg>';
  var SVG_LISTA = '<svg viewBox="0 0 24 24"><path d="M9 6h12M9 12h12M9 18h12"/><circle cx="4" cy="6" r="1.2"/><circle cx="4" cy="12" r="1.2"/><circle cx="4" cy="18" r="1.2"/></svg>';
  var SVG_GRILLA = '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>';

  function construir() {
    var v = document.getElementById('kv');
    if (v) return v;
    estilos();
    v = document.createElement('div');
    v.id = 'kv';
    v.innerHTML =
      '<div id="kv-top"><button type="button" id="kv-volver" class="kv-ico" aria-label="Volver al pedido">&#8592;</button><h2>Vender</h2></div>' +
      '<div id="kv-barra">' +
        '<button type="button" id="kv-btn-buscar" class="kv-ico" aria-label="Buscar">' + SVG_BUSCAR + '</button>' +
        '<button type="button" id="kv-btn-escanear" class="kv-ico" aria-label="Escanear">' + SVG_CODIGO + '</button>' +
        '<button type="button" id="kv-btn-vista" class="kv-ico" aria-label="Cambiar vista">' + SVG_LISTA + '</button>' +
        '<button type="button" id="kv-mult" class="kv-ico" aria-label="Cantidad por toque">1X</button>' +
      '</div>' +
      '<div id="kv-buscar"><input type="search" id="kv-q" placeholder="Buscar producto o código" autocomplete="off"></div>' +
      '<div id="kv-tabs"></div>' +
      '<div id="kv-grilla"></div>' +
      '<div id="kv-pieb"><button type="button" id="kv-total">Ningún ítem</button></div>' +
      '<div id="kv-toast"></div>';
    document.body.appendChild(v);

    document.getElementById('kv-volver').addEventListener('click', volverAlPedido);
    document.getElementById('kv-total').addEventListener('click', volverAlPedido);
    document.getElementById('kv-btn-escanear').addEventListener('click', function () {
      ocultar();
      if (window.KyteScanner) window.KyteScanner.abrir();
    });
    document.getElementById('kv-btn-buscar').addEventListener('click', function () {
      var caja = document.getElementById('kv-buscar');
      var abierta = caja.style.display === 'block';
      caja.style.display = abierta ? 'none' : 'block';
      if (abierta) { busqueda = ''; document.getElementById('kv-q').value = ''; pintarGrilla(); }
      else document.getElementById('kv-q').focus();
    });
    document.getElementById('kv-q').addEventListener('input', function (e) {
      busqueda = e.target.value.trim().toLowerCase();
      pintarGrilla();
    });
    document.getElementById('kv-btn-vista').addEventListener('click', function () {
      modoLista = !modoLista;
      this.innerHTML = modoLista ? SVG_GRILLA : SVG_LISTA;
      pintarGrilla();
    });
    document.getElementById('kv-mult').addEventListener('click', function () {
      multiplo = MULTIPLOS[(MULTIPLOS.indexOf(multiplo) + 1) % MULTIPLOS.length];
      this.textContent = multiplo + 'X';
    });
    document.getElementById('kv-tabs').addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('.kv-tab');
      if (!t) return;
      categoria = t.getAttribute('data-cat');
      pintarTabs();
      pintarGrilla();
    });

    var grilla = document.getElementById('kv-grilla');
    var timerLargo = null, largo = false;
    grilla.addEventListener('click', function (e) {
      if (largo) { largo = false; return; }
      if (e.target.closest('.kv-nuevo')) { registrarNuevo(); return; }
      var t = e.target.closest('.kv-tile');
      if (t) sumar(t.getAttribute('data-pid'), multiplo);
    });
    grilla.addEventListener('touchstart', function (e) {
      var t = e.target.closest && e.target.closest('.kv-tile');
      if (!t) return;
      largo = false;
      timerLargo = setTimeout(function () { largo = true; sumar(t.getAttribute('data-pid'), -1); }, 550);
    }, { passive: true });
    ['touchend', 'touchmove', 'touchcancel'].forEach(function (n) {
      grilla.addEventListener(n, function () { clearTimeout(timerLargo); }, { passive: true });
    });
    return v;
  }

  function toast(texto) {
    var t = document.getElementById('kv-toast');
    if (!t) return;
    t.textContent = texto;
    t.style.display = 'block';
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () { t.style.display = 'none'; }, 1300);
  }

  function pintarTabs() {
    var cats = {};
    datos().prods.forEach(function (p) { var c = catDe(p); if (c) cats[c] = 1; });
    var lista = ['TODOS'].concat(Object.keys(cats).sort());
    if (lista.indexOf(categoria) === -1) categoria = 'TODOS';
    var tabs = document.getElementById('kv-tabs');
    tabs.style.display = lista.length > 1 ? 'flex' : 'none';
    tabs.innerHTML = lista.map(function (c) {
      return '<button type="button" class="kv-tab' + (c === categoria ? ' on' : '') + '" data-cat="' + esc(c) + '">' + esc(c) + '</button>';
    }).join('');
  }

  function pintarGrilla() {
    var g = document.getElementById('kv-grilla');
    if (!g) return;
    g.className = modoLista ? 'lista' : '';
    var d = datos();
    var cant = (d.ped && d.ped.productos) || {};
    var q = busqueda;
    var lista = d.prods.filter(function (p) {
      if (categoria !== 'TODOS' && catDe(p) !== categoria) return false;
      if (!q) return true;
      return String(p.nombre || '').toLowerCase().indexOf(q) !== -1 ||
        String(p.barcode || '').indexOf(q) !== -1 || String(p.codigo || '').toLowerCase().indexOf(q) !== -1;
    });
    var html = lista.slice(0, MAX_TILES).map(function (p) {
      var n = cant[p.id] || 0;
      var foto = p.imagen
        ? '<img loading="lazy" alt="" src="' + esc(p.imagen) + '">'
        : '<span>' + esc(String(p.nombre || '').slice(0, 18)) + '</span>';
      return '<button type="button" class="kv-tile" data-pid="' + esc(p.id) + '">' +
        '<div class="kv-foto">' + foto + '</div>' +
        '<div class="kv-pie"><div class="kv-nombre">' + esc(p.nombre) + '</div><div class="kv-precio">' + dinero(p.precio) + '</div></div>' +
        (n ? '<div class="kv-badge">' + n + '</div>' : '') +
        '</button>';
    }).join('');
    if (!lista.length) html = '<div id="kv-vacio">' + (q ? 'Sin resultados para "' + esc(q) + '"' : 'No hay productos en esta categoría') + '</div>';
    if (lista.length > MAX_TILES) html += '<div id="kv-vacio">Mostrando ' + MAX_TILES + ' de ' + lista.length + '. Usa la lupa para buscar.</div>';
    html += '<button type="button" class="kv-nuevo" aria-label="Registrar producto nuevo">+</button>';
    g.innerHTML = html;
    pintarTotal();
  }

  function pintarTotal() {
    var b = document.getElementById('kv-total');
    if (!b) return;
    var d = datos();
    var items = 0;
    var cant = (d.ped && d.ped.productos) || {};
    Object.keys(cant).forEach(function (k) { items += cant[k] || 0; });
    if (!items) { b.textContent = 'Ningún ítem'; b.classList.remove('lleno'); return; }
    var monto = d.ped && typeof d.ped.total === 'number' ? d.ped.total : 0;
    b.textContent = items + (items === 1 ? ' item' : ' items') + ' = ' + dinero(monto);
    b.classList.add('lleno');
  }

  function sumar(pid, n) {
    var d = datos();
    if (!d.ped || !d.ped.productos || !pid) return;
    if (n > 0) {
      for (var i = 0; i < n; i++) {
        if (typeof agregarProductoPedido === 'function') agregarProductoPedido(pid);
        else d.ped.productos[pid] = (d.ped.productos[pid] || 0) + 1;
      }
    } else {
      var q = (d.ped.productos[pid] || 0) + n;
      if (!d.ped.productos[pid]) return;
      if (q > 0) d.ped.productos[pid] = q; else delete d.ped.productos[pid];
      toast('Quitado 1');
    }
    try { if (navigator.vibrate) navigator.vibrate(30); } catch (e) {}
    refrescarApp();
    pintarGrilla();
  }

  function registrarNuevo() {
    volverAlPedido();
    setTimeout(function () {
      try {
        if (typeof showProductoPicker === 'function') showProductoPicker();
        if (typeof switchPickerTab === 'function') switchPickerTab('registrar');
      } catch (e) {}
    }, 350);
  }

  function mostrar() {
    construir();
    pintarTabs();
    pintarGrilla();
    document.getElementById('kv').style.display = 'flex';
    visible = true;
    try { if (!(history.state && history.state.kyte)) history.pushState({ kyte: true }, ''); } catch (e) {}
  }

  function ocultar() {
    var v = document.getElementById('kv');
    if (v) v.style.display = 'none';
    visible = false;
  }

  function volverAlPedido() {
    ocultar();
    refrescarApp();
    try { if (history.state && history.state.kyte) history.back(); } catch (e) {}
  }

  window.addEventListener('popstate', function () {
    if (visible && !(history.state && history.state.kyte)) ocultar();
  });

  window.KyteVender = { mostrar: mostrar, ocultar: ocultar };
})();
