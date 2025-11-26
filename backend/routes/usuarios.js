import express from 'express';
import bcrypt from 'bcrypt';
import { requireAuth } from '../middleware/auth.js';
import pool from '../database.js';

const router = express.Router();

router.get('/api/usuarios', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, nombre, nombre_usuario, rol, estado, 
             TO_CHAR(fecha_creacion, 'DD/MM/YYYY HH24:MI') as fecha_creacion,
             TO_CHAR(ultimo_acceso, 'DD/MM/YYYY HH24:MI') as ultimo_acceso
      FROM usuarios 
      ORDER BY nombre
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

router.post('/api/usuarios', requireAuth, async (req, res) => {
  try {
    const { nombre, nombre_usuario, password, rol = 'Vendedor' } = req.body;
    
if (req.session.user.rol !== 'Administrador' && req.session.user.rol !== 'Super Admin') {
    return res.status(403).json({ error: 'Solo administradores y super administradores pueden crear usuarios' });
}

    if (!nombre_usuario || !password || !nombre) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    if (rol === 'Super Admin' && req.session.user.rol !== 'Super Admin') {
    return res.status(403).json({ error: 'Solo los Super Administradores pueden crear otros Super Administradores' });
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
       VALUES ($1, $2, $3, $4, 'Activo') RETURNING id, nombre, nombre_usuario, rol, estado`,
      [nombre, nombre_usuario, hashed, rol]
    );

    res.status(201).json({ 
      message: 'Usuario creado exitosamente',
      usuario: result.rows[0] 
    });
  } catch (error) {
    console.error('Error creando usuario:', error);
    res.status(500).json({ error: 'Error del servidor al crear usuario' });
  }
});

router.put('/api/usuarios/:id/estado', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (parseInt(id) === req.session.user.id && estado === 'Inactivo') {
      return res.status(400).json({ error: 'No puedes desactivar tu propio usuario' });
    }

    const result = await pool.query(
      'UPDATE usuarios SET estado = $1 WHERE id = $2 RETURNING *',
      [estado, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ 
      message: `Usuario ${estado.toLowerCase()} correctamente`,
      usuario: result.rows[0] 
    });
  } catch (error) {
    console.error('Error actualizando estado usuario:', error);
    res.status(500).json({ error: 'Error al actualizar estado del usuario' });
  }
});

// En routes/usuarios.js
router.put('/api/usuarios/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, nombre_usuario, password, rol, estado } = req.body;

        // Verificar permisos
       if (req.session.user.rol !== 'Administrador' && req.session.user.rol !== 'Super Admin') {
    return res.status(403).json({ error: 'Solo administradores y super administradores pueden editar usuarios' });
}

        let query = '';
        let params = [];

        if (password) {
            // Si hay nueva contraseña, hashearla
            const hashed = await bcrypt.hash(password, 10);
            query = `UPDATE usuarios SET nombre = $1, nombre_usuario = $2, password = $3, rol = $4, estado = $5 WHERE id = $6 RETURNING *`;
            params = [nombre, nombre_usuario, hashed, rol, estado, id];
        } else {
            // Sin cambiar contraseña
            query = `UPDATE usuarios SET nombre = $1, nombre_usuario = $2, rol = $3, estado = $4 WHERE id = $5 RETURNING *`;
            params = [nombre, nombre_usuario, rol, estado, id];
        }

        const result = await pool.query(query, params);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({ 
            message: 'Usuario actualizado correctamente',
            usuario: result.rows[0] 
        });
    } catch (error) {
        console.error('Error actualizando usuario:', error);
        res.status(500).json({ error: 'Error del servidor al actualizar usuario' });
    }
});

// Cambiar contraseña
router.put('/api/usuarios/:id/password', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'La contraseña es requerida' });
    }

    // Solo administradores pueden cambiar contraseñas de otros usuarios
    if (parseInt(id) !== req.session.user.id && req.session.user.rol !== 'Administrador' && req.session.user.rol !== 'Super Admin') {
      return res.status(403).json({ error: 'No tienes permisos para cambiar esta contraseña' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'UPDATE usuarios SET password = $1 WHERE id = $2 RETURNING id, nombre, nombre_usuario',
      [hashed, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('Error actualizando contraseña:', error);
    res.status(500).json({ error: 'Error al actualizar contraseña' });
  }
});


router.delete('/api/usuarios/:id', requireAuth, async (req,res) => {
  try {
    const {id} = req.params;

   if (req.session.user.rol !== 'Administrador' && req.session.user.rol !== 'Super Admin') {
    return res.status(403).json({error: 'Solo administradores pueden eliminar usuarios'});     
    }
    if(parseInt(id) === req.session.user.id) {
      return res.status(400).json({error: 'No puedes eliminar tu propio usuario'});
    }

    const result = await pool.query(
      'DELETE FROM usuarios WHERE id = $1 RETURNING *',
      [id]
    );

    if(result.rows.length === 0) {
      return res.status(404).json({error: 'Usuario no encontrado'});
    }

    res.json({message: 'Usuario eliminado correctamente'});
  } catch (error) {
    console.log('Error eliminando usuario:', error);
    res.status(500).json({error: 'Error del servidor al eliminar usuario'});
  }
});

// Promover usuario a administrador temporal
router.put('/api/usuarios/:id/promover', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { clave_confirmacion } = req.body;

    // Solo administradores pueden promover
    if (req.session.user.rol !== 'Administrador' && req.session.user.rol !== 'Super Admin') {
      return res.status(403).json({ error: 'Solo administradores pueden promover usuarios' });
    }

    // Verificar que el usuario existe y es vendedor
    const userResult = await pool.query(
      'SELECT * FROM usuarios WHERE id = $1',
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const usuario = userResult.rows[0];
    
    if (usuario.rol !== 'Vendedor') {
      return res.status(400).json({ error: 'Solo se pueden promover vendedores' });
    }

    // Verificar clave de confirmación (puedes usar una clave fija o validar contra algo)
    const CLAVE_VALIDA = 'NAGUARA2024'; // Cambia esta clave por una más segura
    
    if (clave_confirmacion !== CLAVE_VALIDA) {
      return res.status(401).json({ error: 'Clave de confirmación incorrecta' });
    }

    // Promover a administrador
    const updateResult = await pool.query(
      'UPDATE usuarios SET rol = $1 WHERE id = $2 RETURNING id, nombre, nombre_usuario, rol',
      ['Administrador', id]
    );

    res.json({ 
      message: 'Usuario promovido a administrador exitosamente',
      usuario: updateResult.rows[0]
    });

  } catch (error) {
    console.error('Error promoviendo usuario:', error);
    res.status(500).json({ error: 'Error al promover usuario' });
  }
});

router.get('/api/usuarios/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(`
            SELECT id, nombre, nombre_usuario, rol, estado, 
                   TO_CHAR(fecha_creacion, 'DD/MM/YYYY HH24:MI') as fecha_creacion
            FROM usuarios 
            WHERE id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error obteniendo usuario:', error);
        res.status(500).json({ error: 'Error al obtener usuario' });
    }
});

export default router;