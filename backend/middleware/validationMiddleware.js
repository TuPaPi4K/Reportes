export const validateProductData = (data, isUpdate = false) => {
  const errors = [];
  
  if (!isUpdate || data.nombre !== undefined) {
    if (!data.nombre || data.nombre.trim().length === 0) {
      errors.push('El nombre es obligatorio');
    }
    if (data.nombre && data.nombre.trim().length > 100) {
      errors.push('El nombre no puede exceder 100 caracteres');
    }
  }
  
  if (!isUpdate || data.precio_venta !== undefined) {
    const precio = parseFloat(data.precio_venta);
    if (isNaN(precio) || precio < 0) {
      errors.push('El precio de venta debe ser un número positivo');
    }
  }

  if (!isUpdate || data.costo_compra !== undefined) {
    const costo = parseFloat(data.costo_compra);
    if (data.costo_compra && (isNaN(costo) || costo < 0)) {
      errors.push('El costo de compra debe ser un número positivo');
    }
  }
  
  if (!isUpdate || data.categoria_id !== undefined) {
    const categoriaId = parseInt(data.categoria_id);
    if (isNaN(categoriaId) || categoriaId <= 0) {
      errors.push('La categoría es obligatoria');
    }
  }
  
  if (data.stock !== undefined) {
    const stock = parseFloat(data.stock);
    if (isNaN(stock) || stock < 0) {
      errors.push('El stock debe ser un número positivo');
    }
  }

  if (data.stock_minimo !== undefined) {
    const stockMinimo = parseFloat(data.stock_minimo);
    if (isNaN(stockMinimo) || stockMinimo < 0) {
      errors.push('El stock mínimo debe ser un número positivo');
    }
  }

  if (data.id_tasa_iva !== undefined) {
    const tasaIva = parseInt(data.id_tasa_iva);
    if (isNaN(tasaIva) || tasaIva <= 0) {
      errors.push('La tasa de IVA es obligatoria');
    }
  }
  
  return errors;
};

// Middleware para validar producto en POST y PUT
export const validateProduct = (req, res, next) => {
  const isUpdate = req.method === 'PUT';
  const errors = validateProductData(req.body, isUpdate);
  
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }
  
  next();
};

// Middleware para validar cantidad en actualización de stock
export const validateStockUpdate = (req, res, next) => {
  const { cantidad } = req.body;
  
  if (!cantidad || isNaN(cantidad) || cantidad <= 0) {
    return res.status(400).json({ error: 'Cantidad inválida' });
  }
  
  next();
};

// Middleware para validar stock mínimo
export const validateStockMinimo = (req, res, next) => {
  const { stock_minimo } = req.body;
  
  if (!stock_minimo || isNaN(stock_minimo) || stock_minimo < 0) {
    return res.status(400).json({ error: 'Stock mínimo inválido' });
  }
  
  next();
};