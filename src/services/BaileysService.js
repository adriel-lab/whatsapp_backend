// src/services/BaileysService.js

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const QRCode = require('qrcode'); 
const { getIO } = require('./WebSocketService'); // Importamos para enviar eventos

// Objeto para manter as sessões ativas
const sessions = {};

async function startSession(sessionId) {
  // Se já existir uma sessão, não faz nada
  if (sessions[sessionId]) {
    console.log(`Sessão "${sessionId}" já existe.`);
    return;
  }

  console.log(`Iniciando nova sessão: "${sessionId}"`);

  // Define o estado de autenticação, salvando os arquivos em uma pasta
  const { state, saveCreds } = await useMultiFileAuthState(`sessions/${sessionId}`);
  const io = getIO();

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true, // Imprime o QR no terminal para testes
  });

  // Armazena a instância do socket na nossa variável de sessões
  sessions[sessionId] = sock;

  // Lida com os eventos da conexão
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log(`QR Code gerado para a sessão "${sessionId}". Enviando para o cliente.`);
      // Envia o QR Code para o frontend via WebSocket
      io.emit('qr_code_generated', { sessionId, qr });
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log(`Conexão fechada para "${sessionId}". Motivo:`, lastDisconnect.error, '. Reconectar:', shouldReconnect);

      // Limpa a sessão da memória se o usuário deslogou
      if (lastDisconnect.error?.output?.statusCode === DisconnectReason.loggedOut) {
        delete sessions[sessionId];
        console.log(`Sessão "${sessionId}" removida por logout.`);
      } else {
        // Tenta reconectar em outros casos de erro
        // startSession(sessionId); // Lógica de reconexão pode ser adicionada aqui
      }
    } else if (connection === 'open') {
      console.log(`✅ Conexão do WhatsApp aberta para a sessão "${sessionId}"`);
      io.emit('whatsapp_connected', { sessionId });
    }
  });

  // Salva as credenciais sempre que forem atualizadas
  sock.ev.on('creds.update', saveCreds);

  return sock;
}

module.exports = { startSession };