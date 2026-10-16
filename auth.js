const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const CLAVE_DE_EJEMPLO = 'admin123';

module.exports = function setupAuth(app, db) {
  db.exec("CREATE TABLE IF NOT EXISTS usuarios (id TEXT PRIMARY KEY, nombre TEXT NOT NULL, email TEXT UNIQUE, password TEXT NOT NULL, rol TEXT DEFAULT 'admin', creado TEXT DEFAULT (datetime('now')))");

  const adminUser = process.env.ADMIN_USER;
  const adminPass = process.env.ADMIN_PASS;
  const hayUsuarios = db.prepare('SELECT COUNT(*) AS c FROM usuarios').get().c;

  if (!hayUsuarios) {
    // Primer arranque: el administrador sale de variables de entorno, no del código
    if (!adminUser || !adminPass) throw new Error('Define ADMIN_USER y ADMIN_PASS para el primer arranque');
    db.prepare('INSERT INTO usuarios (id,nombre,email,password,rol) VALUES (?,?,?,?,?)')
      .run(uuidv4(), 'Administrador', adminUser, bcrypt.hashSync(adminPass, 10), 'admin');
    console.log('Usuario administrador inicial creado');
  } else {
    // Base existente que todavía usa la clave de ejemplo admin/admin123
    const legado = db.prepare("SELECT id, password FROM usuarios WHERE email = 'admin'").get();
    if (legado && bcrypt.compareSync(CLAVE_DE_EJEMPLO, legado.password)) {
      if (adminPass) {
        try {
          db.prepare('UPDATE usuarios SET email = ?, password = ? WHERE id = ?')
            .run(adminUser || 'admin', bcrypt.hashSync(adminPass, 10), legado.id);
          console.log('La clave de ejemplo del administrador fue reemplazada con ADMIN_PASS');
        } catch (e) {
          console.warn('No se pudo reemplazar la clave de ejemplo:', e.message);
        }
      } else {
        console.warn('ATENCIÓN: el usuario admin sigue con la clave de ejemplo. Define ADMIN_PASS (y ADMIN_USER) y reinicia.');
      }
    }
  }

  app.use((req, res, next) => {
    const pub = req.path.startsWith('/api/login') || req.path === '/login.html' || req.path.match(/\.(css|js|png|jpe?g|gif|webp|svg|ico|woff2?)$/);
    return next(); // LOGIN DESACTIVADO (para reactivar: cambiar por "if (pub) return next();")
    if (!req.session.usuario) {
      if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'No autenticado' });
      return res.redirect('/login.html');
    }
    next();
  });

  app.post('/api/login', (req, res) => {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string') return res.status(400).json({ error: 'Faltan datos' });
    const user = db.prepare("SELECT * FROM usuarios WHERE email = ?").get(email);
    if (!user || !bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    // Sesión nueva en cada login (evita fijación de sesión)
    req.session.regenerate(err => {
      if (err) return res.status(500).json({ error: 'No se pudo iniciar sesión' });
      req.session.usuario = { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol };
      res.json({ success: true, usuario: req.session.usuario });
    });
  });

  app.post('/api/logout', (req, res) => { req.session.destroy(() => res.json({ success: true })); });

  app.get('/api/me', (req, res) => {
    if (!req.session.usuario) return res.status(401).json({ error: 'No autenticado' });
    res.json(req.session.usuario);
  });

  app.post('/api/cambiar-password', (req, res) => {
    if (!req.session.usuario) return res.status(401).json({ error: 'No autenticado' });
    const { actual, nueva } = req.body || {};
    if (typeof actual !== 'string' || typeof nueva !== 'string') return res.status(400).json({ error: 'Faltan datos' });
    if (nueva.length < 8) return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' });
    const user = db.prepare("SELECT * FROM usuarios WHERE id = ?").get(req.session.usuario.id);
    if (!bcrypt.compareSync(actual, user.password)) return res.status(400).json({ error: 'Contraseña actual incorrecta' });
    db.prepare("UPDATE usuarios SET password = ? WHERE id = ?").run(bcrypt.hashSync(nueva, 10), user.id);
    res.json({ success: true });
  });
};
