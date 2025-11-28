import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import pool from '../database.js';

const router = express.Router();

// 1. REPORTE DE VENTAS
router.get('/api/reportes/ventas', requireAuth, async (req, res) => {
    try {
        const { periodo, fecha_inicio, fecha_fin } = req.query;
        let groupBy, dateFormat, orderBy;

        switch (periodo) {
            case 'semanal':
                groupBy = "DATE_TRUNC('week', v.fecha_venta)";
                dateFormat = "To_Char(DATE_TRUNC('week', v.fecha_venta), 'DD/MM')";
                orderBy = "DATE_TRUNC('week', v.fecha_venta)";
                break;
            case 'mensual':
                groupBy = "DATE_TRUNC('month', v.fecha_venta)";
                dateFormat = "To_Char(DATE_TRUNC('month', v.fecha_venta), 'Mon YYYY')";
                orderBy = "DATE_TRUNC('month', v.fecha_venta)";
                break;
            default: 
                groupBy = "DATE(v.fecha_venta)";
                dateFormat = "To_Char(DATE(v.fecha_venta), 'DD/MM/YYYY')";
                orderBy = "DATE(v.fecha_venta)";
        }

        const params = [];
        let dateFilter = "";
        
        if (fecha_inicio) {
            params.push(fecha_inicio);
            dateFilter += ` AND DATE(v.fecha_venta) >= $${params.length}`;
        }
        if (fecha_fin) {
            params.push(fecha_fin);
            dateFilter += ` AND DATE(v.fecha_venta) <= $${params.length}`;
        }

        const query = `
            SELECT 
                ${dateFormat} as label,
                COUNT(v.id)::int as transacciones,
                COALESCE(SUM(
                    (SELECT COALESCE(SUM(dv.cantidad * dv.precio_unitario), 0)
                     FROM detalle_venta dv 
                     WHERE dv.id_venta = v.id)
                ), 0) as total_monto
            FROM ventas v
            WHERE v.estado = 'completada' ${dateFilter}
            GROUP BY ${groupBy}
            ORDER BY ${orderBy} ASC
        `;

        const result = await pool.query(query, params);

        const statsQuery = `
            SELECT 
                COUNT(*)::int as total_transacciones,
                COALESCE(SUM(
                    (SELECT COALESCE(SUM(dv.cantidad * dv.precio_unitario), 0)
                     FROM detalle_venta dv 
                     WHERE dv.id_venta = v.id)
                ), 0) as ingreso_total
            FROM ventas v
            WHERE v.estado = 'completada' ${dateFilter}
        `;
        const statsResult = await pool.query(statsQuery, params);
        const stats = statsResult.rows[0] || { total_transacciones: 0, ingreso_total: 0 };

        res.json({
            chartData: {
                labels: result.rows.map(r => r.label),
                data: result.rows.map(r => parseFloat(r.total_monto))
            },
            stats: {
                total: parseFloat(stats.ingreso_total),
                count: parseInt(stats.total_transacciones),
                average: stats.total_transacciones > 0 ? (stats.ingreso_total / stats.total_transacciones) : 0
            },
            tableData: result.rows.map(r => ({
                fecha: r.label,
                transacciones: parseInt(r.transacciones),
                total: parseFloat(r.total_monto)
            }))
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// 2. REPORTE DE COMPRAS
router.get('/api/reportes/compras', requireAuth, async (req, res) => {
    try {
        const { fecha_inicio, fecha_fin } = req.query;
        const params = [];
        let dateFilter = "";
        
        if (fecha_inicio) {
            params.push(fecha_inicio);
            dateFilter += ` AND c.fecha_compra >= $${params.length}`;
        }
        if (fecha_fin) {
            params.push(fecha_fin);
            dateFilter += ` AND c.fecha_compra <= $${params.length}`;
        }

        const query = `
            SELECT 
                To_Char(DATE(c.fecha_compra), 'DD/MM/YYYY') as label,
                COUNT(c.id)::int as transacciones,
                COALESCE(SUM(c.total), 0) as total_monto
            FROM compras c
            WHERE c.estado != 'cancelada' ${dateFilter}
            GROUP BY DATE(c.fecha_compra)
            ORDER BY DATE(c.fecha_compra) ASC
        `;

        const result = await pool.query(query, params);

        const statsQuery = `
            SELECT COUNT(*)::int as count, COALESCE(SUM(total), 0) as total
            FROM compras c WHERE c.estado != 'cancelada' ${dateFilter}
        `;
        const statsRes = await pool.query(statsQuery, params);
        const stats = statsRes.rows[0] || { count: 0, total: 0 };

        res.json({
            chartData: {
                labels: result.rows.map(r => r.label),
                data: result.rows.map(r => parseFloat(r.total_monto))
            },
            stats: {
                total: parseFloat(stats.total),
                count: parseInt(stats.count),
                average: stats.count > 0 ? (stats.total / stats.count) : 0
            },
            tableData: result.rows.map(r => ({
                fecha: r.label,
                transacciones: parseInt(r.transacciones),
                total: parseFloat(r.total_monto)
            }))
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. REPORTE DE INVENTARIO
router.get('/api/reportes/inventario', requireAuth, async (req, res) => {
    try {
        const query = `
            SELECT 
                c.nombre as categoria,
                COUNT(p.id)::int as cantidad_productos,
                COALESCE(SUM(p.stock), 0) as stock_total
            FROM productos p
            JOIN categorias c ON p.categoria_id = c.id
            WHERE p.stock > 0
            GROUP BY c.id, c.nombre
        `;
        const result = await pool.query(query);

        const tableQuery = `
            SELECT p.nombre, p.stock, p.precio_venta, (p.stock * p.precio_venta) as valor_venta
            FROM productos p WHERE p.stock > 0 ORDER BY p.stock DESC LIMIT 50
        `;
        const tableRes = await pool.query(tableQuery);

        const totalStock = result.rows.reduce((acc, curr) => acc + parseFloat(curr.stock_total), 0);
        const totalProductos = result.rows.reduce((acc, curr) => acc + parseInt(curr.cantidad_productos), 0);

        res.json({
            chartData: {
                labels: result.rows.map(r => r.categoria),
                data: result.rows.map(r => parseFloat(r.stock_total))
            },
            stats: {
                total: totalStock,
                count: totalProductos,
                average: 0
            },
            tableData: tableRes.rows
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. REPORTE DE STOCK MÍNIMO
router.get('/api/reportes/stock-minimo', requireAuth, async (req, res) => {
    try {
        const configRes = await pool.query('SELECT stock_minimo FROM configuracion_negocio ORDER BY id DESC LIMIT 1');
        const minStock = configRes.rows[0]?.stock_minimo || 10;

        const query = `
            SELECT 
                CASE 
                    WHEN stock <= 0 THEN 'Agotado'
                    WHEN stock <= $1 THEN 'Crítico'
                    ELSE 'Normal'
                END as estado,
                COUNT(*)::int as cantidad
            FROM productos
            GROUP BY estado
        `;
        const result = await pool.query(query, [minStock]);

        const criticalQuery = `
            SELECT nombre as producto, stock as cantidad, $1::int as minimo, precio_venta as precio
            FROM productos 
            WHERE stock <= $1
            ORDER BY stock ASC
        `;
        const criticalResult = await pool.query(criticalQuery, [minStock]);

        const labels = ['Agotado', 'Crítico', 'Normal'];
        const dataMap = {};
        result.rows.forEach(row => dataMap[row.estado] = parseInt(row.cantidad));
        
        // Totales para las cards
        const totalCriticos = criticalResult.rows.length;
        const totalProductos = result.rows.reduce((a, b) => a + parseInt(b.cantidad), 0);

        res.json({
            chartData: { labels, data: labels.map(l => dataMap[l] || 0) },
            tableData: criticalResult.rows.map(r => ({
                producto: r.producto,
                stock: r.cantidad,
                minimo: r.minimo,
                estado: r.cantidad <= 0 ? 'Agotado' : 'Crítico'
            })),
            stats: {
                total: totalCriticos,
                count: totalProductos,
                average: minStock
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;