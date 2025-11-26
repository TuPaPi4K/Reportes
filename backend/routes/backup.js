import express from 'express';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

const backupDir = path.join(process.cwd(), 'backups');
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
}

router.post('/api/backup/create', requireAuth, async (req, res) => {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `backup_${timestamp}.sql`;
        const filepath = path.join(backupDir, filename);

        const pgDumpPath = '"C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe"';

        const dbConfig = {
            host: process.env.PGHOST,
            port: process.env.PGPORT,
            database: process.env.PGDATABASE,
            user: process.env.PGUSER,
            password: process.env.PGPASSWORD  
        };

        if (!dbConfig.password) {
            throw new Error('PGPASSWORD no configurada en variables de entorno');
        }

        const command = `${pgDumpPath} -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} -f "${filepath}" -w`;

        console.log('🔧 Creando backup:', filename);
        console.log('🔧 Comando:', command);

        exec(command, { env: { ...process.env, PGPASSWORD: dbConfig.password } }, (error, stdout, stderr) => {
            if (error) {
                console.error('❌ Error creando backup:', error);
                return res.status(500).json({ error: 'Error al crear backup: ' + error.message });
            }

            if (stderr && !stderr.includes('WARNING')) {
                console.warn('⚠️ Advertencia backup:', stderr);
            }

            if (fs.existsSync(filepath)) {
                const stats = fs.statSync(filepath);
                const backupInfo = {
                    filename: filename,
                    filepath: filepath,
                    size: (stats.size / (1024 * 1024)).toFixed(2) + ' MB',
                    created_at: new Date().toISOString(),
                    timestamp: timestamp
                };

                console.log('✅ Backup creado exitosamente:', backupInfo);
                res.json(backupInfo);
            } else {
                console.error('❌ Archivo de backup no se creó');
                res.status(500).json({ error: 'El archivo de backup no se pudo crear' });
            }
        });

    } catch (error) {
        console.error('❌ Error en backup:', error);
        res.status(500).json({ error: 'Error al crear backup' });
    }
});

router.get('/api/backup/history', requireAuth, async (req, res) => {
    try {
        const files = fs.readdirSync(backupDir)
            .filter(file => file.endsWith('.sql'))
            .map(file => {
                const filepath = path.join(backupDir, file);
                const stats = fs.statSync(filepath);
                return {
                    filename: file,
                    filepath: filepath,
                    size: (stats.size / (1024 * 1024)).toFixed(2) + ' MB',
                    created_at: stats.birthtime,
                    timestamp: file.replace('backup_', '').replace('.sql', '')
                };
            })
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        res.json(files);
    } catch (error) {
        console.error('❌ Error listando backups:', error);
        res.status(500).json({ error: 'Error al listar backups' });
    }
});

router.get('/api/backup/download/:filename', requireAuth, async (req, res) => {
    try {
        const { filename } = req.params;
        const filepath = path.join(backupDir, filename);

        if (!fs.existsSync(filepath)) {
            return res.status(404).json({ error: 'Backup no encontrado' });
        }

        if (!filename.endsWith('.sql') || !filename.startsWith('backup_')) {
            return res.status(400).json({ error: 'Archivo inválido' });
        }

        res.download(filepath, filename);
    } catch (error) {
        console.error('❌ Error descargando backup:', error);
        res.status(500).json({ error: 'Error al descargar backup' });
    }
});

router.delete('/api/backup/:filename', requireAuth, async (req, res) => {
    try {
        const { filename } = req.params;
        const filepath = path.join(backupDir, filename);

        if (!fs.existsSync(filepath)) {
            return res.status(404).json({ error: 'Backup no encontrado' });
        }

        if (!filename.endsWith('.sql') || !filename.startsWith('backup_')) {
            return res.status(400).json({ error: 'Archivo inválido' });
        }

        fs.unlinkSync(filepath);
        res.json({ message: 'Backup eliminado correctamente' });
    } catch (error) {
        console.error('❌ Error eliminando backup:', error);
        res.status(500).json({ error: 'Error al eliminar backup' });
    }
});

export default router;