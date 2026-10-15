const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

module.exports = function setupAuth(app, db) {
  db.exec("CREATE TABLE IF NOT EXISTS usuarios (id TEXT PRIMARY KEY, nombre TEXT NOT NULL, email TEXT UNIQUE, password TEXT NOT NULL, rol TEXT DEFAULT 'admin', creado TEXT DEFAULT (datetime('now')))");
  var admin = db.prepare("SELECT * FROM usuarios WHERE email = 'admin'").get();
  if (!admin) {
    var hash = bcrypt.hashSync('admin123', 10);
    var id = uuidv4();
    db.prepare("INSERT INTO usuarios (id,nombre,email,password,rol) VALUES (?,?,?,?,?)").run(id,'Administrador','admin',hash,'admin');
    admin = db.prepare("SELECT * FROM usuarios WHERE email = 'admin'").get();
  }
  app.use(function(req, res, next) {
    if (!req.session.usuario) {
      req.session.usuario = { id: admin.id, nombre: admin.nombre, email: admin.email, rol: admin.rol };
    }
    next();
  });
  app.post('/api/login', function(req, res) {
    var user = db.prepare("SELECT * FROM usuarios WHERE email = ?").get(req.body.email);
    if (!user || !bcrypt.compareSync(req.body.password, user.password))
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    req.session.usuario = { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol };
    res.json({ success: true, usuario: req.session.usuario });
  });
  app.post('/api/logout', function(req, res) { req.session.destroy(); res.json({ success: true }); });
  app.get('/api/me', function(req, res) { res.json(req.session.usuario); });
  app.post('/api/cambiar-password', function(req, res) {
    if (!req.session.usuario) return res.status(401).json({ error: 'No autenticado' });
    var user = db.prepare("SELECT * FROM usuarios WHERE id = ?").get(req.session.usuario.id);
    if (!bcrypt.compareSync(req.body.actual, user.password)) return res.status(400).json({ error: 'Incorrecta' });
    db.prepare("UPDATE usuarios SET password = ? WHERE id = ?").run(bcrypt.hashSync(req.body.nueva, 10), user.id);
    res.json({ success: true });
  });
};
