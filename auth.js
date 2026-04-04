const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

module.exports = function setupAuth(app, db) {
  db.exec("CREATE TABLE IF NOT EXISTS usuarios (id TEXT PRIMARY KEY, nombre TEXT NOT NULL, email TEXT UNIQUE, password TEXT NOT NULL, rol TEXT DEFAULT 'admin', creado TEXT DEFAULT (datetime('now')))");
  const existe = db.prepare("SELECT id FROM usuarios WHERE email = 'admin'").get();
  if (!existe) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare("INSERT INTO usuarios (id,nombre,email,password,rol) VALUES (?,?,?,?,?)").run(uuidv4(),'Administrador','admin',hash,'admin');
    console.log('Usuario admin creado — user: admin / pass: admin123');
  }
  app.use((req, res, next) => {
    const pub = req.path.startsWith('/api/login') || req.path === '/login.html' || req.path.match(/\.(css|js|png|jpg|ico|woff2?)$/);
    if (pub) return next();
    if (!req.session.usuario) {
      if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'No autenticado' });
      return res.redirect('/login.html');
    }
    next();
  });
  app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare("SELECT * FROM usuarios WHERE email = ?").get(email);
    if (!user || !bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    req.session.usuario = { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol };
    res.json({ success: true, usuario: req.session.usuario });
  });
  app.post('/api/logout', (req, res) => { req.session.destroy(); res.json({ success: true }); });
  app.get('/api/me', (req, res) => { if (!req.session.usuario) return res.status(401).json({ error: 'No autenticado' }); res.json(req.session.usuario); });
  app.post('/api/cambiar-password', (req, res) => {
    if (!req.session.usuario) return res.status(401).json({ error: 'No autenticado' });
    const { actual, nueva } = req.body;
    const user = db.prepare("SELECT * FROM usuarios WHERE id = ?").get(req.session.usuario.id);
    if (!bcrypt.compareSync(actual, user.password)) return res.status(400).json({ error: 'Contraseña actual incorrecta' });
    db.prepare("UPDATE usuarios SET password = ? WHERE id = ?").run(bcrypt.hashSync(nueva, 10), user.id);
    res.json({ success: true });
  });
};
