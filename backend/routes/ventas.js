import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import pool from '../database.js';

const router = express.Router();

router.post('/api/ventas', requireAuth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id_cliente, detalles, metodo_pago, payment_details } = req.body;
    const id_usuario = req.session.user.id;

    console.log('📦 Procesando venta con pago:', { 
      id_cliente, 
      detalles, 
      metodo_pago,
      payment_details 
    });

    let total_venta = 0;
    let subtotal = 0;
    let iva_total = 0;

    // Verificar stock y calcular totales
    for (const detalle of detalles) {
      const productoResult = await client.query(
        `SELECT p.stock, p.nombre, p.precio_venta, ti.tasa as tasa_iva
         FROM productos p 
         LEFT JOIN tasas_iva ti ON p.id_tasa_iva = ti.id 
         WHERE p.id = $1`,
        [detalle.id_producto]
      );
      
      if (productoResult.rows.length === 0) {
        throw new Error(`Producto con ID ${detalle.id_producto} no encontrado`);
      }
      
      const producto = productoResult.rows[0];
      if (producto.stock < detalle.cantidad) {
        throw new Error(`Stock insuficiente para "${producto.nombre}". Disponible: ${producto.stock}, Solicitado: ${detalle.cantidad}`);
      }

      const tasa_iva = parseFloat(producto.tasa_iva) / 100;
      const precio_sin_iva = parseFloat(detalle.precio_unitario) / (1 + tasa_iva);
      const iva_linea = precio_sin_iva * tasa_iva * parseFloat(detalle.cantidad);
      
      subtotal += precio_sin_iva * parseFloat(detalle.cantidad);
      iva_total += iva_linea;
      total_venta += parseFloat(detalle.cantidad) * parseFloat(detalle.precio_unitario);
    }

    const ventaResult = await client.query(
      `INSERT INTO ventas (
        id_usuario, id_cliente, metodo_pago, estado, 
        detalles_pago, referencia_pago, banco_pago, monto_recibido, cambio
      ) VALUES ($1, $2, $3, 'completada', $4, $5, $6, $7, $8) RETURNING *`,
      [
        id_usuario, 
        id_cliente, 
        metodo_pago,
        payment_details ? JSON.stringify(payment_details) : null,
        payment_details?.reference || payment_details?.referencia || null,
        payment_details?.bank || payment_details?.banco || null,
        payment_details?.received || payment_details?.monto_recibido || null,
        payment_details?.change || payment_details?.cambio || null
      ]
    );

    const venta = ventaResult.rows[0];
    console.log('✅ Venta creada:', venta.id);

    for (const detalle of detalles) {
      console.log('📝 Procesando detalle:', detalle);
      
      const productoResult = await client.query(
        `SELECT p.stock, p.nombre, ti.tasa as tasa_iva
         FROM productos p 
         LEFT JOIN tasas_iva ti ON p.id_tasa_iva = ti.id 
         WHERE p.id = $1`,
        [detalle.id_producto]
      );
      
      const producto = productoResult.rows[0];

      await client.query(
        `INSERT INTO detalle_venta (id_venta, id_producto, cantidad, precio_unitario) 
         VALUES ($1, $2, $3, $4)`,
        [venta.id, detalle.id_producto, detalle.cantidad, detalle.precio_unitario]
      );

      await client.query(
        'UPDATE productos SET stock = stock - $1 WHERE id = $2',
        [detalle.cantidad, detalle.id_producto]
      );
    }

    await client.query('COMMIT');

    console.log('✅ Venta completada exitosamente - ID:', venta.id);

    res.status(201).json({
      mensaje: 'Venta procesada correctamente',
      venta: {
        id: venta.id,
        fecha_venta: venta.fecha_venta,
        subtotal: subtotal,
        iva: iva_total,
        total: total_venta,
        metodo_pago: venta.metodo_pago,
        payment_details: payment_details
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error en venta:', error);
    
  } finally {
    client.release();
  }
});


