const fs = require('fs');
const csv = require('csv-parser');
const { addMessageToQueue } = require('../../services/QueueService');

// --- ÁREA DE CONFIGURAÇÃO DE TEMPO RANDÔMICO ---
const MIN_DELAY_SECONDS = 120; // 2 minutos
const MAX_DELAY_SECONDS = 600; // 10 minutos

async function startCampaign(req, res) {
    const { sessionId, message } = req.body;
    const csvFile = req.file;

    if (!sessionId || !message || !csvFile) {
        return res.status(400).json({ success: false, message: 'Faltam dados essenciais.' });
    }

    const contacts = [];
    
    fs.createReadStream(csvFile.path)
        .pipe(csv())
        .on('data', (row) => {
            if (row.numero && row.nome) {
                contacts.push({ number: row.numero, name: row.nome });
            }
        })
        .on('end', async () => {
            fs.unlinkSync(csvFile.path); 
            console.log('CSV processado. Agendando contatos:', contacts.length);

            if (contacts.length === 0) {
                return res.status(400).json({ success: false, message: 'Nenhum contato válido encontrado.' });
            }

            const createdMessagesPromises = [];
            
            // --- NOVA LÓGICA DE AGENDAMENTO CUMULATIVO RANDÔMICO ---
            let nextAvailableAt = new Date(); // Começa com o tempo atual

            for (const contact of contacts) {
                // Calcula um delay aleatório para esta mensagem
                const randomDelay = Math.floor(Math.random() * (MAX_DELAY_SECONDS - MIN_DELAY_SECONDS + 1)) + MIN_DELAY_SECONDS;

                // Adiciona o delay ao tempo da última mensagem, criando a fila
                nextAvailableAt.setSeconds(nextAvailableAt.getSeconds() + randomDelay);

                const personalizedMessage = message.replace(/{{nome}}/g, contact.name);

                createdMessagesPromises.push(
                    addMessageToQueue({
                        sessionId,
                        number: contact.number,
                        name: contact.name,
                        message: personalizedMessage,
                        available_at: new Date(nextAvailableAt) // Passa a data calculada
                    })
                );
            }

            const createdMessages = await Promise.all(createdMessagesPromises);
            
            res.status(200).json({ 
                success: true, 
                messages: createdMessages.filter(m => m !== null)
            });
        });
}

module.exports = { startCampaign };