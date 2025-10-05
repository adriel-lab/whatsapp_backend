const mysql = require('mysql2/promise');
require('dotenv').config();

// Cria um "pool" de conexões, que é mais eficiente que criar uma nova a cada consulta
const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

console.log('🔌 Conexão com o banco de dados MySQL configurada.');

module.exports = pool;