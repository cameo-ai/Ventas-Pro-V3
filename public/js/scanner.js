/* scanner.js v4 — Escaneo estilo Kyte con motor ZXing-C++ (WebAssembly) */
(function () {
  'use strict';

  var LIB_LOCAL = '/js/vendor/barcode-detector.js';
  var LIB_CDN = 'https://cdn.jsdelivr.net/npm/barcode-detector@3.2.2/dist/iife/ponyfill.js';
  var WASM_LOCAL = '/js/vendor/zxing_reader.wasm';
  var WASM_CDN = 'https://cdn.jsdelivr.net/npm/zxing-wasm@3.1.3/dist/reader/zxing_reader.wasm';
  var LECTURAS_PARA_CONFIRMAR = 2;
  var ESPERA_MISMO_CODIGO_MS = 1200;
  var INTERVALO_MS = 110;
  var ALTO_FRANJA = 'min(50vw, 260px)';

  var detector = null, stream = null, track = null;
  var video = null, canvas = null, ctx = null;
  var activo = false, arrancando = false, ocupado = false, timerLoop = null;
  var candidato = null, conteo = 0;
  var ultimoCodigo = null, ultimoTiempo = 0;
  var linternaOn = false, zoomOn = false;
  var escaneados = 0, cuadros = 0, mostrandoLectura = false, timerAviso = null;

  function log() {
    try { console.log.apply(console, ['[scanner]'].concat([].slice.call(arguments))); } catch (e) {}
  }

  function estilos() {
    if (document.getElementById('scv4-css')) return;
    var css =
      '#scv4-panel{position:fixed;top:0;left:0;right:0;height:' + ALTO_FRANJA + ';z-index:99999;background:#000;overflow:hidden;display:none}' +
      '#scv4-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}' +
      '#scv4-linea{position:absolute;left:3%;right:3%;top:50%;height:2px;background:#ff3b30;box-shadow:0 0 6px #ff3b30;pointer-events:none}' +
      '#scv4-flash{position:absolute;inset:0;background:rgba(46,204,113,.4);opacity:0;transition:opacity .3s;pointer-events:none}' +
      '.scv4-btn{background:rgba(0,0,0,.55);color:#fff;border:0;border-radius:18px;padding:7px 12px;font:600 14px system-ui,sans-serif}' +
      '#scv4-cerrar{position:absolute;top:8px;left:8px}' +
      '#scv4-controles{position:absolute;top:8px;right:8px;display:flex;gap:6px}' +
      '#scv4-aviso{position:absolute;left:50%;bottom:8px;transform:translateX(-50%);background:rgba(0,0,0,.6);color:#fff;padding:5px 12px;border-radius:14px;font:13px system-ui,sans-serif;white-space:nowrap;max-width:92%;overflow:hidden;text-overflow:ellipsis}' +
      '#scv4-aviso.ok{background:rgba(39,174,96,.92)}' +
      '#scv4-aviso.err{background:rgba(231,76,60,.92);white-space:normal;text-align:center}' +
      'body.scv4-abierto{padding-top:' + ALTO_FRANJA + '!important}';
    var s = document.createElement('style');
    s.id = 'scv4-css';
    s.textContent = css;
    document.head.appendChild(s);
  }

  function asegurarPanel() {
    var panel = document.getElementById('scv4-panel');
    if (panel) return panel;
    estilos();
    panel = document.createElement('div');
    panel.id = 'scv4-panel';
    panel.innerHTML =
      '<video id="scv4-video" playsinline muted autoplay></video>' +
      '<div id="scv4-linea"></div>' +
      '<div id="scv4-flash"></div>' +
      '<button type="button" id="scv4-cerrar" class="scv4-btn">✕ Cerrar</button>' +
      '<div id="scv4-controles">' +
        '<button type="button" id="scv4-zoom" class="scv4-btn" style="display:none">1X</button>' +
        '<button type="button" id="scv4-linterna" class="scv4-btn" style="display:none">Linterna</button>' +
      '</div>' +
      '<div id="scv4-aviso">Iniciando cámara…</div>';
    document.body.appendChild(panel);
    document.getElementById('scv4-cerrar').addEventListener('click', cerrar);
    document.getElementById('scv4-linterna').addEventListener('click', alternarLinterna);
    document.getElementById('scv4-zoom').addEventListener('click', alternarZoom);
    video = document.getElementById('scv4-video');
    canvas = document.createElement('canvas');
    ctx = canvas.getContext('2d', { willReadFrequently: true });
    return panel;
  }

  function estado(texto, tipo) {
    var el = document.getElementById('scv4-aviso');
    if (!el) return;
    el.textContent = texto;
    el.className = tipo || '';
  }

  function avisoNormal() {
    estado(escaneados ? escaneados + ' escaneado(s) · apunta al siguiente' : 'Apunta el código a la línea roja');
  }

  function flash() {
    var f = document.getElementById('scv4-flash');
    if (!f) return;
    f.style.opacity = '1';
    setTimeout(function () { f.style.opacity = '0'; }, 150);
  }

  function cargarScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = res;
      s.onerror = function () { rej(new Error('No cargó ' + src)); };
      document.head.appendChild(s);
    });
  }

  function descargarWasm(url, opciones) {
    return fetch(url, opciones).then(function (r) {
      if (!r.ok) throw new Error(url + ' respondió ' + r.status);
      return r.arrayBuffer();
    }).then(function (buf) {
      var b = new Uint8Array(buf, 0, Math.min(4, buf.byteLength));
      if (b.length < 4 || b[0] !== 0 || b[1] !== 0x61 || b[2] !== 0x73 || b[3] !== 0x6d) {
        throw new Error(url + ' no devolvió un archivo WebAssembly');
      }
      return buf;
    });
  }

  function obtenerWasm() {
    return descargarWasm(WASM_LOCAL, { credentials: 'same-origin' }).catch(function (e) {
      log('wasm local falló, usando CDN:', e.message);
      return descargarWasm(WASM_CDN, {});
    });
  }

  function prepararDetector() {
    if (detector) return Promise.resolve();
    var p = window.BarcodeDetectionAPI ? Promise.resolve() :
      cargarScript(LIB_LOCAL).catch(function () {
        log('Copia local no disponible, usando CDN');
        return cargarScript(LIB_CDN);
      });
    return p.then(function () {
      var api = window.BarcodeDetectionAPI;
      if (!api || !api.BarcodeDetector) throw new Error('No se cargó el motor de lectura');
      return obtenerWasm().then(function (buf) {
        return api.prepareZXingModule({
          overrides: { wasmBinary: buf },
          fireImmediately: true
        });
      }).then(function () {
        detector = new api.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
      });
    });
  }

  function checksumValido(c) {
    if (!/^\d+$/.test(c)) return false;
    if (c.length !== 8 && c.length !== 12 && c.length !== 13) return false;
    var d = c.split('').map(Number);
    var verificador = d.pop();
    var suma = 0;
    for (var i = d.length - 1, p = 3; i >= 0; i--, p = (p === 3 ? 1 : 3)) suma += d[i] * p;
    return (10 - (suma % 10)) % 10 === verificador;
  }

  function capturarFranja() {
    var vw = video.videoWidth, vh = video.videoHeight;
    var cw = video.clientWidth, ch = video.clientHeight;
    if (!vw || !vh || !cw || !ch) return false;
    var escala = Math.max(cw / vw, ch / vh);
    var sw = cw / escala, sh = ch / escala;
    var sx = (vw - sw) / 2, sy = (vh - sh) / 2;
    var factor = Math.min(1, 1000 / sw);
    canvas.width = Math.round(sw * factor);
    canvas.height = Math.round(sh * factor);
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    return true;
  }

  function ciclo() {
    if (!activo) return;
    if (ocupado || video.readyState < 2) { timerLoop = setTimeout(ciclo, INTERVALO_MS); return; }
    if (!capturarFranja()) { timerLoop = setTimeout(ciclo, INTERVALO_MS); return; }
    ocupado = true;
    detector.detect(canvas).then(function (resultados) {
      cuadros++;
      if (resultados && resultados.length) {
        alLeer(resultados[0].rawValue);
      } else if (!mostrandoLectura && cuadros % 6 === 0) {
        estado((escaneados ? escaneados + ' escaneado(s) · ' : '') + 'Analizando… (' + cuadros + ')');
      }
    }).catch(function (err) {
      log('Error del motor', err);
      estado('Error del motor de lectura: ' + (err && err.message ? err.message : err), 'err');
    }).then(function () {
      ocupado = false;
      if (activo) timerLoop = setTimeout(ciclo, INTERVALO_MS);
    });
  }

  function alLeer(texto) {
    var codigo = String(texto || '').replace(/\D/g, '');
    if (!checksumValido(codigo)) return;

    if (codigo === candidato) { conteo++; } else { candidato = codigo; conteo = 1; }
    if (conteo < LECTURAS_PARA_CONFIRMAR) return;
    candidato = null; conteo = 0;

    var ahora = Date.now();
    if (codigo === ultimoCodigo && ahora - ultimoTiempo < ESPERA_MISMO_CODIGO_MS) return;
    ultimoCodigo = codigo; ultimoTiempo = ahora;

    log('Código aceptado:', codigo);
    escaneados++;
    flash();
    try { if (navigator.vibrate) navigator.vibrate(60); } catch (e) {}
    estado('✓ ' + codigo, 'ok');
    mostrandoLectura = true;
    clearTimeout(timerAviso);
    timerAviso = setTimeout(function () { mostrandoLectura = false; avisoNormal(); }, 1500);

    try {
      if (typeof procesarCodigoDetectado === 'function') {
        procesarCodigoDetectado(codigo);
      } else if (typeof window.procesarCodigoDetectado === 'function') {
        window.procesarCodigoDetectado(codigo);
      } else {
        estado('Leído ' + codigo + ' pero falta procesarCodigoDetectado()', 'err');
      }
    } catch (err) {
      log('Error al procesar', err);
      estado('Error con ' + codigo + ': ' + err.message, 'err');
    }
  }

  function iniciarCamara() {
    return navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    }).then(function (s) {
      stream = s;
      track = s.getVideoTracks()[0];
      video.srcObject = s;
      return video.play();
    }).then(function () {
      var caps = {};
      try { caps = track.getCapabilities ? track.getCapabilities() : {}; } catch (e) {}
      log('Capacidades de cámara:', caps);
      if (caps.torch) document.getElementById('scv4-linterna').style.display = '';
      if (caps.zoom && caps.zoom.max >= 2) document.getElementById('scv4-zoom').style.display = '';
      if (caps.focusMode && caps.focusMode.indexOf('continuous') !== -1) {
        track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(function () {});
      }
    });
  }

  function alternarLinterna() {
    if (!track) return;
    linternaOn = !linternaOn;
    track.applyConstraints({ advanced: [{ torch: linternaOn }] }).catch(function () { linternaOn = !linternaOn; });
  }

  function alternarZoom() {
    if (!track) return;
    zoomOn = !zoomOn;
    track.applyConstraints({ advanced: [{ zoom: zoomOn ? 2 : 1 }] })
      .then(function () { document.getElementById('scv4-zoom').textContent = zoomOn ? '2X' : '1X'; })
      .catch(function () { zoomOn = !zoomOn; });
  }

  function abrir() {
    if (activo || arrancando) return;

    var viejo = document.getElementById('modal-scanner-camara');
    if (viejo) viejo.style.display = 'none';

    var panel = asegurarPanel();
    panel.style.display = 'block';
    document.body.classList.add('scv4-abierto');
    escaneados = 0; cuadros = 0; mostrandoLectura = false;
    estado('Iniciando cámara…');

    if (!window.isSecureContext || !navigator.mediaDevices) {
      estado('La cámara requiere HTTPS: abre la app con la dirección https:// de Tailscale', 'err');
      return;
    }

    arrancando = true;
    Promise.all([prepararDetector(), iniciarCamara()]).then(function () {
      arrancando = false;
      activo = true;
      avisoNormal();
      ciclo();
    }).catch(function (err) {
      arrancando = false;
      log('Error al iniciar', err);
      var msg = (err && (err.name || err.message)) || String(err);
      if (/NotAllowed|Permission/i.test(msg)) msg = 'Permiso de cámara denegado: actívalo en los ajustes del sitio';
      else if (/NotFound/i.test(msg)) msg = 'No se encontró cámara';
      else if (/NotReadable/i.test(msg)) msg = 'La cámara está en uso por otra app';
      else if (err && err.message) msg = err.message;
      estado('No se pudo iniciar: ' + msg, 'err');
      apagarCamara();
    });
  }

  function apagarCamara() {
    clearTimeout(timerLoop);
    if (stream) stream.getTracks().forEach(function (t) { try { t.stop(); } catch (e) {} });
    stream = null; track = null;
    if (video) video.srcObject = null;
  }

  function cerrar() {
    activo = false;
    arrancando = false;
    linternaOn = false; zoomOn = false;
    candidato = null; conteo = 0;
    clearTimeout(timerAviso);
    apagarCamara();
    var panel = document.getElementById('scv4-panel');
    if (panel) panel.style.display = 'none';
    document.body.classList.remove('scv4-abierto');
    var z = document.getElementById('scv4-zoom');
    if (z) z.textContent = '1X';
  }

  window.abrirScannerCamara = abrir;
  window.cerrarScannerCamara = cerrar;

  function esBoton(e) {
    return e.target && e.target.closest && e.target.closest('#btn-scanner-camara');
  }
  ['pointerdown', 'mousedown', 'touchstart', 'touchend'].forEach(function (tipo) {
    document.addEventListener(tipo, function (e) {
      if (esBoton(e)) e.stopImmediatePropagation();
    }, true);
  });
  document.addEventListener('click', function (e) {
    if (!esBoton(e)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (activo || arrancando) cerrar(); else abrir();
  }, true);

  document.addEventListener('visibilitychange', function () {
    if (document.hidden && (activo || arrancando)) cerrar();
  });

  log('scanner.js v5 cargado');
})();
