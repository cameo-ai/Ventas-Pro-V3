// ==================== STATE ====================
let productos = [], clientes = [], pedidos = [], servicios = [], ingresos = [], gastos = [];
let pedidoActual = { cliente: null, clienteNombre: '', tipo: 'Pedido', fecha: '', items: {} };

// ==================== API ====================
async function api(method, endpoint, data) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (data) opts.body = JSON.stringify(data);
  const res = await fetch('/api' + endpoint, opts);
  return res.json();
}

async function loadAll() {
  [productos, clientes, pedidos, servicios, ingresos, gastos] = await Promise.all([
    api('GET', '/productos'), api('GET', '/clientes'), api('GET', '/pedidos'),
    api('GET', '/servicios'), api('GET', '/ingresos'), api('GET', '/gastos')
  ]);
}

// ==================== NAVIGATION ====================
function navigate(page) {
  showPage(page);
  // Sync nav
  document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll(`[data-page="${page}"]`).forEach(el => {
    if (el.classList.contains('nav-item') || el.classList.contains('bottom-nav-item'))
      el.classList.add('active');
  });
  // Load data
  if (page === 'productos') renderProductos();
  if (page === 'clientes') renderClientes();
  if (page === 'pedidos') renderPedidos();
  if (page === 'servicios') renderServicios();
  if (page === 'ingresos') renderIngresos();
  if (page === 'gastos') renderGastos();
  if (page === 'informes') renderInformes();
  if (page === 'catalogo') renderCatalogo();
  if (page === 'nuevo-pedido') initNuevoPedido();
}

function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById('page-' + page);
  if (el) el.classList.add('active');
}

document.querySelectorAll('[data-page]').forEach(el => {
  el.addEventListener('click', e => { e.preventDefault(); navigate(el.dataset.page); });
});

// ==================== PRODUCTOS ====================
function renderProductos(lista) {
  const arr = lista || productos;
  const container = document.getElementById('lista-productos');
  if (!container) return;
  if (arr.length === 0) {
    container.innerHTML = '<div class="empty-list"><i class="fa-solid fa-cube"></i><p>No hay productos aún</p></div>';
    return;
  }
  container.innerHTML = arr.map(p => `
    <div class="item-card" onclick="abrirEditarProducto('${p.id}')" style="cursor:pointer">
      ${p.imagen
        ? `<img class="item-thumb" src="${p.imagen}" alt="${p.nombre}" onerror="this.style.display='none'">`
        : `<div class="item-thumb-placeholder">${getIcon(p.categoria)}</div>`}
      <div class="item-info">
        <div class="item-name">${p.nombre}</div>
        <div class="item-sub">${p.precio ? fmtNum(p.precio) : ''}${p.marca ? ' · ' + p.marca : ''}${p.sku ? ' · SKU: ' + p.sku : ''}</div>
        <div class="item-sub" style="color:${(p.stock||0) > 0 ? '#10b981' : '#9ca3af'}">
          Stock: ${p.stock || 0}${p.cantidadDisponible ? ' · Disp: ' + p.cantidadDisponible : ''}
        </div>
      </div>
      <div class="item-actions">
        <button class="btn-del" onclick="event.stopPropagation();eliminarProducto('${p.id}')"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>
  `).join('');
}

function filtrarProductos() {
  const q = document.getElementById('filtro-productos').value.toLowerCase();
  renderProductos(productos.filter(p => p.nombre.toLowerCase().includes(q)));
}

