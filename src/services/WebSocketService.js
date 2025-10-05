// src/services/WebSocketService.js

const { Server } = require('socket.io');

let io;

function initializeSocket(server) {
  io = new Server(server, {
    cors: {
      origin: "*", // Em produção, mude para o domínio do seu frontend PHP
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('✅ Cliente conectado via WebSocket:', socket.id);

    socket.on('disconnect', () => {
      console.log('❌ Cliente desconectado:', socket.id);
    });
  });

  console.log('🔌 Serviço de WebSocket inicializado.');
  return io;
}

// Função para obter a instância do 'io' em outros arquivos
function getIO() {
  if (!io) {
    throw new Error('Socket.io não foi inicializado!');
  }
  return io;
}

module.exports = { initializeSocket, getIO };