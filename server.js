const express = require('express');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

app.get('/visits', async (req, res) => {
    try {
        const connection = await pool.getConnection();

        // Crear la tabla visits si no existe
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS visits (
                id INT AUTO_INCREMENT PRIMARY KEY,
                count INT DEFAULT 1
            )
        `);

        // Crear la tabla config si no existe
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS config (
                id INT AUTO_INCREMENT PRIMARY KEY,
                mode ENUM('develop', 'release') NOT NULL DEFAULT 'develop'
            )
        `);

        // Insertar un valor por defecto en config si no existe
        await connection.execute(`
            INSERT INTO config (mode) SELECT 'develop' FROM DUAL WHERE NOT EXISTS (SELECT * FROM config);
        `);

        // Incrementar visitas
        await connection.execute("INSERT INTO visits (count) VALUES (1) ON DUPLICATE KEY UPDATE count = count + 1");
        
        // Obtener número de visitas
        const [rows] = await connection.execute("SELECT COUNT(*) as total FROM visits");
        
        // Obtener modo del sistema
        const [config] = await connection.execute("SELECT mode FROM config LIMIT 1");
        
        connection.release();
        
        res.json({ visits: rows[0].total, mode: config[0]?.mode || 'undefined' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
