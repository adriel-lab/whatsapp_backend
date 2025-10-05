// src/app.js

const express = require('express');
const http = require('http');
require('dotenv').config();
const { initializeSocket } = require('./services/WebSocketService'); // <--- ADICIONADO

const app = express();
app.use(express.json());
const server = http.createServer(app);

// Inicializa e anexa o servidor de WebSocket ao servidor HTTP
initializeSocket(server); // <--- ADICIONADO

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Backend do WhatsApp está rodando!',
  });
});

// Futuramente, nossas rotas da API virão aqui
const sessionRoutes = require('./api/routes/sessionRoutes'); // <--- ADICIONE
app.use('/api', sessionRoutes);    

server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});

module.exports = { app, server };