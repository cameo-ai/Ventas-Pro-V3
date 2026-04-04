require('dotenv').config({ path: '/mnt/ssd/proventas/app/.env' });
const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const Database = require('better-sqlite3');
const setupAuth = require('./auth');

// ==================== BASE DE DATOS SQLite ====================
const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'ventas.db'));

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

// ==================== MULTER ====================
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, uuidv4() + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => file.mimetype.startsWith('image/') ? cb(null, true) : cb(new Error('Solo imágenes'))
});

// ==================== EXPRESS ====================
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: process.env.SESSION_SECRET || 'proventasmagic2024', resave: false, saveUninitialized: true }));
setupAuth(app, db);

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
  const p = { id, nombre:'', descripcion:'', precio:0, coste:0, barcode:'', codigo:'', sku:'', categoria:'', unidad:'', stock:0, marca:'', tipo:'', variante:'', cantidadDespachar:0, cantidadDisponible:0, porRecibir:0, imagen:'', ...req.body };
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
app.delete('/api/productos/all', (req, res) => { db.prepare('DELETE FROM productos').run(); res.json({ success: true }); });
app.delete('/api/productos/:id', (req, res) => { db.prepare('DELETE FROM productos WHERE id=?').run(req.params.id); res.json({ success: true }); });

// CLIENTES
app.get('/api/clientes', (req, res) => res.json(db.prepare('SELECT * FROM clientes ORDER BY nombre').all()));
app.post('/api/clientes', (req, res) => {
  const id = uuidv4();
  const c = { id, nombre:'', email:'', telefono:'', telefono2:'', telefono3:'', documento:'', direccion:'', nota:'', dia:'', mes:'', totalCompras:0, ...req.body };
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
app.delete('/api/clientes/all', (req, res) => { db.prepare('DELETE FROM clientes').run(); res.json({ success: true }); });
app.delete('/api/clientes/:id', (req, res) => { db.prepare('DELETE FROM clientes WHERE id=?').run(req.params.id); res.json({ success: true }); });

// PEDIDOS
app.get('/api/pedidos', (req, res) => res.json(db.prepare('SELECT * FROM pedidos ORDER BY creado DESC').all().map(rowToPedido)));
app.post('/api/pedidos', (req, res) => {
  const id = uuidv4();
  const numero = nextPedidoNum();
  const fecha = new Date().toISOString().split('T')[0];
  const p = { id, numero, fecha, tipo:'Pedido', cliente:'', clienteId:'', estado:'Pendiente', pago:'', descuento:0, iva:0, subtotal:0, total:0, observacion:'', items:'[]', ...req.body };
  if (typeof p.items !== 'string') p.items = JSON.stringify(p.items || []);
  if (typeof p.iva === 'boolean') p.iva = p.iva ? 1 : 0;
  db.prepare(`INSERT INTO pedidos (id,numero,tipo,fecha,cliente,clienteId,estado,pago,descuento,iva,subtotal,total,observacion,items) VALUES (@id,@numero,@tipo,@fecha,@cliente,@clienteId,@estado,@pago,@descuento,@iva,@subtotal,@total,@observacion,@items)`).run(p);
  db.prepare(`INSERT INTO ingresos (id,descripcion,monto,fecha,categoria) VALUES (?,?,?,?,'Ventas')`).run(uuidv4(), `Pedido ${numero}`, p.total || 0, fecha);
  res.json(rowToPedido(db.prepare('SELECT * FROM pedidos WHERE id=?').get(id)));
});
app.put('/api/pedidos/:id', (req, res) => {
  const ex = db.prepare('SELECT * FROM pedidos WHERE id=?').get(req.params.id);
  if (!ex) return res.status(404).json({ error: 'No encontrado' });
  const p = { ...ex, ...req.body, id: req.params.id };
  if (typeof p.items !== 'string') p.items = JSON.stringify(p.items || []);
  if (typeof p.iva === 'boolean') p.iva = p.iva ? 1 : 0;
  db.prepare(`UPDATE pedidos SET tipo=@tipo,fecha=@fecha,cliente=@cliente,clienteId=@clienteId,estado=@estado,pago=@pago,descuento=@descuento,iva=@iva,subtotal=@subtotal,total=@total,observacion=@observacion,items=@items WHERE id=@id`).run(p);
  res.json(rowToPedido(db.prepare('SELECT * FROM pedidos WHERE id=?').get(req.params.id)));
});
app.delete('/api/pedidos/all', (req, res) => { db.prepare('DELETE FROM pedidos').run(); db.prepare("UPDATE contador SET value=0 WHERE key='pedidos'").run(); res.json({ success: true }); });
app.delete('/api/pedidos/:id', (req, res) => { db.prepare('DELETE FROM pedidos WHERE id=?').run(req.params.id); res.json({ success: true }); });

// SERVICIOS
app.get('/api/servicios', (req, res) => res.json(db.prepare('SELECT * FROM servicios ORDER BY nombre').all()));
app.post('/api/servicios', (req, res) => {
  const id = uuidv4();
  const s = { id, nombre:'', descripcion:'', precio:0, ...req.body };
  db.prepare('INSERT INTO servicios (id,nombre,descripcion,precio) VALUES (@id,@nombre,@descripcion,@precio)').run(s);
  res.json(db.prepare('SELECT * FROM servicios WHERE id=?').get(id));
});
app.delete('/api/servicios/:id', (req, res) => { db.prepare('DELETE FROM servicios WHERE id=?').run(req.params.id); res.json({ success: true }); });

// INGRESOS
app.get('/api/ingresos', (req, res) => res.json(db.prepare('SELECT * FROM ingresos ORDER BY fecha DESC').all()));
app.post('/api/ingresos', (req, res) => {
  const id = uuidv4();
  const i = { id, descripcion:'', categoria:'Ventas', monto:0, fecha: new Date().toISOString().split('T')[0], ...req.body };
  db.prepare('INSERT INTO ingresos (id,descripcion,categoria,monto,fecha) VALUES (@id,@descripcion,@categoria,@monto,@fecha)').run(i);
  res.json(db.prepare('SELECT * FROM ingresos WHERE id=?').get(id));
});
app.delete('/api/ingresos/:id', (req, res) => { db.prepare('DELETE FROM ingresos WHERE id=?').run(req.params.id); res.json({ success: true }); });

// GASTOS
app.get('/api/gastos', (req, res) => res.json(db.prepare('SELECT * FROM gastos ORDER BY fecha DESC').all()));
app.post('/api/gastos', (req, res) => {
  const id = uuidv4();
  const g = { id, descripcion:'', categoria:'Operaciones', monto:0, fecha: new Date().toISOString().split('T')[0], ...req.body };
  db.prepare('INSERT INTO gastos (id,descripcion,categoria,monto,fecha) VALUES (@id,@descripcion,@categoria,@monto,@fecha)').run(g);
  res.json(db.prepare('SELECT * FROM gastos WHERE id=?').get(id));
});
app.delete('/api/gastos/:id', (req, res) => { db.prepare('DELETE FROM gastos WHERE id=?').run(req.params.id); res.json({ success: true }); });


// Exportar Excel
app.get('/api/exportar/clientes', async (req, res) => {
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
});

app.get('/api/exportar/productos', async (req, res) => {
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
});

app.get('/api/exportar/pedidos', async (req, res) => {
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
});


// Enviar pedido por correo
app.post('/api/pedidos/:id/email', async (req, res) => {
  try {
    const nodemailer = require('nodemailer');
    const pedido = db.prepare('SELECT * FROM pedidos WHERE id=?').get(req.params.id);
    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });
    try { pedido.items = JSON.parse(pedido.items||'[]'); } catch(e) { pedido.items=[]; }
    pedido.iva = !!pedido.iva;
    const clientes = db.prepare('SELECT * FROM clientes').all();
    const cliente = clientes.find(c => c.nombre === pedido.cliente);
    const configEmail = db.prepare("SELECT valor FROM config WHERE clave='email_respaldo'").get();
    const emailDestino = configEmail ? configEmail.valor : null;
    if (!emailDestino) return res.status(400).json({ error: 'No hay correo configurado en la app' });
    const generarPDF = require('./pdf');
    const pdf = await generarPDF(pedido, clientes);
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: emailDestino,
      subject: 'Pedido N° ' + pedido.numero + ' - Pro Ventas Magic',
      html: '<p>Estimado/a <b>' + pedido.cliente + '</b>,</p><p>Adjuntamos su pedido N° <b>' + pedido.numero + '</b>.</p><p>Gracias por su preferencia.</p>',
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

app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => {
  console.log(`\n🚀 Pro Ventas Magic en http://localhost:${PORT}`);
  console.log(`📦 SQLite: ${path.join(dataDir, 'ventas.db')}\n`);
});
