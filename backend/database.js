import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pkg;

const pool = new Pool({
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  port: process.env.PGPORT,
});

pool.on('error', (err) => {
  console.error('❌ Error inesperado en el pool de PostgreSQL:', err);
  process.exit(-1);
});

// Probar la conexión al iniciar
const connectDB = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Conexión exitosa a la base de datos PostgreSQL');
    client.release();
  } catch (err) {
    console.error('❌ Error al conectar a la base de datos PostgreSQL:', err);
  }
};

connectDB();

export default pool;
