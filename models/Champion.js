const mongoose = require('mongoose');

const ChampionSchema = new mongoose.Schema({
    champId: String,
    name: String,
    image: String,
    pickRate: { type: Number, default: 0 },
    banRate: { type: Number, default: 0 },
    winRate: { type: Number, default: 0 },
    totalWins: { type: Number, default: 0 },
    totalGames: { type: Number, default: 0 }
});

module.exports = mongoose.model('Champion', ChampionSchema);
