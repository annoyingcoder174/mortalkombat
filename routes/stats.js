const express = require('express');
const router = express.Router();
const Champion = require('../models/Champion');

router.get('/', async (req, res) => {
    try {
        const champions = await Champion.find();

        const enriched = champions.map(champ => {
            const total = champ.totalGames || 1;

            const pick = champ.pickRate || 0;
            const ban = champ.banRate || 0;
            const win = champ.winRate || 0;

            const calcBanPickRate = ((pick + ban) / total * 100).toFixed(1);
            const calcBanRate = (ban / total * 100).toFixed(1);
            const calcWinRate = pick > 0 ? (win / pick * 100).toFixed(1) : '0.0';

            return {
                ...champ.toObject(),
                calcBanPickRate,
                calcBanRate,
                calcWinRate
            };
        });

        res.render('game/stats', { champions: enriched });
    } catch (err) {
        console.error('Stats fetch error:', err);
        res.status(500).send('Internal server error');
    }
});

module.exports = router;
