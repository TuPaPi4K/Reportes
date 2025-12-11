import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import pool from '../database.js';

const router = express.Router();

// =========================================================
// 1. REPORTE DE VENTAS
// =========================================================
router.get('/api/reportes/ventas', requireAuth, async (req, res) => {
    try {
        const { periodo, fecha_inicio, fecha_fin } = req.query;
        
        let groupBy, dateFormat, orderBy;

        // Configuración de Agrupamiento
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
            default: // Diario
                groupBy = "DATE(v.fecha_venta)";
                dateFormat = "To_Char(DATE(v.fecha_venta), 'DD/MM/YYYY')";
                orderBy = "DATE(v.fecha_venta)";
        }

        const params = [];
        let dateFilter = "";
        
        if (fecha_inicio && fecha_fin) {
            // Rango personalizado
            params.push(fecha_inicio);
            dateFilter += ` AND DATE(v.fecha_venta) >= $${params.length}`;
            params.push(fecha_fin);
            dateFilter += ` AND DATE(v.fecha_venta) <= $${params.length}`;
        } else {
            // Filtros Gerenciales (Lógica Correcta)
            switch (periodo) {
                case 'semanal':
                    // Últimas 12 semanas para ver tendencia
                    dateFilter += " AND v.fecha_venta >= DATE_TRUNC('week', CURRENT_DATE - INTERVAL '12 weeks')";
                    break;
                case 'mensual':
                    // Año actual completo
                    dateFilter += " AND v.fecha_venta >= DATE_TRUNC('year', CURRENT_DATE)";
                    break;
                case 'diario':
                default:
                    // Mes actual (Del día 1 a hoy)
                    dateFilter += " AND v.fecha_venta >= DATE_TRUNC('month', CURRENT_DATE)";
                    break;
            }
        }

        // Consulta Principal (JOIN eficiente)
        const query = `
            SELECT 
                ${dateFormat} as label,
                COUNT(DISTINCT v.id)::int as transacciones,
                COALESCE(SUM(dv.cantidad * dv.precio_unitario), 0) as total_monto
            FROM ventas v
            LEFT JOIN detalle_venta dv ON v.id = dv.id_venta
            WHERE v.estado = 'completada' ${dateFilter}
            GROUP BY ${groupBy}
            ORDER BY ${orderBy} ASC
        `;

        const result = await pool.query(query, params);

        // Estadísticas Totales (Mismo filtro)
        const statsQuery = `
            SELECT 
                COUNT(DISTINCT v.id)::int as total_transacciones,
                COALESCE(SUM(dv.cantidad * dv.precio_unitario), 0) as ingreso_total
            FROM ventas v
            LEFT JOIN detalle_venta dv ON v.id = dv.id_venta
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

// =========================================================
// 2. REPORTE DE COMPRAS
// =========================================================
router.get('/api/reportes/compras', requireAuth, async (req, res) => {
    try {
        const { periodo, fecha_inicio, fecha_fin } = req.query;
        
        // Agrupamiento Dinámico
        let groupBy, dateFormat, orderBy;

        switch (periodo) {
            case 'semanal':
                groupBy = "DATE_TRUNC('week', fecha_compra)";
                dateFormat = "To_Char(DATE_TRUNC('week', fecha_compra), 'DD/MM')";
                orderBy = "DATE_TRUNC('week', fecha_compra)";
                break;
            case 'mensual':
                groupBy = "DATE_TRUNC('month', fecha_compra)";
                dateFormat = "To_Char(DATE_TRUNC('month', fecha_compra), 'Mon YYYY')";
                orderBy = "DATE_TRUNC('month', fecha_compra)";
                break;
            default: // Diario
                groupBy = "DATE(fecha_compra)";
                dateFormat = "To_Char(DATE(fecha_compra), 'YYYY-MM-DD')";
                orderBy = "DATE(fecha_compra)";
        }

        let fechaFilter = "";
        const queryParams = [];
        
        if (fecha_inicio && fecha_fin) {
            fechaFilter = "AND fecha_compra >= $1 AND fecha_compra <= $2";
            queryParams.push(fecha_inicio, fecha_fin);
        } else {
            // Filtros Gerenciales (Coherentes con ventas)
            switch (periodo) {
                case 'semanal':
                    fechaFilter = "AND fecha_compra >= DATE_TRUNC('week', CURRENT_DATE - INTERVAL '12 weeks')";
                    break;
                case 'mensual':
                    fechaFilter = "AND fecha_compra >= DATE_TRUNC('year', CURRENT_DATE)";
                    break;
                case 'diario':
                default:
                    fechaFilter = "AND fecha_compra >= DATE_TRUNC('month', CURRENT_DATE)";
                    break;
            }
        }

        const statsQuery = `
            SELECT 
                COALESCE(SUM(total), 0) as total,
                COUNT(*)::int as count,
                COALESCE(AVG(total), 0) as average
            FROM compras 
            WHERE 1=1 ${fechaFilter}
        `;
        const statsResult = await pool.query(statsQuery, queryParams);

        const dataQuery = `
            SELECT 
                ${dateFormat} as fecha_dia,
                COUNT(*)::int as transacciones,
                COALESCE(SUM(total), 0) as total_dia
            FROM compras
            WHERE 1=1 ${fechaFilter}
            GROUP BY ${groupBy}
            ORDER BY ${orderBy} ASC
        `;
        const dataResult = await pool.query(dataQuery, queryParams);

        res.json({
            stats: {
                total: parseFloat(statsResult.rows[0].total),
                count: parseInt(statsResult.rows[0].count),
                average: parseFloat(statsResult.rows[0].average)
            },
            chartData: {
                labels: dataResult.rows.map(r => r.fecha_dia),
                data: dataResult.rows.map(r => parseFloat(r.total_dia))
            },
            tableData: dataResult.rows.map(r => ({
                fecha: r.fecha_dia,
                transacciones: r.transacciones,
                total: parseFloat(r.total_dia)
            }))
        });

    } catch (error) {
        console.error('Error en reporte de compras:', error);
        res.status(500).json({ error: error.message });
    }
});

// =========================================================
// 3. REPORTE DE INVENTARIO
// =========================================================
router.get('/api/reportes/inventario', requireAuth, async (req, res) => {
    try {
        // Obtenemos: Cantidad de Productos, Stock Físico (Unidades), Valor Monetario (Costo)
        const query = `
            SELECT 
                c.nombre as categoria,
                COUNT(p.id)::int as cantidad_productos,
                COALESCE(SUM(p.stock), 0) as stock_unidades,
                COALESCE(SUM(p.stock * p.costo_compra), 0) as stock_valor
            FROM productos p
            LEFT JOIN categorias c ON p.categoria_id = c.id
            WHERE p.stock > 0 AND p.estado = 'Activo'
            GROUP BY c.id, c.nombre
        `;
        const result = await pool.query(query);

        // Tabla detallada sin límites
        const tableQuery = `
            SELECT p.nombre, p.stock, p.unidad_medida, p.costo_compra, (p.stock * p.costo_compra) as valor_total
            FROM productos p WHERE p.stock > 0 AND p.estado = 'Activo'
            ORDER BY p.stock DESC
        `;
        const tableRes = await pool.query(tableQuery);

        const totalUnidades = result.rows.reduce((acc, curr) => acc + parseFloat(curr.stock_unidades), 0);
        const totalProductos = result.rows.reduce((acc, curr) => acc + parseInt(curr.cantidad_productos), 0);
        const totalValor = result.rows.reduce((acc, curr) => acc + parseFloat(curr.stock_valor), 0);

        res.json({
            chartData: {
                // Gráfica por Unidades (Para ver volumen físico)
                labels: result.rows.map(r => r.categoria || 'Sin Categoría'),
                data: result.rows.map(r => parseFloat(r.stock_unidades)) 
            },
            stats: {
                total: totalUnidades,    // Card 1: Stock Físico
                count: totalProductos,   // Card 2: Referencias
                average: totalValor      // Card 3: Valor Monetario (Costo)
            },
            tableData: tableRes.rows
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =========================================================
// 4. REPORTE DE STOCK MÍNIMO
// =========================================================
router.get('/api/reportes/stock-minimo', requireAuth, async (req, res) => {
    try {
        const query = `
            SELECT 
                CASE 
                    WHEN stock <= 0 THEN 'Agotado'
                    WHEN stock <= stock_minimo THEN 'Crítico'
                    ELSE 'Normal'
                END as estado,
                COUNT(*)::int as cantidad
            FROM productos
            WHERE estado = 'Activo'
            GROUP BY 1
        `;
        const result = await pool.query(query);

        const criticalQuery = `
            SELECT nombre as producto, stock as cantidad, stock_minimo as minimo, precio_venta as precio
            FROM productos 
            WHERE stock <= stock_minimo AND estado = 'Activo'
            ORDER BY stock ASC
        `;
        const criticalResult = await pool.query(criticalQuery);

        const totalQuery = "SELECT COUNT(*)::int as total FROM productos WHERE estado = 'Activo'";
        const totalRes = await pool.query(totalQuery);
        const totalProductos = parseInt(totalRes.rows[0].total || 0);
        const totalCriticos = criticalResult.rows.length;

        let estadoGeneral = "Normal";
        if (totalProductos > 0) {
            const ratioCritico = totalCriticos / totalProductos;
            if (ratioCritico > 0.5) estadoGeneral = "Crítico";
            else if (ratioCritico > 0.1) estadoGeneral = "Bajo";
        }

        const labels = ['Agotado', 'Crítico', 'Normal'];
        const dataMap = {};
        result.rows.forEach(row => dataMap[row.estado] = parseInt(row.cantidad));

        res.json({
            chartData: { labels, data: labels.map(l => dataMap[l] || 0) },
            tableData: criticalResult.rows.map(r => ({
                producto: r.producto,
                stock: r.cantidad,
                minimo: r.minimo,
                estado: r.cantidad <= 0 ? 'Agotado' : 'Crítico'
            })),
            stats: {
                total: totalProductos, 
                count: totalCriticos, 
                average: estadoGeneral 
            }
        });
    } catch (error) {
        console.error('Error en reporte stock mínimo:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;