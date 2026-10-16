/* checkout.js — Resumen -> Carrito -> Pagos (app Android, Ventas Pro III) */
(function () {
  'use strict';

  var C = window.Capacitor;
  if (!(C && typeof C.isNativePlatform === 'function' && C.isNativePlatform())) return;

  var FORMAS = [
    { f: 'Efectivo', t: 'Efectivo', i: '<rect x="2" y="6" width="20" height="12" rx="1.5"/><circle cx="12" cy="12" r="3"/><path d="M5 9v6M19 9v6"/>' },
    { f: 'Tarjeta débito', t: 'Tarjeta débito', i: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 14h20M6 9h3"/>' },
    { f: 'Tarjeta crédito', t: 'Tarjeta crédito', i: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 9h20"/><circle cx="16" cy="15" r="1.5"/><circle cx="18.5" cy="15" r="1.5"/>' },
    { f: 'Transferencia', t: 'Transferencia', i: '<path d="M3 10l9-6 9 6M5 10v8M19 10v8M9 10v8M15 10v8M3 20h18"/>' },
    { f: 'Crédito (debe)', t: 'Crédito (debe)', i: '<circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.5 2.7-6 6-6"/><rect x="13" y="13" width="8" height="7" rx="1"/><path d="M17 15v3"/>' },
    { f: 'OTROS', t: 'Otros', i: '<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="16" cy="12" r="1"/>' }
  ];
  var OTRAS = ['Cheque', 'Cobra vendedor'];

  function ped() { return (typeof pedidoV2 !== 'undefined') ? pedidoV2 : null; }
  function prods() { return ((typeof productos !== 'undefined') ? productos : []) || []; }

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

  function refrescar() {
    try { if (typeof renderProductosAgregados === 'function') renderProductosAgregados(); } catch (e) {}
    try { if (typeof recalcularTotal === 'function') recalcularTotal(); } catch (e) {}
  }

  function items() {
    var p = ped(), n = 0;
    if (p && p.productos) Object.keys(p.productos).forEach(function (k) { n += p.productos[k] || 0; });
    return n;
  }

  var css =
    '.kc-pant{position:fixed;inset:0;z-index:2147481000;display:none;flex-direction:column;background:#161a23;color:#e9ecf3;font-family:system-ui,sans-serif}' +
    '.kc-top{display:flex;align-items:center;gap:8px;padding:12px;border-bottom:1px solid #262b38}' +
    '.kc-top h2{margin:0 0 0 4px;font-size:22px;font-weight:600}' +
    '.kc-volver{width:44px;height:42px;border:0;background:transparent;color:#e9ecf3;font-size:26px}' +
    '.kc-cuerpo{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch}' +
    '.kc-fila{display:flex;align-items:center;gap:10px;padding:14px;border-bottom:1px solid #262b38}' +
    '.kc-cant{font-size:22px;font-weight:700;min-width:44px}.kc-cant small{font-size:15px;color:#8a93a6;font-weight:400}' +
    '.kc-info{flex:1;min-width:0}.kc-nombre{font-size:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.kc-precio{font-size:14px;color:#8a93a6;margin-top:2px}.kc-sub{font-size:18px;font-weight:600;white-space:nowrap}' +
    '.kc-btn{width:40px;height:40px;border-radius:10px;border:1px solid #3a4152;background:#1f2431;color:#e9ecf3;font-size:22px;line-height:1}' +
    '.kc-btn.menos{color:#ff6b6b}.kc-btn.mas{color:#2ecc9a}' +
    '.kc-resumen{padding:16px;text-align:right}' +
    '.kc-desc{border:0;background:transparent;color:#2ecc9a;font:500 19px system-ui,sans-serif;padding:4px 0}' +
    '.kc-linea{color:#8a93a6;font-size:16px;margin-top:8px}' +
    '.kc-total{font-size:22px;font-weight:700;margin-top:10px}' +
    '.kc-pie{padding:12px;border-top:1px solid #262b38;display:flex;flex-direction:column;gap:10px}' +
    '.kc-verde{width:100%;border:0;border-radius:12px;background:#2ecc9a;color:#fff;font:600 21px system-ui,sans-serif;padding:16px;position:relative}' +
    '.kc-verde span{position:absolute;right:18px}' +
    '.kc-verde:disabled{opacity:.45}' +
    '.kc-borde{width:100%;border:2px solid #3a4152;border-radius:12px;background:transparent;color:#c3c9d6;font:600 20px system-ui,sans-serif;padding:13px}' +
    '.kp-monto{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;padding:20px}' +
    '.kp-monto b{font-size:52px;font-weight:300;letter-spacing:-1px}.kp-monto b small{font-size:24px;vertical-align:top;margin-right:6px}' +
    '.kp-cliente{border:2px solid #3a4152;border-radius:10px;background:transparent;color:#e9ecf3;font:500 18px system-ui,sans-serif;padding:10px 16px}' +
    '.kp-cliente.si{border-color:#2ecc9a;color:#2ecc9a}' +
    '.kp-grilla{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid #262b38}' +
    '.kp-forma{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;min-height:104px;border:0;border-right:1px solid #262b38;border-bottom:1px solid #262b38;background:transparent;color:#c3c9d6;font:500 15px system-ui,sans-serif;padding:8px 4px}' +
    '.kp-forma:nth-child(3n){border-right:0}' +
    '.kp-forma svg{width:42px;height:42px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}' +
    '.kp-forma.on{color:#2ecc9a;background:rgba(46,204,154,.08)}' +
    '#kc-otros{position:absolute;left:0;right:0;bottom:0;background:#1f2431;border-radius:16px 16px 0 0;padding:12px;display:none;box-shadow:0 -6px 24px rgba(0,0,0,.4)}' +
    '#kc-otros button{display:block;width:100%;margin:6px 0;border:1px solid #3a4152;border-radius:10px;background:#161a23;color:#e9ecf3;font:500 18px system-ui,sans-serif;padding:14px}' +
    '#btn-carrito-ico{margin-right:8px}';
  var st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  function pantalla(id, titulo, cuerpo, pie) {
    var el = document.getElementById(id);
    if (el) return el;
    el = document.createElement('div');
    el.id = id;
    el.className = 'kc-pant';
    el.innerHTML =
      '<div class="kc-top"><button type="button" class="kc-volver" aria-label="Volver">&#8592;</button><h2>' + titulo + '</h2></div>' +
      '<div class="kc-cuerpo">' + cuerpo + '</div>' +
      '<div class="kc-pie">' + pie + '</div>';
    document.body.appendChild(el);
    return el;
  }

  function construirCarrito() {
    var el = pantalla('kc-carrito', 'Carrito',
      '<div id="kc-lista"></div><div class="kc-resumen">' +
        '<button type="button" class="kc-desc" id="kc-btn-desc">Dar descuento</button>' +
        '<div class="kc-linea" id="kc-linea-desc"></div>' +
        '<div class="kc-total" id="kc-total"></div></div>',
      '<button type="button" class="kc-verde" id="kc-ir-pagos"></button>');
    if (el.dataset.listo) return el;
    el.dataset.listo = '1';
    el.querySelector('.kc-volver').addEventListener('click', function () { mostrar(null); });
    document.getElementById('kc-ir-pagos').addEventListener('click', function () { if (items()) abrirPagos(); });
    document.getElementById('kc-btn-desc').addEventListener('click', function () {
      var actual = (ped() && ped().descuento) || 0;
      var v = prompt('Descuento en pesos (0 para quitarlo):', actual || '');
      if (v === null) return;
      var n = Math.max(0, parseInt(String(v).replace(/\D/g, ''), 10) || 0);
      var inp = document.getElementById('ped-descuento');
      if (inp) inp.value = n || '';
      refrescar();
      pintarCarrito();
    });
    document.getElementById('kc-lista').addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('.kc-btn');
      if (!b) return;
      var pid = b.getAttribute('data-pid'), p = ped();
      if (!p) return;
      if (b.classList.contains('mas')) {
        if (typeof agregarProductoPedido === 'function') agregarProductoPedido(pid);
        else p.productos[pid] = (p.productos[pid] || 0) + 1;
      } else {
        var q = (p.productos[pid] || 0) - 1;
        if (q > 0) p.productos[pid] = q; else delete p.productos[pid];
      }
      refrescar();
      pintarCarrito();
    });
    return el;
  }

  function pintarCarrito() {
    var p = ped(), html = '', subtotal = 0;
    if (p && p.productos) Object.keys(p.productos).forEach(function (pid) {
      var q = p.productos[pid];
      if (!q) return;
      var pr = prods().find(function (x) { return String(x.id) === String(pid); }) || { nombre: 'Producto', precio: 0 };
      subtotal += (Number(pr.precio) || 0) * q;
      html += '<div class="kc-fila"><div class="kc-cant">' + q + ' <small>x</small></div>' +
        '<div class="kc-info"><div class="kc-nombre">' + esc(pr.nombre) + '</div><div class="kc-precio">' + dinero(pr.precio) + '</div></div>' +
        '<div class="kc-sub">' + dinero((Number(pr.precio) || 0) * q) + '</div>' +
        '<button type="button" class="kc-btn menos" data-pid="' + esc(pid) + '" aria-label="Quitar uno">&minus;</button>' +
        '<button type="button" class="kc-btn mas" data-pid="' + esc(pid) + '" aria-label="Agregar uno">+</button></div>';
    });
    document.getElementById('kc-lista').innerHTML = html ||
      '<div style="padding:30px 16px;text-align:center;color:#8a93a6;font-size:16px">El carrito está vacío</div>';
    var desc = (p && p.descuento) || 0;
    document.getElementById('kc-linea-desc').textContent = desc ? 'Subtotal ' + dinero(subtotal) + '   ·   Descuento − ' + dinero(desc) : '';
    document.getElementById('kc-btn-desc').textContent = desc ? 'Cambiar descuento' : 'Dar descuento';
    var total = (p && typeof p.total === 'number') ? p.total : subtotal;
    document.getElementById('kc-total').textContent = 'TOTAL: ' + dinero(total);
    var n = items(), b = document.getElementById('kc-ir-pagos');
    b.innerHTML = n ? n + (n === 1 ? ' item' : ' items') + ' = ' + dinero(total) + '<span>&#8250;</span>' : 'Carrito vacío';
    b.disabled = !n;
  }

  function construirPagos() {
    var grilla = FORMAS.map(function (x) {
      return '<button type="button" class="kp-forma" data-forma="' + esc(x.f) + '"><svg viewBox="0 0 24 24">' + x.i + '</svg>' + esc(x.t) + '</button>';
    }).join('');
    var el = pantalla('kc-pagos', 'Pagos',
      '<div style="display:flex;flex-direction:column;min-height:100%">' +
        '<div class="kp-monto"><b id="kp-total"></b><button type="button" class="kp-cliente" id="kp-cliente"></button></div>' +
        '<div class="kp-grilla">' + grilla + '</div></div>' +
        '<div id="kc-otros">' + OTRAS.map(function (o) { return '<button type="button" data-forma="' + esc(o) + '">' + esc(o) + '</button>'; }).join('') + '</div>',
      '<button type="button" class="kc-borde" id="kp-guardar">Guardar pedido</button>' +
      '<button type="button" class="kc-verde" id="kp-avanzar">Avanzar<span>&#8250;</span></button>');
    if (el.dataset.listo) return el;
    el.dataset.listo = '1';
    el.querySelector('.kc-volver').addEventListener('click', function () { mostrar('kc-carrito'); pintarCarrito(); });
    el.querySelector('.kp-grilla').addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('.kp-forma');
      if (!b) return;
      var f = b.getAttribute('data-forma');
      if (f === 'OTROS') { document.getElementById('kc-otros').style.display = 'block'; return; }
      elegirForma(f);
    });
    document.getElementById('kc-otros').addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('button');
      if (b) { elegirForma(b.getAttribute('data-forma')); this.style.display = 'none'; }
    });
    document.getElementById('kp-cliente').addEventListener('click', elegirCliente);
    document.getElementById('kp-guardar').addEventListener('click', function () { guardar(false); });
    document.getElementById('kp-avanzar').addEventListener('click', function () { guardar(true); });
    return el;
  }

  function elegirForma(f) {
    try { if (typeof seleccionarPago === 'function') seleccionarPago(f); else ped().formaPago = f; } catch (e) { ped().formaPago = f; }
    pintarPagos();
  }

  function pintarPagos() {
    var p = ped() || {};
    document.getElementById('kp-total').innerHTML = '<small>$</small>' + dinero(p.total).replace('$ ', '');
    var cli = p.clienteNombre && p.clienteNombre !== 'Venta directa' ? p.clienteNombre : '';
    var bc = document.getElementById('kp-cliente');
    bc.innerHTML = cli ? '&#10003; ' + esc(cli) : '+ Incluir un cliente';
    bc.classList.toggle('si', !!cli);
    var forma = p.formaPago || '';
    document.querySelectorAll('#kc-pagos .kp-forma').forEach(function (b) {
      var f = b.getAttribute('data-forma');
      b.classList.toggle('on', f === forma || (f === 'OTROS' && OTRAS.indexOf(forma) !== -1));
    });
    document.getElementById('kp-avanzar').disabled = !forma;
  }

  function elegirCliente() {
    if (typeof showClientePicker !== 'function') return;
    mostrar(null);
    showClientePicker();
    var n = 0, t = setInterval(function () {
      if (document.querySelector('[id^="modal-"].open') && ++n < 1200) return;
      clearInterval(t);
      abrirPagos();
    }, 300);
  }

  function guardar(conPago) {
    var p = ped();
    if (!p) return;
    if (conPago && !p.formaPago) return;
    if (!conPago) p.formaPago = p.formaPago || '';
    mostrar(null);
    try {
      if (typeof crearPedidoFinal === 'function') {
        var r = crearPedidoFinal();
        if (r && typeof r.catch === 'function') r.catch(function (e) { alert('No se pudo guardar: ' + e.message); abrirPagos(); });
      }
    } catch (e) {
      alert('No se pudo guardar: ' + e.message);
      abrirPagos();
    }
  }

  function mostrar(id) {
    ['kc-carrito', 'kc-pagos'].forEach(function (x) {
      var el = document.getElementById(x);
      if (el) el.style.display = x === id ? 'flex' : 'none';
    });
  }

  function abrirCarrito() { construirCarrito(); refrescar(); pintarCarrito(); mostrar('kc-carrito'); }
  function abrirPagos() { construirPagos(); refrescar(); pintarPagos(); mostrar('kc-pagos'); }

  function relabel() {
    var pag = document.getElementById('page-pedido-items');
    var b = pag && pag.querySelector('.fab-save');
    if (b && !b.dataset.carrito) {
      b.dataset.carrito = '1';
      b.innerHTML = '<span id="btn-carrito-ico">&#128722;</span>Carrito';
    }
  }
  relabel();
  setInterval(relabel, 1000);

  window.addEventListener('click', function (e) {
    var b = e.target && e.target.closest && e.target.closest('#page-pedido-items .fab-save');
    if (!b) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    abrirCarrito();
  }, true);

  window.KyteCheckout = { carrito: abrirCarrito, pagos: abrirPagos, cerrar: function () { mostrar(null); } };
})();
