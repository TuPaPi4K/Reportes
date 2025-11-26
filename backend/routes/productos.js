import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import pool from '../database.js';

const router = express.Router();

// GET /api/productos - Listar productos
router.get('/api/productos', requireAuth, async (req, res) => {
  try {
    const { categoria_id, stock_alerts, search, include_inactive } = req.query;
    
    // Obtener tasa del día para cálculos referenciales
    const tasaResult = await pool.query(
      'SELECT tasa_bs FROM tasa_cambio ORDER BY fecha_actualizacion DESC LIMIT 1'
    );
    const tasaActual = tasaResult.rows.length > 0 ? parseFloat(tasaResult.rows[0].tasa_bs) : 0;

    let query = `
      SELECT 
        p.*,
        ti.tasa as tasa_iva,
        ti.tipo as tipo_iva,
        COALESCE(c.nombre, 'Sin categoría') as categoria,
        prov.nombre as proveedor
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN proveedores prov ON p.id_provedores = prov.id
      LEFT JOIN tasas_iva ti ON p.id_tasa_iva = ti.id
      WHERE 1=1
    `;
    
    let params = [];
    let paramCount = 0;

    // FILTRO: Por defecto solo mostrar Activos, a menos que se pida lo contrario
    if (include_inactive !== 'true') {
        query += ` AND (p.estado = 'Activo' OR p.estado IS NULL)`;
    }

    if (categoria_id) {
      paramCount++;
      query += ` AND p.categoria_id = $${paramCount}`;
      params.push(categoria_id);
    }

    if (search) {
      paramCount++;
      query += ` AND (p.nombre ILIKE $${paramCount} OR p.id::text ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    if (stock_alerts === 'true') {
      query += ` AND p.stock <= p.stock_minimo`;
    }

    query += ` ORDER BY p.nombre ASC`;

    const result = await pool.query(query, params);
    
    const productosFormateados = result.rows.map(producto => {
      const precioVenta = parseFloat(producto.precio_venta) || 0;
      let precioDolares = parseFloat(producto.precio_dolares) || 0;
      
      if (precioDolares === 0 && tasaActual > 0) {
        precioDolares = precioVenta / tasaActual;
      }

      // CORRECCIÓN AQUÍ: Validar explícitamente null/undefined para permitir el 0
      const tasaIvaRaw = producto.tasa_iva;
      const tasaIva = (tasaIvaRaw !== null && tasaIvaRaw !== undefined) 
                      ? parseFloat(tasaIvaRaw) 
                      : 16;

      return {
        ...producto,
        precio_venta: precioVenta,
        precio_dolares: parseFloat(precioDolares.toFixed(2)),
        stock: parseFloat(producto.stock) || 0,
        stock_minimo: parseFloat(producto.stock_minimo) || 0,
        tasa_iva: tasaIva // Ahora sí acepta 0
      };
    });
    
    res.json(productosFormateados);
  } catch (error) {
    console.error('Error en GET /api/productos:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/tasas-iva
router.get('/api/tasas-iva', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, tasa, descripcion, tipo, estado 
      FROM tasas_iva 
      WHERE estado = 'Activa'
      ORDER BY tasa DESC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/productos
router.post('/api/productos', requireAuth, async (req, res) => {
  try {
    const { 
      nombre, precio_venta, costo_compra, stock, unidad_medida, 
      id_provedores, categoria_id, stock_minimo = 10, id_tasa_iva = 1     
    } = req.body;

    const result = await pool.query(`
      INSERT INTO productos (
        nombre, precio_venta, costo_compra, stock, unidad_medida, 
        id_provedores, categoria_id, stock_minimo, id_tasa_iva, estado
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Activo') RETURNING *
    `, [
      nombre, precio_venta, costo_compra, stock, unidad_medida, 
      id_provedores, categoria_id, stock_minimo, id_tasa_iva
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creando producto:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/productos/:id (Con Historial de Cambios)
router.put('/api/productos/:id', requireAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { 
      nombre, precio_venta, costo_compra, stock, unidad_medida, 
      id_provedores, categoria_id, stock_minimo, id_tasa_iva,
      motivo_ajuste // Dato del frontend
    } = req.body;
    
    const usuario_id = req.session.user.id;

    // 1. Obtener stock anterior
    const productoActual = await client.query('SELECT stock FROM productos WHERE id = $1', [id]);
    
    if (productoActual.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const stockAnterior = parseFloat(productoActual.rows[0].stock);
    const nuevoStock = parseFloat(stock);

    // 2. Actualizar producto
    const result = await client.query(`
      UPDATE productos 
      SET nombre = $1, precio_venta = $2, costo_compra = $3, stock = $4, 
          unidad_medida = $5, id_provedores = $6, categoria_id = $7,
          stock_minimo = $8, id_tasa_iva = $9, fecha_actualizacion = CURRENT_TIMESTAMP
      WHERE id = $10 
      RETURNING *
    `, [
      nombre, precio_venta, costo_compra, stock, unidad_medida, 
      id_provedores, categoria_id, stock_minimo, id_tasa_iva, id
    ]);

    // 3. Guardar historial si hubo cambio de stock
    if (stockAnterior !== nuevoStock) {
       const tipo = nuevoStock > stockAnterior ? 'entrada_ajuste' : 'salida_ajuste';
       
       try {
           await client.query(`
             INSERT INTO historial_inventario 
             (producto_id, usuario_id, stock_anterior, stock_nuevo, motivo, tipo_movimiento)
             VALUES ($1, $2, $3, $4, $5, $6)
           `, [
             id, usuario_id, stockAnterior, nuevoStock, 
             motivo_ajuste || 'Actualización directa', tipo
           ]);
       } catch (err) {
           console.warn('⚠️ No se pudo guardar historial (¿falta la tabla?):', err.message);
       }
    }

    await client.query('COMMIT');
    res.json(result.rows[0]);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error actualizando producto:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// DELETE /api/productos/:id - Eliminación Inteligente (Física o Lógica)
router.delete('/api/productos/:id', requireAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;

    // 1. Verificar historial
    const ventasCheck = await client.query('SELECT id FROM detalle_venta WHERE id_producto = $1 LIMIT 1', [id]);
    const comprasCheck = await client.query('SELECT id FROM detalle_compra WHERE id_producto = $1 LIMIT 1', [id]);
    const tieneHistorial = ventasCheck.rows.length > 0 || comprasCheck.rows.length > 0;

    if (tieneHistorial) {
        // Opción A: Tiene historial -> DESACTIVAR (Soft Delete)
        console.log(`⚠️ Producto ${id} tiene historial. Se procederá a desactivar.`);
        await client.query("UPDATE productos SET estado = 'Inactivo' WHERE id = $1", [id]);
        await client.query('COMMIT');
        return res.json({ message: 'Producto archivado correctamente (no se puede borrar por historial)' });
    } else {
        // Opción B: No tiene historial -> ELIMINAR (Hard Delete)
        console.log(`🗑️ Producto ${id} limpio. Se eliminará permanentemente.`);
        // Limpiar historial de ajustes si hubiera (para permitir borrado físico)
        await client.query('DELETE FROM historial_inventario WHERE producto_id = $1', [id]);
        
        const result = await client.query('DELETE FROM productos WHERE id = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        await client.query('COMMIT');
        return res.json({ message: 'Producto eliminado permanentemente' });
    }

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error eliminando producto:', error);
    res.status(500).json({ error: 'Error del servidor al eliminar producto' });
  } finally {
    client.release();
  }
});

// Otras rutas (stock alerts, etc.)
router.get('/api/productos/stock-alerts', requireAuth, async (req, res) => {
  try {
    const productosResult = await pool.query(`
      SELECT p.id, p.nombre, p.stock, p.stock_minimo, p.unidad_medida, c.nombre as categoria
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE p.stock <= p.stock_minimo AND p.estado = 'Activo'
      ORDER BY p.stock ASC
    `);
    res.json(productosResult.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener alertas' });
  }
});

router.get('/api/productos/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`SELECT * FROM productos WHERE id = $1`, [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;