import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import pool from '../database.js';

const router = express.Router();

// GET /api/proveedores - Listar todos los proveedores
router.get('/api/proveedores', requireAuth, async (req, res) => {
  try {
    const { search, estado = 'activo' } = req.query;
    let query = 'SELECT * FROM proveedores WHERE 1=1';
    let params = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      query += ` AND (nombre ILIKE $${paramCount} OR contacto ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ' ORDER BY nombre ASC';

    console.log('🔍 Buscando proveedores:', { search, estado });
    const result = await pool.query(query, params);
    
    res.json({
      proveedores: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('❌ Error obteniendo proveedores:', error);
    res.status(500).json({ error: 'Error al obtener proveedores' });
  }
});

// GET /api/proveedores/:id - Obtener un proveedor específico
router.get('/api/proveedores/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('📋 Obteniendo proveedor:', id);
    
    const result = await pool.query(
      'SELECT * FROM proveedores WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }

    res.json({ proveedor: result.rows[0] });
  } catch (error) {
    console.error('❌ Error obteniendo proveedor:', error);
    res.status(500).json({ error: 'Error al obtener el proveedor' });
  }
});

// POST /api/proveedores - Crear nuevo proveedor
router.post('/api/proveedores', requireAuth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { nombre, contacto, direccion } = req.body;

    console.log('➕ Creando nuevo proveedor:', { nombre, contacto });

    // Validaciones básicas
    if (!nombre || nombre.trim().length === 0) {
      return res.status(400).json({ error: 'El nombre del proveedor es requerido' });
    }

    const result = await client.query(
      `INSERT INTO proveedores (nombre, contacto, direccion) 
       VALUES ($1, $2, $3) RETURNING *`,
      [nombre.trim(), contacto?.trim(), direccion?.trim()]
    );

    await client.query('COMMIT');

    console.log('✅ Proveedor creado exitosamente - ID:', result.rows[0].id);

    res.status(201).json({
      mensaje: 'Proveedor creado correctamente',
      proveedor: result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creando proveedor:', error);
    
    let errorMessage = 'Error al crear el proveedor';
    if (error.code === '23505') {
      errorMessage = 'Ya existe un proveedor con ese nombre';
    }
    
    res.status(500).json({ 
      error: errorMessage, 
      details: error.message 
    });
  } finally {
    client.release();
  }
});

// PUT /api/proveedores/:id - Actualizar proveedor
router.put('/api/proveedores/:id', requireAuth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { nombre, contacto, direccion } = req.body;

    console.log('✏️ Actualizando proveedor:', { id, nombre, contacto });

    // Verificar que el proveedor existe
    const existingProveedor = await client.query(
      'SELECT id FROM proveedores WHERE id = $1',
      [id]
    );

    if (existingProveedor.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }

    if (!nombre || nombre.trim().length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'El nombre del proveedor es requerido' });
    }

    const result = await client.query(
      `UPDATE proveedores 
       SET nombre = $1, contacto = $2, direccion = $3 
       WHERE id = $4 RETURNING *`,
      [nombre.trim(), contacto?.trim(), direccion?.trim(), id]
    );

    await client.query('COMMIT');

    console.log('✅ Proveedor actualizado - ID:', id);

    res.json({
      mensaje: 'Proveedor actualizado correctamente',
      proveedor: result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error actualizando proveedor:', error);
    
    res.status(500).json({ 
      error: 'Error al actualizar el proveedor', 
      details: error.message 
    });
  } finally {
    client.release();
  }
});

// DELETE /api/proveedores/:id - Eliminar proveedor (solo si no tiene productos)
router.delete('/api/proveedores/:id', requireAuth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;

    console.log('🗑️ Eliminando proveedor:', id);

    // Verificar si el proveedor tiene productos asociados
    const productosResult = await client.query(
      'SELECT COUNT(*) as count FROM productos WHERE id_provedores = $1',
      [id]
    );

    const tieneProductos = parseInt(productosResult.rows[0].count) > 0;

    if (tieneProductos) {
      await client.query('ROLLBACK');
      return res.status(409).json({ 
        error: 'No se puede eliminar el proveedor porque tiene productos asociados',
        detalles: 'Elimine o reassigne los productos primero'
      });
    }

    const result = await client.query(
      'DELETE FROM proveedores WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }

    await client.query('COMMIT');

    console.log('✅ Proveedor eliminado - ID:', id);

    res.json({
      mensaje: 'Proveedor eliminado correctamente',
      proveedor: result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error eliminando proveedor:', error);
    
    res.status(500).json({ 
      error: 'Error al eliminar el proveedor', 
      details: error.message 
    });
  } finally {
    client.release();
  }
});

// GET /api/proveedores/:id/productos - Obtener productos de un proveedor
router.get('/api/proveedores/:id/productos', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    console.log('📦 Obteniendo productos del proveedor:', id);

    const result = await pool.query(`
      SELECT p.*, c.nombre as categoria_nombre
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE p.id_provedores = $1
      ORDER BY p.nombre ASC
    `, [id]);

    res.json({
      proveedor_id: id,
      productos: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('❌ Error obteniendo productos del proveedor:', error);
    res.status(500).json({ error: 'Error al obtener productos del proveedor' });
  }
});

// GET /api/proveedores/stats/estadisticas - Estadísticas de proveedores
router.get('/api/proveedores/stats/estadisticas', requireAuth, async (req, res) => {
  try {
    console.log('📊 Obteniendo estadísticas de proveedores');

    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_proveedores,
        COUNT(DISTINCT p.id_provedores) as proveedores_con_productos,
        (SELECT COUNT(*) FROM productos WHERE id_provedores IS NOT NULL) as total_productos_asociados
      FROM proveedores pr
      LEFT JOIN productos p ON pr.id = p.id_provedores
    `);

    const topProveedoresResult = await pool.query(`
      SELECT 
        pr.id,
        pr.nombre,
        COUNT(p.id) as total_productos,
        COALESCE(SUM(p.stock), 0) as stock_total,
        COALESCE(AVG(p.costo_compra), 0) as costo_promedio
      FROM proveedores pr
      LEFT JOIN productos p ON pr.id = p.id_provedores
      GROUP BY pr.id, pr.nombre
      ORDER BY total_productos DESC
      LIMIT 10
    `);

    res.json({
      estadisticas: statsResult.rows[0],
      top_proveedores: topProveedoresResult.rows
    });
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas de proveedores' });
  }
});

export default router;