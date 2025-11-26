import pool from '../database.js';

// Middleware para verificar que el producto existe
export const checkProductExists = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT id, nombre, stock FROM productos WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    req.product = result.rows[0];
    next();
  } catch (error) {
    console.error('Error verificando producto:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Middleware para verificar stock suficiente
export const checkStockSufficient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { cantidad } = req.body;
    
    const result = await pool.query(
      'SELECT stock, nombre FROM productos WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    const product = result.rows[0];
    const newStock = parseFloat(product.stock) - parseFloat(cantidad);
    
    if (newStock < 0) {
      return res.status(400).json({ 
        error: `Stock insuficiente. Stock actual: ${product.stock}, se requieren: ${cantidad}` 
      });
    }
    
    req.product = product;
    next();
  } catch (error) {
    console.error('Error verificando stock:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Middleware para obtener producto completo con joins
export const getProductWithDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        p.*,
        ti.tasa as tasa_iva,
        ti.tipo as tipo_iva,
        ti.descripcion as descripcion_iva,
        c.nombre as categoria,
        prov.nombre as proveedor
      FROM productos p
      LEFT JOIN tasas_iva ti ON p.id_tasa_iva = ti.id
      LEFT JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN proveedores prov ON p.id_provedores = prov.id
      WHERE p.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    req.productWithDetails = result.rows[0];
    next();
  } catch (error) {
    console.error('Error obteniendo detalles del producto:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};