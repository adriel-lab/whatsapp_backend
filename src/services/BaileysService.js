const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const QRCode = require('qrcode');
const fs = require('fs'); // <--- ADICIONE O 'fs'
const path = require('path'); // <--- ADICIONE O 'path'
const { getIO } = require('./WebSocketService');

const sessions = {};

async function startSession(sessionId) {
  // Apenas limpa a sessão da memória, não os arquivos
  if (sessions[sessionId]) {
    delete sessions[sessionId];
    console.log(`Sessão antiga "${sessionId}" limpa da memória.`);
  }

  console.log(`Iniciando ou reconectando sessão: "${sessionId}"`);

  const { state, saveCreds } = await useMultiFileAuthState(`sessions/${sessionId}`);
  const io = getIO();

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false, // Mantemos true para o teste
    connectTimeoutMs: 60000
  });

  sessions[sessionId] = sock;

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log(`QR Code gerado para a sessão "${sessionId}".`);
      try {
        const qrCodeDataUrl = await QRCode.toDataURL(qr);
        io.emit('qr_code_generated', { sessionId, qr: qrCodeDataUrl });
      } catch (err) {
        console.error('Falha ao converter QR Code:', err);
      }
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log(`Conexão fechada. Motivo: ${lastDisconnect.error?.message}. Reconectar: ${shouldReconnect}`);
      
      // Limpa a sessão da memória se o usuário deslogou permanentemente
      if ((lastDisconnect.error instanceof Boom)?.output?.statusCode === DisconnectReason.loggedOut) {
          console.log(`Sessão "${sessionId}" removida permanentemente.`);
          // Aqui você poderia apagar a pasta sessions/${sessionId} se quisesse
      } else {
        // --- LÓGICA DE RECONEXÃO AUTOMÁTICA ---
        console.log(`Tentando reconectar a sessão "${sessionId}" em 10 segundos...`);
        setTimeout(() => startSession(sessionId), 10000); // Tenta reconectar após 10s
      }

    } else if (connection === 'open') {
      console.log(`✅ Conexão do WhatsApp aberta para a sessão "${sessionId}"`);
      io.emit('whatsapp_connected', { sessionId });
    }
  });

  sock.ev.on('creds.update', saveCreds);

  return sock;
}


function getSession(sessionId) {
    return sessions[sessionId] || null;
}

async function sendMessage(session, number, message) {
    if (!session) {
        throw new Error('Sessão Baileys inválida.');
    }
    // Adiciona o @s.whatsapp.net se não tiver
    const formattedNumber = number.includes('@s.whatsapp.net') ? number : `${number}@s.whatsapp.net`;
    
    // Verifica se o número existe no WhatsApp
    const [result] = await session.onWhatsApp(formattedNumber);

    if (!result?.exists) {
        throw new Error(`Número ${number} não existe no WhatsApp.`);
    }

    await session.sendMessage(formattedNumber, { text: message });
}


// --- NOVA FUNÇÃO DE DESCONEXÃO ---
async function disconnectSession(sessionId) {
    const session = sessions[sessionId];
    if (session) {
        console.log(`Desconectando sessão: "${sessionId}"`);
        try {
            await session.logout(); // Encerra a sessão no WhatsApp
        } catch (error) {
            console.error(`Erro ao fazer logout da sessão "${sessionId}":`, error);
        } finally {
            delete sessions[sessionId]; // Remove da memória
            
            // Apaga os arquivos da sessão para forçar um novo QR Code na próxima vez
            const sessionDir = path.join(__dirname, '..', '..', 'sessions', sessionId);
            if (fs.existsSync(sessionDir)) {
                fs.rmSync(sessionDir, { recursive: true, force: true });
                console.log(`Arquivos da sessão "${sessionId}" removidos.`);
            }
            
            // Notifica o frontend
            getIO().emit('session_disconnected', { sessionId });
        }
    }
}


module.exports = { startSession, getSession, sendMessage, disconnectSession }; // <-- ATUALIZE OS EXPORTS