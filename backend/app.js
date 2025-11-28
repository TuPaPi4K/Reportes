import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import session from 'express-session';
import cors from 'cors';
import fs from 'fs';

// Importar rutas
import {
  authRoutes,
  usuarioRoutes,
  productoRoutes,
  clienteRoutes,
  ventaRoutes,
  tasaRoutes,
  configuracionRoutes,
  backupRoutes,
  proveedoresRoutes,
  comprasRoutes,
  categoriasRoutes,
  transformacionesRoutes,
  reportesRoutes
} from './routes/index.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors({
  origin: [
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:3000'
  ],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const rutaFrontend = path.resolve(__dirname, '..', 'frontend');
app.use(express.static(rutaFrontend));

app.use(session({
  name: process.env.SESSION_NAME || 'naguara.sid',
  secret: process.env.SESSION_SECRET || 'secreto-temporal',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60
  }
}));

// Usar rutas
app.use(authRoutes);
app.use(usuarioRoutes);
app.use(productoRoutes);
app.use(clienteRoutes);
app.use(ventaRoutes);
app.use(tasaRoutes);
app.use(configuracionRoutes);
app.use(backupRoutes);
app.use(proveedoresRoutes);
app.use(comprasRoutes);
app.use(categoriasRoutes);
app.use(transformacionesRoutes);
app.use(reportesRoutes);

// Servir archivos HTML del frontend
fs.readdirSync(rutaFrontend).forEach(file => {
  if (file.endsWith('.html')) {
    app.get(`/${file}`, (req, res) => {
      res.sendFile(path.join(rutaFrontend, file));
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor API corriendo en http://localhost:${PORT}`);
});
