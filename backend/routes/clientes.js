// routes/clientes.js
import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import pool from '../database.js';

const router = express.Router();

// GET /api/clientes - Listar clientes con paginación y búsqueda
router.get('/api/clientes', requireAuth, async (req, res) => {
  try {
    const { 
      nombre, 
      cedula, 
      page = 1, 
      limit = 10,
      estado = ''
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT id, cedula_rif, nombre, telefono, direccion, estado, fecha_registro
      FROM clientes 
      WHERE 1=1
    `;
    let countQuery = `SELECT COUNT(*) FROM clientes WHERE 1=1`;
    let params = [];
    let paramCount = 0;

    // Filtro por estado
    if (estado) {
      paramCount++;
      query += ` AND estado = $${paramCount}`;
      countQuery += ` AND estado = $${paramCount}`;
      params.push(estado);
    }

    // Filtro por nombre o dirección
    if (nombre) {
      paramCount++;
      query += ` AND (nombre ILIKE $${paramCount} OR direccion ILIKE $${paramCount})`;
      countQuery += ` AND (nombre ILIKE $${paramCount} OR direccion ILIKE $${paramCount})`;
      params.push(`%${nombre}%`);
    }

    // Filtro por cédula/RIF
    if (cedula) {
      paramCount++;
      query += ` AND cedula_rif ILIKE $${paramCount}`;
      countQuery += ` AND cedula_rif ILIKE $${paramCount}`;
      params.push(`%${cedula}%`);
    }

    // Ordenamiento y paginación
    query += ` ORDER BY nombre LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(parseInt(limit), offset);

    // Ejecutar consulta principal
    const result = await pool.query(query, params);
    
    // Obtener total de registros
    const countResult = await pool.query(countQuery, params.slice(0, paramCount));
    const total = parseInt(countResult.rows[0].count);

    res.json({
      clientes: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error en búsqueda de clientes:', error);
    res.status(500).json({ error: 'Error del servidor al buscar clientes' });
  }
});

// GET /api/clientes/cedula/:cedula - Buscar cliente por cédula/RIF
router.get('/api/clientes/cedula/:cedula', requireAuth, async (req, res) => {
  try {
    const { cedula } = req.params;
    const result = await pool.query(
      `SELECT id, cedula_rif, nombre, telefono, direccion, estado, fecha_registro 
       FROM clientes 
       WHERE cedula_rif = $1 AND estado = $2`, 
      [cedula, 'Activo']
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error buscando cliente por cédula:', error);
    res.status(500).json({ error: 'Error del servidor al buscar cliente' });
  }
});

// GET /api/clientes/:id - Obtener cliente por ID
router.get('/api/clientes/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT id, cedula_rif, nombre, telefono, direccion, estado, fecha_registro 
       FROM clientes 
       WHERE id = $1`, 
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error obteniendo cliente:', error);
    res.status(500).json({ error: 'Error del servidor al obtener cliente' });
  }
});

// POST /api/clientes - Crear nuevo cliente
router.post('/api/clientes', requireAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { cedula_rif, nombre, telefono, direccion } = req.body;
    
    // Validaciones básicas
    if (!cedula_rif || !nombre) {
      return res.status(400).json({ error: 'Cédula/RIF y nombre son obligatorios' });
    }

    // Verificar si ya existe un cliente con la misma cédula/RIF
    const exists = await client.query(
      'SELECT id FROM clientes WHERE cedula_rif = $1',
      [cedula_rif]
    );
    
    if (exists.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Ya existe un cliente con esta cédula/RIF' });
    }

    // Insertar nuevo cliente
    const result = await client.query(
      `INSERT INTO clientes (cedula_rif, nombre, telefono, direccion) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, cedula_rif, nombre, telefono, direccion, estado, fecha_registro`,
      [cedula_rif, nombre, telefono, direccion]
    );
    
    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creando cliente:', error);
    
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Ya existe un cliente con esta cédula/RIF' });
    }
    
    res.status(500).json({ error: 'Error del servidor al crear cliente' });
  } finally {
    client.release();
  }
});

// PUT /api/clientes/:id - Actualizar cliente
router.put('/api/clientes/:id', requireAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { cedula_rif, nombre, telefono, direccion, estado } = req.body;
    
    // Validaciones básicas
    if (!cedula_rif || !nombre) {
      return res.status(400).json({ error: 'Cédula/RIF y nombre son obligatorios' });
    }

    // Verificar que el cliente existe
    const clienteExists = await client.query(
      'SELECT id FROM clientes WHERE id = $1',
      [id]
    );
    
    if (clienteExists.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    // Verificar que no exista otro cliente con la misma cédula/RIF
    const duplicateCheck = await client.query(
      'SELECT id FROM clientes WHERE cedula_rif = $1 AND id != $2',
      [cedula_rif, id]
    );
    
    if (duplicateCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Ya existe otro cliente con esta cédula/RIF' });
    }

    // Actualizar cliente
    const result = await client.query(
      `UPDATE clientes 
       SET cedula_rif = $1, nombre = $2, telefono = $3, direccion = $4, estado = $5
       WHERE id = $6 
       RETURNING id, cedula_rif, nombre, telefono, direccion, estado, fecha_registro`,
      [cedula_rif, nombre, telefono, direccion, estado, id]
    );
    
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error actualizando cliente:', error);
    
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Ya existe otro cliente con esta cédula/RIF' });
    }
    
    res.status(500).json({ error: 'Error del servidor al actualizar cliente' });
  } finally {
    client.release();
  }
});

// DELETE /api/clientes/:id - Eliminar cliente (cambiar estado a Inactivo)
router.delete('/api/clientes/:id', requireAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;

    // Verificar que el cliente existe
    const clienteExists = await client.query(
      'SELECT id FROM clientes WHERE id = $1',
      [id]
    );
    
    if (clienteExists.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    // Actualizar estado a Inactivo (eliminación lógica)
    const result = await client.query(
      `UPDATE clientes 
       SET estado = 'Inactivo' 
       WHERE id = $1 
       RETURNING id, cedula_rif, nombre, estado`,
      [id]
    );
    
    await client.query('COMMIT');
    res.json({ 
      message: 'Cliente eliminado correctamente', 
      cliente: result.rows[0] 
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error eliminando cliente:', error);
    res.status(500).json({ error: 'Error del servidor al eliminar cliente' });
  } finally {
    client.release();
  }
});

// GET /api/clientes-stats - Obtener estadísticas de clientes
router.get('/api/clientes-stats', requireAuth, async (req, res) => {
  try {
    // Total de clientes
    const totalResult = await pool.query('SELECT COUNT(*) FROM clientes');
    const total = parseInt(totalResult.rows[0].count);

    // Clientes activos
    const activosResult = await pool.query('SELECT COUNT(*) FROM clientes WHERE estado = $1', ['Activo']);
    const activos = parseInt(activosResult.rows[0].count);

    // Clientes inactivos
    const inactivosResult = await pool.query('SELECT COUNT(*) FROM clientes WHERE estado = $1', ['Inactivo']);
    const inactivos = parseInt(inactivosResult.rows[0].count);

    // Nuevos clientes este mes
    const nuevosMesResult = await pool.query(
      `SELECT COUNT(*) FROM clientes 
       WHERE fecha_registro >= date_trunc('month', CURRENT_DATE)`
    );
    const nuevosMes = parseInt(nuevosMesResult.rows[0].count);

    res.json({
      total,
      activos,
      inactivos,
      nuevosMes
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ error: 'Error del servidor al obtener estadísticas' });
  }
});

export default router;