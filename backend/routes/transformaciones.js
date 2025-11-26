// backend/routes/transformaciones.js
import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import pool from '../database.js';

const router = express.Router();

// POST /api/transformaciones - Procesar una nueva transformación
router.post('/api/transformaciones', requireAuth, async (req, res) => {
  const client = await pool.connect(); // Usamos client para la transacción
  
  try {
    await client.query('BEGIN'); // 1. INICIAR TRANSACCIÓN
    
    const { producto_origen_id, cantidad_origen, observaciones, detalles } = req.body;
    const usuario_id = req.session.user.id;

    console.log('🔄 Iniciando transformación:', { producto_origen_id, cantidad: cantidad_origen });

    // 2. VERIFICAR STOCK DEL ORIGEN (Ej: ¿Tenemos pollos suficientes?)
    const stockCheck = await client.query(
      'SELECT stock, nombre FROM productos WHERE id = $1',
      [producto_origen_id]
    );

    if (stockCheck.rows.length === 0) {
      throw new Error('Producto de origen no encontrado');
    }

    const productoOrigen = stockCheck.rows[0];
    if (parseFloat(productoOrigen.stock) < parseFloat(cantidad_origen)) {
      throw new Error(`Stock insuficiente de ${productoOrigen.nombre}. Disponible: ${productoOrigen.stock}`);
    }

    // 3. INSERTAR EL ENCABEZADO (El registro de la operación)
    const headerResult = await client.query(`
      INSERT INTO transformacion_producto 
      (usuario_id, producto_origen_id, cantidad_origen, observaciones)
      VALUES ($1, $2, $3, $4)
      RETURNING id, fecha_transformacion`,
      [usuario_id, producto_origen_id, cantidad_origen, observaciones]
    );

    const transformacionId = headerResult.rows[0].id;

    // 4. RESTAR EL STOCK DEL PRODUCTO ORIGEN (Sacrificamos el pollo)
    await client.query(`
      UPDATE productos 
      SET stock = stock - $1 
      WHERE id = $2`,
      [cantidad_origen, producto_origen_id]
    );

    // 5. PROCESAR LOS DETALLES (Loop para crear milanesas, muslos, etc.)
    // detalles es un array: [{ producto_destino_id: 12, cantidad_destino: 5 }, ...]
    if (!detalles || detalles.length === 0) {
        throw new Error('Debe especificar al menos un producto de salida');
    }

    for (const item of detalles) {
      // 5.1 Insertar en la tabla de detalles
      await client.query(`
        INSERT INTO transformacion_detalles 
        (transformacion_id, producto_destino_id, cantidad_destino)
        VALUES ($1, $2, $3)`,
        [transformacionId, item.producto_destino_id, item.cantidad_destino]
      );

      // 5.2 SUMAR STOCK AL PRODUCTO DESTINO (Ahora tenemos más milanesas)
      await client.query(`
        UPDATE productos 
        SET stock = stock + $1 
        WHERE id = $2`,
        [item.cantidad_destino, item.producto_destino_id]
      );
    }

    await client.query('COMMIT'); // 6. CONFIRMAR CAMBIOS SI TODO SALIÓ BIEN
    console.log('✅ Transformación completada ID:', transformacionId);
    
    res.status(201).json({ 
      message: 'Transformación realizada con éxito',
      id: transformacionId 
    });

  } catch (error) {
    await client.query('ROLLBACK'); // 7. REVERTIR TODO SI HUBO ERROR
    console.error('❌ Error en transformación:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// GET /api/transformaciones - Ver historial
router.get('/api/transformaciones', requireAuth, async (req, res) => {
  try {
    // Esta consulta trae el encabezado con el nombre del producto origen y usuario
    const result = await pool.query(`
      SELECT 
        t.id, 
        t.fecha_transformacion,
        t.cantidad_origen,
        t.observaciones,
        p.nombre as nombre_origen,
        u.nombre as usuario
      FROM transformacion_producto t
      JOIN productos p ON t.producto_origen_id = p.id
      JOIN usuarios u ON t.usuario_id = u.id
      ORDER BY t.fecha_transformacion DESC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo historial' });
  }
});

// GET /api/transformaciones/:id - Ver detalles de una transformación específica
router.get('/api/transformaciones/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Obtener detalles (lo que salió)
    const detalles = await pool.query(`
      SELECT 
        td.cantidad_destino,
        p.nombre as nombre_producto
      FROM transformacion_detalles td
      JOIN productos p ON td.producto_destino_id = p.id
      WHERE td.transformacion_id = $1
    `, [id]);

    res.json(detalles.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo detalles' });
  }
});

export default router;