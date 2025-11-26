import pool from '../database.js';

export const getTasaActual = async () => {
  try {
    const tasaResult = await pool.query(
      'SELECT tasa_bs FROM tasa_cambio WHERE activo = true ORDER BY fecha_actualizacion DESC LIMIT 1'
    );
    return tasaResult.rows.length > 0 ? parseFloat(tasaResult.rows[0].tasa_bs) : 250.00;
  } catch (error) {
    console.error('Error obteniendo tasa:', error);
    return 250.00;
  }
};

// Middleware para adjuntar tasa actual a todas las requests
export const attachTasa = async (req, res, next) => {
  try {
    const tasaActual = await getTasaActual();
    req.tasaActual = tasaActual;
    next();
  } catch (error) {
    console.error('Error en middleware de tasa:', error);
    req.tasaActual = 250.00;
    next();
  }
};