async function guardarNuevoProducto() {
  const nombre = document.getElementById('np-nombre').value.trim();
  if (!nombre) return showToast('El nombre es requerido', 'error');
  const precio = parseFloat(document.getElementById('np-precio').value) || 0;
  const coste = parseFloat(document.getElementById('np-coste').value) || 0;
  const descripcion = document.getElementById('np-descripcion').value.trim();
  const barcode = document.getElementById('np-barcode').value.trim();
  const codigo = document.getElementById('np-codigo').value.trim();
  const categoria = document.getElementById('np-categoria').value.trim();
  const unidad = document.getElementById('np-unidad').value;
  const stock = parseInt(document.getElementById('np-stock').value) || 0;

  let imagen = '';
  const fileInput = document.getElementById('np-foto-file');
  if (fileInput.files && fileInput.files[0]) {
    try {
      const fd = new FormData();
      fd.append('imagen', fileInput.files[0]);
      const r = await fetch('/api/upload', { method: 'POST', body: fd });
      const d = await r.json();
      if (d.url) imagen = d.url;
    } catch(e) {}
  }

  const p = await api('POST', '/productos', { nombre, precio, coste, descripcion, barcode, codigo, categoria, unidad, stock, imagen });
  productos.push(p);
  showToast('Producto guardado', 'success');
  // Reset form
  ['np-nombre','np-descripcion','np-precio','np-coste','np-barcode','np-codigo','np-categoria','np-stock'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  document.getElementById('np-unidad').value = '';
  document.getElementById('np-foto-file').value = '';
  document.getElementById('np-foto-preview').style.display = 'none';
  document.getElementById('np-foto-label').textContent = 'No informado';
  navigate('productos');
}

function previewNPFoto(input) {
  if (!input.files || !input.files[0]) return;
  const reader = new FileReader();
  reader.onload = e => {
    const preview = document.getElementById('np-foto-preview');
    preview.src = e.target.result;
    preview.style.display = 'block';
    document.getElementById('np-foto-label').textContent = input.files[0].name;
  };
  reader.readAsDataURL(input.files[0]);
}

async function eliminarProducto(id) {
  if (!confirm('¿Eliminar producto?')) return;
  await api('DELETE', '/productos/' + id);
  productos = productos.filter(p => p.id !== id);
  renderProductos();
  showToast('Producto eliminado');
}

let productoEditando = null;

function abrirEditarProducto(id) {
  const p = productos.find(x => x.id === id);
  if (!p) return;
  productoEditando = p;

  document.getElementById('ep-nombre').value     = p.nombre || '';
  document.getElementById('ep-descripcion').value = p.descripcion || '';
  document.getElementById('ep-precio').value      = p.precio || '';
  document.getElementById('ep-coste').value       = p.coste || '';
  document.getElementById('ep-barcode').value     = p.barcode || '';
  document.getElementById('ep-codigo').value      = p.codigo || '';
  document.getElementById('ep-unidad').value      = p.unidad || '';
  document.getElementById('ep-stock').value       = p.stock || '';

  const preview = document.getElementById('ep-foto-preview');
  if (p.imagen) {
    preview.src = p.imagen;
    preview.style.display = 'block';
    document.getElementById('ep-foto-label').textContent = 'Foto actual';
    document.getElementById('ep-foto-del-btn').style.display = 'block';
  } else {
    preview.style.display = 'none';
    document.getElementById('ep-foto-label').textContent = 'No informado';
    document.getElementById('ep-foto-del-btn').style.display = 'none';
  }

  showPage('editar-producto');
}

async function actualizarProducto() {
  if (!productoEditando) return;
  const nombre = document.getElementById('ep-nombre').value.trim();
  if (!nombre) return showToast('El nombre es requerido', 'error');

  let imagen = productoEditando.imagen || '';
  const fileInput = document.getElementById('ep-foto-file');
  if (fileInput.files && fileInput.files[0]) {
    try {
      const fd = new FormData();
      fd.append('imagen', fileInput.files[0]);
      const r = await fetch('/api/upload', { method: 'POST', body: fd });
      const d = await r.json();
      if (d.url) imagen = d.url;
    } catch(e) {}
  }

  const updated = await api('PUT', '/productos/' + productoEditando.id, {
    nombre,
    descripcion: document.getElementById('ep-descripcion').value.trim(),
    precio:  parseFloat(document.getElementById('ep-precio').value) || 0,
    coste:   parseFloat(document.getElementById('ep-coste').value)  || 0,
    barcode: document.getElementById('ep-barcode').value.trim(),
    codigo:  document.getElementById('ep-codigo').value.trim(),
    unidad:  document.getElementById('ep-unidad').value,
    stock:   parseInt(document.getElementById('ep-stock').value) || 0,
    imagen,
  });

  const idx = productos.findIndex(x => x.id === productoEditando.id);
  if (idx !== -1) productos[idx] = updated;
  showToast('Producto actualizado', 'success');
  navigate('productos');
}

function eliminarFotoProducto() {
  productoEditando.imagen = '';
  document.getElementById('ep-foto-preview').style.display = 'none';
  document.getElementById('ep-foto-label').textContent = 'No informado';
  document.getElementById('ep-foto-file').value = '';
}

function previewEPFoto(input) {
  if (!input.files || !input.files[0]) return;
  const reader = new FileReader();
  reader.onload = e => {
    const preview = document.getElementById('ep-foto-preview');
    preview.src = e.target.result;
    preview.style.display = 'block';
    document.getElementById('ep-foto-label').textContent = input.files[0].name;
  };
  reader.readAsDataURL(input.files[0]);
}

// ==================== CLIENTES ====================
function renderClientes(lista) {
  const arr = lista || clientes;
  const container = document.getElementById('lista-clientes');
  if (!container) return;
  if (arr.length === 0) {
    container.innerHTML = '<div class="empty-list"><i class="fa-solid fa-users"></i><p>No hay clientes aún</p></div>';
    return;
  }
  container.innerHTML = arr.map(c => `
    <div class="item-card">
      <div class="item-thumb-placeholder" style="background:linear-gradient(135deg,#667eea,#764ba2);color:white;font-size:18px;font-weight:800">
        ${c.nombre.charAt(0).toUpperCase()}
      </div>
      <div class="item-info">
        <div class="item-name">${c.nombre}</div>
        <div class="item-sub">${c.telefono1 || c.telefono || ''}</div>
      </div>
      <div class="item-actions">
        <button class="btn-del" onclick="eliminarCliente('${c.id}')"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>
  `).join('');
}

function filtrarClientes() {
  const q = document.getElementById('filtro-clientes').value.toLowerCase();
  renderClientes(clientes.filter(c => c.nombre.toLowerCase().includes(q)));
}

async function guardarNuevoCliente() {
  const nombre = document.getElementById('nc-nombre').value.trim();
  if (!nombre) return showToast('El nombre es requerido', 'error');
  const telefono1 = document.getElementById('nc-tel1').value.trim();
  const telefono2 = document.getElementById('nc-tel2').value.trim();
  const telefono3 = document.getElementById('nc-tel3').value.trim();
  const email = document.getElementById('nc-email').value.trim();
  const documento = document.getElementById('nc-documento').value.trim();
  const direccion = document.getElementById('nc-direccion').value.trim();
  const dia = document.getElementById('nc-dia').value;
  const mes = document.getElementById('nc-mes').value;
  const nota = document.getElementById('nc-nota').value.trim();

  const c = await api('POST', '/clientes', {
    nombre, telefono1, telefono2, telefono3, email,
    documento, direccion, cumpleanos: dia && mes ? `${dia}/${mes}` : '',
    nota, totalCompras: 0
  });
  clientes.push(c);
  showToast('Cliente guardado', 'success');
  ['nc-nombre','nc-tel1','nc-tel2','nc-tel3','nc-email','nc-documento','nc-direccion','nc-nota'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  navigate('clientes');
}

async function eliminarCliente(id) {
  if (!confirm('¿Eliminar cliente?')) return;
  await api('DELETE', '/clientes/' + id);
  clientes = clientes.filter(c => c.id !== id);
  renderClientes();
  showToast('Cliente eliminado');
}

// ==================== CLIENTE PICKER ====================
let pedidoClienteSeleccionado = null;

function showClientePicker() {
  renderPickerClientes(clientes);
  showModal('modal-cliente-picker');
}

function renderPickerClientes(arr) {
  const container = document.getElementById('picker-lista');
  container.innerHTML = arr.map(c => `
    <div class="item-card" onclick="seleccionarCliente('${c.id}', '${c.nombre.replace(/'/g,"\\'")}')">
      <div class="item-thumb-placeholder" style="background:linear-gradient(135deg,#667eea,#764ba2);color:white;font-size:18px;font-weight:800;width:40px;height:40px;border-radius:10px">
        ${c.nombre.charAt(0).toUpperCase()}
      </div>
      <div class="item-info">
        <div class="item-name">${c.nombre}</div>
        <div class="item-sub">${c.telefono1 || ''}</div>
      </div>
    </div>
  `).join('');
  if (arr.length === 0) container.innerHTML = '<p style="text-align:center;color:var(--text2);padding:20px">Sin resultados</p>';
}

function filtrarPickerCliente() {
  const q = document.getElementById('picker-filtro').value.toLowerCase();
  renderPickerClientes(clientes.filter(c => c.nombre.toLowerCase().includes(q)));
}

function seleccionarCliente(id, nombre) {
  if (window._clientePickerTarget === 'pedidos') {
    window._clientePickerTarget = null;
    seleccionarClientePedidos(id);
    return;
  }
  pedidoClienteSeleccionado = { id, nombre };
  document.getElementById('ped-cliente-label').textContent = nombre;
  document.getElementById('ped-cliente-label').style.color = 'var(--text)';
  closeModal('modal-cliente-picker');
}

// ==================== NUEVO PEDIDO ====================
function initNuevoPedido() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('ped-fecha').value = today;
  document.getElementById('ped-tipo').value = 'Pedido';
  pedidoClienteSeleccionado = null;
  document.getElementById('ped-cliente-label').textContent = 'Seleccionar Cliente';
  document.getElementById('ped-cliente-label').style.color = '#9ca3af';
  pedidoActual.items = {};
}

function continuarPedido() {
  if (!pedidoClienteSeleccionado) return showToast('Selecciona un cliente', 'error');
  pedidoActual.cliente = pedidoClienteSeleccionado.id;
  pedidoActual.clienteNombre = pedidoClienteSeleccionado.nombre;
  pedidoActual.tipo = document.getElementById('ped-tipo').value;
  pedidoActual.fecha = document.getElementById('ped-fecha').value;
  pedidoActual.items = {};

  // Show client chip
  document.getElementById('pedido-cliente-chip').textContent = '👤 ' + pedidoActual.clienteNombre;
  renderPedidoProductos(productos);
  showPage('pedido-items');
}

function renderPedidoProductos(arr) {
  const container = document.getElementById('pedido-productos-list');
  container.innerHTML = arr.map(p => {
    const qty = pedidoActual.items[p.id] || 0;
    return `
      <div class="item-card" id="pedido-prod-${p.id}">
        ${p.imagen
          ? `<img class="item-thumb" src="${p.imagen}" alt="${p.nombre}">`
          : `<div class="item-thumb-placeholder">${getIcon(p.categoria)}</div>`}
        <div class="item-info">
          <div class="item-name">${p.nombre}</div>
          <div class="item-sub">${fmtNum(p.precio)}</div>
        </div>
        <div class="item-qty">
          <button class="qty-btn" onclick="cambiarQty('${p.id}', -1)">−</button>
          <span class="qty-num" id="qty-${p.id}">${qty}</span>
          <button class="qty-btn add" onclick="cambiarQty('${p.id}', 1)">+</button>
        </div>
      </div>`;
  }).join('');
}

function filtrarPedidoProductos() {
  const q = document.getElementById('pedido-filtro-prod').value.toLowerCase();
  renderPedidoProductos(productos.filter(p => p.nombre.toLowerCase().includes(q)));
}

function cambiarQty(pid, delta) {
  const prod = productos.find(p => p.id === pid);
  if (!prod) return;
  const actual = pedidoActual.items[pid] || 0;
  const nuevo = Math.max(0, actual + delta);
  if (nuevo === 0) delete pedidoActual.items[pid];
  else pedidoActual.items[pid] = nuevo;
  const el = document.getElementById('qty-' + pid);
  if (el) el.textContent = nuevo;
  actualizarResumenPedido();
}

function actualizarResumenPedido() {
  const ids = Object.keys(pedidoActual.items);
  const resumen = document.getElementById('pedido-resumen');
  if (ids.length === 0) { resumen.style.display = 'none'; return; }
  resumen.style.display = 'block';
  let total = 0;
  const rows = ids.map(pid => {
    const prod = productos.find(p => p.id === pid);
    if (!prod) return '';
    const qty = pedidoActual.items[pid];
    const sub = prod.precio * qty;
    total += sub;
    return `<div class="pedido-item-row"><span>${prod.nombre} x${qty}</span><span>${fmtNum(sub)}</span></div>`;
  }).join('');
  document.getElementById('pedido-items-sel').innerHTML = rows;
  document.getElementById('pedido-total-val').textContent = fmtNum(total);
}

async function crearPedidoFinal() {
  const ids = Object.keys(pedidoActual.items);
  if (ids.length === 0) return showToast('Agrega al menos un producto', 'error');
  const items = ids.map(pid => {
    const prod = productos.find(p => p.id === pid);
    return { id: pid, nombre: prod.nombre, precio: prod.precio, cantidad: pedidoActual.items[pid] };
  });
  const total = items.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const pedido = await api('POST', '/pedidos', {
    cliente: pedidoActual.clienteNombre,
    tipo: pedidoActual.tipo,
    fecha: pedidoActual.fecha,
    items, total
  });
  pedidos.push(pedido);
  showToast('Pedido creado: ' + pedido.numero, 'success');
  pedidoActual.items = {};
  navigate('pedidos');
}

// ==================== PEDIDOS LISTA ====================
function renderPedidos() {
  const container = document.getElementById('lista-pedidos');
  const empty = document.getElementById('pedidos-empty');
  if (!container) return;
  if (pedidos.length === 0) {
    container.innerHTML = '';
    if (empty) empty.style.display = 'flex';
    return;
  }
  if (empty) empty.style.display = 'none';
  container.innerHTML = [...pedidos].reverse().map(p => `
    <div class="item-card" onclick="abrirDetallePedido('${p.id}')" style="cursor:pointer">
      <div class="item-thumb-placeholder" style="background:linear-gradient(135deg,#3b5bdb,#5c7cfa);color:white;font-size:16px;font-weight:800">
        📦
      </div>
      <div class="item-info">
        <div class="item-name">#${p.numero}</div>
        <div class="item-sub">${p.cliente || '—'} · ${p.fecha ? p.fecha.split('-').reverse().join('/') : ''}</div>
        <div class="item-sub" style="font-weight:700;color:var(--text)">${fmtNum(p.total || 0)}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0">
        <span class="badge ${p.estado === 'Completado' ? 'badge-done' : p.estado === 'Cancelado' ? 'badge-cancel' : 'badge-pending'}">${p.estado}</span>
        <i class="fa-solid fa-chevron-right" style="color:var(--text2);font-size:11px;margin-top:4px"></i>
      </div>
    </div>
  `).join('');
}

// ==================== SERVICIOS ====================
function renderServicios() {
  const container = document.getElementById('lista-servicios');
  if (!container) return;
  if (servicios.length === 0) {
    container.innerHTML = '<div class="empty-list"><i class="fa-solid fa-wrench"></i><p>No hay servicios aún</p></div>';
    return;
  }
  container.innerHTML = servicios.map(s => `
    <div class="item-card">
      <div class="item-thumb-placeholder">🔧</div>
      <div class="item-info">
        <div class="item-name">${s.nombre}</div>
        <div class="item-sub">${s.descripcion} · ${fmtNum(s.precio)}</div>
      </div>
      <button class="btn-del" onclick="eliminarServicio('${s.id}')"><i class="fa-solid fa-trash"></i></button>
    </div>
  `).join('');
}

async function guardarServicio() {
  const nombre = document.getElementById('s-nombre').value.trim();
  const descripcion = document.getElementById('s-descripcion').value.trim();
  const precio = parseFloat(document.getElementById('s-precio').value) || 0;
  if (!nombre) return showToast('El nombre es requerido', 'error');
  const s = await api('POST', '/servicios', { nombre, descripcion, precio });
  servicios.push(s);
  renderServicios();
  closeModal('modal-servicio');
  ['s-nombre','s-descripcion','s-precio'].forEach(id => document.getElementById(id).value = '');
  showToast('Servicio guardado', 'success');
}

async function eliminarServicio(id) {
  await api('DELETE', '/servicios/' + id);
  servicios = servicios.filter(s => s.id !== id);
  renderServicios();
  showToast('Servicio eliminado');
}

// ==================== INGRESOS ====================
function renderIngresos() {
  const container = document.getElementById('lista-ingresos');
  if (!container) return;
  if (ingresos.length === 0) {
    container.innerHTML = '<div class="empty-list"><i class="fa-solid fa-piggy-bank"></i><p>No hay ingresos aún</p></div>';
    return;
  }
  container.innerHTML = [...ingresos].reverse().map(i => `
    <div class="item-card">
      <div class="item-thumb-placeholder" style="background:#d1fae5;font-size:22px">💰</div>
      <div class="item-info">
        <div class="item-name">${i.descripcion}</div>
        <div class="item-sub">${i.categoria} · ${i.fecha}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-weight:800;color:var(--green);font-size:15px">+${fmtNum(i.monto)}</span>
        <button class="btn-del" onclick="eliminarIngreso('${i.id}')"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>
  `).join('');
}

async function guardarIngreso() {
  const descripcion = document.getElementById('i-descripcion').value.trim();
  const categoria = document.getElementById('i-categoria').value;
  const monto = parseFloat(document.getElementById('i-monto').value) || 0;
  const fecha = document.getElementById('i-fecha').value || new Date().toISOString().split('T')[0];
  if (!descripcion || !monto) return showToast('Completa los campos', 'error');
  const i = await api('POST', '/ingresos', { descripcion, categoria, monto, fecha });
  ingresos.push(i);
  renderIngresos();
  closeModal('modal-ingreso');
  showToast('Ingreso guardado', 'success');
}

async function eliminarIngreso(id) {
  await api('DELETE', '/ingresos/' + id);
  ingresos = ingresos.filter(i => i.id !== id);
  renderIngresos();
  showToast('Ingreso eliminado');
}

// ==================== GASTOS ====================
function renderGastos() {
  const container = document.getElementById('lista-gastos');
  if (!container) return;
  if (gastos.length === 0) {
    container.innerHTML = '<div class="empty-list"><i class="fa-solid fa-credit-card"></i><p>No hay gastos aún</p></div>';
    return;
  }
  container.innerHTML = [...gastos].reverse().map(g => `
    <div class="item-card">
      <div class="item-thumb-placeholder" style="background:#fee2e2;font-size:22px">💸</div>
      <div class="item-info">
        <div class="item-name">${g.descripcion}</div>
        <div class="item-sub">${g.categoria} · ${g.fecha}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-weight:800;color:var(--red);font-size:15px">-${fmtNum(g.monto)}</span>
        <button class="btn-del" onclick="eliminarGasto('${g.id}')"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>
  `).join('');
}

async function guardarGasto() {
  const descripcion = document.getElementById('g-descripcion').value.trim();
  const categoria = document.getElementById('g-categoria').value;
  const monto = parseFloat(document.getElementById('g-monto').value) || 0;
  const fecha = document.getElementById('g-fecha').value || new Date().toISOString().split('T')[0];
  if (!descripcion || !monto) return showToast('Completa los campos', 'error');
  const g = await api('POST', '/gastos', { descripcion, categoria, monto, fecha });
  gastos.push(g);
  renderGastos();
  closeModal('modal-gasto');
  showToast('Gasto guardado', 'success');
}

async function eliminarGasto(id) {
  await api('DELETE', '/gastos/' + id);
  gastos = gastos.filter(g => g.id !== id);
  renderGastos();
  showToast('Gasto eliminado');
}

// ==================== INFORMES ====================
function renderInformes() {
  const totalIngresos = ingresos.reduce((s, i) => s + Number(i.monto), 0);
  const totalGastos = gastos.reduce((s, g) => s + Number(g.monto), 0);
  const ganancia = totalIngresos - totalGastos;
  document.getElementById('stats-grid').innerHTML = `
    <div class="stat-card"><div class="stat-icon">📦</div><div class="stat-label">Total Pedidos</div><div class="stat-value">${pedidos.length}</div></div>
    <div class="stat-card"><div class="stat-icon">👥</div><div class="stat-label">Clientes</div><div class="stat-value">${clientes.length}</div></div>
    <div class="stat-card"><div class="stat-icon">🏷️</div><div class="stat-label">Productos</div><div class="stat-value">${productos.length}</div></div>
    <div class="stat-card"><div class="stat-icon">💰</div><div class="stat-label">Total Ingresos</div><div class="stat-value green">${totalIngresos > 0 ? fmtNum(totalIngresos) : '—'}</div></div>
    <div class="stat-card"><div class="stat-icon">💸</div><div class="stat-label">Total Gastos</div><div class="stat-value red">${totalGastos > 0 ? fmtNum(totalGastos) : '—'}</div></div>
    <div class="stat-card"><div class="stat-icon">${ganancia >= 0 ? '📈' : '📉'}</div><div class="stat-label">Ganancia Neta</div><div class="stat-value ${ganancia >= 0 ? 'green' : 'red'}">${(totalIngresos > 0 || totalGastos > 0) ? fmtNum(ganancia) : '—'}</div></div>
    <div class="stat-card"><div class="stat-icon">✅</div><div class="stat-label">Completados</div><div class="stat-value">${pedidos.filter(p=>p.estado==='Completado').length}</div></div>
    <div class="stat-card"><div class="stat-icon">⏳</div><div class="stat-label">Pendientes</div><div class="stat-value">${pedidos.filter(p=>p.estado==='Pendiente').length}</div></div>
  `;
}

// ==================== CATÁLOGO ====================
function renderCatalogo() {
  const icons = ['💻','🖱️','⌨️','🖥️','🎧','📱','🖨️','📷','📦'];
  const grid = document.getElementById('catalogo-grid');
  grid.innerHTML = productos.map((p, i) => `
    <div class="catalogo-item">
      ${p.imagen
        ? `<img src="${p.imagen}" alt="${p.nombre}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
        : ''}
      <div class="cat-icon-wrap" style="${p.imagen ? 'display:none' : ''}">${icons[i % icons.length]}</div>
      <div class="cat-nombre">${p.nombre}</div>
      <div class="cat-cat">${p.categoria || ''}</div>
      <div class="cat-precio">${fmtNum(p.precio)}</div>
      <div class="cat-stock">${p.stock} en stock</div>
    </div>
  `).join('');
}

// ==================== THEME ====================
function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  document.getElementById('ajuste-tema') && (document.getElementById('ajuste-tema').value = theme);
  const icon = theme === 'dark' ? 'fa-sun' : 'fa-moon';
  document.querySelectorAll('#themeToggle i, #themeToggleMobile i').forEach(i => i.className = `fa-solid ${icon}`);
}
document.getElementById('themeToggle').addEventListener('click', () => setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'));
document.getElementById('themeToggleMobile').addEventListener('click', () => setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'));

// ==================== MODAL ====================
function showModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function closeModalOutside(e, id) { if (e.target === document.getElementById(id)) closeModal(id); }

// ==================== TOAST ====================
let toastTimer;
function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast show ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

// ==================== HELPERS ====================
function fmtNum(n) {
  const num = Number(n) || 0;
  return num.toLocaleString('es-CL');
}

function getIcon(categoria) {
  const map = { 'Electrónica':'💻','Accesorios':'🖱️','Audio':'🎧','Ropa':'👕','Alimentos':'🍎','Herramientas':'🔧' };
  return map[categoria] || '📦';
}

// ==================== INIT ====================
async function init() {
  setTheme(localStorage.getItem('theme') || 'light');
  const today = new Date().toISOString().split('T')[0];
  ['i-fecha','g-fecha'].forEach(id => { const el = document.getElementById(id); if(el) el.value = today; });
  await loadAll();
  navigate('inicio');
}

init();

// ==================== PEDIDO V2 ====================
let pedidoV2 = {
  numero: '', cliente: null, clienteNombre: '', tipo: 'Pedido', fecha: '',
  productos: {}, servicios: {},
  descuento: 0, iva: false, formaPago: '', observacion: ''
};

function continuarPedido() {
  if (!pedidoClienteSeleccionado) return showToast('Selecciona un cliente', 'error');
  const fecha = document.getElementById('ped-fecha').value;
  const tipo  = document.getElementById('ped-tipo').value;

  // generar numero
  const num = String(pedidos.length + 1).padStart(4, '0');
  pedidoV2 = {
    numero: num, cliente: pedidoClienteSeleccionado.id,
    clienteNombre: pedidoClienteSeleccionado.nombre,
    tipo, fecha, productos: {}, servicios: {},
    descuento: 0, iva: false, formaPago: '', observacion: ''
  };

  document.getElementById('pedido-titulo').textContent = tipo + ' ' + num;
  document.getElementById('pedido-info-card').innerHTML =
    `Número: ${num}<br>Fecha de Pedido: ${fecha.split('-').reverse().join('/')}<br>Cliente: ${pedidoClienteSeleccionado.nombre}`;

  document.getElementById('pedido-productos-agregados').innerHTML = '';
  document.getElementById('pedido-servicios-agregados').innerHTML = '';
  document.getElementById('ped-descuento').value = '';
  document.getElementById('ped-iva-label').textContent = 'IVA';
  document.getElementById('ped-iva-label').style.color = '#b0b8cc';
  document.getElementById('ped-total-display').textContent = '0';
  document.getElementById('ped-pago-label').textContent = 'Formas de pago';
  document.getElementById('ped-pago-label').style.color = '#b0b8cc';
  document.getElementById('ped-observacion').value = '';

  showPage('pedido-items');
}

// --- Producto picker ---
function showProductoPicker() {
  renderPickerProductos(productos);
  showModal('modal-producto-picker');
}
function renderPickerProductos(arr) {
  const c = document.getElementById('picker-lista-prod');
  c.innerHTML = arr.map(p => `
    <div class="item-card" onclick="agregarProductoPedido('${p.id}')">
      ${p.imagen ? `<img class="item-thumb" src="${p.imagen}" alt="">` : `<div class="item-thumb-placeholder">${getIcon(p.categoria)}</div>`}
      <div class="item-info">
        <div class="item-name">${p.nombre}</div>
        <div class="item-sub">${fmtNum(p.precio)}</div>
      </div>
    </div>`).join('') || '<p style="text-align:center;padding:20px;color:var(--text2)">Sin productos</p>';
}
function filtrarPickerProducto() {
  const q = document.getElementById('picker-filtro-prod').value.toLowerCase();
  renderPickerProductos(productos.filter(p => p.nombre.toLowerCase().includes(q)));
}
function agregarProductoPedido(pid) {
  pedidoV2.productos[pid] = (pedidoV2.productos[pid] || 0) + 1;
  closeModal('modal-producto-picker');
  renderProductosAgregados();
  recalcularTotal();
}
function renderProductosAgregados() {
  const c = document.getElementById('pedido-productos-agregados');
  c.innerHTML = Object.keys(pedidoV2.productos).map(pid => {
    const p = productos.find(x => x.id === pid); if (!p) return '';
    const qty = pedidoV2.productos[pid];
    return `<div class="pedido-item-agregado">
      <div class="item-name">${p.nombre}</div>
      <div class="item-price">${fmtNum(p.precio)}</div>
      <div class="pedido-qty-ctrl">
        <button onclick="cambiarQtyV2('prod','${pid}',-1)">−</button>
        <span>${qty}</span>
        <button class="plus" onclick="cambiarQtyV2('prod','${pid}',1)">+</button>
      </div>
    </div>`;
  }).join('');
}

// --- Servicio picker ---
function showServicioPicker() {
  const c = document.getElementById('picker-lista-serv');
  c.innerHTML = servicios.map(s => `
    <div class="item-card" onclick="agregarServicioPedido('${s.id}')">
      <div class="item-thumb-placeholder">🔧</div>
      <div class="item-info">
        <div class="item-name">${s.nombre}</div>
        <div class="item-sub">${fmtNum(s.precio)}</div>
      </div>
    </div>`).join('') || '<p style="text-align:center;padding:20px;color:var(--text2)">Sin servicios</p>';
  showModal('modal-servicio-picker');
}
function agregarServicioPedido(sid) {
  pedidoV2.servicios[sid] = (pedidoV2.servicios[sid] || 0) + 1;
  closeModal('modal-servicio-picker');
  renderServiciosAgregados();
  recalcularTotal();
}
function renderServiciosAgregados() {
  const c = document.getElementById('pedido-servicios-agregados');
  c.innerHTML = Object.keys(pedidoV2.servicios).map(sid => {
    const s = servicios.find(x => x.id === sid); if (!s) return '';
    const qty = pedidoV2.servicios[sid];
    return `<div class="pedido-item-agregado">
      <div class="item-name">${s.nombre}</div>
      <div class="item-price">${fmtNum(s.precio)}</div>
      <div class="pedido-qty-ctrl">
        <button onclick="cambiarQtyV2('serv','${sid}',-1)">−</button>
        <span>${qty}</span>
        <button class="plus" onclick="cambiarQtyV2('serv','${sid}',1)">+</button>
      </div>
    </div>`;
  }).join('');
}

function cambiarQtyV2(tipo, id, delta) {
  const obj = tipo === 'prod' ? pedidoV2.productos : pedidoV2.servicios;
  obj[id] = Math.max(0, (obj[id] || 0) + delta);
  if (obj[id] === 0) delete obj[id];
  if (tipo === 'prod') renderProductosAgregados();
  else renderServiciosAgregados();
  recalcularTotal();
}

function recalcularTotal() {
  let subtotal = 0;
  Object.keys(pedidoV2.productos).forEach(pid => {
    const p = productos.find(x => x.id === pid);
    if (p) subtotal += p.precio * pedidoV2.productos[pid];
  });
  Object.keys(pedidoV2.servicios).forEach(sid => {
    const s = servicios.find(x => x.id === sid);
    if (s) subtotal += s.precio * pedidoV2.servicios[sid];
  });
  const desc = parseFloat(document.getElementById('ped-descuento').value) || 0;
  pedidoV2.descuento = desc;
  let total = subtotal - desc;
  if (pedidoV2.iva) total = total * 1.19;
  pedidoV2.total = Math.max(0, Math.round(total));
  document.getElementById('ped-total-display').textContent = fmtNum(pedidoV2.total);
}

function toggleIVA() {
  pedidoV2.iva = !pedidoV2.iva;
  const lbl = document.getElementById('ped-iva-label');
  lbl.textContent = pedidoV2.iva ? 'IVA 19% incluido' : 'IVA';
  lbl.style.color = pedidoV2.iva ? 'var(--accent)' : '#b0b8cc';
  recalcularTotal();
}

function showPagoPicker() { showModal('modal-pago-picker'); }
function seleccionarPago(forma) {
  if (window._pagoTarget === 'detalle' && pedidoEditando) {
    pedidoEditando.formaPago = forma;
    const lbl = document.getElementById('det-pago');
    if (lbl) { lbl.textContent = forma; lbl.style.color = 'var(--text)'; }
    window._pagoTarget = null;
  } else {
    pedidoV2.formaPago = forma;
    const lbl = document.getElementById('ped-pago-label');
    if (lbl) { lbl.textContent = forma; lbl.style.color = 'var(--text)'; }
  }
  closeModal('modal-pago-picker');
}

async function crearPedidoFinal() {
  const pids = Object.keys(pedidoV2.productos);
  const sids = Object.keys(pedidoV2.servicios);
  if (!pids.length && !sids.length) return showToast('Agrega al menos un producto o servicio', 'error');

  recalcularTotal();
  const items = [
    ...pids.map(pid => { const p = productos.find(x => x.id === pid); return { id: pid, nombre: p.nombre, precio: p.precio, cantidad: pedidoV2.productos[pid], tipo: 'producto' }; }),
    ...sids.map(sid => { const s = servicios.find(x => x.id === sid); return { id: sid, nombre: s.nombre, precio: s.precio, cantidad: pedidoV2.servicios[sid], tipo: 'servicio' }; })
  ];

  const pedido = await api('POST', '/pedidos', {
    numero: pedidoV2.numero,
    cliente: pedidoV2.clienteNombre,
    tipo: pedidoV2.tipo,
    fecha: pedidoV2.fecha,
    items,
    descuento: pedidoV2.descuento,
    iva: pedidoV2.iva,
    formaPago: pedidoV2.formaPago,
    observacion: document.getElementById('ped-observacion').value,
    total: pedidoV2.total
  });
  pedidos.push(pedido);
  showToast('Pedido ' + pedidoV2.numero + ' guardado', 'success');
  navigate('pedidos');
}

// ==================== AJUSTES ====================
function toggleDarkMode() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  setTheme(isDark ? 'light' : 'dark');
  const toggle = document.getElementById('dark-toggle');
  if (toggle) toggle.classList.toggle('on', !isDark);
}

function guardarPerfil() {
  const nombre = document.getElementById('perfil-nombre').value.trim();
  if (nombre) {
    document.getElementById('settings-username').textContent = nombre;
    const initials = nombre.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
    document.getElementById('settings-avatar').textContent = initials;
  }
  closeModal('modal-perfil');
  showToast('Perfil actualizado', 'success');
}

async function limpiarClientes() {
  if (!confirm('¿Eliminar todos los clientes? Esta acción no se puede deshacer.')) return;
  await api('DELETE', '/clientes/all');
  clientes = [];
  showToast('Clientes eliminados', 'success');
}

async function reiniciarPedidos() {
  if (!confirm('¿Eliminar todos los pedidos? Esta acción no se puede deshacer.')) return;
  await api('DELETE', '/pedidos/all');
  pedidos = [];
  showToast('Pedidos reiniciados', 'success');
}

// ==================== IMPORTAR CLIENTES ====================
let importData = [];

function dragOver(e) {
  e.preventDefault();
  document.getElementById('import-dropzone').classList.add('drag-over');
}
function dropFile(e) {
  e.preventDefault();
  document.getElementById('import-dropzone').classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) processImportFile(file);
}
function handleImportFile(input) {
  if (input.files && input.files[0]) processImportFile(input.files[0]);
}

function processImportFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const reader = new FileReader();

  if (ext === 'csv') {
    reader.onload = e => {
      const rows = parseCSV(e.target.result);
      showImportPreview(file, rows);
    };
    reader.readAsText(file, 'UTF-8');
  } else {
    // xlsx/xls — load SheetJS dynamically
    reader.onload = e => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        showImportPreview(file, rows);
      } catch(err) {
        showToast('Error al leer el archivo', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  }
}

function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const obj = {};
    headers.forEach((h, i) => obj[h] = vals[i] || '');
    return obj;
  });
}

function showImportPreview(file, rows) {
  importData = rows;
  const sizeKB = (file.size / 1024).toFixed(1);

  document.getElementById('import-file-info').innerHTML = `
    <i class="fa-solid fa-file-excel"></i>
    <span style="flex:1">${file.name}</span>
    <span class="file-size">${rows.length} filas · ${sizeKB} KB</span>`;
  document.getElementById('import-preview').style.display = 'block';

  // Preview table (first 5 rows)
  if (rows.length > 0) {
    const headers = Object.keys(rows[0]);
    const preview = rows.slice(0, 5);
    document.getElementById('import-table-wrap').innerHTML = `
      <table class="import-table">
        <thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${preview.map(r=>`<tr>${headers.map(h=>`<td>${r[h]||''}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>`;
  }

  // Enable import button
  const btn = document.getElementById('import-btn');
  btn.style.background = '#3b5bdb';
  btn.style.pointerEvents = 'auto';
}

async function comenzarImportacion() {
  if (!importData.length) return showToast('Selecciona un archivo primero', 'error');

  // Normalize column names
  const nameKeys   = ['razon social','razón social','nombre o razon social','nombre o razón social','razon_social','nombre','contacto','name','empresa','company'];
  const phoneKeys  = ['teléfono','telefono','celular','phone','tel'];
  const emailKeys  = ['correo','email','e-mail','mail'];
  const dirKeys    = ['dirección','direccion','address'];
  const rutKeys    = ['rut','dni','documento'];
  const notaKeys   = ['observación','observacion','giro','nota','note'];

  function findKey(obj, keys) {
    const lower = Object.keys(obj).map(k => ({ orig: k, low: k.toLowerCase() }));
    for (const k of keys) {
      const match = lower.find(l => l.low.includes(k));
      if (match) return obj[match.orig];
    }
    return '';
  }

  let importados = 0, errores = 0;
  for (const row of importData) {
    const nombre = findKey(row, nameKeys);
    if (!nombre) { errores++; continue; }
    try {
      const c = await api('POST', '/clientes', {
        nombre,
        telefono1: findKey(row, phoneKeys),
        email: findKey(row, emailKeys),
        direccion: findKey(row, dirKeys),
        documento: findKey(row, rutKeys),
        nota: findKey(row, notaKeys),
        totalCompras: 0
      });
      clientes.push(c);
      importados++;
    } catch(e) { errores++; }
  }

  showToast(`${importados} clientes importados${errores ? `, ${errores} omitidos` : ''}`, 'success');
  importData = [];
  document.getElementById('import-preview').style.display = 'none';
  document.getElementById('import-file').value = '';
  const btn = document.getElementById('import-btn');
  btn.style.background = '#c0c8d8';
  btn.style.pointerEvents = 'none';
  navigate('clientes');
}

// ==================== AGREGAR PRODUCTO (página con checkboxes) ====================
let pickerSeleccion = {}; // pid -> true

function showProductoPicker() {
  pickerSeleccion = {};
  // Pre-marcar los que ya están en el pedido
  Object.keys(pedidoV2.productos).forEach(pid => { pickerSeleccion[pid] = true; });
  switchPickerTab('catalogar');
  document.getElementById('picker-search-prod').value = '';
  renderPickerCheckList(productos);
  showPage('agregar-producto');
}

function switchPickerTab(tab) {
  document.getElementById('tab-catalogar').classList.toggle('active', tab === 'catalogar');
  document.getElementById('tab-registrar').classList.toggle('active', tab === 'registrar');
  document.getElementById('picker-tab-catalogar').style.display = tab === 'catalogar' ? 'block' : 'none';
  document.getElementById('picker-tab-registrar').style.display = tab === 'registrar' ? 'block' : 'none';
  document.getElementById('btn-seleccionar-productos').style.display = tab === 'catalogar' ? 'block' : 'none';
}

function renderPickerCheckList(arr) {
  const c = document.getElementById('picker-check-list');
  if (!arr.length) {
    c.innerHTML = '<div class="empty-list"><i class="fa-solid fa-cube"></i><p>No hay productos</p></div>';
    return;
  }
  c.innerHTML = arr.map(p => {
    const sel = pickerSeleccion[p.id] ? 'selected' : '';
    return `
    <div class="picker-check-card ${sel}" id="pcc-${p.id}" onclick="togglePickerCheck('${p.id}')">
      <div class="picker-checkbox">
        <i class="fa-solid fa-check"></i>
      </div>
      <div class="picker-check-info">
        <div class="picker-check-name">${p.nombre}</div>
        <div class="picker-check-price">${fmtNum(p.precio)}</div>
      </div>
    </div>`;
  }).join('');
}

function togglePickerCheck(pid) {
  pickerSeleccion[pid] = !pickerSeleccion[pid];
  if (!pickerSeleccion[pid]) delete pickerSeleccion[pid];
  const card = document.getElementById('pcc-' + pid);
  if (card) card.classList.toggle('selected', !!pickerSeleccion[pid]);
}

function filtrarPickerCheck() {
  const q = document.getElementById('picker-search-prod').value.toLowerCase();
  renderPickerCheckList(productos.filter(p => p.nombre.toLowerCase().includes(q)));
}

function confirmarSeleccionProductos() {
  const pids = Object.keys(pickerSeleccion);
  if (!pids.length) { showToast('Selecciona al menos un producto', 'error'); return; }
  // Agregar al pedidoV2 (cantidad 1 si nuevo, mantener si ya existía)
  pids.forEach(pid => {
    if (!pedidoV2.productos[pid]) pedidoV2.productos[pid] = 1;
  });
  // Quitar los que se desmarcaron
  Object.keys(pedidoV2.productos).forEach(pid => {
    if (!pickerSeleccion[pid]) delete pedidoV2.productos[pid];
  });
  renderProductosAgregados();
  recalcularTotal();
  showPage('pedido-items');
}

async function registrarYAgregarProducto() {
  const nombre = document.getElementById('pr-nombre').value.trim();
  if (!nombre) { showToast('El nombre es requerido', 'error'); return; }
  const precio = parseFloat(document.getElementById('pr-precio').value) || 0;
  const coste  = parseFloat(document.getElementById('pr-coste').value) || 0;
  const barcode = document.getElementById('pr-barcode').value.trim();
  const codigo  = document.getElementById('pr-codigo').value.trim();
  const stock   = parseInt(document.getElementById('pr-stock').value) || 0;

  const p = await api('POST', '/productos', { nombre, precio, coste, barcode, codigo, stock });
  productos.push(p);
  pedidoV2.productos[p.id] = 1;
  renderProductosAgregados();
  recalcularTotal();
  showToast('Producto registrado y agregado', 'success');
  // Reset form
  ['pr-nombre','pr-precio','pr-coste','pr-barcode','pr-codigo','pr-stock'].forEach(id => {
    document.getElementById(id).value = '';
  });
  showPage('pedido-items');
}

// ==================== DETALLE PEDIDO ====================
let pedidoEditando = null;

function filtrarPedidos() {
  const q = document.getElementById('filtro-pedidos').value.toLowerCase();
  const filtrados = pedidos.filter(p =>
    (p.numero||'').toLowerCase().includes(q) ||
    (p.cliente||'').toLowerCase().includes(q)
  );
  const container = document.getElementById('lista-pedidos');
  const empty = document.getElementById('pedidos-empty');
  if (!filtrados.length) {
    container.innerHTML = '';
    if (empty) empty.style.display = 'flex';
    return;
  }
  if (empty) empty.style.display = 'none';
  container.innerHTML = [...filtrados].reverse().map(p => `
    <div class="item-card" onclick="abrirDetallePedido('${p.id}')" style="cursor:pointer">
      <div class="item-thumb-placeholder" style="background:linear-gradient(135deg,#3b5bdb,#5c7cfa);color:white;font-size:16px">📦</div>
      <div class="item-info">
        <div class="item-name">#${p.numero}</div>
        <div class="item-sub">${p.cliente||'—'} · ${p.fecha?p.fecha.split('-').reverse().join('/'):''}
        </div>
        <div class="item-sub" style="font-weight:700;color:var(--text)">${fmtNum(p.total||0)}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0">
        <span class="badge ${p.estado==='Completado'?'badge-done':p.estado==='Cancelado'?'badge-cancel':'badge-pending'}">${p.estado}</span>
        <i class="fa-solid fa-chevron-right" style="color:var(--text2);font-size:11px;margin-top:4px"></i>
      </div>
    </div>`).join('');
}

function abrirDetallePedido(id) {
  const p = pedidos.find(x => x.id === id);
  if (!p) return;
  pedidoEditando = JSON.parse(JSON.stringify(p)); // copia editable

  document.getElementById('detalle-titulo').textContent = (p.tipo||'Pedido') + ' ' + p.numero;
  document.getElementById('det-fecha').value = p.fecha || '';
  document.getElementById('det-cliente').textContent = p.cliente || '—';
  document.getElementById('det-observacion').value = p.observacion || '';
  document.getElementById('det-descuento').value = p.descuento || '';

  // Estado
  setDetEstado(p.estado || 'Pendiente');

  // IVA
  const ivaOn = p.iva || false;
  const ivaLbl = document.getElementById('det-iva-label');
  ivaLbl.textContent = ivaOn ? 'IVA 19% incluido' : 'IVA';
  ivaLbl.style.color = ivaOn ? 'var(--accent)' : '#b0b8cc';

  // Forma de pago
  const pagoLbl = document.getElementById('det-pago');
  pagoLbl.textContent = p.formaPago || 'Formas de pago';
  pagoLbl.style.color = p.formaPago ? 'var(--text)' : '#b0b8cc';

  // Total
  document.getElementById('det-total').textContent = fmtNum(p.total || 0);

  // Productos
  renderDetProductos();

  switchDetalleTab('pedido');
  showPage('detalle-pedido');
}

function setDetEstado(estado) {
  document.getElementById('det-estado').textContent = estado;
  const colores = { 'Pendiente': '#f97316', 'Completado': '#10b981', 'Cancelado': '#ef4444' };
  document.getElementById('det-estado-dot').style.background = colores[estado] || '#f97316';
  if (pedidoEditando) pedidoEditando.estado = estado;
}

function switchDetalleTab(tab) {
  ['pedido','pagos','horario'].forEach(t => {
    document.getElementById('dtab-' + t).classList.toggle('active', t === tab);
    document.getElementById('dtab-content-' + t).style.display = t === tab ? 'block' : 'none';
  });
}

function renderDetProductos() {
  const items = pedidoEditando.items || [];
  const c = document.getElementById('det-productos-list');
  if (!items.length) { c.innerHTML = ''; return; }
  c.innerHTML = items.map((item, i) => `
    <div class="det-prod-card">
      <div class="det-prod-info">
        <div class="det-prod-name">${item.nombre}</div>
        <div class="det-prod-meta">Cantidad: ${item.cantidad} &nbsp;·&nbsp; Total: ${fmtNum((item.precio||0) * item.cantidad)}</div>
      </div>
      <button class="btn-edit-prod" onclick="editarItemDetalle(${i})"><i class="fa-solid fa-pen-to-square"></i></button>
    </div>`).join('');
}

function editarItemDetalle(i) {
  const item = pedidoEditando.items[i];
  const nueva = prompt(`Cantidad para "${item.nombre}":`, item.cantidad);
  if (nueva === null) return;
  const qty = parseInt(nueva);
  if (qty <= 0) { pedidoEditando.items.splice(i, 1); }
  else { pedidoEditando.items[i].cantidad = qty; }
  renderDetProductos();
  recalcularDetalle();
}

function abrirAgregarProductoDetalle() {
  // reusar picker de productos pero volviendo a detalle
  pickerSeleccion = {};
  (pedidoEditando.items || []).forEach(it => { if (it.tipo !== 'servicio') pickerSeleccion[it.id] = true; });
  switchPickerTab('catalogar');
  document.getElementById('picker-search-prod').value = '';
  renderPickerCheckList(productos);
  // Cambiar back button temporalmente
  document.querySelector('#page-agregar-producto .back-btn').setAttribute('onclick','showPage("detalle-pedido")');
  document.getElementById('btn-seleccionar-productos').setAttribute('onclick','confirmarSeleccionProductosDetalle()');
  showPage('agregar-producto');
}

function confirmarSeleccionProductosDetalle() {
  const pids = Object.keys(pickerSeleccion);
  // Remover productos no seleccionados
  pedidoEditando.items = (pedidoEditando.items || []).filter(it => it.tipo === 'servicio' || pickerSeleccion[it.id]);
  // Agregar nuevos
  pids.forEach(pid => {
    const existe = pedidoEditando.items.find(it => it.id === pid);
    if (!existe) {
      const p = productos.find(x => x.id === pid);
      if (p) pedidoEditando.items.push({ id: p.id, nombre: p.nombre, precio: p.precio, cantidad: 1, tipo: 'producto' });
    }
  });
  renderDetProductos();
  recalcularDetalle();
  // Restaurar botón
  document.getElementById('btn-seleccionar-productos').setAttribute('onclick','confirmarSeleccionProductos()');
  document.querySelector('#page-agregar-producto .back-btn').setAttribute('onclick','showPage("pedido-items")');
  showPage('detalle-pedido');
}

function recalcularDetalle() {
  const items = pedidoEditando.items || [];
  let sub = items.reduce((s, it) => s + (it.precio||0) * it.cantidad, 0);
  const desc = parseFloat(document.getElementById('det-descuento').value) || 0;
  let total = sub - desc;
  if (pedidoEditando.iva) total *= 1.19;
  pedidoEditando.total = Math.max(0, Math.round(total));
  document.getElementById('det-total').textContent = fmtNum(pedidoEditando.total);
}

function toggleIVADetalle() {
  pedidoEditando.iva = !pedidoEditando.iva;
  const lbl = document.getElementById('det-iva-label');
  lbl.textContent = pedidoEditando.iva ? 'IVA 19% incluido' : 'IVA';
  lbl.style.color = pedidoEditando.iva ? 'var(--accent)' : '#b0b8cc';
  recalcularDetalle();
}

function showPagoPickerDetalle() {
  // reusar modal-pago-picker pero redirigir a detalle
  showModal('modal-pago-picker');
  // override seleccionarPago temporalmente se hace con flag
  window._pagoTarget = 'detalle';
}

function showMenuPedido() {
  const opciones = ['Completado', 'Pendiente', 'Cancelado', 'Eliminar pedido'];
  const sel = prompt('Cambiar estado o acción:\n1. Completado\n2. Pendiente\n3. Cancelado\n4. Eliminar pedido\n\nEscribe el número:');
  if (sel === '1') setDetEstado('Completado');
  else if (sel === '2') setDetEstado('Pendiente');
  else if (sel === '3') setDetEstado('Cancelado');
  else if (sel === '4') eliminarPedidoDetalle();
}

async function eliminarPedidoDetalle() {
  if (!confirm('¿Eliminar este pedido?')) return;
  await api('DELETE', '/pedidos/' + pedidoEditando.id);
  pedidos = pedidos.filter(p => p.id !== pedidoEditando.id);
  navigate('pedidos');
}

function showModalEstado() {
  const estados = ['Pendiente', 'Completado', 'Cancelado'];
  const actual = pedidoEditando.estado || 'Pendiente';
  // simple cycle
  const idx = estados.indexOf(actual);
  setDetEstado(estados[(idx + 1) % estados.length]);
}

async function actualizarPedido() {
  if (!pedidoEditando) return;
  pedidoEditando.fecha = document.getElementById('det-fecha').value;
  pedidoEditando.observacion = document.getElementById('det-observacion').value;
  pedidoEditando.descuento = parseFloat(document.getElementById('det-descuento').value) || 0;
  recalcularDetalle();

  const actualizado = await api('PUT', '/pedidos/' + pedidoEditando.id, pedidoEditando);
  const idx = pedidos.findIndex(p => p.id === pedidoEditando.id);
  if (idx !== -1) pedidos[idx] = actualizado;
  showToast('Pedido actualizado', 'success');
}

function generarDocumento() {
  if (!pedidoEditando) return;
  const p = pedidoEditando;

  // Buscar datos del cliente
  const clienteObj = clientes.find(c => c.nombre === p.cliente) || {};
  const fechaFmt = p.fecha ? p.fecha.split('-').reverse().join('/') : '—';

  // Calcular subtotal
  const items = p.items || [];
  const subtotal = items.reduce((s, it) => s + (it.precio || 0) * (it.cantidad || 1), 0);
  const descuento = p.descuento || 0;
  const baseIva = subtotal - descuento;
  const iva = p.iva ? Math.round(baseIva * 0.19) : 0;
  const total = baseIva + iva;

  // Filas de productos
  const filasProd = items.map(it => {
    const subtotalItem = (it.precio || 0) * (it.cantidad || 1);
    const img = it.imagen
      ? `<img src="${it.imagen}" style="width:48px;height:48px;object-fit:contain;border-radius:6px">`
      : `<div style="width:48px;height:48px;background:#e8f0fe;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:20px">📦</div>`;
    return `<tr>
      <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0">
        <div style="display:flex;align-items:center;gap:10px">
          ${img}
          <div>
            <div style="font-weight:700;font-size:13px">${it.nombre}</div>
            ${it.descripcion ? `<div style="font-size:11px;color:#666;margin-top:2px">${it.descripcion}</div>` : ''}
          </div>
        </div>
      </td>
      <td style="padding:10px 8px;text-align:center;border-bottom:1px solid #f0f0f0;font-size:13px">${it.cantidad || 1} un</td>
      <td style="padding:10px 8px;text-align:right;border-bottom:1px solid #f0f0f0;font-size:13px">$ ${fmtNum(it.precio || 0)}</td>
      <td style="padding:10px 8px;text-align:right;border-bottom:1px solid #f0f0f0;font-size:13px;font-weight:600">$ ${fmtNum(subtotalItem)}</td>
    </tr>`;
  }).join('');

  // Obtener perfil guardado
  const empresa = document.getElementById('perfil-empresa')?.value || 'Pro Ventas Magic';
  const nombreUsuario = document.getElementById('perfil-nombre')?.value || '';

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pedido ${p.numero}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; background:#f5f5f5; padding:20px; color:#222; }
    .doc { background:#fff; max-width:780px; margin:0 auto; border-radius:12px; overflow:hidden; box-shadow:0 2px 20px rgba(0,0,0,.1); }
    .header { display:flex; justify-content:space-between; align-items:center; padding:24px 28px; background:#fff; border-bottom:4px solid #f97316; }
    .logo-area { display:flex; flex-direction:column; }
    .logo-empresa { font-size:20px; font-weight:800; color:#1a3a5c; }
    .logo-sub { font-size:12px; color:#666; margin-top:2px; }
    .header-info { text-align:right; background:#1a3a5c; color:#fff; padding:14px 18px; border-radius:8px; font-size:12px; line-height:1.8; }
    .header-info span { display:block; }
    .divider-bar { height:8px; background:#f97316; }
    .body { padding:24px 28px; }
    .two-col { display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-bottom:24px; }
    .section-title { font-size:13px; font-weight:800; color:#f97316; border-bottom:2px solid #f97316; padding-bottom:4px; margin-bottom:10px; letter-spacing:1px; }
    .info-row { font-size:12px; color:#444; line-height:1.9; }
    .info-row strong { color:#222; }
    table { width:100%; border-collapse:collapse; margin-bottom:16px; }
    thead tr { background:#1a3a5c; color:#fff; }
    thead th { padding:10px 8px; text-align:left; font-size:12px; font-weight:700; }
    thead th:nth-child(2), thead th:nth-child(3), thead th:nth-child(4) { text-align:center; }
    thead th:nth-child(3), thead th:nth-child(4) { text-align:right; }
    .totales { display:flex; justify-content:flex-end; margin-top:8px; }
    .totales-box { min-width:260px; }
    .totales-row { display:flex; justify-content:space-between; padding:6px 0; font-size:13px; border-bottom:1px solid #f0f0f0; }
    .totales-row.total { font-weight:800; font-size:16px; color:#1a3a5c; border-top:2px solid #1a3a5c; border-bottom:none; padding-top:10px; margin-top:4px; }
    .obs { margin-top:20px; padding:14px; background:#f8f9fa; border-radius:8px; font-size:12px; color:#555; }
    .footer-btns { display:flex; gap:12px; padding:20px 28px; background:#f8f9fa; border-top:1px solid #eee; }
    .btn { flex:1; padding:14px; border:none; border-radius:10px; font-size:15px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; }
    .btn-share { background:#3b5bdb; color:#fff; }
    .btn-print { background:#1a3a5c; color:#fff; }
    @media print { body { background:#fff; padding:0; } .footer-btns { display:none; } .doc { box-shadow:none; } }
  </style>
</head>
<body>
  <div class="doc">
    <div class="header">
      <div class="logo-area">
        <div class="logo-empresa">🏢 ${empresa}</div>
        ${nombreUsuario ? `<div class="logo-sub">${nombreUsuario}</div>` : ''}
      </div>
      <div class="header-info">
        ${clienteObj.email ? `<span>✉ ${clienteObj.email}</span>` : ''}
        ${clienteObj.telefono ? `<span>📞 ${clienteObj.telefono}</span>` : ''}
        ${clienteObj.direccion ? `<span>📍 ${clienteObj.direccion}</span>` : ''}
      </div>
    </div>
    <div class="divider-bar"></div>

    <div class="body">
      <div class="two-col">
        <div>
          <div class="section-title">PEDIDO</div>
          <div class="info-row">
            <strong>Pedido:</strong> ${String(p.numero).padStart(4,'0')}<br>
            <strong>Fecha:</strong> ${fechaFmt}<br>
            <strong>Estado:</strong> ${p.estado || 'Pendiente'}<br>
            ${p.pago ? `<strong>Pago:</strong> ${p.pago}<br>` : ''}
          </div>
        </div>
        <div>
          <div class="section-title">CLIENTE</div>
          <div class="info-row">
            <strong>Nombre:</strong> ${p.cliente || '—'}<br>
            ${clienteObj.telefono ? `<strong>Teléfono:</strong> ${clienteObj.telefono}<br>` : ''}
            ${clienteObj.documento ? `<strong>ID:</strong> ${clienteObj.documento}<br>` : ''}
            ${clienteObj.direccion ? `<strong>Dirección:</strong> ${clienteObj.direccion}<br>` : ''}
          </div>
        </div>
      </div>

      <div class="section-title">Productos</div>
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th style="text-align:center">Cantidad</th>
            <th style="text-align:right">Valor Unitario</th>
            <th style="text-align:right">Total</th>
          </tr>
        </thead>
        <tbody>${filasProd}</tbody>
      </table>

      <div class="totales">
        <div class="totales-box">
          <div class="totales-row"><span>Productos</span><span>$ ${fmtNum(subtotal)}</span></div>
          ${descuento ? `<div class="totales-row"><span>Descuento</span><span>- $ ${fmtNum(descuento)}</span></div>` : ''}
          ${p.iva ? `<div class="totales-row"><span>IVA (19.0%)</span><span>$ ${fmtNum(iva)}</span></div>` : ''}
          <div class="totales-row total"><span>Total</span><span>$ ${fmtNum(total)}</span></div>
        </div>
      </div>

      ${p.observacion ? `<div class="obs"><strong>Observación:</strong> ${p.observacion}</div>` : ''}
    </div>

    <div class="footer-btns">
      <button class="btn btn-share" onclick="if(navigator.share){navigator.share({title:'Pedido ${p.numero}',text:'Documento adjunto'})}else{alert('Comparte desde el menú del navegador')}">
        🔗 Compartir
      </button>
      <button class="btn btn-print" onclick="window.print()">
        🖨️ Imprimir A4
      </button>
    </div>
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  showToast('Documento generado', 'success');
}

// ==================== PEDIDOS MENU ====================
function buildPedidoCard(p) {
  const colores = { 'Pendiente': '#f97316', 'Completado': '#10b981', 'Cancelado': '#ef4444' };
  const color = colores[p.estado] || '#f97316';
  const fecha = p.fecha ? p.fecha.split('-').reverse().join('/') : '';
  return `
  <div class="pedido-lista-card" onclick="abrirDetallePedido('${p.id}')">
    <div class="pedido-lista-top">
      <span class="pedido-lista-num">#${p.numero}</span>
      <span class="pedido-lista-fecha">${fecha}</span>
    </div>
    <div class="pedido-lista-cliente">${p.cliente || '—'}</div>
    <div class="pedido-lista-total">${fmtNum(p.total || 0)}</div>
    <div class="pedido-lista-estado">
      <span class="pedido-lista-dot" style="background:${color}"></span>
      <span style="color:${color}">${p.estado || 'Pendiente'}</span>
    </div>
  </div>`;
}

function abrirPedidosRecientes() {
  showPage('pedidos-recientes');
  document.getElementById('filtro-recientes').value = '';
  renderPedidosRecientes(pedidos);
}

function renderPedidosRecientes(arr) {
  const lista = document.getElementById('lista-recientes');
  const empty = document.getElementById('recientes-empty');
  const sorted = [...arr].reverse();
  if (!sorted.length) {
    lista.innerHTML = '';
    empty.style.display = 'flex';
    return;
  }
  empty.style.display = 'none';
  lista.innerHTML = sorted.map(buildPedidoCard).join('');
}

function filtrarPedidosRecientes() {
  const q = document.getElementById('filtro-recientes').value.toLowerCase();
  const filtrados = pedidos.filter(p =>
    (p.numero||'').toLowerCase().includes(q) ||
    (p.cliente||'').toLowerCase().includes(q)
  );
  renderPedidosRecientes(filtrados);
}

// Buscar por cliente
let clientePickerPedidosCallback = null;

function showClientePickerPedidos() {
  // Reusar modal-cliente-picker
  renderPickerClientes(clientes);
  window._clientePickerTarget = 'pedidos';
  showModal('modal-cliente-picker');
}

function seleccionarClientePedidos(cid) {
  const c = clientes.find(x => x.id === cid);
  if (!c) return;
  document.getElementById('pedidos-cliente-label').textContent = c.nombre;
  closeModal('modal-cliente-picker');
  const pedidosCliente = pedidos.filter(p => p.cliente === c.nombre);
  const lista = document.getElementById('lista-pedidos-cliente');
  if (!pedidosCliente.length) {
    lista.innerHTML = '<div class="empty-list"><i class="fa-solid fa-bag-shopping"></i><p>Sin pedidos para este cliente</p></div>';
    return;
  }
  lista.innerHTML = '<div class="pedidos-lista">' + [...pedidosCliente].reverse().map(buildPedidoCard).join('') + '</div>';
}

// ==================== IMPORTAR PRODUCTOS ====================
let importProdData = [];

function dragOverProd(e) {
  e.preventDefault();
  document.getElementById('import-prod-dropzone').classList.add('drag-over');
}
function dropFileProd(e) {
  e.preventDefault();
  document.getElementById('import-prod-dropzone').classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) processImportProdFile(file);
}
function handleImportProdFile(input) {
  if (input.files && input.files[0]) processImportProdFile(input.files[0]);
}

function processImportProdFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const reader = new FileReader();
  if (ext === 'csv') {
    reader.onload = e => { showImportProdPreview(file, parseCSV(e.target.result)); };
    reader.readAsText(file, 'UTF-8');
  } else {
    reader.onload = e => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
        showImportProdPreview(file, rows);
      } catch(err) { showToast('Error al leer el archivo', 'error'); }
    };
    reader.readAsArrayBuffer(file);
  }
}

function showImportProdPreview(file, rows) {
  importProdData = rows;
  const sizeKB = (file.size / 1024).toFixed(1);
  document.getElementById('import-prod-file-info').innerHTML = `
    <i class="fa-solid fa-file-excel"></i>
    <span style="flex:1">${file.name}</span>
    <span class="file-size">${rows.length} filas · ${sizeKB} KB</span>`;
  document.getElementById('import-prod-preview').style.display = 'block';
  if (rows.length > 0) {
    const headers = Object.keys(rows[0]);
    const preview = rows.slice(0, 5);
    document.getElementById('import-prod-table-wrap').innerHTML = `
      <table class="import-table">
        <thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${preview.map(r=>`<tr>${headers.map(h=>`<td>${r[h]||''}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>`;
  }
  const btn = document.getElementById('import-prod-btn');
  btn.style.background = '#3b5bdb';
  btn.style.pointerEvents = 'auto';
}

async function comenzarImportacionProductos() {
  if (!importProdData.length) return showToast('Selecciona un archivo primero', 'error');

  const nameKeys      = ['productos','producto','nombre','descripcion','articulo','name','product'];
  const tipoKeys      = ['tipo de producto','tipo producto','tipo'];
  const varianteKeys  = ['variante'];
  const barcodeKeys   = ['codigo de barras','código de barras','barcode','codigo barras'];
  const skuKeys       = ['sku'];
  const stockKeys     = ['stock'];
  const despachKeys   = ['cantidad por despachar','por despachar','despachar'];
  const dispKeys      = ['cantidad disponible','disponible'];
  const recibirKeys   = ['por recibir','a recibir'];
  const marcaKeys     = ['marca','brand'];

  function findKey(obj, keys) {
    const lower = Object.keys(obj).map(k => ({ orig: k, low: k.toLowerCase().trim() }));
    for (const k of keys) {
      const match = lower.find(l => l.low === k || l.low.includes(k));
      if (match) return String(obj[match.orig]).trim();
    }
    return '';
  }

  function cleanNum(v) { return parseFloat(String(v).replace(/[^0-9.,]/g,'').replace(',','.')) || 0; }
  function cleanInt(v) { return parseInt(String(v).replace(/[^0-9]/g,'')) || 0; }

  let importados = 0, errores = 0;
  for (const row of importProdData) {
    const nombre = findKey(row, nameKeys);
    if (!nombre || nombre === '0' || nombre === '') { errores++; continue; }
    try {
      const p = await api('POST', '/productos', {
        nombre,
        tipo:               findKey(row, tipoKeys),
        variante:           findKey(row, varianteKeys),
        barcode:            findKey(row, barcodeKeys),
        sku:                findKey(row, skuKeys),
        stock:              cleanInt(findKey(row, stockKeys)),
        cantidadDespachar:  cleanInt(findKey(row, despachKeys)),
        cantidadDisponible: cleanInt(findKey(row, dispKeys)),
        porRecibir:         cleanInt(findKey(row, recibirKeys)),
        marca:              findKey(row, marcaKeys),
        precio: 0,
      });
      productos.push(p);
      importados++;
    } catch(e) { errores++; }
  }

  showToast(`${importados} productos importados${errores ? `, ${errores} omitidos` : ''}`, 'success');
  importProdData = [];
  document.getElementById('import-prod-preview').style.display = 'none';
  document.getElementById('import-prod-file').value = '';
  const btn = document.getElementById('import-prod-btn');
  btn.style.background = '#c0c8d8';
  btn.style.pointerEvents = 'none';
  navigate('productos');
}

async function limpiarProductos() {
  if (!confirm('¿Eliminar todos los productos? Esta acción no se puede deshacer.')) return;
  await api('DELETE', '/productos/all');
  productos = [];
  showToast('Productos eliminados', 'success');
}