router.get('/api/ventas', requireAuth, async (req, res) => {
  try {
    const { fecha } = req.query;
    let query = `
      SELECT v.*, c.nombre as cliente_nombre
      FROM ventas v
      LEFT JOIN clientes c ON v.id_cliente = c.id
      WHERE v.estado = 'completada'
    `;
    let params = [];

    if (fecha) {
      query += ' AND DATE(v.fecha_venta) = $1';
      params.push(fecha);
    }

    query += ' ORDER BY v.fecha_venta DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo ventas:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/api/ventas/resumen-diario', requireAuth, async (req, res) => {
  try {
    const { fecha } = req.query;
    const fechaFiltro = fecha || new Date().toISOString().split('T')[0];
    const usuario_id = req.session.user.id; // ✅ Obtener el usuario de la sesión

    console.log('📊 Obteniendo resumen diario para:', { 
      fecha: fechaFiltro, 
      usuario: usuario_id 
    });

    // 1. Obtener ventas NO mixtas DEL USUARIO ACTUAL
    const ventasNoMixtas = await pool.query(`
      SELECT 
        metodo_pago,
        COUNT(*) as cantidad_ventas,
        SUM(
          (SELECT SUM(dv.cantidad * dv.precio_unitario) 
           FROM detalle_venta dv 
           WHERE dv.id_venta = v.id)
        ) as total_ventas
      FROM ventas v
      WHERE DATE(v.fecha_venta) = $1 
        AND v.estado = 'completada'
        AND v.metodo_pago != 'mixto'
        AND v.id_usuario = $2  -- ✅ FILTRAR POR USUARIO
      GROUP BY metodo_pago
    `, [fechaFiltro, usuario_id]);

    // 2. Obtener ventas mixtas DEL USUARIO ACTUAL
    const ventasMixtas = await pool.query(`
      SELECT v.id, v.detalles_pago
      FROM ventas v
      WHERE DATE(v.fecha_venta) = $1 
        AND v.estado = 'completada'
        AND v.metodo_pago = 'mixto'
        AND v.id_usuario = $2  -- ✅ FILTRAR POR USUARIO
    `, [fechaFiltro, usuario_id]);

    // 3. Obtener estadísticas generales DEL USUARIO ACTUAL
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_ventas_count,
        MIN(fecha_venta) as primera_venta,
        MAX(fecha_venta) as ultima_venta
      FROM ventas 
      WHERE DATE(fecha_venta) = $1 
        AND estado = 'completada'
        AND id_usuario = $2  -- ✅ FILTRAR POR USUARIO
    `, [fechaFiltro, usuario_id]);

    const stats = statsResult.rows[0] || {
      total_ventas_count: 0,
      primera_venta: null,
      ultima_venta: null
    };

    // Inicializar resumen
    const resumen = {
      efectivo_bs: 0,
      efectivo_usd: 0,
      punto_venta: 0,
      transferencia: 0,
      pago_movil: 0,
      mixto: 0,
      efectivo: 0,
      tarjeta: 0,
      total: 0,
      total_ventas_count: parseInt(stats.total_ventas_count) || 0,
      primera_venta: stats.primera_venta,
      ultima_venta: stats.ultima_venta,
      usuario: usuario_id  // ✅ Incluir info del usuario
    };

    // 4. Procesar ventas NO mixtas
    ventasNoMixtas.rows.forEach(row => {
      const metodo = row.metodo_pago;
      const total = parseFloat(row.total_ventas) || 0;
      
      if (resumen.hasOwnProperty(metodo)) {
        resumen[metodo] = total;
      }
      resumen.total += total;
    });

    // 5. Procesar ventas Mixtas - DESGLOSAR
    let contadorMixtas = 0;
    ventasMixtas.rows.forEach(venta => {
      contadorMixtas++;
      
      if (venta.detalles_pago && venta.detalles_pago.payments) {
        venta.detalles_pago.payments.forEach(pago => {
          const metodo = pago.method;
          const monto = parseFloat(pago.amount) || 0;
          
          if (resumen.hasOwnProperty(metodo)) {
            resumen[metodo] += monto;
            resumen.total += monto;
          }
        });
      }
    });

    resumen.mixto = contadorMixtas;

    console.log('📈 Resumen diario DEL USUARIO:', {
      usuario: usuario_id,
      totalVentas: resumen.total,
      cantidadVentas: resumen.total_ventas_count,
      ventasMixtas: contadorMixtas
    });

    res.json(resumen);

  } catch (error) {
    console.error('Error obteniendo resumen diario:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ruta para obtener todas las facturas con filtros avanzados
router.get('/api/facturas-venta', requireAuth, async (req, res) => {
  try {
    const { 
      fecha_inicio, 
      fecha_fin, 
      cliente, 
      metodo_pago, 
      estado,
      page = 1, 
      limit = 20 
    } = req.query;

    let query = `
      SELECT 
        v.id,
        v.fecha_venta,
        v.metodo_pago,
        v.estado,
        v.detalles_pago,
        v.referencia_pago,
        v.banco_pago,
        v.motivo_anulacion,
        c.nombre as cliente_nombre,
        c.cedula_rif as cliente_cedula,
        u.nombre as vendedor_nombre,
        (SELECT SUM(dv.cantidad * dv.precio_unitario) 
         FROM detalle_venta dv 
         WHERE dv.id_venta = v.id) as total
      FROM ventas v
      LEFT JOIN clientes c ON v.id_cliente = c.id
      LEFT JOIN usuarios u ON v.id_usuario = u.id
      WHERE 1=1
    `;

    let params = [];
    let conditions = [];
    let paramCount = 0;

    if (estado) {
      paramCount += 1;
      conditions.push(`v.estado = $${paramCount}`);
      params.push(estado);
    }

    if (fecha_inicio && fecha_fin) {
      paramCount += 2;
      conditions.push(`DATE(v.fecha_venta) BETWEEN $${paramCount-1} AND $${paramCount}`);
      params.push(fecha_inicio, fecha_fin);
    } else if (fecha_inicio) {
      paramCount += 1;
      conditions.push(`DATE(v.fecha_venta) >= $${paramCount}`);
      params.push(fecha_inicio);
    } else if (fecha_fin) {
      paramCount += 1;
      conditions.push(`DATE(v.fecha_venta) <= $${paramCount}`);
      params.push(fecha_fin);
    }

    if (cliente) {
      paramCount += 1;
      conditions.push(`(c.nombre ILIKE $${paramCount} OR c.cedula_rif ILIKE $${paramCount})`);
      params.push(`%${cliente}%`);
    }

    if (metodo_pago) {
      paramCount += 1;
      conditions.push(`v.metodo_pago = $${paramCount}`);
      params.push(metodo_pago);
    }

    if (conditions.length > 0) {
      query += ` AND ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY v.fecha_venta DESC`;
    
    const offset = (page - 1) * limit;
    paramCount += 2;
    query += ` LIMIT $${paramCount-1} OFFSET $${paramCount}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);

    let countQuery = `
      SELECT COUNT(*) 
      FROM ventas v
      LEFT JOIN clientes c ON v.id_cliente = c.id
      WHERE 1=1
    `;

    let countParams = [];
    let countConditions = [];
    let countParamCount = 0;

    if (estado) {
      countParamCount += 1;
      countConditions.push(`v.estado = $${countParamCount}`);
      countParams.push(estado);
    }

    if (fecha_inicio && fecha_fin) {
      countParamCount += 2;
      countConditions.push(`DATE(v.fecha_venta) BETWEEN $${countParamCount-1} AND $${countParamCount}`);
      countParams.push(fecha_inicio, fecha_fin);
    } else if (fecha_inicio) {
      countParamCount += 1;
      countConditions.push(`DATE(v.fecha_venta) >= $${countParamCount}`);
      countParams.push(fecha_inicio);
    } else if (fecha_fin) {
      countParamCount += 1;
      countConditions.push(`DATE(v.fecha_venta) <= $${countParamCount}`);
      countParams.push(fecha_fin);
    }

    if (cliente) {
      countParamCount += 1;
      countConditions.push(`(c.nombre ILIKE $${countParamCount} OR c.cedula_rif ILIKE $${countParamCount})`);
      countParams.push(`%${cliente}%`);
    }

    if (metodo_pago) {
      countParamCount += 1;
      countConditions.push(`v.metodo_pago = $${countParamCount}`);
      countParams.push(metodo_pago);
    }

    if (countConditions.length > 0) {
      countQuery += ` AND ${countConditions.join(' AND ')}`;
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalFacturas = parseInt(countResult.rows[0].count);

    res.json({
      facturas: result.rows,
      paginacion: {
        pagina_actual: parseInt(page),
        total_paginas: Math.ceil(totalFacturas / limit),
        total_facturas: totalFacturas,
        por_pagina: parseInt(limit)
      }
    });

  } catch (error) {
    res.status(500).json({ error: 'Error al obtener las facturas de venta' });
  }
});

// Ruta para anular una factura
router.put('/api/facturas-venta/:id/anular', requireAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { motivo } = req.body;
    const motivo_anulacion = motivo || 'Anulación por usuario';

    console.log(`❌ Anulando factura ${id}, motivo: ${motivo_anulacion}`);

    // 1. Verificar que la factura existe y está activa
    const facturaResult = await client.query(
      'SELECT id, estado FROM ventas WHERE id = $1',
      [id]
    );

    if (facturaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }

    const factura = facturaResult.rows[0];
    
    if (factura.estado === 'anulada') {
      return res.status(400).json({ error: 'La factura ya está anulada' });
    }

    if (factura.estado !== 'completada') {
      return res.status(400).json({ error: 'Solo se pueden anular facturas completadas' });
    }

    // 2. Obtener detalles de la venta para revertir stock
    const detallesResult = await client.query(
      `SELECT dv.id_producto, dv.cantidad, p.nombre, p.stock
       FROM detalle_venta dv 
       JOIN productos p ON dv.id_producto = p.id 
       WHERE dv.id_venta = $1`,
      [id]
    );

    // 3. Revertir stock de productos
    for (const detalle of detallesResult.rows) {
      await client.query(
        'UPDATE productos SET stock = stock + $1 WHERE id = $2',
        [detalle.cantidad, detalle.id_producto]
      );
      console.log(`📦 Stock revertido: ${detalle.nombre} +${detalle.cantidad}`);
    }

    // 4. Marcar factura como anulada
    await client.query(
      'UPDATE ventas SET estado = $1, motivo_anulacion = $2 WHERE id = $3',
      ['anulada', motivo_anulacion, id]
    );

    await client.query('COMMIT');

    console.log(`✅ Factura ${id} anulada exitosamente`);
    res.json({ 
      mensaje: 'Factura anulada exitosamente',
      factura_id: id
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error anulando factura:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Ruta para obtener estadísticas de facturas
router.get('/api/facturas-venta/estadisticas', requireAuth, async (req, res) => {
    try {
        const { fecha_inicio, fecha_fin } = req.query;
        
        let query = `
            SELECT 
                COALESCE(COUNT(*), 0) as total_facturas,
                COALESCE(COUNT(CASE WHEN estado = 'anulada' THEN 1 END), 0) as facturas_anuladas,
                COALESCE(SUM(
                    CASE WHEN estado = 'completada' THEN
                        (SELECT COALESCE(SUM(dv.cantidad * dv.precio_unitario), 0)
                         FROM detalle_venta dv 
                         WHERE dv.id_venta = v.id)
                    ELSE 0 END
                ), 0) as total_ventas,
                COALESCE(AVG(
                    CASE WHEN estado = 'completada' THEN
                        (SELECT COALESCE(SUM(dv.cantidad * dv.precio_unitario), 0)
                         FROM detalle_venta dv 
                         WHERE dv.id_venta = v.id)
                    ELSE NULL END
                ), 0) as promedio_venta
            FROM ventas v
            WHERE 1=1
        `;

        let params = [];
        let conditions = [];
        let paramCount = 0;

        if (fecha_inicio && fecha_fin) {
            paramCount += 2;
            conditions.push(`DATE(v.fecha_venta) BETWEEN $${paramCount-1} AND $${paramCount}`);
            params.push(fecha_inicio, fecha_fin);
        }

        if (conditions.length > 0) {
            query += ` AND ${conditions.join(' AND ')}`;
        }

        const result = await pool.query(query, params);
        const estadisticas = result.rows[0];

        // Obtener métodos de pago (solo de facturas completadas)
        const metodosPagoQuery = `
            SELECT 
                metodo_pago,
                COALESCE(COUNT(*), 0) as cantidad,
                COALESCE(SUM(
                    (SELECT COALESCE(SUM(dv.cantidad * dv.precio_unitario), 0)
                     FROM detalle_venta dv 
                     WHERE dv.id_venta = v.id)
                ), 0) as total
            FROM ventas v
            WHERE estado = 'completada'
            ${fecha_inicio && fecha_fin ? ' AND DATE(v.fecha_venta) BETWEEN $1 AND $2' : ''}
            GROUP BY metodo_pago
            ORDER BY total DESC
        `;

        const metodosResult = await pool.query(
            metodosPagoQuery, 
            fecha_inicio && fecha_fin ? [fecha_inicio, fecha_fin] : []
        );

        res.json({
            estadisticas,
            metodos_pago: metodosResult.rows
        });

    } catch (error) {
        console.error('❌ Error obteniendo estadísticas:', error);
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
});

router.get('/api/cierre-caja/verificar', requireAuth, async (req, res) => {
  try {
    const { fecha, usuario_id } = req.query;
    const fechaFiltro = fecha || new Date().toISOString().split('T')[0];
    const usuarioFiltro = usuario_id || req.session.user.id;

    console.log('🔍 Verificando cierre de caja para:', { fecha: fechaFiltro, usuario: usuarioFiltro });

    const result = await pool.query(
      'SELECT id, fecha, usuario_id, estado FROM cierre_caja WHERE fecha = $1 AND usuario_id = $2',
      [fechaFiltro, usuarioFiltro]
    );

    if (result.rows.length > 0) {
      console.log('❌ Cierre de caja ya existe:', result.rows[0]);
      return res.status(409).json({
        error: 'Cierre de caja ya existe',
        cierre_existente: result.rows[0]
      });
    }

    console.log('✅ No existe cierre de caja para hoy');
    res.json({ 
      mensaje: 'Puede proceder con el cierre de caja',
      puede_continuar: true 
    });

  } catch (error) {
    console.error('Error verificando cierre de caja:', error);
    res.status(500).json({ error: 'Error al verificar cierre de caja' });
  }
});



router.post('/api/cierre-caja', requireAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const {
      fecha,
      usuario_id = req.session.user.id,
      efectivo_inicial,
      efectivo_final,
      total_ventas,
      total_ventas_efectivo,
      total_ventas_tarjeta,
      total_ventas_transferencia,
      total_ventas_pago_movil,
      diferencia
    } = req.body;

    console.log('🔐 Validando cierre de caja para usuario:', usuario_id, 'fecha:', fecha);

    // ✅ VALIDACIÓN: Verificar si ya existe un cierre de caja para este usuario en esta fecha
    const existingClose = await client.query(
      'SELECT id, fecha, usuario_id FROM cierre_caja WHERE fecha = $1 AND usuario_id = $2',
      [fecha, usuario_id]
    );

    if (existingClose.rows.length > 0) {
      await client.query('ROLLBACK');
      console.log('❌ Ya existe cierre de caja para hoy:', existingClose.rows[0]);
      return res.status(409).json({ 
        error: 'Ya existe un cierre de caja para esta fecha y usuario',
        cierre_existente: existingClose.rows[0]
      });
    }

    // ✅ Insertar nuevo cierre de caja
    const result = await client.query(`
      INSERT INTO cierre_caja (
        fecha, usuario_id, efectivo_inicial, efectivo_final, total_ventas,
        total_ventas_efectivo, total_ventas_tarjeta, total_ventas_transferencia,
        total_ventas_pago_movil, diferencia, estado
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'completado')
      RETURNING *
    `, [
      fecha, usuario_id, efectivo_inicial, efectivo_final, total_ventas,
      total_ventas_efectivo, total_ventas_tarjeta, total_ventas_transferencia,
      total_ventas_pago_movil, diferencia
    ]);

    await client.query('COMMIT');
    
    console.log('✅ Cierre de caja registrado exitosamente:', result.rows[0].id);
    res.status(201).json({ 
      mensaje: 'Cierre de caja procesado exitosamente',
      cierre: result.rows[0] 
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error procesando cierre de caja:', error);
    
    if (error.code === '23505') {
      return res.status(409).json({ 
        error: 'Ya existe un cierre de caja para hoy' 
      });
    }
    
    res.status(500).json({ error: 'Error al procesar cierre de caja' });
  } finally {
    client.release();
  }
});


// GET Top Productos (Dashboard)
router.get('/api/ventas/top-productos', requireAuth, async (req, res) => {
  try {
    const { fecha } = req.query;
    let query = `
      SELECT 
        p.nombre,
        SUM(dv.cantidad) as cantidad
      FROM detalle_venta dv
      JOIN productos p ON dv.id_producto = p.id
      JOIN ventas v ON dv.id_venta = v.id
      WHERE v.estado = 'completada'
    `;
    
    const params = [];

    if (fecha) {
        // Si piden una fecha específica (filtro)
        query += ` AND DATE(v.fecha_venta) = $1`;
        params.push(fecha);
    } else {
        // Si no (Dashboard), mostrar TOP del mes actual
        query += ` AND DATE_TRUNC('month', v.fecha_venta) = DATE_TRUNC('month', CURRENT_DATE)`;
    }

    query += `
      GROUP BY p.id, p.nombre
      ORDER BY cantidad DESC
      LIMIT 5
    `;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo top productos:', error);
    res.status(500).json({ error: error.message });
  }
});


router.get('/api/ventas/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('📋 Solicitando datos de venta:', id);
    
    const ventaResult = await pool.query(`
      SELECT v.*, c.nombre as cliente_nombre, c.cedula_rif, c.telefono, c.direccion,
             u.nombre as vendedor_nombre
      FROM ventas v
      LEFT JOIN clientes c ON v.id_cliente = c.id
      LEFT JOIN usuarios u ON v.id_usuario = u.id
      WHERE v.id = $1
    `, [id]);

    if (ventaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }

    const venta = ventaResult.rows[0];

    // ✅ NUEVO: Incluir tasa_iva en la consulta de detalles
    const detallesResult = await pool.query(`
      SELECT dv.*, p.nombre as producto_nombre, p.unidad_medida, ti.tasa as tasa_iva
      FROM detalle_venta dv
      LEFT JOIN productos p ON dv.id_producto = p.id
      LEFT JOIN tasas_iva ti ON p.id_tasa_iva = ti.id
      WHERE dv.id_venta = $1
    `, [id]);

    const detalles = detallesResult.rows;
    
    // ✅ NUEVO: Calcular subtotal e IVA por producto
    let subtotal = 0;
    let iva_total = 0;

    detalles.forEach(detalle => {
      const cantidad = parseFloat(detalle.cantidad);
      const precio_unitario = parseFloat(detalle.precio_unitario);
      const tasa_iva = parseFloat(detalle.tasa_iva) / 100; // Convertir porcentaje a decimal
      
      const precio_sin_iva = precio_unitario / (1 + tasa_iva);
      const iva_linea = precio_sin_iva * tasa_iva * cantidad;
      
      subtotal += precio_sin_iva * cantidad;
      iva_total += iva_linea;
    });

    const total = subtotal + iva_total;

    console.log('✅ Datos de venta obtenidos:', { 
      id, 
      items: detalles.length,
      subtotal,
      iva_total,
      total
    });

    // Manejar detalles_pago (código existente)
    let detallesPago = venta.detalles_pago;
    if (detallesPago && typeof detallesPago === 'string') {
      try {
        detallesPago = JSON.parse(detallesPago);
      } catch (parseError) {
        console.warn('⚠️ Error parseando detalles_pago:', parseError);
        detallesPago = null;
      }
    }

    res.json({
      id: venta.id,
      fecha_venta: venta.fecha_venta,
      cliente: {
        nombre: venta.cliente_nombre,
        cedula_rif: venta.cedula_rif,
        telefono: venta.telefono,
        direccion: venta.direccion
      },
      vendedor: venta.vendedor_nombre,
      metodo_pago: venta.metodo_pago,
      detalles_pago: detallesPago,
      referencia_pago: venta.referencia_pago,
      banco_pago: venta.banco_pago,
      monto_recibido: venta.monto_recibido,
      cambio: venta.cambio,
      detalles: detalles,
      subtotal: subtotal,
      iva: iva_total,
      total: total
    });

  } catch (error) {
    console.error('❌ Error obteniendo venta:', error);
    res.status(500).json({ error: 'Error al obtener los datos de la venta' });
  }
});



// Ruta para reimprimir factura (obtener datos completos para impresión)
router.get('/api/facturas-venta/:id/reimprimir', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🖨️ Solicitando reimpresión de factura:', id);
    
    const ventaResult = await pool.query(`
      SELECT v.*, c.nombre as cliente_nombre, c.cedula_rif, c.telefono, c.direccion,
             u.nombre as vendedor_nombre
      FROM ventas v
      LEFT JOIN clientes c ON v.id_cliente = c.id
      LEFT JOIN usuarios u ON v.id_usuario = u.id
      WHERE v.id = $1
    `, [id]);

    if (ventaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }

    const venta = ventaResult.rows[0];

    // ✅ NUEVO: Incluir tasa_iva en la consulta
    const detallesResult = await pool.query(`
      SELECT dv.*, p.nombre as producto_nombre, p.unidad_medida, ti.tasa as tasa_iva
      FROM detalle_venta dv
      LEFT JOIN productos p ON dv.id_producto = p.id
      LEFT JOIN tasas_iva ti ON p.id_tasa_iva = ti.id
      WHERE dv.id_venta = $1
    `, [id]);

    const detalles = detallesResult.rows;
    
    // ✅ NUEVO: Calcular subtotal e IVA por producto
    let subtotal = 0;
    let iva_total = 0;

    detalles.forEach(detalle => {
      const cantidad = parseFloat(detalle.cantidad);
      const precio_unitario = parseFloat(detalle.precio_unitario);
      const tasa_iva = parseFloat(detalle.tasa_iva) / 100;
      
      const precio_sin_iva = precio_unitario / (1 + tasa_iva);
      const iva_linea = precio_sin_iva * tasa_iva * cantidad;
      
      subtotal += precio_sin_iva * cantidad;
      iva_total += iva_linea;
    });

    const total = subtotal + iva_total;

    // Obtener información de la empresa
    const empresaResult = await pool.query('SELECT * FROM configuracion_empresa WHERE id = 1');
    const empresa = empresaResult.rows[0] || {
      nombre_empresa: "Pollera Na'Guara",
      rif: "J-123456789",
      telefono: "(0412) 123-4567",
      direccion: "Barquisimeto, Venezuela",
      mensaje_factura: "¡Gracias por su compra!"
    };

    // Manejar detalles_pago (código existente)
    let detallesPago = venta.detalles_pago;
    if (detallesPago && typeof detallesPago === 'string') {
      try {
        detallesPago = JSON.parse(detallesPago);
      } catch (parseError) {
        console.warn('⚠️ Error parseando detalles_pago:', parseError);
        detallesPago = null;
      }
    }

    console.log('✅ Datos para reimpresión obtenidos:', { 
      id, 
      items: detalles.length,
      subtotal,
      iva_total,
      total
    });

    res.json({
      factura: {
        id: venta.id,
        fecha_venta: venta.fecha_venta,
        numero_factura: `F-${venta.id.toString().padStart(6, '0')}`,
        estado: venta.estado,
        metodo_pago: venta.metodo_pago
      },
      empresa: empresa,
      cliente: {
        nombre: venta.cliente_nombre,
        cedula_rif: venta.cedula_rif,
        telefono: venta.telefono,
        direccion: venta.direccion
      },
      vendedor: venta.vendedor_nombre,
      detalles_pago: detallesPago,
      referencia_pago: venta.referencia_pago,
      banco_pago: venta.banco_pago,
      items: detalles,
      subtotal: subtotal,
      iva: iva_total,
      total: total,
      fecha_reimpresion: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error reimprimiendo factura:', error);
    res.status(500).json({ error: 'Error al reimprimir la factura' });
  }
});


export default router;