const express = require('express');
const http = require('http');
const cors = require('cors');
require('dotenv').config();
const { initializeSocket } = require('./services/WebSocketService');
const { startWorker } = require('./workers/messageWorker');

const app = express();

// --- CONFIGURAÇÃO DE CORS EXPLÍCITA ---
const corsOptions = {
  origin: 'http://localhost', // Permite apenas requisições desta origem
  optionsSuccessStatus: 200 // Para navegadores mais antigos
};
app.use(cors(corsOptions)); // <-- USAMOS AS OPÇÕES AQUI

app.use(express.json());
const server = http.createServer(app);

initializeSocket(server);

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Backend do WhatsApp está rodando!',
  });
});


const sessionRoutes = require('./api/routes/sessionRoutes');
const campaignRoutes = require('./api/routes/campaignRoutes'); // <-- ADICIONE

app.use('/api', sessionRoutes);
app.use('/api', campaignRoutes); // <-- ADICIONE



server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
   startWorker();
});

module.exports = { app, server };