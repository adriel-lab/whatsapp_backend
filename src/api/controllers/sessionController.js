// src/api/controllers/sessionController.js
const baileysService = require('../../services/BaileysService');

async function start(req, res) {
  // Futuramente, o sessionId viria do usuário logado (ex: 'user_1')
  // Por agora, vamos usar um valor fixo para teste.
  const sessionId = 'minha-primeira-sessao';

  try {
    await baileysService.startSession(sessionId);
    res.status(200).json({ success: true, message: `Sessão "${sessionId}" iniciada. Aguarde o QR Code.` });
  } catch (error) {
    console.error('Falha ao iniciar a sessão:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
  }
}

module.exports = { start };