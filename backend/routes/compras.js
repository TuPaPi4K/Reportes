import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import pool from '../database.js';

const router = express.Router();

// ==========================================
// 1. RUTAS ESPECÍFICAS (Deben ir PRIMERO)
// ==========================================

// GET Estadísticas
router.get('/api/compras/stats/estadisticas', requireAuth, async (req, res) => {
  try {
    const fecha = new Date();
    const mes = fecha.getMonth() + 1;
    const anio = fecha.getFullYear();

    console.log('📊 Solicitando estadísticas de compras...');

    const stats = await pool.query(`
      SELECT 
        COALESCE(SUM(total), 0) as total_invertido,
        COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) as compras_pendientes,
        COUNT(CASE WHEN estado = 'recibida' THEN 1 END) as compras_recibidas
      FROM compras
      WHERE EXTRACT(MONTH FROM fecha_compra) = $1 AND EXTRACT(YEAR FROM fecha_compra) = $2
    `, [mes, anio]);

    res.json({ estadisticas: stats.rows[0] });
  } catch (error) {
    console.error('Error en estadísticas:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 2. RUTAS DINÁMICAS CON PARÁMETROS
// ==========================================

// GET Factura para imprimir (CORREGIDO: Se eliminó p.rif de la consulta)
router.get('/api/compras/:id/factura', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // 1. Datos de la Compra y Proveedor
    // NOTA: Eliminamos "p.rif as prov_rif" porque la columna no existe en la tabla
    const compraRes = await pool.query(`
      SELECT c.*, 
             p.nombre as prov_nombre, p.direccion as prov_direccion, p.contacto as prov_contacto,
             u.nombre as comprador
      FROM compras c
      LEFT JOIN proveedores p ON c.id_proveedor = p.id
      LEFT JOIN usuarios u ON c.id_usuario = u.id
      WHERE c.id = $1
    `, [id]);

    if (compraRes.rows.length === 0) return res.status(404).json({ error: 'Compra no encontrada' });
    const compra = compraRes.rows[0];

    const empresaRes = await pool.query('SELECT * FROM configuracion_empresa LIMIT 1');
    const empresa = empresaRes.rows[0] || { nombre_empresa: "Na'Guara", rif: "J-123456789", direccion: "Venezuela" };

    const detallesRes = await pool.query(`
      SELECT dc.*, p.nombre as producto, p.unidad_medida
      FROM detalle_compra dc
      JOIN productos p ON dc.id_producto = p.id
      WHERE dc.id_compra = $1
    `, [id]);

    const factura = {
        empresa: empresa,
        proveedor: {
            nombre: compra.prov_nombre,
            rif: 'N/A', // Devolvemos N/A ya que no tenemos el dato en BD
            direccion: compra.prov_direccion,
            contacto: compra.prov_contacto
        },
        compra: {
            id: compra.id,
            numero_factura: compra.num_factura,
            fecha: compra.fecha_compra,
            estado: compra.estado,
            comprador: compra.comprador
        },
        items: detallesRes.rows.map(d => ({
            producto: d.producto,
            unidad: d.unidad_medida,
            cantidad: parseFloat(d.cantidad),
            precio: parseFloat(d.precio_compra),
            total: parseFloat(d.cantidad) * parseFloat(d.precio_compra)
        })),
        subtotal: parseFloat(compra.total),
        total: parseFloat(compra.total)
    };

    res.json(factura);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error generando factura' });
  }
});

// PUT Recibir Compra (Actualiza Stock y Costos)
router.put('/api/compras/:id/recibir', requireAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { detalles_recibidos } = req.body; 

    console.log('📥 Recibiendo compra ID:', id);

    for (const detalle of detalles_recibidos) {
      await client.query(
        `UPDATE detalle_compra 
         SET cantidad_recibida = $1, lote = $2, fecha_vencimiento = $3 
         WHERE id = $4 AND id_compra = $5`,
        [detalle.cantidad_recibida, detalle.lote, detalle.fecha_vencimiento, detalle.id_detalle, id]
      );

      const precioResult = await client.query(
        'SELECT precio_compra FROM detalle_compra WHERE id = $1',
        [detalle.id_detalle]
      );
      const nuevoCosto = precioResult.rows[0]?.precio_compra;

      if (nuevoCosto > 0) {
          await client.query(
            `UPDATE productos 
             SET stock = stock + $1, 
                 costo_compra = $2,
                 fecha_actualizacion = CURRENT_TIMESTAMP
             WHERE id = $3`,
            [detalle.cantidad_recibida, nuevoCosto, detalle.id_producto]
          );
      } else {
          await client.query(
            'UPDATE productos SET stock = stock + $1 WHERE id = $2',
            [detalle.cantidad_recibida, detalle.id_producto]
          );
      }
    }

    const pendientesResult = await client.query(
      `SELECT COUNT(*) as pendientes 
       FROM detalle_compra 
       WHERE id_compra = $1 AND cantidad_recibida < cantidad`,
      [id]
    );

    const estado = parseInt(pendientesResult.rows[0].pendientes) > 0 ? 'parcial' : 'recibida';

    await client.query(
      'UPDATE compras SET estado = $1, fecha_recepcion = CURRENT_TIMESTAMP WHERE id = $2',
      [estado, id]
    );

    await client.query('COMMIT');
    res.json({ mensaje: 'Recepción procesada y costos actualizados', estado });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error recibiendo compra:', error);
    res.status(500).json({ error: 'Error al recibir la compra', details: error.message });
  } finally {
    client.release();
  }
});

