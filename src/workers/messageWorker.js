const db = require('../config/database');

const { getSession, sendMessage, disconnectSession } = require('../services/BaileysService');
const { getIO } = require('../services/WebSocketService');

const CHECK_INTERVAL = 10000; // O worker verificará o banco a cada 10 segundos

// Função para processar um único job
async function processJob(job) {
    console.log(`Processando job ID: ${job.id} para o número ${job.contact_number}`);
    
    // Atualiza o status para 'processing'
    await db.execute('UPDATE jobs SET status = ?, attempts = attempts + 1 WHERE id = ?', ['processing', job.id]);
    getIO().emit('message_status_update', { id: job.id, status: 'processando' });

    try {
        const session = getSession(job.session_id);
        if (!session) {
            throw new Error(`Sessão "${job.session_id}" não encontrada ou não conectada.`);
        }

        // Envia a mensagem
        await sendMessage(session, job.contact_number, job.message_body);
        
        // Atualiza para 'completed'
        await db.execute('UPDATE jobs SET status = ? WHERE id = ?', ['completed', job.id]);
        console.log(`✅ Job ID: ${job.id} enviado com sucesso.`);
        getIO().emit('message_status_update', { id: job.id, status: 'enviada' });

    } catch (error) {
        console.error(`❌ Falha no Job ID: ${job.id}. Erro:`, error.message);
        // Atualiza para 'failed'
        await db.execute('UPDATE jobs SET status = ?, error_log = ? WHERE id = ?', ['failed', error.message, job.id]);
        getIO().emit('message_status_update', { id: job.id, status: 'falha' });
    } finally {
        // --- LÓGICA DE VERIFICAÇÃO E DESCONEXÃO ---
        // Após cada job (sucesso ou falha), verifica se há mais algum pendente
        const [remainingJobs] = await db.query(
            "SELECT COUNT(*) as count FROM jobs WHERE session_id = ? AND status = 'pending'",
            [job.session_id]
        );

        if (remainingJobs[0].count === 0) {
            console.log(`Campanha para a sessão "${job.session_id}" finalizada. Desconectando...`);
            await disconnectSession(job.session_id);
        }
    }
}

// Função principal que busca por jobs
async function processQueue() {
    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        // Query mágica: Seleciona 1 job pendente, trava a linha para que nenhum outro worker a pegue, e pula as que já estão travadas.
        const [rows] = await connection.query(
            "SELECT * FROM jobs WHERE status = 'pending' AND available_at <= NOW() ORDER BY available_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED"
        );

        const job = rows[0];

        if (job) {
            await processJob(job);
        }
        
        await connection.commit();
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Erro no worker da fila:', error);
    } finally {
        if (connection) connection.release();
    }
}

// Inicia o worker
function startWorker() {
    console.log('👷 Worker de mensagens iniciado. Verificando a fila a cada 10 segundos.');
    setInterval(processQueue, CHECK_INTERVAL);
}

module.exports = { startWorker };