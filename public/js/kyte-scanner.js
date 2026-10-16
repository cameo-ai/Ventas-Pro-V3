/* kyte-scanner.js — Escaneo estilo Kyte dentro de la app Android (Ventas Pro III) */
(function () {
  'use strict';

  var FORMATOS = ['EAN_13', 'EAN_8', 'UPC_A', 'UPC_E'];
  var ESPERA_MISMO_CODIGO_MS = 1800;
  var ALTO_FRANJA_VH = 30;

  var abierto = false, arrancando = false;
  var ultimoCodigo = null, ultimoTiempo = 0;
  var zoom2x = false, mudo = false, audioCtx = null, avisoTimer = null;

  try { mudo = localStorage.getItem('kyte-mudo') === '1'; } catch (e) {}

  function log() {
    try { console.log.apply(console, ['[kyte]'].concat([].slice.call(arguments))); } catch (e) {}
  }

  function esApp() {
    var C = window.Capacitor;
    return !!(C && typeof C.isNativePlatform === 'function' && C.isNativePlatform());
  }

  function plugin() {
    var C = window.Capacitor;
    if (!C) return null;
    if (C.Plugins && C.Plugins.BarcodeScanner) return C.Plugins.BarcodeScanner;
    return typeof C.registerPlugin === 'function' ? C.registerPlugin('BarcodeScanner') : null;
  }

  function prepararAudio() {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!audioCtx) audioCtx = new AC();
      if (audioCtx.state === 'suspended') audioCtx.resume();
    } catch (e) {}
  }

  function beep() {
    if (mudo || !audioCtx) return;
    try {
      var t = audioCtx.currentTime;
      var o = audioCtx.createOscillator();
      var g = audioCtx.createGain();
      o.type = 'square';
      o.frequency.value = 2700;
      g.gain.setValueAtTime(0.3, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      o.connect(g);
      g.connect(audioCtx.destination);
      o.start(t);
      o.stop(t + 0.12);
    } catch (e) {}
  }

  function datosPedido() {
    var ped = (typeof pedidoV2 !== 'undefined') ? pedidoV2 : null;
    var prods = (typeof productos !== 'undefined') ? productos : [];
    return { ped: ped, prods: prods || [] };
  }

  function dinero(n) {
    n = Math.round(Number(n) || 0);
    try { if (typeof fmtNum === 'function') return '$ ' + fmtNum(n); } catch (e) {}
    return '$ ' + n.toLocaleString('es-CL');
  }

  function refrescarApp() {
    try { if (typeof renderProductosAgregados === 'function') renderProductosAgregados(); } catch (e) { log(e); }
    try { if (typeof recalcularTotal === 'function') recalcularTotal(); } catch (e) { log(e); }
  }

  function estilos() {
    if (document.getElementById('kyte-css')) return;
    var css =
      'html.kyte-on,html.kyte-on body{background:transparent!important}' +
      'body.kyte-on>*:not(#kyte){visibility:hidden!important}' +
      '#kyte{position:fixed;inset:0;z-index:2147483000;display:flex;flex-direction:column;font-family:system-ui,sans-serif;color:#e9ecf3}' +
      '#kyte-top{display:flex;align-items:center;gap:8px;padding:10px 12px;background:#161a23;border-bottom:1px solid #262b38}' +
      '#kyte-top h2{flex:1;margin:0 0 0 4px;font-size:21px;font-weight:600}' +
      '.kyte-ico{min-width:44px;height:40px;border:1px solid #3a4152;border-radius:8px;background:transparent;color:#e9ecf3;font:600 16px system-ui,sans-serif;padding:0 10px}' +
      '#kyte-volver{border:0;font-size:26px;min-width:40px;padding:0}' +
      '#kyte-franja{position:relative;height:' + ALTO_FRANJA_VH + 'vh;background:transparent;overflow:hidden}' +
      '#kyte-linea{position:absolute;left:0;right:0;top:50%;height:2px;background:#ff3b30;box-shadow:0 0 6px #ff3b30}' +
      '#kyte-flash{position:absolute;inset:0;background:rgba(46,204,154,.45);opacity:0;transition:opacity .3s}' +
      '#kyte-linterna{position:absolute;right:10px;top:10px;border:0;border-radius:18px;background:rgba(0,0,0,.6);color:#fff;font:600 14px system-ui,sans-serif;padding:8px 14px;display:none}' +
      '#kyte-aviso{position:absolute;left:50%;bottom:10px;transform:translateX(-50%);max-width:92%;padding:6px 14px;border-radius:14px;background:rgba(0,0,0,.65);color:#fff;font:600 14px system-ui,sans-serif;text-align:center;display:none}' +
      '#kyte-aviso.ok{background:rgba(39,174,96,.95)}#kyte-aviso.err{background:rgba(231,76,60,.95)}' +
      '#kyte-lista{flex:1;overflow-y:auto;background:#161a23;-webkit-overflow-scrolling:touch}' +
      '.kyte-fila{display:flex;align-items:center;gap:10px;padding:14px 14px;border-bottom:1px solid #262b38}' +
      '.kyte-cant{font-size:22px;font-weight:700;min-width:44px}.kyte-cant small{font-size:15px;color:#8a93a6;font-weight:400}' +
      '.kyte-info{flex:1;min-width:0}.kyte-nombre{font-size:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.kyte-precio{font-size:14px;color:#8a93a6;margin-top:2px}' +
      '.kyte-sub{font-size:18px;font-weight:600;white-space:nowrap}' +
      '.kyte-btn{width:40px;height:40px;border-radius:10px;border:1px solid #3a4152;background:#1f2431;color:#e9ecf3;font-size:22px;line-height:1}' +
      '.kyte-btn.menos{color:#ff6b6b}.kyte-btn.mas{color:#2ecc9a}' +
      '#kyte-vacio{padding:28px 16px;text-align:center;color:#8a93a6;font-size:16px}' +
      '#kyte-pie{padding:12px;background:#161a23;border-top:1px solid #262b38}' +
      '#kyte-total{width:100%;border:0;border-radius:12px;background:#2ecc9a;color:#fff;font:600 21px system-ui,sans-serif;padding:16px}';
    var s = document.createElement('style');
    s.id = 'kyte-css';
    s.textContent = css;
    document.head.appendChild(s);
  }

  function construir() {
    var k = document.getElementById('kyte');
    if (k) return k;
    estilos();
    k = document.createElement('div');
    k.id = 'kyte';
    k.innerHTML =
      '<div id="kyte-top">' +
        '<button type="button" id="kyte-volver" class="kyte-ico" aria-label="Volver">&#8592;</button>' +
        '<h2>Vender</h2>' +
        '<button type="button" id="kyte-mudo" class="kyte-ico" aria-label="Sonido"></button>' +
        '<button type="button" id="kyte-zoom" class="kyte-ico" aria-label="Zoom">1X</button>' +
      '</div>' +
      '<div id="kyte-franja"><div id="kyte-linea"></div><div id="kyte-flash"></div>' +
        '<button type="button" id="kyte-linterna">Linterna</button>' +
        '<div id="kyte-aviso"></div></div>' +
      '<div id="kyte-lista"></div>' +
      '<div id="kyte-pie"><button type="button" id="kyte-total">0 items = $ 0</button></div>';
    document.body.appendChild(k);

    document.getElementById('kyte-volver').addEventListener('click', function () { cerrar(true); });
    document.getElementById('kyte-total').addEventListener('click', function () { cerrar(true); });
    document.getElementById('kyte-mudo').addEventListener('click', function () {
      mudo = !mudo;
      try { localStorage.setItem('kyte-mudo', mudo ? '1' : '0'); } catch (e) {}
      pintarMudo();
    });
    document.getElementById('kyte-zoom').addEventListener('click', alternarZoom);
    document.getElementById('kyte-linterna').addEventListener('click', function () {
      var BS = plugin();
      if (BS) BS.toggleTorch().catch(function () {});
    });
    document.getElementById('kyte-lista').addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('.kyte-btn');
      if (!b) return;
      cambiarCantidad(b.getAttribute('data-pid'), b.classList.contains('mas') ? 1 : -1);
    });
    pintarMudo();
    return k;
  }

  function pintarMudo() {
    var b = document.getElementById('kyte-mudo');
    if (b) b.innerHTML = mudo ? '&#128263;' : '&#128266;';
  }

  function aviso(texto, tipo) {
    var el = document.getElementById('kyte-aviso');
    if (!el) return;
    el.textContent = texto;
    el.className = tipo || '';
    el.style.display = 'block';
    clearTimeout(avisoTimer);
    avisoTimer = setTimeout(function () { el.style.display = 'none'; }, 1800);
  }

  function flash() {
    var f = document.getElementById('kyte-flash');
    if (!f) return;
    f.style.opacity = '1';
    setTimeout(function () { f.style.opacity = '0'; }, 150);
  }

  function pintarLista() {
    var lista = document.getElementById('kyte-lista');
    var total = document.getElementById('kyte-total');
    if (!lista || !total) return;
    var d = datosPedido();
    var items = 0, html = '';
    var ids = d.ped && d.ped.productos ? Object.keys(d.ped.productos) : [];
    ids.forEach(function (pid) {
      var cant = d.ped.productos[pid];
      if (!cant) return;
      var p = d.prods.find(function (x) { return String(x.id) === String(pid); }) || { nombre: 'Producto', precio: 0 };
      items += cant;
      var nombre = String(p.nombre || 'Producto').replace(/[&<>"]/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
      });
      html +=
        '<div class="kyte-fila">' +
          '<div class="kyte-cant">' + cant + ' <small>x</small></div>' +
          '<div class="kyte-info"><div class="kyte-nombre">' + nombre + '</div>' +
            '<div class="kyte-precio">' + dinero(p.precio) + '</div></div>' +
          '<div class="kyte-sub">' + dinero((Number(p.precio) || 0) * cant) + '</div>' +
          '<button type="button" class="kyte-btn menos" data-pid="' + pid + '" aria-label="Quitar uno">&minus;</button>' +
          '<button type="button" class="kyte-btn mas" data-pid="' + pid + '" aria-label="Agregar uno">+</button>' +
        '</div>';
    });
    lista.innerHTML = html || '<div id="kyte-vacio">Apunta el código de barras a la línea roja</div>';
    var monto = d.ped && typeof d.ped.total === 'number' ? d.ped.total : 0;
    total.textContent = items + (items === 1 ? ' item' : ' items') + ' = ' + dinero(monto);
  }

  function cambiarCantidad(pid, delta) {
    var d = datosPedido();
    if (!d.ped || !d.ped.productos) return;
    if (delta > 0) {
      if (typeof agregarProductoPedido === 'function') agregarProductoPedido(pid);
      else d.ped.productos[pid] = (d.ped.productos[pid] || 0) + 1;
    } else {
      var q = (d.ped.productos[pid] || 0) - 1;
      if (q > 0) d.ped.productos[pid] = q; else delete d.ped.productos[pid];
    }
    refrescarApp();
    pintarLista();
  }

  function dentroDeFranja(b) {
    var pts = b && b.cornerPoints;
    var franja = document.getElementById('kyte-franja');
    if (!pts || !pts.length || !franja) return true;
    var dpr = window.devicePixelRatio || 1;
    var y = 0;
    for (var i = 0; i < pts.length; i++) y += pts[i][1];
    y = y / pts.length / dpr;
    var r = franja.getBoundingClientRect();
    return y >= r.top - 60 && y <= r.bottom + 40;
  }

  function alLeer(evento) {
    if (!abierto) return;
    var lista = (evento && evento.barcodes) || [];
    for (var i = 0; i < lista.length; i++) {
      var b = lista[i];
      if (!dentroDeFranja(b)) continue;
      var codigo = String(b.rawValue || b.displayValue || '').replace(/\D/g, '');
      if (!codigo) continue;
      var ahora = Date.now();
      if (codigo === ultimoCodigo && ahora - ultimoTiempo < ESPERA_MISMO_CODIGO_MS) return;
      ultimoCodigo = codigo; ultimoTiempo = ahora;
      entregar(codigo);
      return;
    }
  }

  function entregar(codigo) {
    beep();
    flash();
    try { if (navigator.vibrate) navigator.vibrate(60); } catch (e) {}
    var antes = JSON.stringify((datosPedido().ped || {}).productos || {});
    try {
      if (typeof procesarCodigoDetectado === 'function') procesarCodigoDetectado(codigo);
      else if (typeof window.procesarCodigoDetectado === 'function') window.procesarCodigoDetectado(codigo);
      else { aviso('Falta procesarCodigoDetectado()', 'err'); return; }
    } catch (err) {
      aviso('Error con ' + codigo + ': ' + err.message, 'err');
      log(err);
    }
    if (!abierto) return;
    var despues = JSON.stringify((datosPedido().ped || {}).productos || {});
    aviso((despues !== antes ? '✓ ' : '') + codigo, despues !== antes ? 'ok' : '');
    pintarLista();
  }

  function permisoCamara(BS) {
    return BS.checkPermissions().then(function (r) {
      if (r && r.camera === 'granted') return true;
      return BS.requestPermissions().then(function (r2) { return !!(r2 && r2.camera === 'granted'); });
    });
  }

  function alternarZoom() {
    var BS = plugin();
    if (!BS) return;
    zoom2x = !zoom2x;
    BS.setZoomRatio({ zoomRatio: zoom2x ? 2 : 1 }).then(function () {
      document.getElementById('kyte-zoom').textContent = zoom2x ? '2X' : '1X';
    }).catch(function () { zoom2x = !zoom2x; });
  }

  function abrir() {
    if (abierto || arrancando) return;
    var BS = plugin();
    if (!BS) return;
    prepararAudio();
    arrancando = true;
    permisoCamara(BS).then(function (ok) {
      if (!ok) {
        arrancando = false;
        alert('Para escanear, permite el uso de la cámara a Ventas Pro en los ajustes del teléfono.');
        return;
      }
      construir();
      document.documentElement.classList.add('kyte-on');
      document.body.classList.add('kyte-on');
      document.getElementById('kyte').style.display = 'flex';
      zoom2x = false;
      document.getElementById('kyte-zoom').textContent = '1X';
      ultimoCodigo = null;
      abierto = true;
      pintarLista();
      try { history.pushState({ kyte: true }, ''); } catch (e) {}
      return BS.removeAllListeners().catch(function () {}).then(function () {
        return BS.addListener('barcodesScanned', alLeer);
      }).then(function () {
        return BS.startScan({ formats: FORMATOS, lensFacing: 'BACK', resolution: 1 });
      }).then(function () {
        arrancando = false;
        return BS.isTorchAvailable().then(function (r) {
          if (r && r.available) document.getElementById('kyte-linterna').style.display = 'block';
        }).catch(function () {});
      });
    }).catch(function (err) {
      arrancando = false;
      log('Error al abrir', err);
      cerrar(false);
      alert('No se pudo abrir la cámara: ' + ((err && err.message) || err));
    });
  }

  function cerrar(volverHistorial) {
    var estabaAbierto = abierto || arrancando;
    abierto = false;
    arrancando = false;
    var BS = plugin();
    if (BS) {
      BS.removeAllListeners().catch(function () {});
      BS.stopScan().catch(function () {});
    }
    document.documentElement.classList.remove('kyte-on');
    if (document.body) document.body.classList.remove('kyte-on');
    var k = document.getElementById('kyte');
    if (k) k.style.display = 'none';
    if (estabaAbierto) refrescarApp();
    if (volverHistorial && estabaAbierto) {
      try { if (history.state && history.state.kyte) history.back(); } catch (e) {}
    }
  }

  function asegurarModulo(BS) {
    return BS.isGoogleBarcodeScannerModuleAvailable().then(function (r) {
      if (r && r.available) return;
      return BS.installGoogleBarcodeScannerModule().then(function esperar(n) {
        n = typeof n === 'number' ? n : 90;
        return BS.isGoogleBarcodeScannerModuleAvailable().then(function (r2) {
          if (r2 && r2.available) return;
          if (n <= 0) throw new Error('No se pudo preparar el lector de Google. Revisa internet.');
          return new Promise(function (res) { setTimeout(res, 1000); }).then(function () { return esperar(n - 1); });
        });
      });
    });
  }

  function escanearParaCampo(input) {
    var BS = plugin();
    if (!BS) return;
    prepararAudio();
    asegurarModulo(BS).then(function () {
      return BS.scan({ formats: FORMATOS, autoZoom: true });
    }).then(function (res) {
      var b = res && res.barcodes && res.barcodes[0];
      var codigo = b ? String(b.rawValue || b.displayValue || '').replace(/\D/g, '') : '';
      if (!codigo) return;
      beep();
      try { if (navigator.vibrate) navigator.vibrate(60); } catch (e) {}
      input.value = codigo;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }).catch(function (err) {
      var msg = (err && err.message) || String(err);
      if (!/cancel/i.test(msg)) alert('Error del lector: ' + msg);
    });
  }

  if (!esApp()) { log('navegador: no se activa'); return; }

  window.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;

    if (t.closest('#btn-scanner-camara')) {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (abierto || arrancando) cerrar(true); else abrir();
      return;
    }

    var campo = document.getElementById('pr-barcode');
    if (campo && t !== campo && campo.parentElement && campo.parentElement.contains(t)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      escanearParaCampo(campo);
    }
  }, true);

  var cerrarPrevio = window.cerrarScannerCamara;
  window.cerrarScannerCamara = function () {
    cerrar(false);
    if (typeof cerrarPrevio === 'function') { try { cerrarPrevio(); } catch (e) {} }
  };
  window.abrirScannerCamara = abrir;

  window.addEventListener('popstate', function () { if (abierto || arrancando) cerrar(false); });
  window.addEventListener('pagehide', function () { cerrar(false); });
  document.addEventListener('visibilitychange', function () { if (document.hidden && abierto) cerrar(true); });

  log('kyte-scanner.js cargado (app nativa)');
})();
