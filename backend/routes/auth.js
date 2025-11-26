import express from 'express';
import bcrypt from 'bcrypt';
import pool from '../database.js';

const router = express.Router();

// Sesión
router.get('/api/sesion', (req, res) => {
  if (req.session && req.session.user) {
    res.json({ autenticado: true, usuario: req.session.user });
  } else {
    res.json({ autenticado: false });
  }
});

// Register
router.post('/register', async (req, res) => {
  try {
    const { nombre, nombre_usuario, password, rol = 'Vendedor' } = req.body;
    if (!nombre_usuario || !password || !nombre) {
      return res.status(400).json({ error: 'Faltan datos' });
    }

    const exists = await pool.query(
      'SELECT id FROM usuarios WHERE nombre_usuario = $1',
      [nombre_usuario]
    );
    if (exists.rows.length > 0) {
      return res.status(400).json({ error: 'Nombre de usuario ya existe' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO usuarios (nombre, nombre_usuario, password, rol, estado)
       VALUES ($1, $2, $3, $4, 'Activo') RETURNING id, nombre, nombre_usuario, rol`,
      [nombre, nombre_usuario, hashed, rol]
    );

    res.status(201).json({ usuario: result.rows[0] });
  } catch (error) {
    console.error('Error en register:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { nombre_usuario, password } = req.body;

    const result = await pool.query(
      'SELECT * FROM usuarios WHERE nombre_usuario = $1 AND estado = $2',
      [nombre_usuario, 'Activo']
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Usuario no encontrado o inactivo' });
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    // ACTUALIZAR ÚLTIMO ACCESO - AGREGAR ESTO
    await pool.query(
      'UPDATE usuarios SET ultimo_acceso = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    req.session.user = {
      id: user.id,
      nombre: user.nombre,
      rol: user.rol
    };

    res.json({
      mensaje: 'Login exitoso',
      usuario: req.session.user
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ error: 'Error al cerrar sesión' });
    }
    res.clearCookie(process.env.SESSION_NAME || 'naguara.sid');
    res.json({ mensaje: 'Sesión cerrada correctamente' });
  });
});

// Obtener usuario actual
router.get('/api/me', (req, res) => {
  res.json(req.session.user || null);
});

export default router;