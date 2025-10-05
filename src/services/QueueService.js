const db = require('../config/database');

async function addMessageToQueue(data) {
    const { sessionId, number, message, name, available_at } = data;

    const sql = `
        INSERT INTO jobs (session_id, contact_number, message_body, available_at, status)
        VALUES (?, ?, ?, ?, 'pending')
    `;

    try {
        const [result] = await db.execute(sql, [
            sessionId,
            number,
            message,
            available_at
        ]);
        
        console.log(`Mensagem para ${number} agendada no MySQL para: ${available_at.toLocaleString()}`);
        return {
            id: result.insertId,
            number: number,
            name: name,
            status: 'pending'
        };
    } catch (error) {
        console.error('Erro ao inserir job no MySQL:', error);
        return null;
    }
}

module.exports = { addMessageToQueue };