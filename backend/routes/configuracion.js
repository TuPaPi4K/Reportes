import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import pool from '../database.js';

const router = express.Router();

// ==========================================
// 1. DASHBOARD (Estadísticas Generales)
// ==========================================
router.get('/api/dashboard/stats', async (req, res) => {
  try {
    // 1. Productos Activos
    const productos = await pool.query("SELECT COUNT(*) FROM productos WHERE estado = 'Activo'");
    
    // 2. Ventas de Hoy
    const ventas = await pool.query("SELECT COUNT(*) FROM ventas WHERE DATE(fecha_venta) = CURRENT_DATE AND estado = 'completada'");
    
    // 3. Proveedores
    const proveedores = await pool.query('SELECT COUNT(*) FROM proveedores');
    
    // 4. Stock Bajo (INTELIGENTE: Compara stock vs stock_minimo de CADA producto)
    const stockBajo = await pool.query("SELECT COUNT(*) FROM productos WHERE stock <= stock_minimo AND estado = 'Activo'");

    res.json({
      totalProductos: parseInt(productos.rows[0].count),
      ventasHoy: parseInt(ventas.rows[0].count),
      totalProveedores: parseInt(proveedores.rows[0].count),
      productosStockMinimo: parseInt(stockBajo.rows[0].count)
    });
  } catch (error) {
    console.error('Error en dashboard stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 2. DATOS DE LA EMPRESA (Tabla configuracion_empresa)
// ==========================================
router.get('/api/empresa', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM configuracion_empresa ORDER BY id ASC LIMIT 1');
    res.json(result.rows[0] || {}); 
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo datos empresa' });
  }
});

router.put('/api/empresa', requireAuth, async (req, res) => {
  try {
    const { nombre_empresa, rif, telefono, direccion, email, mensaje_factura } = req.body;
    
    // Verificar si existe para hacer UPDATE o INSERT
    const check = await pool.query('SELECT id FROM configuracion_empresa LIMIT 1');
    
    let result;
    if (check.rows.length > 0) {
        const id = check.rows[0].id;
        result = await pool.query(`
          UPDATE configuracion_empresa 
          SET nombre_empresa=$1, rif=$2, telefono=$3, direccion=$4, email=$5, mensaje_factura=$6
          WHERE id=$7 RETURNING *`,
          [nombre_empresa, rif, telefono, direccion, email, mensaje_factura, id]
        );
    } else {
        result = await pool.query(`
          INSERT INTO configuracion_empresa (nombre_empresa, rif, telefono, direccion, email, mensaje_factura)
          VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [nombre_empresa, rif, telefono, direccion, email, mensaje_factura]
        );
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error actualizando empresa' });
  }
});

// ==========================================
// 3. CONFIGURACIÓN DE NEGOCIO (Ahora solo IVA desde tasas_iva)
// ==========================================
router.get('/api/configuracion/negocio', requireAuth, async (req, res) => {
  try {
    // Ahora leemos la tasa GENERAL directamente de la tabla tasas_iva
    // Asumimos que ID 1 es la general, o buscamos por tipo 'general'
    const result = await pool.query("SELECT tasa FROM tasas_iva WHERE tipo = 'general' LIMIT 1");
    
    // Mantenemos el formato que espera el frontend: { iva_rate: 16 }
    // Si no encuentra tasa, devuelve 16 por defecto
    const tasa = result.rows.length > 0 ? parseFloat(result.rows[0].tasa) : 16.00;
    
    res.json({ iva_rate: tasa });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error obteniendo configuración de IVA' });
  }
});

router.put('/api/configuracion/negocio', requireAuth, async (req, res) => {
  try {
    const { iva_rate } = req.body; 
    
    // Actualizamos la tasa GENERAL en la tabla tasas_iva
    const result = await pool.query(`
        UPDATE tasas_iva 
        SET tasa = $1, fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE tipo = 'general' 
        RETURNING tasa`,
        [iva_rate]
    );
    
    if (result.rows.length === 0) {
        // Si por alguna razón no existe la tasa general, la creamos
        await pool.query(`
            INSERT INTO tasas_iva (tasa, descripcion, tipo, estado)
            VALUES ($1, 'IVA General', 'general', 'Activa')`, 
            [iva_rate]
        );
    }
    
    res.json({ 
        message: 'IVA actualizado correctamente', 
        configuracion: { iva_rate: iva_rate } 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error guardando configuración de IVA' });
  }
});

// ==========================================
// 4. MÉTODOS DE PAGO (Desde metodos_pago_config)
// ==========================================
router.get('/api/configuracion/metodos-pago', requireAuth, async (req, res) => {
    try {
        // Consultar tabla real
        const result = await pool.query('SELECT metodo_id as id, nombre, habilitado FROM metodos_pago_config ORDER BY id');
        
        // Si está vacía, llenarla con defaults (Auto-reparación)
        if (result.rows.length === 0) {
            console.log('🔧 Inicializando métodos de pago...');
            await pool.query(`
                INSERT INTO metodos_pago_config (metodo_id, nombre, habilitado) VALUES 
                ('efectivo_bs', 'Efectivo Bs', true),
                ('efectivo_usd', 'Efectivo USD', true),
                ('tarjeta', 'Tarjeta', true),
                ('transferencia', 'Transferencia', true),
                ('pago_movil', 'Pago Móvil', true),
                ('punto_venta', 'Punto de Venta', true),
                ('mixto', 'Pago Mixto', true)
            `);
            // Volver a consultar
            const newResult = await pool.query('SELECT metodo_id as id, nombre, habilitado FROM metodos_pago_config ORDER BY id');
            return res.json(newResult.rows);
        }

        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error obteniendo métodos' });
    }
});

router.put('/api/configuracion/metodos-pago/:metodo', requireAuth, async (req, res) => {
    try {
        const { metodo } = req.params;
        const { habilitado } = req.body;

        const result = await pool.query(
            'UPDATE metodos_pago_config SET habilitado = $1, fecha_actualizacion = CURRENT_TIMESTAMP WHERE metodo_id = $2 RETURNING *',
            [habilitado, metodo]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: 'Método no encontrado' });
        
        res.json({ message: 'Estado actualizado', metodo: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Error actualizando método' });
    }
});

export default router;