// GET Detalles de una compra (Genérico con ID)
router.get('/api/compras/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    // También quitamos p.rif de aquí por seguridad
    const compraResult = await pool.query(`
      SELECT c.*, p.nombre as proveedor_nombre 
      FROM compras c
      LEFT JOIN proveedores p ON c.id_proveedor = p.id
      WHERE c.id = $1
    `, [id]);

    if (compraResult.rows.length === 0) return res.status(404).json({ error: 'No encontrada' });

    const detallesResult = await pool.query(`
      SELECT dc.*, pr.nombre as producto_nombre, pr.unidad_medida
      FROM detalle_compra dc
      LEFT JOIN productos pr ON dc.id_producto = pr.id
      WHERE dc.id_compra = $1
    `, [id]);

    res.json({ compra: compraResult.rows[0], detalles: detallesResult.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 3. RUTAS GENERALES (Sin parámetros)
// ==========================================

// GET Listar todas las compras
router.get('/api/compras', requireAuth, async (req, res) => {
  try {
    const { estado, proveedor_id } = req.query;
    
    let query = `
      SELECT c.*, p.nombre as proveedor_nombre, u.nombre as usuario_nombre
      FROM compras c
      LEFT JOIN proveedores p ON c.id_proveedor = p.id
      LEFT JOIN usuarios u ON c.id_usuario = u.id
      WHERE 1=1
    `;
    let params = [];
    let paramCount = 0;

    if (estado) {
      paramCount++;
      query += ` AND c.estado = $${paramCount}`;
      params.push(estado);
    }

    if (proveedor_id) {
      paramCount++;
      query += ` AND c.id_proveedor = $${paramCount}`;
      params.push(proveedor_id);
    }

    query += ' ORDER BY c.fecha_compra DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo compras:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST Crear Compra
router.post('/api/compras', requireAuth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id_proveedor, num_factura, observaciones, detalles } = req.body;
    const id_usuario = req.session.user.id;

    const compraResult = await client.query(
      `INSERT INTO compras (id_proveedor, id_usuario, num_factura, observaciones, estado) 
       VALUES ($1, $2, $3, $4, 'pendiente') RETURNING *`,
      [id_proveedor, id_usuario, num_factura, observaciones]
    );

    const compra = compraResult.rows[0];

    for (const detalle of detalles) {
      await client.query(
        `INSERT INTO detalle_compra (id_compra, id_producto, cantidad, precio_compra, cantidad_recibida) 
         VALUES ($1, $2, $3, $4, 0)`,
        [compra.id, detalle.id_producto, detalle.cantidad, detalle.precio_compra]
      );
    }

    const totalResult = await client.query(
      `SELECT SUM(cantidad * precio_compra) as total 
       FROM detalle_compra WHERE id_compra = $1`,
      [compra.id]
    );

    await client.query(
      'UPDATE compras SET total = $1 WHERE id = $2',
      [totalResult.rows[0].total || 0, compra.id]
    );

    await client.query('COMMIT');
    res.status(201).json({ mensaje: 'Compra creada correctamente', compra });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creando compra:', error);
    res.status(500).json({ error: 'Error al crear la compra', details: error.message });
  } finally {
    client.release();
  }
});

export default router;