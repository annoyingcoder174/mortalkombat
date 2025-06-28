const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const path = require('path');
const http = require('http');
const socketio = require('socket.io');
const dotenv = require('dotenv');
const Champion = require('./models/Champion');
const fighters = require('./utils/fighters_with_stats.json');
const statsRoutes = require('./routes/stats'); // adjust path if needed
const { calculateEloGain, getRank } = require('./utils/rankUtils');
const User = require('./models/User');



dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(async () => {
    console.log('✅ Connected to MongoDB');

    // ⚠️ Seed champions on server start (dev only)
    const count = await Champion.countDocuments();
    if (count === 0) {
        await Champion.insertMany(fighters);
        console.log('🌱 Champions seeded automatically.');
    } else {
        console.log('ℹ️ Champions already exist, skipping seeding.');
    }
});

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');



app.use(session({
    secret: process.env.SESSION_SECRET || 'secret-key',
    resave: false,
    saveUninitialized: false
}));

const rooms = {};

// Routes
app.use('/', require('./routes/auth'));
app.use('/game', require('./routes/game')(io, rooms));
app.use('/stats', statsRoutes);

// Socket.IO logic
io.on('connection', (socket) => {
    socket.on('join-room', ({ roomId, userId }) => {
        socket.join(roomId);

        if (!rooms[roomId]) {
            rooms[roomId] = {
                players: [],
                picks: {},
                pickedChamps: [],
                bannedChamps: [],
                banSources: {},
                format: 3,
                round: 1,
                creator: userId,
                phase: 'waiting',
                currentTurn: 0,
                history: [],
                pickOrder: [],
            };
        }

        const room = rooms[roomId];

        if (!room.players.includes(userId) && room.players.length < 2) {
            room.players.push(userId);
            room.picks[userId] = [];
        }

        if (room.players.length === 2 && room.phase === 'waiting') {
            room.phase = 'ban';
            room.currentTurn = 0;
            io.to(roomId).emit('start-ban-phase');
            io.to(roomId).emit('your-turn', {
                userId: room.creator,
                phase: 'ban'
            });
        }
    });

    const Champion = require('./models/Champion'); // ensure this is at top of server.js

    socket.on('ban-champ', async ({ roomId, champId, userId }) => {
        const room = rooms[roomId];
        if (!room || room.bannedChamps.includes(champId)) return;

        room.bannedChamps.push(champId);
        room.banSources[champId] = userId;

        // 🔄 Update totalBans and banRate
        try {
            await Champion.findOneAndUpdate(
                { champId },
                { $inc: { totalBans: 1, banRate: 1 } }
            );
        } catch (err) {
            console.error('❌ Failed to update ban stats:', err);
        }

        io.to(roomId).emit('banned', { userId, champId });
        io.to(roomId).emit('sync-state', {
            banSources: room.banSources,
            history: room.history
        });

        room.currentTurn++;
        if (room.currentTurn >= 2) {
            room.phase = 'pick';
            const [p1, p2] = room.players;
            room.pickOrder = [p1, p2];
            io.to(roomId).emit('start-pick-phase');
            io.to(roomId).emit('your-turn', {
                userId: p1,
                phase: 'pick'
            });
        } else {
            const nextUser = room.players[room.currentTurn % 2];
            io.to(roomId).emit('your-turn', {
                userId: nextUser,
                phase: 'ban'
            });
        }
    });



    socket.on('pick-champ', async ({ roomId, champId, userId }) => {
        const room = rooms[roomId];
        if (!room || room.pickedChamps.includes(champId)) return;

        const maxPicks = room.format;
        if (room.picks[userId].length >= maxPicks) return;

        const opponent = room.players.find(p => p !== userId);
        const wasBanned = room.bannedChamps.includes(champId);
        const bannedByOpponent = room.banSources?.[champId] === opponent;

        if (wasBanned) {
            const losses = room.history.filter(w => w !== userId).length;
            const threshold = Math.ceil((room.format - 1) / 2);
            if (!bannedByOpponent || losses < threshold) {
                return;
            }
        }
        // 📌 Increment pickRate immediately
        try {
            await Champion.findOneAndUpdate(
                { champId },
                { $inc: { pickRate: 1 } }
            );
        } catch (err) {
            console.error('❌ Error updating pickRate stat:', err);
        }


        room.pickedChamps.push(champId);
        room.picks[userId].push(champId);

        // ✅ Stats: increment totalPicks and totalGames
        await Champion.findOneAndUpdate(
            { champId },
            { $inc: { pickRate: 1, totalGames: 1 } }
        ).catch(console.error);


        io.to(roomId).emit('picked', { userId, champId });

        const [p1, p2] = room.players;
        const bothPickedThisRound =
            room.picks[p1].length === room.round &&
            room.picks[p2].length === room.round;

        if (bothPickedThisRound) {
            // ✅ Update totalGames for uninvolved champs
            const allChamps = await Champion.find({}, 'champId');
            const allChampIds = allChamps.map(c => c.champId);
            const involved = [
                ...room.bannedChamps,
                ...room.picks[p1],
                ...room.picks[p2]
            ];
            const uninvolved = allChampIds.filter(id => !involved.includes(id));

            await Champion.updateMany(
                { champId: { $in: uninvolved } },
                { $inc: { totalGames: 1 } }
            );

            room.phase = 'await-winner';
            io.to(roomId).emit('awaiting-winner');
        } else {
            const next = room.players.find(p => p !== userId && room.picks[p].length < room.round);
            if (next) {
                io.to(roomId).emit('your-turn', {
                    userId: next,
                    phase: 'pick'
                });
            }
        }
    });


    // make sure this is at the top



    socket.on('round-winner', async ({ roomId, winnerId }) => {
        const room = rooms[roomId];
        if (!room) return;

        const roundIndex = room.round - 1;
        room.history.push(winnerId);

        io.to(roomId).emit('mark-result', {
            winnerId,
            roundIndex,
            history: room.history
        });

        io.to(roomId).emit('sync-state', {
            banSources: room.banSources,
            history: room.history
        });

        // ✅ Stat tracking for this round only
        try {
            const loserId = room.players.find(p => p !== winnerId);
            const winnerChamp = room.picks?.[winnerId]?.[roundIndex];
            const loserChamp = room.picks?.[loserId]?.[roundIndex];

            if (winnerChamp) {
                await Champion.findOneAndUpdate(
                    { champId: winnerChamp },
                    {
                        $inc: {
                            pickRate: 1,
                            winRate: 1,
                            totalWins: 1,
                            totalGames: 1
                        }
                    }
                );
            }

            if (loserChamp) {
                await Champion.findOneAndUpdate(
                    { champId: loserChamp },
                    {
                        $inc: {
                            pickRate: 1,
                            totalGames: 1
                        }
                    }
                );
            }
        } catch (err) {
            console.error("❌ Failed to update stats for champions:", err);
        }

        // ✅ Check match win condition
        const winCondition = Math.ceil(room.format / 2);
        const winnerWins = room.history.filter(w => w === winnerId).length;

        if (winnerWins >= winCondition) {
            const loserId = room.players.find(p => p !== winnerId);
            const winnerScore = room.history.filter(id => id === winnerId).length;
            const loserScore = room.history.filter(id => id === loserId).length;

            const { gain, loss } = calculateEloGain(room.format, winnerScore, loserScore);

            try {
                await User.findOneAndUpdate(
                    { username: winnerId },
                    { $inc: { elo: gain } }
                );
                await User.findOneAndUpdate(
                    { username: loserId },
                    { $inc: { elo: -loss } }
                );
            } catch (err) {
                console.error("❌ Failed to update ELO:", err);
            }

            io.to(roomId).emit('match-end', { winner: winnerId });
            delete rooms[roomId];
            return;
        }


        // 🔁 Continue to next round
        const loserId = room.players.find(p => p !== winnerId);
        room.round++;
        room.phase = 'pick';
        room.pickOrder = [loserId, winnerId];

        io.to(roomId).emit('next-round', { round: room.round });
        io.to(roomId).emit('your-turn', {
            userId: loserId,
            phase: 'pick'
        });
    });








});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
