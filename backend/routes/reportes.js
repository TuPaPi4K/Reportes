import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import pool from '../database.js';

const router = express.Router();

// 1. REPORTE DE VENTAS
router.get('/api/reportes/ventas', requireAuth, async (req, res) => {
    try {
        const { periodo, fecha_inicio, fecha_fin } = req.query;
        
        // 1. Configuración de Agrupamiento (Para la Gráfica)
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
            default: // Diario
                groupBy = "DATE(v.fecha_venta)";
                dateFormat = "To_Char(DATE(v.fecha_venta), 'DD/MM/YYYY')";
                orderBy = "DATE(v.fecha_venta)";
        }

        // 2. Configuración de Filtros de Fecha (Para los Datos/Cards)
        const params = [];
        let dateFilter = "";
        
        if (fecha_inicio && fecha_fin) {
            // Caso A: Rango personalizado (Tiene prioridad)
            params.push(fecha_inicio);
            dateFilter += ` AND DATE(v.fecha_venta) >= $${params.length}`;
            params.push(fecha_fin);
            dateFilter += ` AND DATE(v.fecha_venta) <= $${params.length}`;
        } else {
            // Caso B: Filtros automáticos por botón (Aquí estaba el fallo)
            switch (periodo) {
                case 'semanal':
                    // Filtra desde el Lunes de la semana actual
                    dateFilter += " AND v.fecha_venta >= DATE_TRUNC('week', CURRENT_DATE)";
                    break;
                case 'mensual':
                    // Filtra desde el día 1 del mes actual
                    dateFilter += " AND v.fecha_venta >= DATE_TRUNC('month', CURRENT_DATE)";
                    break;
                case 'diario':
                default:
                    // Filtra solo hoy (dejando diario igual como pediste, pero asegurando que sea "hoy")
                    dateFilter += " AND DATE(v.fecha_venta) = CURRENT_DATE";
                    break;
            }
        }

        // 3. Consulta Principal (Gráfica y Tabla)
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

        // 4. Consulta de Estadísticas (Cards)
        // Ahora usa el mismo dateFilter, por lo que los totales coincidirán con el periodo
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
        const { periodo, fecha_inicio, fecha_fin } = req.query;
        
        // 1. Construcción dinámica del filtro de fecha
        let fechaFilter = "";
        const queryParams = [];
        
        if (fecha_inicio && fecha_fin) {
            // Rango personalizado
            fechaFilter = "AND fecha_compra >= $1 AND fecha_compra <= $2";
            queryParams.push(fecha_inicio, fecha_fin);
        } else {
            // Filtros predefinidos
            switch (periodo) {
                case 'diario':
                    fechaFilter = "AND DATE(fecha_compra) = CURRENT_DATE";
                    break;
                case 'semanal':
                    // Semana actual (desde el lunes)
                    fechaFilter = "AND fecha_compra >= DATE_TRUNC('week', CURRENT_DATE)";
                    break;
                case 'mensual':
                    // Mes actual (desde el día 1)
                    fechaFilter = "AND fecha_compra >= DATE_TRUNC('month', CURRENT_DATE)";
                    break;
                default:
                    // Si no hay filtro, limitamos a los últimos 30 días por seguridad
                    fechaFilter = "AND fecha_compra >= CURRENT_DATE - INTERVAL '30 days'";
            }
        }

        // 2. Consulta de Estadísticas (Totales)
        const statsQuery = `
            SELECT 
                COALESCE(SUM(total), 0) as total,
                COUNT(*)::int as count,
                COALESCE(AVG(total), 0) as average
            FROM compras 
            WHERE 1=1 ${fechaFilter}
        `;
        const statsResult = await pool.query(statsQuery, queryParams);

        // 3. Consulta para Gráfico y Tabla (Agrupado por día)
        const dataQuery = `
            SELECT 
                to_char(fecha_compra, 'YYYY-MM-DD') as fecha_dia,
                COUNT(*)::int as transacciones,
                COALESCE(SUM(total), 0) as total_dia
            FROM compras
            WHERE 1=1 ${fechaFilter}
            GROUP BY 1
            ORDER BY 1 ASC
        `;
        const dataResult = await pool.query(dataQuery, queryParams);

        // 4. Formatear respuesta
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
        // 1. Obtener conteo por estados (Agotado, Crítico, Normal)
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

        // 2. Lista detallada para la tabla (productos en alerta)
        const criticalQuery = `
            SELECT nombre as producto, stock as cantidad, stock_minimo as minimo, precio_venta as precio
            FROM productos 
            WHERE stock <= stock_minimo AND estado = 'Activo'
            ORDER BY stock ASC
        `;
        const criticalResult = await pool.query(criticalQuery);

        // 3. Totales generales para las cards
        // Calculamos el total de productos activos
        const totalQuery = "SELECT COUNT(*)::int as total FROM productos WHERE estado = 'Activo'";
        const totalRes = await pool.query(totalQuery);
        const totalProductos = parseInt(totalRes.rows[0].total || 0);

        // Calculamos cuántos están en alerta (Agotado + Crítico)
        const totalCriticos = criticalResult.rows.length;

        // 4. Lógica para la tarjeta "Promedio" (Determinamos la salud del inventario)
        // Si más del 20% del inventario está crítico, el estado general es "Crítico"
        let estadoGeneral = "Normal";
        if (totalProductos > 0) {
            const ratioCritico = totalCriticos / totalProductos;
            if (ratioCritico > 0.5) estadoGeneral = "Crítico"; // Más del 50% mal
            else if (ratioCritico > 0.1) estadoGeneral = "Bajo"; // Más del 10% mal
        }

        // Mapeo de datos para el gráfico
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
                // AQUÍ AJUSTAMOS LOS VALORES PARA COINCIDIR CON TUS ETIQUETAS:
                
                // Card 1: "Total del Periodo" -> Enviamos el Total de Productos (ej. 23)
                total: totalProductos, 
                
                // Card 2: "Transacciones" -> Enviamos la Cantidad de Alertas (ej. 8)
                count: totalCriticos, 
                
                // Card 3: "Promedio" -> Enviamos el Estado General (ej. "Crítico" o "Normal")
                average: estadoGeneral 
            }
        });
    } catch (error) {
        console.error('Error en reporte stock mínimo:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;