/* ingreso.js — Inicio (VENTA / INGRESO PRODUCTOS) + pantalla "Ingreso de productos" estilo Kyte */
(function () {
  'use strict';

  var C = window.Capacitor;
  var ES_APP = !!(C && typeof C.isNativePlatform === 'function' && C.isNativePlatform());
  var NARANJA = '#f97316';

  function lista() { return ((typeof productos !== 'undefined') ? productos : []) || []; }

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

  function aviso(msg, tipo) {
    try { if (typeof showToast === 'function') return showToast(msg, tipo || ''); } catch (e) {}
    alert(msg);
  }

  function mismoCodigo(a, b) {
    var x = String(a || '').replace(/\D/g, ''), y = String(b || '').replace(/\D/g, '');
    if (!x || !y) return false;
    return x === y || (x.length === y.length + 1 && x.slice(1) === y) || (y.length === x.length + 1 && y.slice(1) === x);
  }

  function estiloBoton(b) {
    b.style.background = NARANJA;
    b.style.color = '#fff';
    b.style.border = 'none';
    b.style.borderRadius = '30px';
    b.style.width = '230px';
    b.style.maxWidth = '80%';
    b.style.padding = '12px 16px';
    b.style.fontSize = '17px';
    b.style.fontWeight = '700';
    b.style.letterSpacing = '.5px';
    b.style.boxShadow = '0 4px 14px rgba(0,0,0,.3)';
    b.style.cursor = 'pointer';
  }

  function botonesInicio() {
    var slot = document.getElementById('ventas-home-slot');
    var v = document.getElementById('btn-ventas-rapidas');
    if (!slot || !v || v.parentNode !== slot) return false;
    if (!v.dataset.naranja) { v.dataset.naranja = '1'; v.textContent = 'VENTA'; estiloBoton(v); }
    if (!document.getElementById('btn-ingreso-productos')) {
      var b = document.createElement('button');
      b.type = 'button';
      b.id = 'btn-ingreso-productos';
      b.textContent = 'INGRESO PRODUCTOS';
      estiloBoton(b);
      b.style.display = 'block';
      b.style.margin = '12px auto 0';
      b.addEventListener('click', abrirLista);
      slot.appendChild(b);
      v.style.display = 'block';
      v.style.margin = '0 auto'; slot.style.marginTop = '22vh';
    }
    return true;
  }
  var nIni = 0, tIni = setInterval(function () { if (botonesInicio() || ++nIni > 60) clearInterval(tIni); }, 250);
  setInterval(botonesInicio, 2000);

  var css =
    '.ip-pant{position:fixed;inset:0;z-index:2147480000;display:none;flex-direction:column;background:#161a23;color:#e9ecf3;font-family:system-ui,sans-serif}' +
    '.ip-top{display:flex;align-items:center;gap:8px;padding:12px;border-bottom:1px solid #262b38}' +
    '.ip-top h2{flex:1;margin:0 0 0 4px;font-size:22px;font-weight:600}' +
    '.ip-ico{min-width:44px;height:42px;border:0;background:transparent;color:#e9ecf3;font-size:26px;display:flex;align-items:center;justify-content:center}' +
    '.ip-ico svg{width:28px;height:28px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}' +
    '.ip-buscar{display:flex;align-items:center;gap:6px;padding:8px 10px;background:#1b2030;border-bottom:1px solid #262b38}' +
    '.ip-buscar input{flex:1;min-width:0;height:44px;border:0;background:transparent;color:#e9ecf3;font-size:18px;outline:none}' +
    '.ip-mas{color:#2ecc9a!important;font-size:36px!important;font-weight:300}' +
    '.ip-cuerpo{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch}' +
    '.ip-fila{display:flex;align-items:center;gap:14px;width:100%;padding:12px 14px;border:0;border-bottom:1px solid #262b38;background:transparent;color:#e9ecf3;text-align:left}' +
    '.ip-mini{flex:0 0 64px;height:64px;border-radius:8px;overflow:hidden;background:#4a5266;display:flex;align-items:center;justify-content:center;font-size:12px;color:#d6dae3;text-align:center;padding:2px;box-sizing:border-box}' +
    '.ip-mini img{width:100%;height:100%;object-fit:cover}' +
    '.ip-dato{flex:1;min-width:0}.ip-nom{font-size:19px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.ip-cat{font-size:15px;color:#8a93a6;margin-top:3px}.ip-pre{font-size:18px;white-space:nowrap}' +
    '.ip-vacio{padding:30px 16px;text-align:center;color:#8a93a6;font-size:16px}' +
    '.ip-prev{display:flex;align-items:center;justify-content:center;gap:28px;padding:22px 12px;background:#1b2030}' +
    '.ip-tile{width:150px;border-radius:8px;overflow:hidden;background:#3b4253}' +
    '.ip-tile-foto{height:94px;background:#4a5266;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;color:#e9ecf3;overflow:hidden;padding:4px;text-align:center}' +
    '.ip-tile-foto img{width:100%;height:100%;object-fit:cover}' +
    '.ip-tile-pie{padding:6px 10px 8px}.ip-tile-nom{font-size:15px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ip-tile-pre{font-size:15px}' +
    '.ip-foto-btn{position:relative;border:0;background:transparent;color:#c3c9d6}' +
    '.ip-foto-btn svg{width:40px;height:40px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}' +
    '.ip-foto-btn b{position:absolute;top:-6px;right:-8px;min-width:22px;height:22px;border-radius:11px;background:#2ecc9a;color:#fff;font:700 13px/22px system-ui;display:none}' +
    '.ip-campos{padding:8px 18px 4px}' +
    '.ip-campo{display:block;margin:14px 0}' +
    '.ip-campo span{display:block;font-size:14px;color:#8a93a6;margin-bottom:2px}' +
    '.ip-campo input,.ip-campo textarea{width:100%;box-sizing:border-box;border:0;border-bottom:2px solid #3a4152;background:transparent;color:#e9ecf3;font-size:20px;padding:8px 2px;outline:none;border-radius:0}' +
    '.ip-campo input:focus,.ip-campo textarea:focus{border-bottom-color:#2ecc9a}' +
    '.ip-fila-cod{display:flex;align-items:flex-end;gap:6px}.ip-fila-cod .ip-campo{flex:1}' +
    '.ip-opc{margin-top:10px;border-top:8px solid #12151d}' +
    '.ip-opc-tit{display:flex;align-items:center;width:100%;padding:18px;border:0;background:transparent;color:#e9ecf3;text-align:left}' +
    '.ip-opc-tit b{flex:1;font-size:21px}.ip-opc-tit small{display:block;font-size:14px;color:#8a93a6;font-weight:400;margin-top:3px}' +
    '.ip-opc-tit i{font-style:normal;font-size:22px;transition:transform .2s}.ip-opc.abierto .ip-opc-tit i{transform:rotate(180deg)}' +
    '.ip-opc-cuerpo{display:none;padding:0 18px 12px}.ip-opc.abierto .ip-opc-cuerpo{display:block}' +
    '.ip-pie{padding:12px;border-top:1px solid #262b38}' +
    '.ip-guardar{width:100%;border:0;border-radius:12px;background:#2ecc9a;color:#fff;font:600 21px system-ui,sans-serif;padding:16px}' +
    '.ip-guardar:disabled{background:#2a303d;color:#6b7385}';
  var st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  var SVG_ESC = '<svg viewBox="0 0 24 24"><path d="M3 7V4h3M18 4h3v3M21 17v3h-3M6 20H3v-3"/><path d="M7 8v8M10 8v8M12.5 8v8M15 8v8M17 8v8"/></svg>';
  var SVG_LUPA = '<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/></svg>';
  var SVG_FOTO = '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="15.5" cy="9" r="2"/><path d="M3 17l5-5 4 4 3-3 6 6"/></svg>';

  function mostrar(id) {
    ['ip-lista', 'ip-form'].forEach(function (x) {
      var el = document.getElementById(x);
      if (el) el.style.display = x === id ? 'flex' : 'none';
    });
  }

  function plugin() {
    if (!C) return null;
    if (C.Plugins && C.Plugins.BarcodeScanner) return C.Plugins.BarcodeScanner;
    return typeof C.registerPlugin === 'function' ? C.registerPlugin('BarcodeScanner') : null;
  }

  function escanear() {
    var BS = plugin();
    if (!BS) return Promise.reject(new Error('Lector no disponible'));
    return BS.isGoogleBarcodeScannerModuleAvailable().then(function (r) {
      if (r && r.available) return;
      return BS.installGoogleBarcodeScannerModule().then(function esperar(n) {
        n = typeof n === 'number' ? n : 90;
        return BS.isGoogleBarcodeScannerModuleAvailable().then(function (r2) {
          if (r2 && r2.available) return;
          if (n <= 0) throw new Error('No se pudo preparar el lector. Revisa internet.');
          return new Promise(function (ok) { setTimeout(ok, 1000); }).then(function () { return esperar(n - 1); });
        });
      });
    }).then(function () {
      return BS.scan({ formats: ['EAN_13', 'EAN_8', 'UPC_A', 'UPC_E', 'CODE_128', 'CODE_39'], autoZoom: true });
    }).then(function (res) {
      var b = res && res.barcodes && res.barcodes[0];
      try { if (navigator.vibrate) navigator.vibrate(60); } catch (e) {}
      return b ? String(b.rawValue || b.displayValue || '').trim() : '';
    });
  }

  function falloScan(e) {
    var m = (e && e.message) || String(e);
    if (!/cancel/i.test(m)) aviso('Lector: ' + m, 'error');
  }

  function construirLista() {
    if (document.getElementById('ip-lista')) return;
    var el = document.createElement('div');
    el.id = 'ip-lista';
    el.className = 'ip-pant';
    el.innerHTML =
      '<div class="ip-top"><button type="button" class="ip-ico" id="ip-l-volver" aria-label="Volver">&#8592;</button><h2 id="ip-l-tit">Productos</h2></div>' +
      '<div class="ip-buscar"><span class="ip-ico" style="min-width:34px">' + SVG_LUPA + '</span>' +
        '<input type="search" id="ip-q" placeholder="Ítem, valor o código" autocomplete="off">' +
        (ES_APP ? '<button type="button" class="ip-ico" id="ip-l-esc" aria-label="Escanear">' + SVG_ESC + '</button>' : '') +
        '<button type="button" class="ip-ico ip-mas" id="ip-l-mas" aria-label="Nuevo producto">+</button></div>' +
      '<div class="ip-cuerpo" id="ip-l-filas"></div>';
    document.body.appendChild(el);
    document.getElementById('ip-l-volver').addEventListener('click', function () { mostrar(null); });
    document.getElementById('ip-q').addEventListener('input', pintarLista);
    document.getElementById('ip-l-mas').addEventListener('click', function () { abrirForm(null, ''); });
    var be = document.getElementById('ip-l-esc');
    if (be) be.addEventListener('click', function () {
      escanear().then(function (cod) {
        if (!cod) return;
        var p = lista().find(function (x) { return mismoCodigo(x.barcode, cod) || mismoCodigo(x.codigo, cod); });
        if (p) { aviso('Ya registrado: ' + p.nombre); abrirForm(p); }
        else abrirForm(null, cod);
      }).catch(falloScan);
    });
    document.getElementById('ip-l-filas').addEventListener('click', function (e) {
      var f = e.target.closest && e.target.closest('.ip-fila');
      if (!f) return;
      var p = lista().find(function (x) { return String(x.id) === f.getAttribute('data-id'); });
      if (p) abrirForm(p);
    });
  }

  function pintarLista() {
    var q = (document.getElementById('ip-q').value || '').trim().toLowerCase();
    var todos = lista();
    var l = todos.filter(function (p) {
      if (!q) return true;
      return String(p.nombre || '').toLowerCase().indexOf(q) !== -1 || String(p.barcode || '').indexOf(q) !== -1 ||
        String(p.codigo || '').toLowerCase().indexOf(q) !== -1 || String(p.precio || '').indexOf(q) !== -1;
    }).slice().sort(function (a, b) { return String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es'); });
    document.getElementById('ip-l-tit').textContent = 'Productos (' + todos.length + ')';
    var html = l.slice(0, 400).map(function (p) {
      var mini = p.imagen ? '<img loading="lazy" alt="" src="' + esc(p.imagen) + '">' : esc(String(p.nombre || '').slice(0, 14));
      return '<button type="button" class="ip-fila" data-id="' + esc(p.id) + '"><div class="ip-mini">' + mini + '</div>' +
        '<div class="ip-dato"><div class="ip-nom">' + esc(p.nombre) + '</div>' + (p.categoria ? '<div class="ip-cat">' + esc(p.categoria) + '</div>' : '') + '</div>' +
        '<div class="ip-pre">' + dinero(p.precio) + '</div></button>';
    }).join('');
    document.getElementById('ip-l-filas').innerHTML = html || '<div class="ip-vacio">' + (q ? 'Sin resultados' : 'Aún no hay productos. Toca + para agregar.') + '</div>';
  }

  function abrirLista() { construirLista(); pintarLista(); mostrar('ip-lista'); }

  var editando = null, fotoArchivo = null, fotoUrl = '';

  function campo(id, etiqueta, tipo, extra) {
    return '<label class="ip-campo"><span>' + etiqueta + '</span><input id="' + id + '" type="' + (tipo || 'text') + '" ' + (extra || '') + '></label>';
  }

  function construirForm() {
    if (document.getElementById('ip-form')) return;
    var el = document.createElement('div');
    el.id = 'ip-form';
    el.className = 'ip-pant';
    el.innerHTML =
      '<div class="ip-top"><button type="button" class="ip-ico" id="ip-f-volver" aria-label="Volver">&#8592;</button><h2 id="ip-f-tit">Nuevo producto</h2></div>' +
      '<div class="ip-cuerpo">' +
        '<div class="ip-prev"><div class="ip-tile"><div class="ip-tile-foto" id="ip-t-foto">Nombre</div>' +
          '<div class="ip-tile-pie"><div class="ip-tile-nom" id="ip-t-nom">Nombre del producto</div><div class="ip-tile-pre" id="ip-t-pre">$ 0</div></div></div>' +
          '<button type="button" class="ip-foto-btn" id="ip-foto-btn" aria-label="Agregar foto">' + SVG_FOTO + '<b>1</b></button>' +
          '<input type="file" id="ip-foto-file" accept="image/*" style="display:none"></div>' +
        '<div class="ip-campos">' +
          campo('ip-nombre', 'Nombre del producto', 'text', 'autocomplete="off"') +
          campo('ip-precio', 'Precio', 'number', 'inputmode="numeric" min="0" step="1"') +
        '</div>' +
        '<div class="ip-opc" id="ip-opc"><button type="button" class="ip-opc-tit" id="ip-opc-tit"><b>Opcionales<small>Código de barras, costo, stock y categoría</small></b><i>&#8964;</i></button>' +
          '<div class="ip-opc-cuerpo">' +
            '<div class="ip-fila-cod">' + campo('ip-barcode', 'Código de barras', 'text', 'inputmode="numeric" autocomplete="off"') +
              (ES_APP ? '<button type="button" class="ip-ico" id="ip-f-esc" aria-label="Escanear código">' + SVG_ESC + '</button>' : '') + '</div>' +
            campo('ip-coste', 'Costo', 'number', 'inputmode="numeric" min="0" step="1"') +
            campo('ip-stock', 'Stock', 'number', 'inputmode="numeric" step="1"') +
            campo('ip-categoria', 'Categoría', 'text', 'list="ip-cats" autocomplete="off"') + '<datalist id="ip-cats"></datalist>' +
            campo('ip-codigo', 'Código interno', 'text', 'autocomplete="off"') +
            '<label class="ip-campo"><span>Descripción</span><textarea id="ip-descripcion" rows="2"></textarea></label>' +
          '</div></div>' +
      '</div>' +
      '<div class="ip-pie"><button type="button" class="ip-guardar" id="ip-guardar" disabled>Añadir producto</button></div>';
    document.body.appendChild(el);

    document.getElementById('ip-f-volver').addEventListener('click', function () { if (modoVenta) volverAVenta(null); else abrirLista(); });
    document.getElementById('ip-opc-tit').addEventListener('click', function () { document.getElementById('ip-opc').classList.toggle('abierto'); });
    ['ip-nombre', 'ip-precio'].forEach(function (id) { document.getElementById(id).addEventListener('input', pintarPrev); });
    document.getElementById('ip-foto-btn').addEventListener('click', function () { document.getElementById('ip-foto-file').click(); });
    document.getElementById('ip-foto-file').addEventListener('change', function () {
      if (!this.files || !this.files[0]) return;
      fotoArchivo = this.files[0];
      var r = new FileReader();
      r.onload = function (ev) { fotoUrl = ev.target.result; pintarPrev(); };
      r.readAsDataURL(fotoArchivo);
    });
    var bc = document.getElementById('ip-f-esc');
    if (bc) bc.addEventListener('click', function () {
      escanear().then(function (cod) {
        if (!cod) return;
        var otro = lista().find(function (x) { return (!editando || x.id !== editando.id) && (mismoCodigo(x.barcode, cod) || mismoCodigo(x.codigo, cod)); });
        if (otro) aviso('Ese código ya es de: ' + otro.nombre, 'error');
        document.getElementById('ip-barcode').value = cod;
      }).catch(falloScan);
    });
    document.getElementById('ip-guardar').addEventListener('click', guardar);
  }

  function pintarPrev() {
    var nom = document.getElementById('ip-nombre').value.trim();
    var pre = document.getElementById('ip-precio').value;
    document.getElementById('ip-t-nom').textContent = nom || 'Nombre del producto';
    document.getElementById('ip-t-pre').textContent = dinero(pre);
    var f = document.getElementById('ip-t-foto');
    if (fotoUrl) f.innerHTML = '<img alt="" src="' + esc(fotoUrl) + '">';
    else f.textContent = nom ? nom.split(' ')[0] : 'Nombre';
    var badge = document.querySelector('#ip-foto-btn b');
    badge.style.display = fotoUrl ? 'block' : 'none';
    document.getElementById('ip-guardar').disabled = !nom || pre === '';
  }

  function abrirForm(p, codigoNuevo, desdeVenta) {
    modoVenta = !!desdeVenta;
    construirForm();
    editando = p || null;
    fotoArchivo = null;
    fotoUrl = (p && p.imagen) || '';
    document.getElementById('ip-foto-file').value = '';
    var v = function (id, val) { document.getElementById(id).value = val == null ? '' : val; };
    v('ip-nombre', p ? p.nombre : '');
    v('ip-precio', p ? p.precio : '');
    v('ip-barcode', p ? p.barcode : (codigoNuevo || ''));
    v('ip-coste', p ? (p.coste || '') : '');
    v('ip-stock', p ? (p.stock == null ? '' : p.stock) : '');
    v('ip-categoria', p ? p.categoria : '');
    v('ip-codigo', p ? p.codigo : '');
    v('ip-descripcion', p ? p.descripcion : '');
    var cats = {};
    lista().forEach(function (x) { if (x.categoria) cats[x.categoria] = 1; });
    document.getElementById('ip-cats').innerHTML = Object.keys(cats).sort().map(function (c) { return '<option value="' + esc(c) + '">'; }).join('');
    document.getElementById('ip-f-tit').textContent = p ? 'Editar producto' : 'Nuevo producto';
    document.getElementById('ip-guardar').textContent = p ? 'Guardar cambios' : 'Añadir producto';
    document.getElementById('ip-opc').classList.toggle('abierto', !!codigoNuevo || !!p);
    pintarPrev();
    mostrar('ip-form');
    if (!p) setTimeout(function () { try { document.getElementById('ip-nombre').focus(); } catch (e) {} }, 150);
  }

  function comprimir(dataUrl, max, calidad) {
    return new Promise(function (ok, mal) {
      var img = new Image();
      img.onload = function () {
        var esc = Math.min(1, max / Math.max(img.width, img.height));
        var c = document.createElement('canvas');
        c.width = Math.round(img.width * esc);
        c.height = Math.round(img.height * esc);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(function (b) { b ? ok(b) : mal(new Error('no se pudo procesar la foto')); }, 'image/jpeg', calidad);
      };
      img.onerror = function () { mal(new Error('formato de foto no soportado')); };
      img.src = dataUrl;
    });
  }

  function subirFoto() {
    if (!fotoArchivo) return Promise.resolve(editando ? (editando.imagen || '') : '');
    return comprimir(fotoUrl, 1200, 0.82).then(function (blob) {
      var fd = new FormData();
      fd.append('imagen', blob, 'producto-' + Date.now() + '.jpg');
      return fetch('/api/upload', { method: 'POST', body: fd, credentials: 'same-origin' });
    }).then(function (r) {
      return r.text().then(function (t) {
        var d = {};
        try { d = JSON.parse(t); } catch (e) {}
        if (!r.ok || !d.url) throw new Error(d.error || ('el servidor respondió ' + r.status));
        return d.url;
      });
    }).catch(function (e) {
      aviso('La foto no se pudo subir (' + e.message + '); se guarda sin foto', 'error');
      return editando ? (editando.imagen || '') : '';
    });
  }

  function guardar() {
    var b = document.getElementById('ip-guardar');
    var g = function (id) { return document.getElementById(id).value; };
    var nombre = g('ip-nombre').trim();
    if (!nombre) return aviso('El nombre es requerido', 'error');
    if (typeof api !== 'function') return aviso('No encontré la función api() de la app', 'error');
    b.disabled = true;
    b.textContent = 'Guardando…';
    subirFoto().then(function (imagen) {
      var datos = {
        nombre: nombre,
        precio: parseFloat(g('ip-precio')) || 0,
        coste: parseFloat(g('ip-coste')) || 0,
        descripcion: g('ip-descripcion').trim(),
        barcode: g('ip-barcode').trim(),
        codigo: g('ip-codigo').trim(),
        categoria: g('ip-categoria').trim(),
        unidad: editando ? (editando.unidad || '') : '',
        stock: parseInt(g('ip-stock'), 10) || 0,
        imagen: imagen
      };
      if (editando) {
        var id = editando.id;
        return Promise.resolve(api('PUT', '/productos/' + id, Object.assign({}, editando, datos))).then(function (r) {
          Object.assign(editando, datos, (r && typeof r === 'object' && r.id) ? r : {});
          aviso('Producto actualizado', 'success');
        });
      }
      return Promise.resolve(api('POST', '/productos', datos)).then(function (p) {
        if (!p || !p.id) throw new Error((p && p.error) || 'respuesta inválida');
        lista().push(p);
        nuevoId = p.id;
        aviso('Producto guardado', 'success');
      });
    }).then(function () {
      if (modoVenta) volverAVenta(nuevoId); else abrirLista();
    }).catch(function (e) {
      aviso('No se pudo guardar: ' + ((e && e.message) || e), 'error');
    }).then(function () {
      b.textContent = editando ? 'Guardar cambios' : 'Añadir producto';
      pintarPrev();
    });
  }

  // Pantalla Productos de la app: el botón rojo del código de barras busca con la cámara
  window.addEventListener('click', function (e) {
    var b = e.target && e.target.closest && e.target.closest('#page-productos .barcode-btn');
    if (!b || !ES_APP) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    escanear().then(function (cod) {
      if (!cod) return;
      var p = lista().find(function (x) { return mismoCodigo(x.barcode, cod) || mismoCodigo(x.codigo, cod); });
      var f = document.getElementById('filtro-productos');
      if (p) {
        if (f) { f.value = p.nombre; try { if (typeof filtrarProductos === 'function') filtrarProductos(); } catch (er) {} }
        aviso('Encontrado: ' + p.nombre, 'success');
      } else if (confirm('El código ' + cod + ' no está registrado. ¿Registrarlo ahora?')) {
        abrirForm(null, cod);
      }
    }).catch(falloScan);
  }, true);

  var modoVenta = false, nuevoId = null;

  function volverAVenta(id) {
    modoVenta = false;
    mostrar(null);
    if (id) {
      try { if (typeof agregarProductoPedido === 'function') agregarProductoPedido(id); } catch (e) {}
      try { if (typeof renderProductosAgregados === 'function') renderProductosAgregados(); } catch (e) {}
      try { if (typeof recalcularTotal === 'function') recalcularTotal(); } catch (e) {}
    }
    setTimeout(function () { if (window.KyteScanner) window.KyteScanner.abrir(); }, 250);
  }

  if (ES_APP && typeof window.procesarCodigoDetectado === 'function') {
    var procesarOriginal = window.procesarCodigoDetectado;
    window.procesarCodigoDetectado = function (codigo) {
      var existe = lista().some(function (x) { return mismoCodigo(x.barcode, codigo) || mismoCodigo(x.codigo, codigo); });
      if (existe) return procesarOriginal.apply(this, arguments);
      try { if (window.KyteScanner) window.KyteScanner.cerrar(false); } catch (e) {}
      nuevoId = null;
      abrirForm(null, String(codigo || ''), true);
      aviso('Código nuevo: regístralo para agregarlo a la venta');
    };
  }

  window.IngresoProductos = { abrir: abrirLista, nuevo: function (cod) { abrirForm(null, cod || ''); } };
})();
