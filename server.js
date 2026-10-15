// Busca el .env junto a server.js; si no está, usa la ruta antigua de este servidor
require('dotenv').config({ path: [require('path').join(__dirname, '.env'), '/mnt/ssd/proventas/app/.env'], quiet: true });
const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const Database = require('better-sqlite3');
const setupAuth = require('./auth');

// ==================== BASE DE DATOS SQLite ====================
// DATA_DIR manda; si no existe, usa el volumen de Railway (variable automática); si no, ./data
const dataDir = process.env.DATA_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'ventas.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS productos (
    id TEXT PRIMARY KEY, nombre TEXT NOT NULL, descripcion TEXT DEFAULT '',
    precio REAL DEFAULT 0, coste REAL DEFAULT 0, barcode TEXT DEFAULT '',
    codigo TEXT DEFAULT '', sku TEXT DEFAULT '', categoria TEXT DEFAULT '',
    unidad TEXT DEFAULT '', stock INTEGER DEFAULT 0, marca TEXT DEFAULT '',
    tipo TEXT DEFAULT '', variante TEXT DEFAULT '',
    cantidadDespachar INTEGER DEFAULT 0, cantidadDisponible INTEGER DEFAULT 0,
    porRecibir INTEGER DEFAULT 0, imagen TEXT DEFAULT '',
    creado TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS clientes (
    id TEXT PRIMARY KEY, nombre TEXT NOT NULL, email TEXT DEFAULT '',
    telefono TEXT DEFAULT '', telefono2 TEXT DEFAULT '', telefono3 TEXT DEFAULT '',
    documento TEXT DEFAULT '', direccion TEXT DEFAULT '', nota TEXT DEFAULT '',
    dia TEXT DEFAULT '', mes TEXT DEFAULT '', totalCompras REAL DEFAULT 0,
    creado TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS pedidos (
    id TEXT PRIMARY KEY, numero TEXT, tipo TEXT DEFAULT 'Pedido', fecha TEXT,
    cliente TEXT DEFAULT '', clienteId TEXT DEFAULT '', estado TEXT DEFAULT 'Pendiente',
    pago TEXT DEFAULT '', descuento REAL DEFAULT 0, iva INTEGER DEFAULT 0,
    subtotal REAL DEFAULT 0, total REAL DEFAULT 0, observacion TEXT DEFAULT '',
    items TEXT DEFAULT '[]', creado TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS servicios (
    id TEXT PRIMARY KEY, nombre TEXT NOT NULL, descripcion TEXT DEFAULT '',
    precio REAL DEFAULT 0, creado TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS ingresos (
    id TEXT PRIMARY KEY, descripcion TEXT DEFAULT '', categoria TEXT DEFAULT 'Ventas',
    monto REAL DEFAULT 0, fecha TEXT, creado TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS gastos (
    id TEXT PRIMARY KEY, descripcion TEXT DEFAULT '', categoria TEXT DEFAULT 'Operaciones',
    monto REAL DEFAULT 0, fecha TEXT, creado TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS contador (key TEXT PRIMARY KEY, value INTEGER DEFAULT 0);
  INSERT OR IGNORE INTO contador (key, value) VALUES ('pedidos', 0);
  CREATE TABLE IF NOT EXISTS config (clave TEXT PRIMARY KEY, valor TEXT);
`);

function nextPedidoNum() {
  db.prepare("UPDATE contador SET value = value + 1 WHERE key = 'pedidos'").run();
  const row = db.prepare("SELECT value FROM contador WHERE key = 'pedidos'").get();
  return `PED-${String(row.value).padStart(4, '0')}`;
}

function rowToPedido(row) {
  if (!row) return null;
  try { row.items = JSON.parse(row.items || '[]'); } catch { row.items = []; }
  row.iva = !!row.iva;
  return row;
}

function esc(t) {
  return String(t ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function getNegocio() {
  const data = {};
  db.prepare("SELECT clave, valor FROM config WHERE clave LIKE 'neg_%'").all()
    .forEach(r => { data[r.clave.replace('neg_', '')] = r.valor; });
  return data;
}

// Evita que un error en una ruta async tumbe el proceso
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ==================== MULTER ====================
// Las imágenes viven dentro de DATA_DIR (el volumen de Railway), no en public/
const uploadsDir = path.join(dataDir, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
const EXT_OK = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, uuidv4() + path.extname(file.originalname).toLowerCase())
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = EXT_OK.includes(path.extname(file.originalname).toLowerCase()) && file.mimetype.startsWith('image/');
    if (ok) return cb(null, true);
    const e = new Error('Solo imágenes jpg, png, webp o gif'); e.status = 400; cb(e);
  }
});

// ==================== EXPRESS ====================
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
function getSessionSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const f = path.join(dataDir, 'session-secret.txt');
  if (!fs.existsSync(f)) fs.writeFileSync(f, require('crypto').randomBytes(32).toString('hex'), { mode: 0o600 });
  return fs.readFileSync(f, 'utf8').trim();
}
if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1); // solo si hay un proxy delante (Nginx, Railway...)
app.use(session({
  secret: getSessionSecret(),
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.COOKIE_SECURE === 'true', maxAge: 1000 * 60 * 60 * 8 }
}));
// Máximo 10 intentos fallidos de login por IP cada 15 minutos
const VENTANA_LOGIN = 15 * 60 * 1000;
const fallosLogin = new Map(); // ip -> { n, desde }
app.use('/api/login', (req, res, next) => {
  if (req.method !== 'POST') return next();
  let r = fallosLogin.get(req.ip);
  if (r && Date.now() - r.desde > VENTANA_LOGIN) { fallosLogin.delete(req.ip); r = null; }
  if (r && r.n >= 10) return res.status(429).json({ error: 'Demasiados intentos, espera 15 minutos' });
  res.on('finish', () => {
    if (res.statusCode === 401) {
      const x = fallosLogin.get(req.ip) || { n: 0, desde: Date.now() };
      x.n++; fallosLogin.set(req.ip, x);
    } else if (res.statusCode === 200) fallosLogin.delete(req.ip);
  });
  next();
});
setInterval(() => {
  const t = Date.now();
  for (const [ip, v] of fallosLogin) if (t - v.desde > VENTANA_LOGIN) fallosLogin.delete(ip);
}, 10 * 60 * 1000).unref();
setupAuth(app, db);
app.use('/uploads', express.static(uploadsDir, { setHeaders: res => res.setHeader('X-Content-Type-Options', 'nosniff') }));

const soloAdmin = (req, res, next) =>
  req.session.usuario && req.session.usuario.rol === 'admin' ? next() : res.status(403).json({ error: 'Sin permiso' });

// Informes
app.get('/api/informes/resumen', (req, res) => {
  const p = db.prepare('SELECT COUNT(*) as total, SUM(total) as monto FROM pedidos').get();
  const c = db.prepare('SELECT COUNT(*) as total FROM clientes').get();
  const pr = db.prepare('SELECT COUNT(*) as total FROM productos').get();
  const ing = db.prepare('SELECT SUM(monto) as total FROM ingresos').get();
  const gas = db.prepare('SELECT SUM(monto) as total FROM gastos').get();
  res.json({ pedidos: p.total||0, ventasMonto: p.monto||0, clientes: c.total||0, productos: pr.total||0, ingresos: ing.total||0, gastos: gas.total||0 });
});
app.get('/api/informes/ventas-por-mes', (req, res) => {
  const rows = db.prepare("SELECT strftime('%Y-%m', fecha) as mes, COUNT(*) as pedidos, SUM(total) as total FROM pedidos GROUP BY mes ORDER BY mes DESC LIMIT 12").all();
  res.json(rows.reverse());
});
app.get('/api/informes/pedidos-por-estado', (req, res) => {
  res.json(db.prepare('SELECT estado, COUNT(*) as cantidad FROM pedidos GROUP BY estado').all());
});
app.get('/api/informes/top-productos', (req, res) => {
  const todos = db.prepare('SELECT items FROM pedidos').all();
  const conteo = {};
  todos.forEach(p => {
    try { JSON.parse(p.items||'[]').forEach(it => { if (!conteo[it.nombre]) conteo[it.nombre]={nombre:it.nombre,cantidad:0,total:0}; conteo[it.nombre].cantidad+=(it.cantidad||1); conteo[it.nombre].total+=(it.precio||0)*(it.cantidad||1); }); } catch(e) {}
  });
  res.json(Object.values(conteo).sort((a,b)=>b.total-a.total).slice(0,5));
});

// Stats
app.get('/api/stats', (req, res) => {
  const totalIngresos = db.prepare('SELECT COALESCE(SUM(monto),0) as t FROM ingresos').get().t;
  const totalGastos   = db.prepare('SELECT COALESCE(SUM(monto),0) as t FROM gastos').get().t;
  res.json({
    totalPedidos:   db.prepare('SELECT COUNT(*) as t FROM pedidos').get().t,
    totalClientes:  db.prepare('SELECT COUNT(*) as t FROM clientes').get().t,
    totalProductos: db.prepare('SELECT COUNT(*) as t FROM productos').get().t,
    totalIngresos, totalGastos, ganancia: totalIngresos - totalGastos,
    pedidosRecientes: db.prepare('SELECT * FROM pedidos ORDER BY creado DESC LIMIT 5').all().map(rowToPedido)
  });
});

app.post('/api/upload', upload.single('imagen'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió imagen' });
  res.json({ url: '/uploads/' + req.file.filename });
});

// PRODUCTOS
app.get('/api/productos', (req, res) => res.json(db.prepare('SELECT * FROM productos ORDER BY nombre').all()));
app.post('/api/productos', (req, res) => {
  const id = uuidv4();
  const p = { id, nombre:'', descripcion:'', precio:0, coste:0, barcode:'', codigo:'', sku:'', categoria:'', unidad:'', stock:0, marca:'', tipo:'', variante:'', cantidadDespachar:0, cantidadDisponible:0, porRecibir:0, imagen:'', ...req.body, id };
  db.prepare(`INSERT INTO productos (id,nombre,descripcion,precio,coste,barcode,codigo,sku,categoria,unidad,stock,marca,tipo,variante,cantidadDespachar,cantidadDisponible,porRecibir,imagen) VALUES (@id,@nombre,@descripcion,@precio,@coste,@barcode,@codigo,@sku,@categoria,@unidad,@stock,@marca,@tipo,@variante,@cantidadDespachar,@cantidadDisponible,@porRecibir,@imagen)`).run(p);
  res.json(db.prepare('SELECT * FROM productos WHERE id=?').get(id));
});
app.put('/api/productos/:id', (req, res) => {
  const ex = db.prepare('SELECT * FROM productos WHERE id=?').get(req.params.id);
  if (!ex) return res.status(404).json({ error: 'No encontrado' });
  const p = { ...ex, ...req.body, id: req.params.id };
  db.prepare(`UPDATE productos SET nombre=@nombre,descripcion=@descripcion,precio=@precio,coste=@coste,barcode=@barcode,codigo=@codigo,sku=@sku,categoria=@categoria,unidad=@unidad,stock=@stock,marca=@marca,tipo=@tipo,variante=@variante,cantidadDespachar=@cantidadDespachar,cantidadDisponible=@cantidadDisponible,porRecibir=@porRecibir,imagen=@imagen WHERE id=@id`).run(p);
  res.json(db.prepare('SELECT * FROM productos WHERE id=?').get(req.params.id));
});
app.delete('/api/productos/all', soloAdmin, (req, res) => { db.prepare('DELETE FROM productos').run(); res.json({ success: true }); });
app.delete('/api/productos/:id', (req, res) => { db.prepare('DELETE FROM productos WHERE id=?').run(req.params.id); res.json({ success: true }); });

// CLIENTES
app.get('/api/clientes', (req, res) => res.json(db.prepare('SELECT * FROM clientes ORDER BY nombre').all()));
app.post('/api/clientes', (req, res) => {
  const id = uuidv4();
  const c = { id, nombre:'', email:'', telefono:'', telefono2:'', telefono3:'', documento:'', direccion:'', nota:'', dia:'', mes:'', totalCompras:0, ...req.body, id };
  db.prepare(`INSERT INTO clientes (id,nombre,email,telefono,telefono2,telefono3,documento,direccion,nota,dia,mes,totalCompras) VALUES (@id,@nombre,@email,@telefono,@telefono2,@telefono3,@documento,@direccion,@nota,@dia,@mes,@totalCompras)`).run(c);
  res.json(db.prepare('SELECT * FROM clientes WHERE id=?').get(id));
});
app.put('/api/clientes/:id', (req, res) => {
  const ex = db.prepare('SELECT * FROM clientes WHERE id=?').get(req.params.id);
  if (!ex) return res.status(404).json({ error: 'No encontrado' });
  const c = { ...ex, ...req.body, id: req.params.id };
  db.prepare(`UPDATE clientes SET nombre=@nombre,email=@email,telefono=@telefono,telefono2=@telefono2,telefono3=@telefono3,documento=@documento,direccion=@direccion,nota=@nota,dia=@dia,mes=@mes,totalCompras=@totalCompras WHERE id=@id`).run(c);
  res.json(db.prepare('SELECT * FROM clientes WHERE id=?').get(req.params.id));
});
app.delete('/api/clientes/all', soloAdmin, (req, res) => { db.prepare('DELETE FROM clientes').run(); res.json({ success: true }); });
app.delete('/api/clientes/:id', (req, res) => { db.prepare('DELETE FROM clientes WHERE id=?').run(req.params.id); res.json({ success: true }); });

// PEDIDOS
function parseItems(v) {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') { try { const a = JSON.parse(v); return Array.isArray(a) ? a : []; } catch { return []; } }
  return [];
}
// El servidor calcula los totales; no se confía en los que manda el navegador
function calcularTotales(items, descuento, iva) {
  const subtotal = items.reduce((t, i) => t + (Number(i.precio) || 0) * (Number(i.cantidad) || 1), 0);
  const desc = Math.max(0, Number(descuento) || 0);
  const base = Math.max(0, subtotal - desc);
  const ivaMonto = iva ? Math.round(base * 0.19) : 0;
  return { subtotal, descuento: desc, total: base + ivaMonto };
}
const FECHA_OK = /^\d{4}-\d{2}-\d{2}$/;

const crearPedido = db.transaction((b) => {
  const id = uuidv4();
  const numero = nextPedidoNum();
  const fecha = FECHA_OK.test(b.fecha || '') ? b.fecha : new Date().toISOString().split('T')[0];
  const items = parseItems(b.items);
  const iva = b.iva ? 1 : 0;
  const t = calcularTotales(items, b.descuento, iva);
  db.prepare(`INSERT INTO pedidos (id,numero,tipo,fecha,cliente,clienteId,estado,pago,descuento,iva,subtotal,total,observacion,items)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id, numero, b.tipo || 'Pedido', fecha, b.cliente || '', b.clienteId || '',
    b.estado || 'Pendiente', b.pago || '', t.descuento, iva, t.subtotal, t.total, b.observacion || '', JSON.stringify(items));
  db.prepare(`INSERT INTO ingresos (id,descripcion,monto,fecha,categoria) VALUES (?,?,?,?,'Ventas')`)
    .run(uuidv4(), `Pedido ${numero}`, t.total, fecha);
  return id;
});

const editarPedido = db.transaction((id, ex, b) => {
  const items = b.items !== undefined ? parseItems(b.items) : parseItems(ex.items);
  const iva = b.iva === undefined ? ex.iva : (b.iva ? 1 : 0);
  const t = calcularTotales(items, b.descuento ?? ex.descuento, iva);
  const fecha = FECHA_OK.test(b.fecha || '') ? b.fecha : ex.fecha;
  db.prepare(`UPDATE pedidos SET tipo=?,fecha=?,cliente=?,clienteId=?,estado=?,pago=?,descuento=?,iva=?,subtotal=?,total=?,observacion=?,items=? WHERE id=?`)
    .run(b.tipo ?? ex.tipo, fecha, b.cliente ?? ex.cliente, b.clienteId ?? ex.clienteId, b.estado ?? ex.estado,
      b.pago ?? ex.pago, t.descuento, iva, t.subtotal, t.total, b.observacion ?? ex.observacion, JSON.stringify(items), id);
  db.prepare('UPDATE ingresos SET monto=?, fecha=? WHERE descripcion=?').run(t.total, fecha, `Pedido ${ex.numero}`);
});

const borrarPedido = db.transaction((id, numero) => {
  db.prepare('DELETE FROM ingresos WHERE descripcion=?').run(`Pedido ${numero}`);
  db.prepare('DELETE FROM pedidos WHERE id=?').run(id);
});

app.get('/api/pedidos', (req, res) => res.json(db.prepare('SELECT * FROM pedidos ORDER BY creado DESC').all().map(rowToPedido)));
app.post('/api/pedidos', (req, res) => {
  const id = crearPedido(req.body || {});
  res.json(rowToPedido(db.prepare('SELECT * FROM pedidos WHERE id=?').get(id)));
});
app.put('/api/pedidos/:id', (req, res) => {
  const ex = db.prepare('SELECT * FROM pedidos WHERE id=?').get(req.params.id);
  if (!ex) return res.status(404).json({ error: 'No encontrado' });
  editarPedido(req.params.id, ex, req.body || {});
  res.json(rowToPedido(db.prepare('SELECT * FROM pedidos WHERE id=?').get(req.params.id)));
});
app.delete('/api/pedidos/all', soloAdmin, (req, res) => {
  db.transaction(() => {
    db.prepare("DELETE FROM ingresos WHERE descripcion LIKE 'Pedido %'").run();
    db.prepare('DELETE FROM pedidos').run();
    db.prepare("UPDATE contador SET value=0 WHERE key='pedidos'").run();
  })();
  res.json({ success: true });
});
app.delete('/api/pedidos/:id', (req, res) => {
  const ex = db.prepare('SELECT numero FROM pedidos WHERE id=?').get(req.params.id);
  if (ex) borrarPedido(req.params.id, ex.numero);
  res.json({ success: true });
});

// SERVICIOS
app.get('/api/servicios', (req, res) => res.json(db.prepare('SELECT * FROM servicios ORDER BY nombre').all()));
app.post('/api/servicios', (req, res) => {
  const id = uuidv4();
  const s = { id, nombre:'', descripcion:'', precio:0, ...req.body, id };
  db.prepare('INSERT INTO servicios (id,nombre,descripcion,precio) VALUES (@id,@nombre,@descripcion,@precio)').run(s);
  res.json(db.prepare('SELECT * FROM servicios WHERE id=?').get(id));
});
app.delete('/api/servicios/:id', (req, res) => { db.prepare('DELETE FROM servicios WHERE id=?').run(req.params.id); res.json({ success: true }); });

// INGRESOS
app.get('/api/ingresos', (req, res) => res.json(db.prepare('SELECT * FROM ingresos ORDER BY fecha DESC').all()));
app.post('/api/ingresos', (req, res) => {
  const id = uuidv4();
  const i = { id, descripcion:'', categoria:'Ventas', monto:0, fecha: new Date().toISOString().split('T')[0], ...req.body, id };
  db.prepare('INSERT INTO ingresos (id,descripcion,categoria,monto,fecha) VALUES (@id,@descripcion,@categoria,@monto,@fecha)').run(i);
  res.json(db.prepare('SELECT * FROM ingresos WHERE id=?').get(id));
});
app.delete('/api/ingresos/:id', (req, res) => { db.prepare('DELETE FROM ingresos WHERE id=?').run(req.params.id); res.json({ success: true }); });

// GASTOS
app.get('/api/gastos', (req, res) => res.json(db.prepare('SELECT * FROM gastos ORDER BY fecha DESC').all()));
app.post('/api/gastos', (req, res) => {
  const id = uuidv4();
  const g = { id, descripcion:'', categoria:'Operaciones', monto:0, fecha: new Date().toISOString().split('T')[0], ...req.body, id };
  db.prepare('INSERT INTO gastos (id,descripcion,categoria,monto,fecha) VALUES (@id,@descripcion,@categoria,@monto,@fecha)').run(g);
  res.json(db.prepare('SELECT * FROM gastos WHERE id=?').get(id));
});
app.delete('/api/gastos/:id', (req, res) => { db.prepare('DELETE FROM gastos WHERE id=?').run(req.params.id); res.json({ success: true }); });


// Exportar Excel
app.get('/api/exportar/clientes', wrap(async (req, res) => {
  const ExcelJS = require('exceljs');
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Clientes');
  ws.columns = [
    { header: 'Nombre', key: 'nombre', width: 30 },
    { header: 'Telefono', key: 'telefono', width: 15 },
    { header: 'Email', key: 'email', width: 25 },
    { header: 'Direccion', key: 'direccion', width: 30 },
    { header: 'Documento', key: 'documento', width: 15 },
    { header: 'Nota', key: 'nota', width: 30 },
  ];
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B5BDB' } };
  db.prepare('SELECT * FROM clientes ORDER BY nombre').all().forEach(c => ws.addRow(c));
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=Clientes.xlsx');
  await wb.xlsx.write(res);
  res.end();
}));

app.get('/api/exportar/productos', wrap(async (req, res) => {
  const ExcelJS = require('exceljs');
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Productos');
  ws.columns = [
    { header: 'Nombre', key: 'nombre', width: 30 },
    { header: 'Precio', key: 'precio', width: 12 },
    { header: 'Stock', key: 'stock', width: 10 },
    { header: 'SKU', key: 'sku', width: 15 },
    { header: 'Marca', key: 'marca', width: 15 },
    { header: 'Tipo', key: 'tipo', width: 15 },
    { header: 'Variante', key: 'variante', width: 15 },
  ];
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF97316' } };
  db.prepare('SELECT * FROM productos ORDER BY nombre').all().forEach(p => ws.addRow(p));
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=Productos.xlsx');
  await wb.xlsx.write(res);
  res.end();
}));

app.get('/api/exportar/pedidos', wrap(async (req, res) => {
  const ExcelJS = require('exceljs');
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Pedidos');
  ws.columns = [
    { header: 'Numero', key: 'numero', width: 10 },
    { header: 'Cliente', key: 'cliente', width: 25 },
    { header: 'Fecha', key: 'fecha', width: 12 },
    { header: 'Estado', key: 'estado', width: 12 },
    { header: 'Total', key: 'total', width: 12 },
    { header: 'Pago', key: 'pago', width: 15 },
    { header: 'Observacion', key: 'observacion', width: 30 },
  ];
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };
  db.prepare('SELECT numero,cliente,fecha,estado,total,pago,observacion FROM pedidos ORDER BY numero DESC').all().forEach(p => ws.addRow(p));
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=Pedidos.xlsx');
  await wb.xlsx.write(res);
  res.end();
}));


// Enviar pedido por correo
app.post('/api/pedidos/:id/email', async (req, res) => {
  try {
    const nodemailer = require('nodemailer');
    const pedido = db.prepare('SELECT * FROM pedidos WHERE id=?').get(req.params.id);
    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });
    try { pedido.items = JSON.parse(pedido.items||'[]'); } catch(e) { pedido.items=[]; }
    pedido.iva = !!pedido.iva;
    const clientes = db.prepare('SELECT * FROM clientes').all();
    const cliente = clientes.find(c => c.id === pedido.clienteId) || clientes.find(c => c.nombre === pedido.cliente);
    const negocio = getNegocio();
    const respaldo = db.prepare("SELECT valor FROM config WHERE clave='email_respaldo'").get();
    const emailDestino = (cliente && cliente.email) || negocio.email || (respaldo && respaldo.valor) || null;
    if (!emailDestino) return res.status(400).json({ error: 'El cliente no tiene correo y no hay correo del negocio configurado' });
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.SMTP_FROM) {
      return res.status(500).json({ error: 'Falta configurar SMTP_USER, SMTP_PASS y SMTP_FROM en el servidor' });
    }
    const generarPDF = require('./pdf');
    const pdf = await generarPDF(pedido, clientes, negocio);
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: emailDestino,
      subject: 'Pedido N° ' + pedido.numero + ' - ' + (negocio.nombre || 'Pro Ventas Magic'),
      html: '<p>Estimado/a <b>' + esc(pedido.cliente) + '</b>,</p><p>Adjuntamos su pedido N° <b>' + esc(pedido.numero) + '</b>.</p><p>Gracias por su preferencia.</p>',
      attachments: [{ filename: 'Pedido_' + pedido.numero + '.pdf', content: pdf, contentType: 'application/pdf' }]
    });
    res.json({ success: true, enviado_a: emailDestino });
  } catch(e) { console.error(e); res.status(500).json({ error: e.message }); }
});


// Config negocio
app.get('/api/config/negocio', (req, res) => {
  try {
    const rows = db.prepare("SELECT clave, valor FROM config WHERE clave LIKE 'neg_%'").all();
    const data = {};
    rows.forEach(r => { data[r.clave.replace('neg_','')] = r.valor; });
    res.json(data);
  } catch(e) { res.json({}); }
});

app.post('/api/config/negocio', (req, res) => {
  try {
    const allowed = ['nombre','rut','telefono','email','whatsapp','instagram','web','direccion','ciudad','region','pais','logo','firma'];
    for (const [k,v] of Object.entries(req.body)) {
      if (allowed.includes(k)) {
        db.prepare("INSERT OR REPLACE INTO config (clave, valor) VALUES (?, ?)").run('neg_'+k, v);
      }
    }
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || (err instanceof multer.MulterError ? 400 : 500);
  const msg = status < 500 || process.env.NODE_ENV !== 'production' ? err.message : 'Error interno';
  res.status(status).json({ error: msg });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Pro Ventas Magic en http://localhost:${PORT}`);
  console.log(`📦 SQLite: ${path.join(dataDir, 'ventas.db')}\n`);
});
