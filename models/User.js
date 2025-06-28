const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    elo: { type: Number, default: 0 } // 👈 Add this
});

module.exports = mongoose.model('User', userSchema);
