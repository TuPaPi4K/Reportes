import express from 'express';
import pool from '../database.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET: Obtener categorías con conteo
router.get('/api/categorias', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, COUNT(p.id) as total_productos 
      FROM categorias c
      LEFT JOIN productos p ON c.id = p.categoria_id
      GROUP BY c.id
      ORDER BY c.estado ASC, c.nombre ASC  -- Ordenar: Activas primero
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo categorías:', error);
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
});

// POST: Crear categoría
router.post('/api/categorias', requireAuth, async (req, res) => {
  try {
    const { nombre, descripcion = '' } = req.body;
    const result = await pool.query(`
      INSERT INTO categorias (nombre, descripcion, estado) 
      VALUES ($1, $2, 'Activa') RETURNING *
    `, [nombre, descripcion]);
    
    res.status(201).json({ ...result.rows[0], total_productos: 0 });
  } catch (error) {
    console.error('Error creando categoría:', error);
    res.status(500).json({ error: 'Error al crear categoría' });
  }
});

// PUT: Editar Categoría
router.put('/api/categorias/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, estado } = req.body;

    const result = await pool.query(`
      UPDATE categorias 
      SET nombre = $1, descripcion = $2, estado = $3
      WHERE id = $4
      RETURNING *
    `, [nombre, descripcion, estado, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error actualizando categoría:', error);
    res.status(500).json({ error: 'Error al actualizar categoría' });
  }
});

// DELETE: "Eliminar" 
router.delete('/api/categorias/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.query(`
        UPDATE categorias 
        SET estado = 'Inactiva' 
        WHERE id = $1
    `, [id]);
    
    res.json({ message: 'Categoría desactivada correctamente' });
  } catch (error) {
    console.error('Error desactivando categoría:', error);
    res.status(500).json({ error: 'Error al desactivar la categoría' });
  }
});

export default router;