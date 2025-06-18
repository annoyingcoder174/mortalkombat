const Champion = require('../models/Champion');

const rooms = {};

function handleSocketEvents(io) {
    io.on('connection', socket => {
        socket.on('join-room', ({ roomId, userId }) => {
            socket.join(roomId);
            if (!rooms[roomId]) rooms[roomId] = { players: [], bans: [], picks: [] };
            rooms[roomId].players.push(userId);
        });

        socket.on('ban-champ', async ({ roomId, champId }) => {
            await Champion.findOneAndUpdate({ champId }, { $inc: { bans: 1 } });
            rooms[roomId].bans.push(champId);
            io.to(roomId).emit('banned', champId);
        });

        socket.on('pick-champ', async ({ roomId, champId }) => {
            await Champion.findOneAndUpdate({ champId }, { $inc: { picks: 1 } });
            rooms[roomId].picks.push(champId);
            io.to(roomId).emit('picked', champId);
        });

        socket.on('match-result', async ({ roomId, winnerId }) => {
            const match = rooms[roomId];
            const winningChamp = match.picks.find(p => p.userId === winnerId)?.champId;
            if (winningChamp) {
                await Champion.findOneAndUpdate({ champId: winningChamp }, { $inc: { wins: 1 } });
            }
        });
    });
}

module.exports = { handleSocketEvents };
