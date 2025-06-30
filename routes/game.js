const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const Champion = require('../models/Champion');
const { ensureAuth } = require('../middleware/auth');

module.exports = (io, rooms) => {
    router.get('/menu', ensureAuth, (req, res) => {
        const availableRooms = Object.entries(rooms).map(([roomId, room]) => ({
            roomId,
            players: room.players,
            format: room.format
        }));

        res.render('game/menu', {
            user: req.session.user,
            availableRooms
        });
    });
    const Champion = require('../models/Champion'); // ensure import at the top

    router.get('/stats', ensureAuth, async (req, res) => {
        try {
            const champs = await Champion.find().lean();

            champs.forEach(champ => {
                const { totalPicks, totalBans, totalWins, totalGames } = champ;

                champ.pickRate = totalGames ? ((totalPicks / totalGames) * 100).toFixed(1) : '0.0';
                champ.banRate = totalGames ? ((totalBans / totalGames) * 100).toFixed(1) : '0.0';
                champ.winRate = totalPicks ? ((totalWins / totalPicks) * 100).toFixed(1) : '0.0';
                champ.banPickRate = totalGames ? (((totalBans + totalPicks) / totalGames) * 100).toFixed(1) : '0.0';
            });

            res.render('game/stats', {
                user: req.session.user,
                champions: champs
            });
        } catch (err) {
            console.error('Error fetching stats:', err);
            res.status(500).send('Server Error');
        }
    });
    const { getRank } = require('../utils/rankUtils');
    const User = require('../models/User');

    router.get('/menu', ensureAuth, async (req, res) => {
        const user = await User.findOne({ username: req.session.user.username });

        const availableRooms = Object.entries(rooms).map(([roomId, room]) => ({
            roomId,
            players: room.players,
            format: room.format
        }));

        res.render('game/menu', {
            user: user.username,
            rank: getRank(user.elo),
            availableRooms
        });
    });





    router.post('/create-room', ensureAuth, async (req, res) => {
        const { format } = req.body;
        const roomId = uuidv4();

        rooms[roomId] = {
            players: [],
            picks: {},
            pickedChamps: [],
            bannedChamps: [],
            banSources: {}, // ✅ Fix
            lastLoser: null,
            pickOrder: [],
            format: parseInt(format),
            phase: 'waiting',
            currentTurn: 0,
            round: 1,
            history: [],
            creator: req.session.user.username
        };

        res.redirect(`/game/room/${roomId}`);
    });



    router.get('/room/:roomId', ensureAuth, async (req, res) => {
        const roomId = req.params.roomId;
        const room = rooms[roomId];
        if (!room) return res.redirect('/game/menu');

        const champions = await Champion.find().lean();
        const user = req.session.user.username;
        const opponent = room.players.find(p => p !== user);
        const isCreator = room.creator === user;

        const userData = await User.findOne({ username: user });
        const opponentData = opponent ? await User.findOne({ username: opponent }) : null;

        res.render('game/banpick', {
            user,
            opponent,
            userRank: getRank(userData.elo),
            userElo: userData.elo,
            opponentRank: opponentData ? getRank(opponentData.elo) : '---',
            opponentElo: opponentData ? opponentData.elo : 0,
            roomId,
            format: room.format,
            champions,
            players: room.players,
            isCreator
        });

    });



    router.post('/join-room/:roomId', ensureAuth, (req, res) => {
        const roomId = req.params.roomId;
        const room = rooms[roomId];
        if (!room || room.players.length >= 2 || room.players.includes(req.session.user.username)) {
            return res.redirect('/game/menu');
        }
        room.players.push(req.session.user.username);
        room.picks[req.session.user.username] = [];

        res.redirect(`/game/room/${roomId}`);
    });

    router.post('/join-room', ensureAuth, (req, res) => {
        const roomId = req.body.roomId;
        if (!roomId) return res.redirect('/game/menu');
        return res.redirect(`/game/room/${roomId}`);
    });

    return router;
};
function getRankBadgeClass(rankName) {
    if (rankName.includes('Tân Binh')) return 'rank-tanbinh';
    if (rankName.includes('Huyết Binh')) return 'rank-huyetbinh';
    if (rankName.includes('Sát Thủ')) return 'rank-satthuden';
    if (rankName.includes('Rồng Đen')) return 'rank-rongden';
    if (rankName.includes('Quán Quân')) return 'rank-quanquan';
    if (rankName.includes('Thần Chiến Tranh')) return 'rank-thanchientranh';
    if (rankName.includes('Á Thần')) return 'rank-athan';
    return '';
}

