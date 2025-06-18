const mongoose = require('mongoose');

const MatchSchema = new mongoose.Schema({
    roomId: String,
    player1: {
        userId: mongoose.Schema.Types.ObjectId,
        pick: String,
        win: Boolean
    },
    player2: {
        userId: mongoose.Schema.Types.ObjectId,
        pick: String,
        win: Boolean
    },
    bans: [String],
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Match', MatchSchema);
